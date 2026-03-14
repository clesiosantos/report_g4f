<?php
// Configurações do Banco de Dados GLPI
$host = 'db.petro.local';
$db   = 'glpi_fisco'; 
$user = 'glpi_fisco';     
$pass = 'GLPiDB@2024.'; 
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
     echo json_encode(['error' => 'Falha na conexão com o banco: ' . $e->getMessage()]);
     exit;
}
?>