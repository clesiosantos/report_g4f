<?php
require_once __DIR__ . '/auth.php';
report_method('GET');
require_once __DIR__ . '/db.php';
echo json_encode(report_actor($pdo));
