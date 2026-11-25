<?php
require_once __DIR__ . '/auth.php';
report_method('POST');
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    report_error(415, 'Envie JSON.');
}
require_once __DIR__ . '/db.php';
report_session();

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$user = is_string($input['user'] ?? null) ? trim($input['user']) : '';
$pass = is_string($input['pass'] ?? null) ? $input['pass'] : '';

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
            pu.profiles_id AS profile_id,
            en.name AS entidade_name
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id AND p.itemtype = 'User')
        LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
        LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
        LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
        WHERE u.name = ?
        AND u.is_deleted = 0 AND u.is_active = 1 AND pu.profiles_id IN (6, 8, 10, 11, 3, 4)
        ORDER BY CASE pu.profiles_id WHEN 11 THEN 1 WHEN 10 THEN 2 WHEN 6 THEN 3 ELSE 4 END, pu.is_dynamic DESC, pu.id DESC
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user]);
    $userData = $stmt->fetch();

    if (!$userData) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciais invalidas']);
        exit;
    }

    if (!password_verify($pass, (string)$userData['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Credenciais invalidas']);
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

    $actor = [
        'id' => (int)$userData['id'],
        'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
        'username' => $userData['login_user'],
        'chave' => $getVal($userData['chave'], $userData['login_user']),
        'email' => $getVal($userData['email'], 'N/A'),
        'gerencia' => $getVal($gerencia, 'Não informada'),
        'profile' => $getVal($userData['profile_name'], 'Posto de Trabalho'),
        'profile_id' => (int)$userData['profile_id'],
        'entidade' => $getVal($userData['entidade_name'], 'G4F - SEDE'),
        'lider' => $lider,
        'preposto' => $preposto,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
            ];
    session_regenerate_id(true);
    $_SESSION = ['actor' => $actor, 'created_at' => time(), 'last_seen' => time()];
    session_write_close();
    echo json_encode($actor);

} catch (Exception $e) {
    http_response_code(500);
    error_log('RDA Tec: falha no login.');
    echo json_encode(['error' => 'Falha interna na autenticacao.']);
}
?>