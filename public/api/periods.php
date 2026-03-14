<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    // Busca períodos distintos da tabela de calendário
    $sql = "SELECT DISTINCT periodo AS PERIODO FROM calendario ORDER BY data_inicio DESC";
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>