<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
require_once __DIR__ . '/consolidated_data.php';
$actor = report_actor($pdo);
$scope = rda_group_scope($actor);
$lock = null;
try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['code'])) {
            $record = rda_group_find($pdo, rda_code($_GET['code']));
            if (!$record) report_error(404, 'Consolidado nao encontrado.');
            rda_group_authorize($pdo, $actor, $record);
            echo json_encode($record, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            exit;
        }
        $group = filter_var($_GET['group_id'] ?? 0, FILTER_VALIDATE_INT, ['options'=>['min_range'=>0]]);
        if ($group === false) report_error(400, 'Gerencia invalida.');
        if (isset($_GET['history'])) {
            $period = is_string($_GET['period'] ?? null) ? $_GET['period'] : '';
            if (!isset($_GET['group_id']) || !$period) report_error(400, 'Informe gerencia e competencia.');
            $page = filter_var($_GET['page'] ?? 1,FILTER_VALIDATE_INT,['options'=>['min_range'=>1,'max_range'=>100000]]);
            if (!$page) report_error(400,'Pagina invalida.');
            $offset = ($page-1)*20;
            $stmt = $pdo->prepare("SELECT codigo, emitido_em_utc, id FROM rda_consolidados WHERE gerencia_id=? AND competencia=? AND escopo=? ORDER BY id DESC LIMIT 21 OFFSET $offset");
            $stmt->execute([$group,$period,$scope]);
            $rows=$stmt->fetchAll();
            $items=[];
            foreach (array_slice($rows,0,20) as $row) {
                $r=rda_group_find($pdo,$row['codigo']);
                // Historico nao revela composicoes cuja autorizacao foi revogada.
                $allowed=true;
                foreach($r['snapshot']['items'] as $item) if(!report_can_view($pdo,$actor,(int)$item['user_id'])) {$allowed=false;break;}
                if($allowed) $items[]=['code'=>$row['codigo'],'issued_at'=>$r['snapshot']['issued_at'],'revision'=>$r['revision'],'latest_revision'=>$r['latest_revision'],'count'=>count($r['snapshot']['items'])];
            }
            echo json_encode(['items'=>$items,'has_more'=>count($rows)>20]);
            exit;
        }
        if (isset($_GET['group_id'])) {
            $rows = rda_consolidated_members($pdo, $actor, $group);
            echo json_encode(array_map(fn($r)=>['id'=>(int)$r['id'],'name'=>$r['name'],'active'=>(bool)$r['is_active']],$rows),JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        } else {
            $rows = rda_group_members($pdo, $actor);
            $groups=[];
            foreach($rows as $r) {
                $id=(int)$r['group_id'];
                if(!isset($groups[$id])) $groups[$id]=['id'=>$id,'name'=>$r['group_name'],'count'=>0];
                $groups[$id]['count']++;
            }
            $all = ['id'=>0,'name'=>'Todas as gerências','count'=>count(rda_all_members($pdo,$actor))];
            echo json_encode(array_merge([$all],array_values($groups)),JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        }
        exit;
    }
    report_method('POST');
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') report_error(415, 'Envie JSON.');
    $input=json_decode(file_get_contents('php://input'),true);
    if(!is_array($input)) report_error(400,'Solicitacao invalida.');
    if(($input['action'] ?? '') === 'reprint') {
        $r=rda_group_find($pdo,rda_code($input['code'] ?? null));
        if(!$r) report_error(404,'Consolidado nao encontrado.');
        rda_group_authorize($pdo,$actor,$r);
        rda_group_event($pdo,$actor,$r['snapshot']['code'],'REIMPRESSAO_SOLICITADA');
        echo json_encode(['ok'=>true]);
        exit;
    }
    $group=filter_var($input['group_id'] ?? -1,FILTER_VALIDATE_INT,['options'=>['min_range'=>0]]);
    $period=is_string($input['period'] ?? null)?trim($input['period']):'';
    $codes=$input['codes'] ?? null;
    if($group === false || !$period || strlen($period)>255 || !is_array($codes)) report_error(400,'Gerencia, competencia e emissoes obrigatorias.');
    $stmt=$pdo->prepare('SELECT periodo FROM calendario WHERE periodo=? ORDER BY data LIMIT 1');
    $stmt->execute([$period]);
    $period=$stmt->fetchColumn();
    if(!$period) report_error(400,'Competencia inexistente.');
    $name=hash('sha256','rda-group:'.$group.':'.$period.':'.$scope);
    $stmt=$pdo->prepare('SELECT GET_LOCK(?,10)');
    $stmt->execute([$name]);
    if((int)$stmt->fetchColumn()!==1) report_error(503,'Consolidacao em andamento.');
    $lock=$name;
    $pdo->beginTransaction();
    $members=rda_consolidated_members($pdo,$actor,$group);
    if(!$members || count($codes)!==count($members)) report_error(409,'A composicao da gerencia mudou. Gere novamente.');
    $items=[];
    $stmt=$pdo->prepare('SELECT codigo FROM rda_emissoes WHERE colaborador_id=? AND competencia=? ORDER BY id DESC LIMIT 1');
    foreach($members as $member) {
        $id=(int)$member['id'];
        if(!report_can_view($pdo,$actor,$id)) report_error(403,'Acesso negado ao colaborador.');
        $code=rda_code($codes[(string)$id] ?? null);
        $stmt->execute([$id,$period]);
        if($stmt->fetchColumn()!==$code) report_error(409,'Existe uma emissao individual mais recente. Gere novamente.');
        $r=rda_find($pdo,$code);
        if((int)$r['snapshot']['user']['id']!==$id || $r['snapshot']['period']!==$period) report_error(409,'Emissao individual incompativel.');
        $item=['user_id'=>$id,'name'=>$r['snapshot']['user']['name'],'code'=>$code,'sha256'=>$r['sha256'],'revision'=>$r['revision'],'ticket_count'=>count($r['snapshot']['tickets'])];
        if ($group === 0) $item['gerencia'] = $r['snapshot']['user']['gerencia'] ?? '';
        $items[]=$item;
    }
    $content=['contract'=>RDA_CONTRACT,'group_id'=>$group,'group_name'=>($group === 0 ? 'Todas as gerências' : $members[0]['group_name']),'period'=>$period,'scope'=>$scope,'items'=>$items];
    $hash=hash('sha256',json_encode(rda_canonical($content),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    $stmt=$pdo->prepare('SELECT codigo, hash_conteudo FROM rda_consolidados WHERE gerencia_id=? AND competencia=? AND escopo=? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$group,$period,$scope]);
    $latest=$stmt->fetch();
    if($latest && hash_equals($latest['hash_conteudo'],$hash)) {
        $r=rda_group_find($pdo,$latest['codigo']);
        rda_group_event($pdo,$actor,$latest['codigo'],'REUTILIZACAO');
        $pdo->commit();
        echo json_encode($r+['reused'=>true],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        return;
    }
    $issuer=rda_person($pdo,(int)$actor['id']);
    $now=new DateTimeImmutable('now',new DateTimeZone('UTC'));
    $s=$content+['code'=>strtoupper(bin2hex(random_bytes(16))),'issued_at'=>$now->format('Y-m-d\TH:i:s\Z'),'issuer'=>['name'=>$issuer['name'],'username'=>$issuer['username'],'profile'=>$actor['profile']],'version'=>1];
    $json=json_encode($s,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
    $stmt=$pdo->prepare('INSERT INTO rda_consolidados (codigo,gerencia_id,competencia,escopo,emitido_em_utc,emissor_id,snapshot_json,sha256,hash_conteudo) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->execute([$s['code'],$group,$period,$scope,$now->format('Y-m-d H:i:s'),$actor['id'],$json,hash('sha256',$json),$hash]);
    $batch=$pdo->lastInsertId();
    $stmt=$pdo->prepare('INSERT INTO rda_consolidados_itens (consolidado_id,ordem,colaborador_id,codigo_individual,sha256_individual) VALUES (?,?,?,?,?)');
    foreach($items as $i=>$item) $stmt->execute([$batch,$i+1,$item['user_id'],$item['code'],$item['sha256']]);
    rda_group_event($pdo,$actor,$s['code'],'EMISSAO');
    $r=rda_group_find($pdo,$s['code']);
    $pdo->commit();
    http_response_code(201);
    echo json_encode($r+['reused'=>false],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
} catch(Throwable $e) {
    if($pdo->inTransaction()) $pdo->rollBack();
    error_log('RDA Tec: falha no consolidado: '.get_class($e));
    http_response_code(500);
    echo json_encode(['error'=>'Nao foi possivel processar o consolidado.']);
} finally {
    if($lock!==null) {
        $stmt=$pdo->prepare('SELECT RELEASE_LOCK(?)');
        $stmt->execute([$lock]);
    }
}
