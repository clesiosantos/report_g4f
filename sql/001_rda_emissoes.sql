-- Executar com usuario administrativo no MySQL do Petro Tec.
-- Nenhuma tabela nativa do GLPI e modificada.
USE glpi_tec;

CREATE TABLE IF NOT EXISTS rda_emissoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    emitido_em_utc DATETIME NOT NULL,
    colaborador_id INT UNSIGNED NOT NULL,
    emissor_id INT UNSIGNED NOT NULL,
    competencia VARCHAR(255) NOT NULL,
    snapshot_json LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_rda_codigo (codigo),
    KEY ix_rda_colaborador_competencia (colaborador_id, competencia),
    KEY ix_rda_emissao (emitido_em_utc),
    CONSTRAINT chk_rda_snapshot_json CHECK (JSON_VALID(snapshot_json))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Conta existente: conceder escrita exclusivamente na tabela de emissao.
GRANT SELECT, INSERT ON glpi_tec.rda_emissoes TO 'report_tec'@'192.168.0.239';
