<?php
// Acesso ao consolidado usa o mesmo escopo individual, nunca o filtro do navegador.
function rda_group_scope(array $actor): string {
    if (report_is_super_admin($actor)) return 'ALL';
    if ((int)($actor['profile_id'] ?? 0) === 11) return '11:' . $actor['id'];
    report_error(403, 'Perfil nao autorizado para consolidacao.');
}

function rda_group_members(PDO $pdo, array $actor, int $group = 0): array {
    rda_group_scope($actor);
    $column = report_manager_column($actor);
    $scope = report_is_super_admin($actor) ? '' : " AND (p.$column = ? OR u.id = ?)";
    $filter = $group > 0 ? ' AND g.id = ?' : '';
    $stmt = $pdo->prepare("SELECT DISTINCT g.id AS group_id, g.name AS group_name, u.id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.name) AS name,
        u.is_active
        FROM glpi_plugin_fields_useragrupamentos p
        JOIN glpi_users u ON u.id = p.items_id
        JOIN glpi_plugin_fields_gerencialotaofielddropdowns g ON g.id = p.plugin_fields_gerencialotaofielddropdowns_id
        WHERE p.itemtype = 'User' AND u.is_deleted = 0 AND u.id > 0 AND g.id > 0
        $scope $filter ORDER BY g.name, name, u.id");
    $params = $scope ? [$actor['id'], $actor['id']] : [];
    if ($group > 0) $params[] = $group;
    $stmt->execute($params);
    return $stmt->fetchAll();
}


// ID zero representa o consolidado geral, sem limitar pela lotacao.
// Inclui o universo das gerencias e os perfis operacionais sem lotacao.
// EXISTS evita duplicar pessoas com mais de um vinculo ou perfil.
function rda_all_members(PDO $pdo, array $actor): array {
    rda_group_scope($actor);
    $scope = report_is_super_admin($actor) ? '' : "AND (u.id = ? OR EXISTS (
        SELECT 1 FROM glpi_plugin_fields_useragrupamentos a
        WHERE a.items_id = u.id AND a.itemtype = 'User' AND a.users_id_prepostofield = ?))";
    $stmt = $pdo->prepare("SELECT u.id,
        COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''), u.name) AS name,
        u.is_active
        FROM glpi_users u
        WHERE u.id > 0 AND u.is_deleted = 0
        AND (EXISTS (SELECT 1 FROM glpi_profiles_users pu
              WHERE pu.users_id = u.id AND pu.profiles_id IN (6,10,11))
             OR EXISTS (SELECT 1 FROM glpi_plugin_fields_useragrupamentos p
              JOIN glpi_plugin_fields_gerencialotaofielddropdowns g
                ON g.id = p.plugin_fields_gerencialotaofielddropdowns_id
              WHERE p.items_id = u.id AND p.itemtype = 'User' AND g.id > 0))
        $scope ORDER BY name, u.id");
    $stmt->execute($scope ? [$actor['id'], $actor['id']] : []);
    return $stmt->fetchAll();
}

function rda_consolidated_members(PDO $pdo, array $actor, int $group): array {
    return $group === 0 ? rda_all_members($pdo, $actor) : rda_group_members($pdo, $actor, $group);
}

function rda_group_find(PDO $pdo, string $code): ?array {
    $stmt = $pdo->prepare('SELECT id, codigo, gerencia_id, competencia, escopo, snapshot_json, sha256, hash_conteudo FROM rda_consolidados WHERE codigo = ?');
    $stmt->execute([$code]);
    $row = $stmt->fetch();
    if (!$row) return null;
    if (!hash_equals($row['sha256'], hash('sha256', $row['snapshot_json']))) report_error(409, 'Consolidado com divergencia de integridade.');
    $s = json_decode($row['snapshot_json'], true, 512, JSON_THROW_ON_ERROR);
    if ($s['code'] !== $code || (int)$s['group_id'] !== (int)$row['gerencia_id'] || $s['period'] !== $row['competencia'] || $s['scope'] !== $row['escopo']) report_error(409, 'Consolidado com divergencia de dados.');
    $stmt = $pdo->prepare('SELECT colaborador_id, codigo_individual, sha256_individual FROM rda_consolidados_itens WHERE consolidado_id = ? ORDER BY ordem');
    $stmt->execute([$row['id']]);
    $items = $stmt->fetchAll();
    if (count($items) !== count($s['items'])) report_error(409, 'Composicao do consolidado divergente.');
    // Valida os vinculos e os hashes dos snapshots individuais, sem expor dados na consulta publica.
    $check = $pdo->prepare('SELECT colaborador_id, competencia, sha256, SHA2(snapshot_json, 256) AS actual FROM rda_emissoes WHERE codigo = ?');
    foreach ($items as $i => $item) {
        $expected = $s['items'][$i];
        if ((int)$item['colaborador_id'] !== (int)$expected['user_id'] || $item['codigo_individual'] !== $expected['code'] || !hash_equals($item['sha256_individual'], $expected['sha256'])) report_error(409, 'Composicao do consolidado divergente.');
        $check->execute([$item['codigo_individual']]);
        $individual = $check->fetch();
        if (!$individual || (int)$individual['colaborador_id'] !== (int)$item['colaborador_id'] || $individual['competencia'] !== $s['period'] || !hash_equals($expected['sha256'], $individual['sha256']) || !hash_equals($individual['sha256'], $individual['actual'])) report_error(409, 'RDA individual com divergencia de integridade.');
    }
    $stmt = $pdo->prepare('SELECT COUNT(*) AS latest_revision, COALESCE(SUM(id <= ?),0) AS revision FROM rda_consolidados WHERE gerencia_id = ? AND competencia = ? AND escopo = ?');
    $stmt->execute([$row['id'], $row['gerencia_id'], $row['competencia'], $row['escopo']]);
    $v = $stmt->fetch();
    return ['snapshot'=>$s, 'sha256'=>$row['sha256'], 'hash_conteudo'=>$row['hash_conteudo'], 'revision'=>(int)$v['revision'], 'latest_revision'=>(int)$v['latest_revision']];
}

function rda_group_authorize(PDO $pdo, array $actor, array $record): void {
    $scope = rda_group_scope($actor);
    if ($scope !== 'ALL' && $scope !== $record['snapshot']['scope']) report_error(403, 'Acesso negado ao consolidado.');
    foreach ($record['snapshot']['items'] as $item) {
        if (!report_can_view($pdo, $actor, (int)$item['user_id'])) report_error(403, 'Acesso negado a um dos colaboradores.');
    }
}
function rda_group_event(PDO $pdo, array $actor, string $code, string $event): void {
    $issuer = rda_person($pdo, (int)$actor['id']);
    $stmt = $pdo->prepare('INSERT INTO rda_consolidado_eventos (codigo, evento, ocorrido_em_utc, usuario_id, usuario_login, usuario_nome, perfil, ip, navegador) VALUES (?, ?, UTC_TIMESTAMP(6), ?, ?, ?, ?, ?, ?)');
    $stmt->execute([$code,$event,$actor['id'],$issuer['username'],$issuer['name'],$actor['profile'],$_SERVER['REMOTE_ADDR'] ?? '',mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '',0,500)]);
}
