<?php
/**
 * Configurações do Banco de Dados GLPI com suporte a .env
 */

function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Carrega o .env da raiz (estamos em public/api/, então subimos dois níveis)
loadEnv(__DIR__ . '/../../.env');

$host = getenv('DB_HOST') ?: 'db.petro.local';
$db   = getenv('DB_NAME') ?: 'glpi_fisco';
$user = getenv('DB_USER') ?: 'glpi_fisco';
$pass = getenv('DB_PASS') ?: 'GLPiDB@2024.';
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
     echo json_encode(['error' => 'Falha na conexão: ' . $e->getMessage()]);
     exit;
}
?>