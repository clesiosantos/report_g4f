<?php
require_once 'db.php';
require_once 'config.php';
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
    // SQL atualizado para buscar dados do plugin_fields (Gerência e Chave Colaborador)
    $sql = "
        SELECT 
            u.id, 
            u.name as chave_sistema, 
            u.password, 
            u.realname, 
            u.firstname,
            (SELECT email FROM glpi_useremails WHERE users_id = u.id AND is_default = 1 LIMIT 1) as email,
            pf.chavecolaboradorfield as chave_colaborador,
            pf.gerenciadeorigemfield as gerencia_origem
        FROM glpi_users u 
        LEFT JOIN glpi_plugin_fields_useragrupamentos pf ON pf.items_id = u.id
        WHERE u.name = ? AND u.is_deleted = 0 
        LIMIT 1
    ";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user]);
    $userData = $stmt->fetch();

    if ($userData && password_verify($pass, $userData['password'])) {
        $profile = 'Posto de Trabalho';
        if (str_contains(strtolower($user), 'lider')) $profile = 'Lider';
        if (str_contains(strtolower($user), 'preposto')) $profile = 'Preposto';

        echo json_encode([
            'id' => $userData['id'],
            'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
            'chave' => $userData['chave_colaborador'] ?? $userData['chave_sistema'],
            'email' => $userData['email'] ?? 'N/A',
            'gerencia' => $userData['gerencia_origem'] ?? 'Não informada',
            'profile' => $profile,
            'session_token' => bin2hex(random_bytes(32))
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha inválidos']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno no servidor: ' . $e->getMessage()]);
}
?>