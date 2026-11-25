<?php
require_once __DIR__ . '/auth.php';
report_method('POST');
report_session();
$_SESSION = [];
session_destroy();
setcookie(session_name(), '', [
    'expires' => time() - 3600, 'path' => '/report/',
    'secure' => true, 'httponly' => true, 'samesite' => 'Strict'
]);
echo json_encode(['ok' => true]);
