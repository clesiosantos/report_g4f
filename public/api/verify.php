<?php
require_once __DIR__ . '/auth.php';
report_method('POST');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $record = rda_find($pdo, rda_code($input['code'] ?? null));
    $s = $record['snapshot'];
    // Consulta publica por codigo: nenhum nome, IP, localizacao ou chamado e divulgado.
    echo json_encode([
        'code' => $s['code'], 'contract' => $s['contract'],
        'issued_at' => $s['issued_at'], 'period' => $s['period'],
        'ticket_count' => count($s['tickets']), 'sha256' => $record['sha256']
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    error_log('RDA Tec: falha na verificacao.');
    report_error(500, 'Consulta de autenticidade indisponivel.');
}
