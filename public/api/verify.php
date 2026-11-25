<?php
require_once __DIR__ . '/auth.php';
report_method('POST');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/report_data.php';
require_once __DIR__ . '/consolidated_data.php';
try {
    $input = json_decode(file_get_contents('php://input'), true);
    $code = rda_code($input['code'] ?? null);
    $group = rda_group_find($pdo,$code);
    if ($group) {
        $s=$group['snapshot'];
        echo json_encode(['type'=>'consolidated','code'=>$code,'contract'=>$s['contract'],'period'=>$s['period'],'issued_at'=>$s['issued_at'],
            'member_count'=>count($s['items']),'ticket_count'=>array_sum(array_column($s['items'],'ticket_count')),
            'sha256'=>$group['sha256'],'revision'=>$group['revision'],'latest_revision'=>$group['latest_revision']],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
        exit;
    }
    $record = rda_find($pdo, $code);
    $s = $record['snapshot'];
    // Consulta publica por codigo: nenhum nome, IP, localizacao ou chamado e divulgado.
    echo json_encode([
        'code' => $s['code'], 'contract' => $s['contract'],
        'issued_at' => $s['issued_at'], 'period' => $s['period'],
        'ticket_count' => count($s['tickets']), 'sha256' => $record['sha256'],
        'revision' => $record['revision'], 'latest_revision' => $record['latest_revision']
    ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    error_log('RDA Tec: falha na verificacao.');
    report_error(500, 'Consulta de autenticidade indisponivel.');
}
