<?php
// Sessao independente do GLPI, restrita ao contexto do relatorio.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function report_error(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['error' => $message]);
    exit;
}

function report_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('RDA_TEC_SESSION');
    session_set_cookie_params([
        'lifetime' => 0, 'path' => '/report/', 'secure' => true,
        'httponly' => true, 'samesite' => 'Strict'
    ]);
    if (!session_start()) report_error(503, 'Sessao indisponivel.');
}

function report_method(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        report_error(405, 'Metodo nao permitido.');
    }
}

function report_actor(PDO $pdo): array {
    report_session();
    $actor = $_SESSION['actor'] ?? null;
    $now = time();
    if (!$actor || $now - ($_SESSION['last_seen'] ?? 0) > 1800 ||
        $now - ($_SESSION['created_at'] ?? 0) > 28800) {
        $_SESSION = [];
        session_destroy();
        report_error(401, 'Sessao expirada ou nao autenticada.');
    }
    $stmt = $pdo->prepare("SELECT 1 FROM glpi_users u
        JOIN glpi_profiles_users pu ON pu.users_id = u.id
        WHERE u.id = ? AND u.is_active = 1 AND u.is_deleted = 0
        AND pu.profiles_id = ? LIMIT 1");
    $stmt->execute([$actor['id'], $actor['profile_id']]);
    if (!$stmt->fetchColumn()) {
        $_SESSION = [];
        session_destroy();
        report_error(401, 'Sessao nao autorizada.');
    }
    $_SESSION['last_seen'] = $now;
    session_write_close();
    return $actor;
}

function report_manager_column(array $actor): ?string {
    return match ((int)$actor['profile_id']) {
        10 => 'users_id_liderfield',
        11 => 'users_id_prepostofield',
        default => null
    };
}

function report_can_view(PDO $pdo, array $actor, int $target): bool {
    if ((int)$actor['id'] === $target) return true;
    $column = report_manager_column($actor);
    if ($column === null) return false;
    // Coluna escolhida apenas da lista fixa acima; IDs parametrizados.
    $stmt = $pdo->prepare("SELECT 1 FROM glpi_plugin_fields_useragrupamentos p
        JOIN glpi_users u ON u.id = p.items_id
        WHERE p.items_id = ? AND p.itemtype = 'User'
        AND p.$column = ? AND u.is_deleted = 0 LIMIT 1");
    $stmt->execute([$target, $actor['id']]);
    return (bool)$stmt->fetchColumn();
}
