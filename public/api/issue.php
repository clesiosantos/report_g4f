<?php
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
$actor = report_actor($pdo);
$method = $_SERVER['REQUEST_METHOD'] ?? '';

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
    $target = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    $period = is_string($input['period'] ?? null) ? trim($input['period']) : '';
    if (!$target || $period === '' || strlen($period) > 255) report_error(400, 'Periodo e colaborador obrigatorios.');
    if (!report_can_view($pdo, $actor, $target)) report_error(403, 'Acesso negado.');
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
    $json = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    $hash = hash('sha256', $json);
    $stmt = $pdo->prepare('INSERT INTO rda_emissoes (codigo, emitido_em_utc, colaborador_id, emissor_id, competencia, snapshot_json, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$snapshot['code'], $now->format('Y-m-d H:i:s'), $target, $actor['id'], $period, $json, $hash]);
    $pdo->commit();
    http_response_code(201);
    echo json_encode(['snapshot' => $snapshot, 'sha256' => $hash], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('RDA Tec: falha no registro ou leitura da emissao.');
    report_error(500, 'Nao foi possivel registrar ou consultar a emissao.');
}
