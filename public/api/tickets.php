<?php
require_once 'db.php';
header('Content-Type: application/json');

$period = $_GET['period'] ?? '';
$userId = $_GET['user_id'] ?? '';

if (empty($period) || empty($userId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Período e ID do usuário são obrigatórios']);
    exit;
}

// SQL atualizado com strip_tags para limpar a descrição e filtro por usuário
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
        'Fechado' as status
    FROM glpi_tickets t
    LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
    INNER JOIN calendario c ON (DATE(t.closedate) = c.data OR DATE(t.solvedate) = c.data)
    WHERE c.periodo = ?
    AND t.users_id_recipient = ?
    AND t.status = 6
    AND t.is_deleted = 0
    AND it.completename NOT REGEXP 'Justificativa'
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $userId]);
    $results = $stmt->fetchAll();
    
    // Limpando HTML da descrição antes de enviar
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