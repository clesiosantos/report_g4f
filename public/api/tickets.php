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

/**
 * SQL Revisado para depuração.
 * Se o relatório estiver vazio, pode ser que 'f.date_creation' não esteja batendo com o 'calendario.data'.
 */
$sql = "
    SELECT 
        t.id,
        t.name as titulo,
        t.content as descricao,
        t.date as data_criacao,
        IFNULL(t.solvedate, t.closedate) as data_solucao,
        it.completename as servico,
        fc_users_name(t.users_id_recipient) AS posto_trabalho, 
        
        -- Fiscalização
        fc_get_name_last_approval_status(t.id, ?) AS fiscal_campo,
        fc_get_last_approval_status(t.id, ?) AS status_aprovacao,
        
        IFNULL(fc_groups_ticket(t.id, 2), fc_manager_users(t.users_id_recipient)) AS gerencia_origem,
        fc_leader_prepost(t.users_id_recipient, 2) AS preposto,
        
        c.periodo as periodo_avaliado,
        f.date_creation as data_aprovacao_solicitada,
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
    
    -- Usamos LEFT JOIN aqui para o chamado não sumir se não houver followup
    LEFT JOIN (
        SELECT f1.items_id, f1.date_creation
        FROM glpi_itilfollowups f1
        WHERE f1.id = (
            SELECT MAX(f2.id) 
            FROM glpi_itilfollowups f2 
            WHERE f2.itemtype = 'Ticket' AND f2.items_id = f1.items_id
        )
    ) f ON f.items_id = t.id
    
    -- Vinculamos o calendário. Se f.date_creation for NULL, tentamos pela data do ticket como fallback
    INNER JOIN calendario c ON (DATE(COALESCE(f.date_creation, t.solvedate, t.closedate, t.date)) = c.data)
    
    WHERE c.periodo = ?
    AND t.users_id_recipient = ?
    AND t.status IN (2, 3, 4, 5, 6)
    AND t.is_deleted = 0
    AND (it.completename IS NULL OR it.completename NOT REGEXP 'Justificativa')
    ORDER BY t.date DESC
";

try {
    $stmt = $pdo->prepare($sql);
    // Passamos o período para as funções de fiscal e para o filtro WHERE
    $stmt->execute([$period, $period, $period, $userId]);
    $results = $stmt->fetchAll();
    
    foreach ($results as &$row) {
        $cleanDesc = html_entity_decode($row['descricao'] ?? '');
        $cleanDesc = strip_tags($cleanDesc);
        $row['descricao'] = trim(preg_replace('/\s+/', ' ', $cleanDesc));
    }
    
    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Erro SQL: ' . $e->getMessage(),
        'debug_sql' => $sql,
        'params' => ['period' => $period, 'user_id' => $userId]
    ]);
}
?>