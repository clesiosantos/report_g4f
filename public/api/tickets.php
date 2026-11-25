<?php
require_once __DIR__ . '/auth.php';
report_method('GET');
require_once __DIR__ . '/db.php';
$actor = report_actor($pdo);
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: application/json');

$period = is_string($_GET['period'] ?? null) ? $_GET['period'] : '';
$userId = filter_var($_GET['user_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if (empty($period) || !$userId || strlen($period) > 255) {
    http_response_code(400);
    echo json_encode(['error' => 'Período e ID do usuário são obrigatórios']);
    exit;
}

require_once __DIR__ . '/report_data.php';
try {
    if (!report_can_view($pdo, $actor, $userId)) report_error(403, 'Acesso negado.');
    echo json_encode(rda_tickets($pdo, $period, $userId));
} catch (Throwable $e) {
    http_response_code(500);
    error_log('RDA Tec: falha na consulta de chamados.');
    echo json_encode(['error' => 'Falha ao consultar chamados.']);
}
