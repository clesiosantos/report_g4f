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
    // 1. Busca básica do usuário para validar a senha
    $sqlUser = "SELECT id, name, password, realname, firstname FROM glpi_users WHERE name = ? AND is_deleted = 0 LIMIT 1";
    $stmtUser = $pdo->prepare($sqlUser);
    $stmtUser->execute([$user]);
    $userData = $stmtUser->fetch();

    if (!$userData || !password_verify($pass, $userData['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Usuário ou senha inválidos no GLPI']);
        exit;
    }

    // 2. Busca o e-mail (separado para evitar quebras de JOIN)
    $email = 'N/A';
    $sqlEmail = "SELECT email FROM glpi_useremails WHERE users_id = ? AND is_default = 1 LIMIT 1";
    $stmtEmail = $pdo->prepare($sqlEmail);
    $stmtEmail->execute([$userData['id']]);
    $emailData = $stmtEmail->fetch();
    if ($emailData) $email = $emailData['email'];

    // 3. Tenta buscar campos do plugin (Chave e Gerência)
    $chave = $userData['name']; // Fallback para o nome de sistema
    $gerencia = 'Não informada';
    
    try {
        $sqlPlugin = "SELECT chavecolaboradorfield, gerenciadeorigemfield FROM glpi_plugin_fields_useragrupamentos WHERE items_id = ? LIMIT 1";
        $stmtPlugin = $pdo->prepare($sqlPlugin);
        $stmtPlugin->execute([$userData['id']]);
        $pluginData = $stmtPlugin->fetch();
        if ($pluginData) {
            if (!empty($pluginData['chavecolaboradorfield'])) $chave = $pluginData['chavecolaboradorfield'];
            if (!empty($pluginData['gerenciadeorigemfield'])) $gerencia = $pluginData['gerenciadeorigemfield'];
        }
    } catch (Exception $e) {
        // Se a tabela do plugin não existir, apenas ignoramos e usamos os fallbacks
    }

    // Define perfil baseado no nome (conforme regra anterior)
    $profile = 'Posto de Trabalho';
    $userNameLower = strtolower($user);
    if (str_contains($userNameLower, 'lider')) $profile = 'Lider';
    if (str_contains($userNameLower, 'preposto')) $profile = 'Preposto';

    echo json_encode([
        'id' => (int)$userData['id'],
        'name' => trim(($userData['firstname'] ?? '') . ' ' . ($userData['realname'] ?? '')),
        'chave' => $chave,
        'email' => $email,
        'gerencia' => $gerencia,
        'profile' => $profile,
        'session_token' => bin2hex(random_bytes(32))
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro no banco de dados: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno: ' . $e->getMessage()]);
}
?>