<?php
require_once 'db.php';
header('Content-Type: application/json');

$managerId = $_GET['manager_id'] ?? '';
$role = $_GET['role'] ?? ''; // 'Lider' ou 'Preposto'

if (empty($managerId) || empty($role)) {
    http_response_code(400);
    echo json_encode(['error' => 'ID do gestor e papel são obrigatórios']);
    exit;
}

try {
    // Definimos o tipo de busca baseado no papel
    $roleType = ($role === 'Lider') ? 1 : 2;

    $sql = "
        SELECT 
            u.id, 
            CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
            p.chavecolaboradorfield AS chave,
            fc_manager_users(u.id) AS gerencia,
            pr.name AS profile,
            e.email,
            en.name AS entidade
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
        LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
        LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
        LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
        WHERE fc_leader_prepost(u.id, ?) = (SELECT CONCAT(IFNULL(firstname, ''), ' ', IFNULL(realname, '')) FROM glpi_users WHERE id = ?)
        AND u.is_deleted = 0
        GROUP BY u.id
        ORDER BY u.firstname ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$roleType, $managerId]);
    $results = $stmt->fetchAll();

    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>