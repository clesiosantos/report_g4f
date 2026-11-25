USE glpi_tec;
-- A tabela original e seus registros permanecem inalterados.
CREATE TABLE IF NOT EXISTS rda_emissao_eventos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    evento ENUM('EMISSAO','REUTILIZACAO','REIMPRESSAO_SOLICITADA') NOT NULL,
    ocorrido_em_utc DATETIME(6) NOT NULL,
    usuario_id INT UNSIGNED NOT NULL,
    usuario_login VARCHAR(255) NOT NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    perfil VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    navegador VARCHAR(500) NOT NULL,
    localizacao VARCHAR(180) NOT NULL,
    PRIMARY KEY (id),
    KEY ix_rda_evento_codigo (codigo, id),
    KEY ix_rda_evento_data (ocorrido_em_utc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
GRANT SELECT, INSERT ON glpi_tec.rda_emissao_eventos TO 'report_tec'@'192.168.0.239';
