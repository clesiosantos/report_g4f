<?php
require_once __DIR__ . '/auth.php';
report_method('GET');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
$actor = report_actor($pdo);
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000000]]);
if (!$page) report_error(400, 'Pagina invalida.');
$limit = 20;
$offset = ($page - 1) * $limit;
try {
    if (isset($_GET['code'])) {
        $record = rda_find($pdo, rda_code($_GET['code']));
        if (!report_can_view($pdo, $actor, (int)$record['snapshot']['user']['id'])) report_error(403, 'Acesso negado.');
        $code = $record['snapshot']['code'];
        $stmt = $pdo->prepare('SELECT COUNT(*) FROM rda_emissao_eventos WHERE codigo = ?');
        $stmt->execute([$code]);
        $total = (int)$stmt->fetchColumn();
        $stmt = $pdo->prepare("SELECT evento, DATE_FORMAT(ocorrido_em_utc, '%Y-%m-%dT%H:%i:%sZ') AS occurred_at,
            usuario_nome, usuario_login, perfil FROM rda_emissao_eventos WHERE codigo = ? ORDER BY id DESC LIMIT $limit OFFSET $offset");
        $stmt->execute([$code]);
        echo json_encode(['items' => $stmt->fetchAll(), 'total' => $total, 'page' => $page, 'page_size' => $limit]);
        exit;
    }
    $target = filter_var($_GET['user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $period = is_string($_GET['period'] ?? null) ? trim($_GET['period']) : '';
    if (!$target || !$period || strlen($period) > 255) report_error(400, 'Periodo e colaborador obrigatorios.');
    if (!report_can_view($pdo, $actor, $target)) report_error(403, 'Acesso negado.');
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM rda_emissoes WHERE colaborador_id = ? AND competencia = ?');
    $stmt->execute([$target, $period]);
    $total = (int)$stmt->fetchColumn();
    $stmt = $pdo->prepare("SELECT e.codigo, (SELECT COUNT(*) FROM rda_emissao_eventos a WHERE a.codigo = e.codigo) AS event_count
        FROM rda_emissoes e WHERE e.colaborador_id = ? AND e.competencia = ? ORDER BY e.id DESC LIMIT $limit OFFSET $offset");
    $stmt->execute([$target, $period]);
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $r = rda_find($pdo, $row['codigo']);
        $s = $r['snapshot'];
        $items[] = ['code' => $s['code'], 'issued_at' => $s['issued_at'],
            'issuer' => trim($s['currentUser']['name'] ?? '') ?: ($s['currentUser']['username'] ?? ''),
            'issuer_profile' => $s['currentUser']['profile'] ?? '',
            'ticket_count' => count($s['tickets']), 'event_count' => (int)$row['event_count'],
            'revision' => $r['revision'], 'latest_revision' => $r['latest_revision']];
    }
    echo json_encode(['items' => $items, 'total' => $total, 'page' => $page, 'page_size' => $limit]);
} catch (Throwable $e) {
    error_log('RDA Tec: falha na consulta de historico.');
    report_error(500, 'Historico indisponivel.');
}
