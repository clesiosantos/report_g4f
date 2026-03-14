/* 
   SQL Otimizado para Relatório RDA 
   Inclui: Texto de abertura (content) e limpeza de joins
*/

SELECT 
    t.id AS "CHAMADO",
    t.name AS "TITULO_CHAMADO",
    t.content AS "DESCRICAO_ABERTURA", -- Campo solicitado
    t.date AS "DATA_CRIACAO",
    t.solvedate AS "DATA_SOLUCAO",
    cat.completename AS "SERVICO_COMPLETO",
    fc_users_name(t.users_id_recipient) AS "POSTO_TRABALHO", 
    IFNULL(fc_groups_ticket(t.id, 2), fc_manager_users(t.users_id_recipient)) AS "GERENCIA_ORIGEM",
    fc_leader_prepost(t.users_id_recipient, 1) AS "LIDER_POSTO",
    fc_leader_prepost(t.users_id_recipient, 2) AS "PREPOSTO_POSTO",
    CASE 
        WHEN DAY(t.date) >= 23 THEN CONCAT(LPAD(MONTH(t.date), 2, '0'), '-', YEAR(t.date))
        WHEN DAY(t.date) < 23 AND MONTH(t.date) != 1 THEN CONCAT(LPAD(MONTH(t.date)-1, 2, '0'), '-', YEAR(t.date))
        WHEN DAY(t.date) < 23 AND MONTH(t.date) = 1 THEN CONCAT('12', '-', YEAR(t.date)-1)
        ELSE "INDETERMINADO"
    END AS "PERIODO_AVALIADO",
    CASE t.status
         WHEN '1' THEN 'Novo'
         WHEN '2' THEN 'Atribuído'
         WHEN '3' THEN 'Planejado'
         WHEN '4' THEN 'Pendente'
         WHEN '5' THEN 'Solucionado' 
         WHEN '6' THEN 'Fechado'
    END AS "STATUS_CHAMADO",
    IFNULL(fc_task_time(t.id)/3600, 0) AS "HORAS_LANCADAS"
FROM glpi_tickets t
LEFT JOIN glpi_itilcategories cat ON cat.id = t.itilcategories_id
LEFT JOIN glpi_users u ON u.id = t.users_id_recipient
WHERE t.status = 6 
AND cat.completename NOT REGEXP 'Justificativa'
-- Filtros de data e usuário devem ser injetados aqui pelo ETL ou API