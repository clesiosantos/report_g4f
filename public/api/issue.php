<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
$actor = report_actor($pdo);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$lock = null;

try {
    if ($method === 'GET') {
        $record = rda_find($pdo, rda_code($_GET['code'] ?? null));
        if (!report_can_view($pdo, $actor, (int)$record['snapshot']['user']['id'])) report_error(403, 'Acesso negado.');
        echo json_encode($record, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        exit;
    }
    report_method('POST');
    if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') report_error(415, 'Envie JSON.');
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) report_error(400, 'Solicitacao invalida.');
    if (($input['action'] ?? '') === 'reprint') {
        $record = rda_find($pdo, rda_code($input['code'] ?? null));
        if (!report_can_view($pdo, $actor, (int)$record['snapshot']['user']['id'])) report_error(403, 'Acesso negado.');
        rda_event($pdo, $record['snapshot']['code'], 'REIMPRESSAO_SOLICITADA', $actor, rda_person($pdo, (int)$actor['id']));
        echo json_encode(['ok' => true]);
        exit;
    }
    $target = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $period = is_string($input['period'] ?? null) ? trim($input['period']) : '';
    if (!$target || $period === '' || strlen($period) > 255) report_error(400, 'Periodo e colaborador obrigatorios.');
    if (!report_can_view($pdo, $actor, $target)) report_error(403, 'Acesso negado.');
    $stmt = $pdo->prepare('SELECT periodo FROM calendario WHERE periodo = ? ORDER BY data LIMIT 1');
    $stmt->execute([$period]);
    $period = $stmt->fetchColumn();
    if (!$period) report_error(400, 'Competencia inexistente.');
    $lockName = hash('sha256', 'rda:glpi_tec:' . $target . ':' . $period);
    $stmt = $pdo->prepare('SELECT GET_LOCK(?, 10)');
    $stmt->execute([$lockName]);
    if ((int)$stmt->fetchColumn() !== 1) report_error(503, 'Emissao em andamento. Tente novamente.');
    $lock = $lockName;
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT data, periodo FROM calendario WHERE periodo = ? ORDER BY data');
    $stmt->execute([$period]);
    $calendar = $stmt->fetchAll();
    if (!$calendar) {
        $pdo->rollBack();
        report_error(400, 'Competencia inexistente.');
    }
    $period = $calendar[0]['periodo'];
    $person = rda_person($pdo, $target);
    $issuer = rda_person($pdo, (int)$actor['id']);
    $issuer['profile'] = $actor['profile'];
    $issuer['profile_id'] = (int)$actor['profile_id'];
    // A localizacao e informada pelo navegador, nao constitui prova de identidade.
    $location = is_string($input['location'] ?? null) ? mb_substr(trim($input['location']), 0, 180) : '';
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $snapshot = [
        'version' => 1,
        'code' => strtoupper(bin2hex(random_bytes(16))),
        'contract' => RDA_CONTRACT,
        'issued_at' => $now->format('Y-m-d\\TH:i:s\\Z'),
        'period' => $period,
        'dates' => array_column($calendar, 'data'),
        'user' => $person,
        'currentUser' => $issuer,
        'tickets' => rda_tickets($pdo, $period, $target),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'browser' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
        'location' => $location ?: 'Nao disponibilizada pelo navegador',
    ];
    $snapshot['hash_conteudo'] = rda_content_hash($snapshot);
    $stmt = $pdo->prepare('SELECT codigo FROM rda_emissoes WHERE colaborador_id = ? AND competencia = ? ORDER BY id DESC LIMIT 1');
    $stmt->execute([$target, $period]);
    $latest = $stmt->fetchColumn();
    $previous = $latest ? rda_find($pdo, $latest) : null;
    if ($previous && hash_equals($previous['hash_conteudo'], $snapshot['hash_conteudo'])) {
        rda_event($pdo, $latest, 'REUTILIZACAO', $actor, $issuer, $location);
        $pdo->commit();
        echo json_encode($previous + ['reused' => true], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        return;
    }
    $json = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $hash = hash('sha256', $json);
    $stmt = $pdo->prepare('INSERT INTO rda_emissoes (codigo, emitido_em_utc, colaborador_id, emissor_id, competencia, snapshot_json, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$snapshot['code'], $now->format('Y-m-d H:i:s'), $target, $actor['id'], $period, $json, $hash]);
    rda_event($pdo, $snapshot['code'], 'EMISSAO', $actor, $issuer, $location);
    $record = rda_find($pdo, $snapshot['code']);
    $pdo->commit();
    http_response_code(201);
    echo json_encode($record + ['reused' => false], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('RDA Tec: falha no registro ou leitura da emissao.');
    http_response_code(500);
    echo json_encode(['error' => 'Nao foi possivel registrar ou consultar a emissao.']);
} finally {
    if ($lock !== null) {
        $stmt = $pdo->prepare('SELECT RELEASE_LOCK(?)');
        $stmt->execute([$lock]);
    }
}
