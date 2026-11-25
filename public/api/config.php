<?php
// Configurações da API REST do GLPI
define('GLPI_API_URL', getenv('GLPI_API_URL') ?: '');
define('GLPI_APP_TOKEN', getenv('GLPI_APP_TOKEN') ?: '');

/**
 * Função auxiliar para chamadas de API
 */
function callGLPI($endpoint, $method = 'GET', $headers = [], $data = null) {
    if (GLPI_API_URL === '' || GLPI_APP_TOKEN === '') {
        throw new RuntimeException('Integracao REST GLPI nao configurada.');
    }
    $url = rtrim(GLPI_API_URL, '/') . '/' . ltrim($endpoint, '/');
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