<?php
/**
 * Configurações do Banco de Dados GLPI com suporte a .env e .env.local
 */

function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) continue;
        $name = trim($parts[0]);
        $value = trim($parts[1]);
        if (!array_key_exists($name, $_SERVER) && !array_key_exists($name, $_ENV)) {
            putenv(sprintf('%s=%s', $name, $value));
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// Carrega primeiro o .env e depois o .env.local (que tem precedência se as variáveis não existirem no ambiente)
loadEnv(__DIR__ . '/../../.env');
loadEnv(__DIR__ . '/../../.env.local');

$host = getenv('DB_HOST') ?: 'db.petro.local';
$db   = getenv('DB_NAME') ?: 'glpi_reduc';
$user = getenv('DB_USER') ?: 'glpi_reduc';
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