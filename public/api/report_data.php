<?php
// Consultas compartilhadas entre o painel e a emissao oficial.
const RDA_CONTRACT = '5900.0134711.26.7';

function rda_tickets(PDO $pdo, string $period, int $userId): array {
    $sql = "
        SELECT 
            t.id,
            t.name as titulo,
            t.content as descricao,
            t.date as data_criacao,
            IFNULL(t.solvedate, t.closedate) as data_solucao,
            c.data as data_referencia,
            it.completename as servico,
            fc_users_name(t.users_id_recipient) AS posto_trabalho, 
            c.periodo as periodo_avaliado,
            CASE t.status 
                WHEN 2 THEN 'Atribuído'
                WHEN 3 THEN 'Planejado'
                WHEN 4 THEN 'Pendente'
                WHEN 5 THEN 'Solucionado'
                WHEN 6 THEN 'Fechado'
                ELSE 'Outro'
            END as status
        FROM glpi_tickets t
        LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
        INNER JOIN calendario c ON (DATE(t.date) = c.data)
        WHERE c.periodo = ?
        AND t.users_id_recipient = ?
        AND t.status IN (2, 3, 4, 5, 6)
        AND t.is_deleted = 0
        AND (it.completename IS NULL OR it.completename NOT REGEXP 'Justificativa')
        ORDER BY t.date DESC, t.id DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$period, $userId]);
    $results = $stmt->fetchAll();
    foreach ($results as &$row) {
        // Preserva paragrafos, listas e quebras de linha do GLPI sem renderizar HTML.
        $cleanDesc = html_entity_decode((string)($row['descricao'] ?? ''), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanDesc = preg_replace('~<(script|style)\b[^>]*>.*?</\1\s*>~is', '', $cleanDesc);
        $cleanDesc = preg_replace('~<br\b[^>]*>~i', "\n", $cleanDesc);
        $cleanDesc = preg_replace('~<li\b[^>]*>~i', "\n• ", $cleanDesc);
        $cleanDesc = preg_replace('~</?(?:p|div|section|article|h[1-6]|blockquote|ul|ol|tr|pre)\b[^>]*>|</li\s*>~i', "\n", $cleanDesc);
        $cleanDesc = strip_tags($cleanDesc);
        $cleanDesc = html_entity_decode($cleanDesc, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $cleanDesc = str_replace(["\r\n", "\r", "\u{00A0}"], ["\n", "\n", ' '], $cleanDesc);
        $cleanDesc = preg_replace('/[ \t]+/u', ' ', $cleanDesc);
        $cleanDesc = preg_replace('/ *\n */u', "\n", $cleanDesc);
        $cleanDesc = preg_replace('/\n{3,}/', "\n\n", $cleanDesc);
        $row['descricao'] = trim($cleanDesc);
    }

    unset($row);
    return $results;
}

function rda_person(PDO $pdo, int $id): array {
    // O perfil/entidade do posto de trabalho tem prioridade na identificacao do RDA.
    $stmt = $pdo->prepare("SELECT u.id, u.name AS username,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.name) AS name,
        COALESCE((SELECT e.email FROM glpi_useremails e WHERE e.users_id = u.id ORDER BY e.is_default DESC, e.id LIMIT 1), '') AS email,
        COALESCE(p.chavecolaboradorfield, '') AS chave,
        COALESCE(pr.name, '') AS profile, COALESCE(en.name, '') AS entidade,
        COALESCE(fc_manager_users(u.id), '') AS gerencia,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', l.firstname, l.realname)), ''), l.name, '') AS lider,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', pp.firstname, pp.realname)), ''), pp.name, '') AS preposto,
        COALESCE(pp.id, 0) AS preposto_id
        FROM glpi_users u
        LEFT JOIN glpi_plugin_fields_useragrupamentos p ON p.items_id = u.id AND p.itemtype = 'User'
        LEFT JOIN glpi_users l ON l.id = p.users_id_liderfield AND l.id > 0
        LEFT JOIN glpi_users pp ON pp.id = p.users_id_prepostofield AND pp.id > 0
        LEFT JOIN glpi_profiles_users pu ON pu.users_id = u.id
        LEFT JOIN glpi_profiles pr ON pr.id = pu.profiles_id
        LEFT JOIN glpi_entities en ON en.id = pu.entities_id
        WHERE u.id = ? AND u.is_deleted = 0
        ORDER BY CASE pu.profiles_id WHEN 6 THEN 0 WHEN 11 THEN 1 WHEN 10 THEN 2 WHEN 4 THEN 3 ELSE 4 END,
        pu.is_dynamic DESC, pu.id DESC, p.id DESC LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) report_error(404, 'Colaborador nao encontrado.');
    $row['id'] = (int)$row['id'];
    $row['preposto_id'] = (int)$row['preposto_id'];
    return $row;
}

function rda_code($value): string {
    if (!is_string($value)) report_error(400, 'Codigo invalido.');
    $code = strtoupper(trim($value));
    if (!preg_match('/^[A-F0-9]{32}$/D', $code)) report_error(400, 'Codigo invalido.');
    return $code;
}

function rda_find(PDO $pdo, string $code): array {
    $stmt = $pdo->prepare('SELECT id, codigo, colaborador_id, competencia, snapshot_json, sha256 FROM rda_emissoes WHERE codigo = ?');
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) report_error(404, 'Codigo de autenticidade nao encontrado.');
    if (!hash_equals($row['sha256'], hash('sha256', $row['snapshot_json']))) {
        report_error(409, 'Registro com divergencia de integridade.');
    }
    $snapshot = json_decode($row['snapshot_json'], true, 512, JSON_THROW_ON_ERROR);
    if (($snapshot['code'] ?? '') !== $code || (int)($snapshot['user']['id'] ?? 0) !== (int)$row['colaborador_id']) {
        report_error(409, 'Registro com divergencia de integridade.');
    }
    $contentHash = rda_content_hash($snapshot);
    if (isset($snapshot['hash_conteudo']) && !hash_equals($snapshot['hash_conteudo'], $contentHash)) {
        report_error(409, 'Registro com divergencia de conteudo.');
    }
    $stmt = $pdo->prepare('SELECT COUNT(*) AS latest_revision, COALESCE(SUM(id <= ?), 0) AS revision
        FROM rda_emissoes WHERE colaborador_id = ? AND competencia = ?');
    $stmt->execute([$row['id'], $row['colaborador_id'], $row['competencia']]);
    $versions = $stmt->fetch();
    return ['snapshot' => $snapshot, 'sha256' => $row['sha256'], 'hash_conteudo' => $contentHash,
        'revision' => (int)$versions['revision'], 'latest_revision' => (int)$versions['latest_revision']];
}


// O hash operacional exclui os metadados variaveis da emissao.
function rda_canonical($value) {
    if (!is_array($value)) return $value;
    if (!array_is_list($value)) ksort($value, SORT_STRING);
    foreach ($value as $key => $item) $value[$key] = rda_canonical($item);
    return $value;
}
function rda_content_hash(array $snapshot): string {
    $content = [];
    foreach (['contract', 'period', 'dates', 'user', 'tickets'] as $key) $content[$key] = $snapshot[$key];
    return hash('sha256', json_encode(rda_canonical($content),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
}
function rda_event(PDO $pdo, string $code, string $event, array $actor, array $issuer, string $location = ''): void {
    $stmt = $pdo->prepare('INSERT INTO rda_emissao_eventos
        (codigo, evento, ocorrido_em_utc, usuario_id, usuario_login, usuario_nome, perfil, ip, navegador, localizacao)
        VALUES (?, ?, UTC_TIMESTAMP(6), ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$code, $event, $actor['id'], $issuer['username'], $issuer['name'] ?: $issuer['username'],
        $actor['profile'], $_SERVER['REMOTE_ADDR'] ?? '', mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500), $location]);
}
