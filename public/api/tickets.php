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

// Consulta atualizada para incluir status 5 (Solucionado) e 6 (Fechado)
$sql = "
    SELECT 
        t.id,
        t.name as titulo,
        t.content as descricao,
        t.date as data_criacao,
        IFNULL(t.solvedate, t.closedate) as data_solucao,
        it.completename as servico,
        fc_users_name(t.users_id_recipient) AS posto_trabalho, 
        c.periodo as periodo_avaliado,
        CASE t.status 
            WHEN 5 THEN 'Solucionado'
            WHEN 6 THEN 'Fechado'
            ELSE 'Outro'
        END as status
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
    INNER JOIN calendario c ON (DATE(IFNULL(t.solvedate, t.closedate)) = c.data)
    WHERE c.periodo = ?
    AND t.users_id_recipient = ?
    AND t.status IN (5, 6)
    AND t.is_deleted = 0
    AND it.completename NOT REGEXP 'Justificativa'
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $userId]);
    $results = $stmt->fetchAll();
    
    foreach ($results as &$row) {
        $cleanDesc = html_entity_decode($row['descricao']);
        $cleanDesc = strip_tags($cleanDesc);
        $row['descricao'] = trim(preg_replace('/\s+/', ' ', $cleanDesc));
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>