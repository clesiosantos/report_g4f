<?php
// Configurações do Banco de Dados GLPI - AMBIENTE REDUC
$host = 'db.reduc.local'; // Alterar para o host da Reduc
$db   = 'glpi_reduc';      // Alterar para o banco da Reduc
$user = 'glpi_reduc';      // Usuário do banco Reduc
$pass = 'SENHA_REDUC';     // Senha do banco Reduc
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
     echo json_encode(['error' => 'Falha na conexão com o banco REDUC: ' . $e->getMessage()]);
     exit;
}
?>