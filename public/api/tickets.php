<?php
require_once 'db.php';
header('Content-Type: application/json');

$period = $_GET['period'] ?? '';

if (empty($period)) {
    http_response_code(400);
    echo json_encode(['error' => 'Período é obrigatório']);
    exit;
}

// SQL utilizando as funções e joins fornecidos pelo usuário
$sql = "
    SELECT 
        t.id,
        t.name as titulo,
        t.content as descricao,
        t.date as data_criacao,
        t.solve_date as data_solucao,
        it.completename as servico,
        -- Usando as funções do banco conforme solicitado
        fc_users_name(t.users_id_recipient) AS posto_trabalho, 
        IFNULL(fc_groups_ticket(t.id, 2), fc_manager_users(t.users_id_recipient)) AS gerencia_origem,
        fc_leader_prepost(t.users_id_recipient, 1) AS lider,
        fc_leader_prepost(t.users_id_recipient, 2) AS preposto,
        c.periodo as periodo_avaliado,
        'Fechado' as status,
        IFNULL(fc_task_time(t.id)/3600, 0) AS tempo_total
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
    LEFT JOIN glpi_users u ON u.id = t.users_id_recipient
    INNER JOIN calendario c ON DATE(t.closedate) = c.data
    WHERE c.periodo = ?
    AND t.status = 6
    AND t.is_deleted = 0
    AND it.completename NOT REGEXP 'Justificativa'
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period]);
    $results = $stmt->fetchAll();
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>