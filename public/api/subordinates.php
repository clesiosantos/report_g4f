<?php
require_once 'db.php';
header('Content-Type: application/json');

$managerId = $_GET['manager_id'] ?? '';
$role = strtoupper($_GET['role'] ?? '');

if (empty($managerId)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID do gestor é obrigatório']);
    exit;
}

try {
    // Busca o login do usuário para checar se é o super usuário 'glpi'
    $stmtCheck = $pdo->prepare("SELECT name FROM glpi_users WHERE id = ?");
    $stmtCheck->execute([$managerId]);
    $requesterUsername = strtolower($stmtCheck->fetchColumn() ?: '');

    // Se for o usuário 'glpi' OU se o papel enviado for SUPER_ADMIN, retorna TODOS os usuários ativos
    if ($requesterUsername === 'glpi' || $role === 'SUPER_ADMIN') {
        $sql = "
            SELECT 
                u.id, 
                CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
                u.name as username,
                (SELECT chavecolaboradorfield FROM glpi_plugin_fields_useragrupamentos WHERE items_id = u.id LIMIT 1) AS chave,
                (SELECT pr.name FROM glpi_profiles pr INNER JOIN glpi_profiles_users pu ON pu.profiles_id = pr.id WHERE pu.users_id = u.id LIMIT 1) AS profile,
                (SELECT email FROM glpi_useremails WHERE users_id = u.id AND is_default = 1 LIMIT 1) AS email,
                (SELECT en.name FROM glpi_entities en INNER JOIN glpi_profiles_users pu ON pu.entities_id = en.id WHERE pu.users_id = u.id LIMIT 1) AS entidade,
                fc_manager_users(u.id) AS gerencia,
                fc_leader_prepost(u.id, 1) AS lider,
                fc_leader_prepost(u.id, 2) AS preposto
            FROM glpi_users u
            WHERE u.is_deleted = 0
            ORDER BY u.firstname ASC, u.realname ASC
        ";
        $stmt = $pdo->query($sql);
        $results = $stmt->fetchAll();
        echo json_encode($results);
        exit;
    }

    // Lógica normal para Líderes e Prepostos
    $roleType = (stripos($role, 'PREPOSTO') !== false) ? 2 : 1;
    
    $stmtUser = $pdo->prepare("SELECT CONCAT(IFNULL(firstname, ''), ' ', IFNULL(realname, '')) as fullname FROM glpi_users WHERE id = ?");
    $stmtUser->execute([$managerId]);
    $managerName = $stmtUser->fetchColumn();

    if (!$managerName) {
        echo json_encode([]);
        exit;
    }

    $sql = "
        SELECT 
            u.id, 
            CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
            u.name as username,
            (SELECT chavecolaboradorfield FROM glpi_plugin_fields_useragrupamentos WHERE items_id = u.id LIMIT 1) AS chave,
            (SELECT pr.name FROM glpi_profiles pr INNER JOIN glpi_profiles_users pu ON pu.profiles_id = pr.id WHERE pu.users_id = u.id LIMIT 1) AS profile,
            (SELECT email FROM glpi_useremails WHERE users_id = u.id AND is_default = 1 LIMIT 1) AS email,
            (SELECT en.name FROM glpi_entities en INNER JOIN glpi_profiles_users pu ON pu.entities_id = en.id WHERE pu.users_id = u.id LIMIT 1) AS entidade,
            fc_manager_users(u.id) AS gerencia,
            fc_leader_prepost(u.id, 1) AS lider,
            fc_leader_prepost(u.id, 2) AS preposto
        FROM glpi_users u
        WHERE fc_leader_prepost(u.id, ?) = ?
        AND u.is_deleted = 0
        ORDER BY u.firstname ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$roleType, $managerName]);
    $results = $stmt->fetchAll();

    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao buscar subordinados: ' . $e->getMessage()]);
}
?>