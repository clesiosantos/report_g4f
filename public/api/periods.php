<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    $sql = "
        SELECT c.periodo AS PERIODO 
        FROM glpi_tickets t
        INNER JOIN calendario c ON (DATE(IFNULL(t.solvedate, t.closedate)) = c.data)
        WHERE t.status IN (5, 6)
        AND t.is_deleted = 0
        AND c.periodo IS NOT NULL
        GROUP BY c.periodo
        ORDER BY MAX(c.data) DESC
    ";
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (empty($results)) {
        $sqlFallback = "SELECT periodo FROM calendario GROUP BY periodo ORDER BY MAX(data) DESC LIMIT 12";
        $stmtFallback = $pdo->query($sqlFallback);
        $results = $stmtFallback->fetchAll(PDO::FETCH_COLUMN);
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro SQL: ' . $e->getMessage()]);
}
?>