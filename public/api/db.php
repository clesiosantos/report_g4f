<?php
/**
 * Configurações do Banco de Dados GLPI
 * 
 * Recomenda-se configurar estas variáveis no ambiente do servidor (Apache/vHost)
 * ou via arquivo .htaccess para maior segurança e portabilidade.
 */

$host = getenv('DB_HOST') ?: 'db.petro.local';
$db   = getenv('DB_NAME') ?: 'glpi_fisco';
$user = getenv('DB_USER') ?: 'glpi_fisco';
$pass = getenv('DB_PASS') ?: 'SUA_SENHA_AQUI'; // Definir senha segura no ambiente
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     header('Content-Type: application/json', true, 500);
     echo json_encode(['error' => 'Falha na conexão com o banco de dados: ' . $e->getMessage()]);
     exit;
}
?>