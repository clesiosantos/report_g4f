<?php
require_once 'db.php';
require_once 'config.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$user = trim($input['user'] ?? '');
$pass = $input['pass'] ?? '';

if (empty($user) || empty($pass)) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuário e senha são obrigatórios']);
    exit;
}

try {
    $sql = "
        SELECT
            u.id, 
            u.name as login_user, 
            u.password, 
            u.realname, 
            u.firstname,
            e.email,
            p.chavecolaboradorfield AS chave,
            pr.name AS profile_name,
            en.name AS entidade_name
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
        LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
        LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
        LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
        WHERE u.name = ?
        AND u.is_deleted = 0 
        ORDER BY pu.is_dynamic DESC, pu.id DESC
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user]);
    $userData = $stmt->fetch();

    if (!$userData) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário não encontrado ou inativo']);
        exit;
    }

    if (!password_verify($pass, $userData['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Senha incorreta']);
        exit;
    }

    $gerencia = 'Não informada';
    $lider = '';
    $preposto = '';
    
    try {
        $stmtMg = $pdo->prepare("SELECT fc_manager_users(?) as gerencia, fc_leader_prepost(?, 1) as lider, fc_leader_prepost(?, 2) as preposto");
        $stmtMg->execute([$userData['id'], $userData['id'], $userData['id']]);
        $mgData = $stmtMg->fetch();
        if ($mgData) {
            $gerencia = $mgData['gerencia'] ?? $gerencia;
            $lider = $mgData['lider'] ?? '';
            $preposto = $mgData['preposto'] ?? '';
        }
    } catch (Exception $e) {}

    $getVal = function($val, $default) {
        return (isset($val) && trim($val) !== '') ? $val : $default;
    };

    echo json_encode([
        'id' => (int)$userData['id'],
        'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
        'username' => $userData['login_user'],
        'chave' => $getVal($userData['chave'], $userData['login_user']),
        'email' => $getVal($userData['email'], 'N/A'),
        'gerencia' => $getVal($gerencia, 'Não informada'),
        'profile' => $getVal($userData['profile_name'], 'Posto de Trabalho'),
        'entidade' => $getVal($userData['entidade_name'], 'G4F - SEDE'),
        'lider' => $lider,
        'preposto' => $preposto,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        'session_token' => bin2hex(random_bytes(16))
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro SQL: ' . $e->getMessage()]);
}
?>