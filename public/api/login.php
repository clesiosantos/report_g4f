<?php
require_once 'db.php';
require_once 'config.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$user = $input['user'] ?? '';
$pass = $input['pass'] ?? '';

if (empty($user) || empty($pass)) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuário e senha são obrigatórios']);
    exit;
}

try {
    // Consulta ajustada para buscar perfil e entidade via glpi_profiles_users (vínculo real do GLPI)
    $sql = "
        SELECT
            u.id, 
            u.name, 
            u.password, 
            u.realname, 
            u.firstname,
            e.email,
            p.chavecolaboradorfield AS chave,
            fc_manager_users(u.id) AS gerencia,
            pr.name AS profile_name,
            en.name AS entidade_name
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
        -- Buscamos o vínculo de perfil e entidade ativo
        LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
        LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
        LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
        WHERE u.name = ?
        AND u.is_deleted = 0 
        ORDER BY pu.is_dynamic DESC, pu.id DESC -- Pega o perfil mais recente/relevante
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user]);
    $userData = $stmt->fetch();

    if (!$userData || !password_verify($pass, $userData['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha inválidos']);
        exit;
    }

    // Função auxiliar para evitar campos vazios no JSON
    $getVal = function($val, $default) {
        return (isset($val) && trim($val) !== '') ? $val : $default;
    };

    echo json_encode([
        'id' => (int)$userData['id'],
        'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
        'chave' => $getVal($userData['chave'], $userData['name']),
        'email' => $getVal($userData['email'], 'N/A'),
        'gerencia' => $getVal($userData['gerencia'], 'Não informada'),
        'profile' => $getVal($userData['profile_name'], 'Posto de Trabalho'),
        'entidade' => $getVal($userData['entidade_name'], 'G4F - SEDE'),
        'session_token' => bin2hex(random_bytes(32))
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao consultar perfil: ' . $e->getMessage()]);
}
?>