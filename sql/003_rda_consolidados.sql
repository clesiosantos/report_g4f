USE glpi_tec;
CREATE TABLE IF NOT EXISTS rda_consolidados (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
 gerencia_id INT UNSIGNED NOT NULL,
 competencia VARCHAR(255) NOT NULL,
 escopo VARCHAR(64) NOT NULL,
 emitido_em_utc DATETIME NOT NULL,
 emissor_id INT UNSIGNED NOT NULL,
 snapshot_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
 sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 hash_conteudo CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 KEY ix_rda_grupo (gerencia_id,competencia,escopo,id),
 CHECK (JSON_VALID(snapshot_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS rda_consolidados_itens (
 consolidado_id BIGINT UNSIGNED NOT NULL,
 ordem INT UNSIGNED NOT NULL,
 colaborador_id INT UNSIGNED NOT NULL,
 codigo_individual CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 sha256_individual CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 PRIMARY KEY (consolidado_id,ordem),
 UNIQUE KEY uk_rda_grupo_pessoa (consolidado_id,colaborador_id),
 FOREIGN KEY (consolidado_id) REFERENCES rda_consolidados(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS rda_consolidado_eventos (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 codigo CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 evento ENUM('EMISSAO','REUTILIZACAO','REIMPRESSAO_SOLICITADA') NOT NULL,
 ocorrido_em_utc DATETIME(6) NOT NULL,
 usuario_id INT UNSIGNED NOT NULL,
 usuario_login VARCHAR(255) NOT NULL,
 usuario_nome VARCHAR(255) NOT NULL,
 perfil VARCHAR(255) NOT NULL,
 ip VARCHAR(45) NOT NULL,
 navegador VARCHAR(500) NOT NULL,
 KEY ix_rda_grupo_eventos (codigo,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
GRANT SELECT ON glpi_tec.glpi_plugin_fields_gerencialotaofielddropdowns TO 'report_tec'@'192.168.0.239';
GRANT SELECT, INSERT ON glpi_tec.rda_consolidados TO 'report_tec'@'192.168.0.239';
GRANT SELECT, INSERT ON glpi_tec.rda_consolidados_itens TO 'report_tec'@'192.168.0.239';
GRANT SELECT, INSERT ON glpi_tec.rda_consolidado_eventos TO 'report_tec'@'192.168.0.239';
