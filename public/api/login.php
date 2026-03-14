<?php
require_once 'db.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$user = $input['user'] ?? '';
$pass = $input['pass'] ?? '';

if (empty($user) || empty($pass)) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuário e senha obrigatórios']);
    exit;
}

try {
    // Busca o usuário e o hash da senha no banco do GLPI
    $stmt = $pdo->prepare("SELECT id, name, password, realname, firstname FROM glpi_users WHERE name = ? AND is_deleted = 0 LIMIT 1");
    $stmt->execute([$user]);
    $userData = $stmt->fetch();

    // Verifica se o usuário existe e se a senha bate com o hash do GLPI
    if ($userData && password_verify($pass, $userData['password'])) {
        
        // Lógica de Perfil (Pode ser expandida consultando a tabela glpi_profiles_users)
        $profile = 'Posto de Trabalho';
        if (str_contains(strtolower($user), 'lider')) $profile = 'Lider';
        if (str_contains(strtolower($user), 'preposto')) $profile = 'Preposto';

        echo json_encode([
            'id' => $userData['id'],
            'name' => ($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? ''),
            'profile' => $profile,
            'session_token' => bin2hex(random_bytes(32))
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha inválidos']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno no servidor']);
}
?>