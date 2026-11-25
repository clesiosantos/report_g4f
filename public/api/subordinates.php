<?php
require_once __DIR__ . '/auth.php';
report_method('GET');
require_once __DIR__ . '/db.php';
$actor = report_actor($pdo);
$column = report_manager_column($actor);
if ($column === null) report_error(403, 'Acesso negado.');
$managerId = (int)$actor['id'];
if (isset($_GET['manager_id']) && filter_var($_GET['manager_id'], FILTER_VALIDATE_INT) !== $managerId) {
    report_error(403, 'Acesso negado.');
}

try {
    $sql = "
        SELECT 
            u.id, 
            CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
            u.name as username,
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
        WHERE EXISTS (SELECT 1 FROM glpi_plugin_fields_useragrupamentos a WHERE a.items_id = u.id AND a.itemtype = 'User' AND a.$column = ?)
        AND u.id <> ?
        AND u.is_deleted = 0
        GROUP BY u.id, name, username, gerencia, lider, preposto
        ORDER BY u.firstname ASC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$managerId, $managerId]);
    $results = $stmt->fetchAll();
    foreach ($results as &$row) $row['id'] = (int)$row['id'];
    unset($row);

    echo json_encode($results);
} catch (Exception $e) {
    http_response_code(500);
    error_log('RDA Tec: falha ao consultar subordinados.');
    echo json_encode(['error' => 'Falha ao consultar subordinados.']);
}
?>