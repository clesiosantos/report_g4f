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

// Aqui você pode implementar a lógica de conferir a senha (hash do GLPI)
// Ou usar a API do GLPI via cURL para validar a sessão.
// Por enquanto, vamos simular a validação baseada no banco:

$stmt = $pdo->prepare("SELECT id, name, realname, firstname FROM glpi_users WHERE name = ? LIMIT 1");
$stmt->execute([$user]);
$userData = $stmt->fetch();

if ($userData) {
    // Mock de perfil baseado no nome para o exemplo
    $profile = 'Posto de Trabalho';
    if (strpos($user, 'lider') !== false) $profile = 'Lider';
    if (strpos($user, 'preposto') !== false) $profile = 'Preposto';

    echo json_encode([
        'id' => $userData['id'],
        'name' => $userData['firstname'] . ' ' . $userData['realname'],
        'profile' => $profile,
        'session_token' => bin2hex(random_bytes(16))
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Usuário não encontrado']);
}
?>