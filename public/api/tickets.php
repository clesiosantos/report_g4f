<?php
require_once 'db.php';
header('Content-Type: application/json');

$period = $_GET['period'] ?? '';

if (empty($period)) {
    http_response_code(400);
    echo json_encode(['error' => 'Período é obrigatório']);
    exit;
}

// SQL Otimizado filtrando por período (via join com calendário ou formato de data)
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
        ? as periodo_avaliado,
        CASE WHEN t.status = 5 THEN 'Solucionado' ELSE 'Fechado' END as status,
        (SELECT SUM(actiontime)/3600 FROM glpi_tickettasks WHERE tickets_id = t.id) as tempo_total
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON t.itilcategories_id = it.id
    LEFT JOIN glpi_users u ON t.users_id_recipient = u.id
    INNER JOIN calendario c ON (t.date BETWEEN c.data_inicio AND c.data_fim)
    WHERE c.periodo = ?
    AND t.is_deleted = 0
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $period]);
    $results = $stmt->fetchAll();
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>