<?php
require_once 'db.php';
header('Content-Type: application/json');

$managerId = $_GET['manager_id'] ?? '';
$role = $_GET['role'] ?? '';

if (empty($managerId) || empty($role)) {
    http_response_code(400);
    echo json_encode(['error' => 'Parâmetros insuficientes']);
    exit;
}

try {
    $roleType = (stripos($role, 'PREPOSTO') !== false) ? 2 : 1;

    // Busca o nome do gestor primeiro
    $stmtUser = $pdo->prepare("SELECT CONCAT(IFNULL(firstname, ''), ' ', IFNULL(realname, '')) as fullname FROM glpi_users WHERE id = ?");
    $stmtUser->execute([$managerId]);
    $managerName = $stmtUser->fetchColumn();

    if (!$managerName) {
        echo json_encode([]);
        exit;
    }

    // Consulta ajustada para incluir a gerência via fc_manager_users
    $sql = "
        SELECT 
            u.id, 
            CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
            MAX(p.chavecolaboradorfield) AS chave,
            MAX(pr.name) AS profile,
            MAX(e.email) AS email,
            MAX(en.name) AS entidade,
            fc_manager_users(u.id) AS gerencia,
            fc_leader_prepost(u.id, 1) AS lider,
            fc_leader_prepost(u.id, 2) AS preposto
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
        LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
        LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
        LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
        WHERE fc_leader_prepost(u.id, ?) = ?
        AND u.is_deleted = 0
        GROUP BY u.id, name, gerencia, lider, preposto
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