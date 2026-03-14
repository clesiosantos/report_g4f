<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    // Busca os períodos distintos baseados na data de fechamento dos chamados vinculada ao calendário
    $sql = "
        SELECT DISTINCT c.periodo AS PERIODO 
        FROM glpi_tickets t
        INNER JOIN calendario c ON DATE(t.closedate) = c.data
        WHERE t.status = 6 
        AND t.is_deleted = 0
        ORDER BY c.data DESC
    ";
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>