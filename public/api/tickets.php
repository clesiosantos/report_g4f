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

// Vinculação agora é feita EXCLUSIVAMENTE pela data de criação (t.date)
$sql = "
    SELECT 
        t.id,
        t.name as titulo,
        t.content as descricao,
        t.date as data_criacao,
        IFNULL(t.solvedate, t.closedate) as data_solucao,
        c.data as data_referencia,
        it.completename as servico,
        fc_users_name(t.users_id_recipient) AS posto_trabalho, 
        c.periodo as periodo_avaliado,
        CASE t.status 
            WHEN 2 THEN 'Atribuído'
            WHEN 3 THEN 'Planejado'
            WHEN 4 THEN 'Pendente'
            WHEN 5 THEN 'Solucionado'
            WHEN 6 THEN 'Fechado'
            ELSE 'Outro'
        END as status
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
    INNER JOIN calendario c ON (DATE(t.date) = c.data)
    WHERE c.periodo = ?
    AND t.users_id_recipient = ?
    AND t.status IN (2, 3, 4, 5, 6)
    AND t.is_deleted = 0
    AND (it.completename IS NULL OR it.completename NOT REGEXP 'Justificativa')
    ORDER BY t.date DESC
";

try {
    if (!report_can_view($pdo, $actor, $userId)) report_error(403, 'Acesso negado.');
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $userId]);
    $results = $stmt->fetchAll();
    
    foreach ($results as &$row) {
        // Preserva paragrafos, listas e quebras de linha do GLPI sem renderizar HTML.
        $cleanDesc = html_entity_decode((string)($row['descricao'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanDesc = preg_replace('~<(script|style)\b[^>]*>.*?</\1\s*>~is', '', $cleanDesc);
        $cleanDesc = preg_replace('~<br\b[^>]*>~i', "\n", $cleanDesc);
        $cleanDesc = preg_replace('~<li\b[^>]*>~i', "\n• ", $cleanDesc);
        $cleanDesc = preg_replace('~</?(?:p|div|section|article|h[1-6]|blockquote|ul|ol|tr|pre)\b[^>]*>|</li\s*>~i', "\n", $cleanDesc);
        $cleanDesc = strip_tags($cleanDesc);
        $cleanDesc = html_entity_decode($cleanDesc, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanDesc = str_replace(["\r\n", "\r", "\u{00A0}"], ["\n", "\n", ' '], $cleanDesc);
        $cleanDesc = preg_replace('/[ \t]+/u', ' ', $cleanDesc);
        $cleanDesc = preg_replace('/ *\n */u', "\n", $cleanDesc);
        $cleanDesc = preg_replace('/\n{3,}/', "\n\n", $cleanDesc);
        $row['descricao'] = trim($cleanDesc);
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    error_log('RDA Tec: falha na consulta de chamados.');
    echo json_encode(['error' => 'Falha ao consultar chamados.']);
}
?>