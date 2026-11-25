<?php
/**
 * Conexao com o banco GLPI. Credenciais devem ser fornecidas pelo servidor.
 */
$host = getenv('DB_HOST');
$db = getenv('DB_NAME');
$user = getenv('DB_USER');
$pass = getenv('DB_PASS');

foreach ([$host, $db, $user, $pass] as $value) {
    if ($value === false || $value === '') {
        error_log('Portal RDA: configuracao de banco incompleta.');
        header('Content-Type: application/json', true, 503);
        echo json_encode(['error' => 'Banco de dados do relatorio nao configurado.']);
        exit;
    }
}

$dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    error_log('Portal RDA: falha na conexao com o banco.');
    header('Content-Type: application/json', true, 503);
    echo json_encode(['error' => 'Banco de dados do relatorio indisponivel.']);
    exit;
}
