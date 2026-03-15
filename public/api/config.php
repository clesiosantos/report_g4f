<?php
// Carrega variáveis do .env se a função não existir (evita redeclaração se db.php já carregou)
if (!function_exists('loadEnv')) {
    function loadEnv($path) {
        if (!file_exists($path)) return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            $parts = explode('=', $line, 2);
            if (count($parts) !== 2) continue;
            list($name, $value) = $parts;
            putenv(trim($name) . '=' . trim($value));
        }
    }
}
loadEnv(__DIR__ . '/../../.env');

// Configurações da API REST do GLPI
define('GLPI_API_URL', getenv('GLPI_API_URL') ?: 'https://fisco.g4f.sharksolucoes.com.br/apirest.php/');
define('GLPI_APP_TOKEN', getenv('GLPI_APP_TOKEN') ?: 'OsSl5jvHymW58g6blPXVGzVEMgrczOmCQ777ZjLE');

/**
 * Função auxiliar para chamadas de API
 */
function callGLPI($endpoint, $method = 'GET', $headers = [], $data = null) {
    $url = GLPI_API_URL . $endpoint;
    $ch = curl_init($url);
    
    $defaultHeaders = [
        'App-Token: ' . GLPI_APP_TOKEN,
        'Content-Type: application/json'
    ];
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array_merge($defaultHeaders, $headers));
    
    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return ['code' => $httpCode, 'data' => json_decode($response, true)];
}
?>