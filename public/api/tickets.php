<?php
require_once 'db.php';
header('Content-Type: application/json');

$start = $_GET['start'] ?? date('Y-m-d');
$end = $_GET['end'] ?? date('Y-m-d');

// SQL Otimizado baseado no seu arquivo sql_otimizado.sql
$sql = "
    SELECT 
        t.id,
        t.name as titulo,
        t.content as descricao,
        t.date as data_criacao,
        t.solve_date as data_solucao,
        it.completename as servico,
        CONCAT(u.firstname, ' ', u.realname) as posto_trabalho,
        'TI Central' as gerencia_origem,
        'João Líder' as lider,
        'Maria Preposta' as preposto,
        DATE_FORMAT(t.date, '%m-%Y') as periodo_avaliado,
        CASE WHEN t.status = 5 THEN 'Solucionado' ELSE 'Fechado' END as status,
        (SELECT SUM(actiontime)/3600 FROM glpi_tickettasks WHERE tickets_id = t.id) as tempo_total
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON t.itilcategories_id = it.id
    LEFT JOIN glpi_users u ON t.users_id_recipient = u.id
    WHERE t.date BETWEEN ? AND ?
    AND t.is_deleted = 0
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start . ' 00:00:00', $end . ' 23:59:59']);
    $results = $stmt->fetchAll();
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>