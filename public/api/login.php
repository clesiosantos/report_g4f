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
    // Consulta consolidada para buscar dados básicos, e-mail e campos do plugin
    $sql = "
        SELECT 
            u.id, 
            u.name, 
            u.password, 
            u.realname, 
            u.firstname,
            e.email,
            p.chavecolaboradorfield AS chave,
            p.gerenciadeorigemfield AS gerencia
        FROM glpi_users u
        LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
        WHERE u.name = ? 
        AND u.is_deleted = 0 
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

    // Lógica de Perfil/Cargo (baseada no nome de usuário conforme solicitado anteriormente)
    $profile = 'Posto de Trabalho';
    $userNameLower = strtolower($user);
    if (str_contains($userNameLower, 'lider')) $profile = 'Líder';
    if (str_contains($userNameLower, 'preposto')) $profile = 'Preposto';

    echo json_encode([
        'id' => (int)$userData['id'],
        'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
        'chave' => $userData['chave'] ?? $userData['name'],
        'email' => $userData['email'] ?? 'N/A',
        'gerencia' => $userData['gerencia'] ?? 'Não informada',
        'profile' => $profile,
        'session_token' => bin2hex(random_bytes(32))
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao consultar perfil: ' . $e->getMessage()]);
}
?>