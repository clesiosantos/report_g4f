<?php
// Configurações do Banco de Dados GLPI
$host = 'localhost';
$db   = 'glpi_database'; // Altere para o nome do seu banco
$user = 'glpi_user';     // Altere para seu usuário
$pass = 'glpi_password'; // Altere para sua senha
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
     echo json_encode(['error' => 'Falha na conexão com o banco']);
     exit;
}
?>