<?php
require_once 'db.php';
header('Content-Type: application/json');

try {
    // Busca períodos baseados no cruzamento de chamados fechados e o calendário
    // Usando solvedate como alternativa caso closedate esteja nulo
    $sql = "
        SELECT DISTINCT c.periodo AS PERIODO 
        FROM glpi_tickets t
        INNER JOIN calendario c ON (DATE(t.closedate) = c.data OR DATE(t.solvedate) = c.data)
        WHERE t.status = 6 
        AND t.is_deleted = 0
        AND c.periodo IS NOT NULL
        ORDER BY c.data DESC
    ";
    $stmt = $pdo->query($sql);
    $results = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Se não retornar nada por cruzamento, busca todos os períodos cadastrados no calendário como fallback
    if (empty($results)) {
        $sqlFallback = "SELECT DISTINCT periodo FROM calendario ORDER BY data DESC LIMIT 12";
        $stmtFallback = $pdo->query($sqlFallback);
        $results = $stmtFallback->fetchAll(PDO::FETCH_COLUMN);
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>