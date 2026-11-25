# RDA consolidado por gerência — Tec

- Executar sql/003_rda_consolidados.sql após as migrações anteriores, antes de publicar. Concede SELECT no cadastro de gerências e SELECT/INSERT nas três tabelas novas, sem modificar tabelas GLPI.
- Super-Admin: gerência completa; líder/preposto: somente equipe autorizada (inclui o próprio usuário quando lotado na gerência). A lotação atual é usada; inclui usuários não excluídos, inclusive inativos e sem chamados. Não reconstrói lotação histórica.
- O navegador emite os RDAs individuais sequencialmente e finaliza o consolidado somente após verificar todos os colaboradores atuais e as últimas emissões. Se ocorrer falha, as emissões individuais já concluídas continuam válidas e podem ser reutilizadas. Não há limite fixo de colaboradores; limites práticos de memória, sessão, rede e impressão do navegador permanecem.
- Consolidados são versionados por gerência, competência e escopo (ALL ou perfil/ID do gestor). O índice é por ordem de colaborador, sem número de página física. PDF é produzido pelo navegador; cada pessoa começa em nova página. O conteúdo individual é recuperado pelo código e hash já registrados.
- A validação pública aceita códigos individuais e consolidados. Não expõe nomes ou conteúdo. Recuperação integral exige autenticação e autorização de todos os membros; o gestor só consulta seus próprios consolidados e o Super-Admin pode abrir qualquer código autorizado, com histórico do escopo global.
- Reimpressão do consolidado registra solicitação na tabela rda_consolidado_eventos, não comprova impressão física. Incluir as três novas tabelas nos backups.
- Bloquear acesso HTTP direto ao helper consolidated_data.php no Apache junto com report_data.php.
