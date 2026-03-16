<?php
require_once 'db.php';
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Content-Type: application/json');

$period = $_GET['period'] ?? '';
$userId = $_GET['user_id'] ?? '';

if (empty($period) || empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Período e ID do usuário são obrigatórios']);
    exit;
}

// c.data é a data real do calendário (ex: 2026-03-09)
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
    INNER JOIN calendario c ON (DATE(COALESCE(t.solvedate, t.closedate, t.date)) = c.data)
    WHERE c.periodo = ?
    AND t.users_id_recipient = ?
    AND t.status IN (2, 3, 4, 5, 6)
    AND t.is_deleted = 0
    AND (it.completename IS NULL OR it.completename NOT REGEXP 'Justificativa')
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $userId]);
    $results = $stmt->fetchAll();
    
    foreach ($results as &$row) {
        $cleanDesc = html_entity_decode($row['descricao'] ?? '');
        $cleanDesc = strip_tags($cleanDesc);
        $row['descricao'] = trim(preg_replace('/\s+/', ' ', $cleanDesc));
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>