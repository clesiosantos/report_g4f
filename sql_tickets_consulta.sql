SELECT 
    t.id,
    t.name as titulo,
    t.content as descricao,
    t.date as data_criacao,
    IFNULL(t.solvedate, t.closedate) as data_solucao,
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
INNER JOIN calendario c ON (DATE(COALESCE(t.solvedate, t.closedate, t.date)) = c.data)
WHERE c.periodo = ?
AND t.users_id_recipient = ?
AND t.status IN (2, 3, 4, 5, 6)
AND t.is_deleted = 0
AND (it.completename IS NULL OR it.completename NOT REGEXP 'Justificativa')
ORDER BY t.date DESC