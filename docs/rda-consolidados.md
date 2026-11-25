# RDA consolidado por gerência — Tec

- Executar sql/003_rda_consolidados.sql após as migrações anteriores, antes de publicar. Concede SELECT no cadastro de gerências e SELECT/INSERT nas três tabelas novas, sem modificar tabelas GLPI.
- Somente ZZ-Super-Admin (4) e Preposto (11) podem emitir, consultar histórico ou reimprimir consolidados. Super-Admin: gerência completa; preposto: somente equipe autorizada (inclui o próprio usuário quando lotado na gerência). A lotação atual é usada; inclui usuários não excluídos, inclusive inativos e sem chamados. Não reconstrói lotação histórica.
- Lider (10), Posto de Trabalho (6), Auditoria (8) e ZZ-Admin (3) não têm acesso ao consolidado autenticado; permissões individuais permanecem inalteradas. A verificação pública por código continua limitada aos metadados.
- O navegador emite os RDAs individuais sequencialmente e finaliza o consolidado somente após verificar todos os colaboradores atuais e as últimas emissões. Se ocorrer falha, as emissões individuais já concluídas continuam válidas e podem ser reutilizadas. Não há limite fixo de colaboradores; limites práticos de memória, sessão, rede e impressão do navegador permanecem.
- Consolidados são versionados por gerência, competência e escopo (ALL ou perfil/ID do gestor). O índice é por ordem de colaborador, sem número de página física. PDF é produzido pelo navegador; cada pessoa começa em nova página. O conteúdo individual é recuperado pelo código e hash já registrados.
- A validação pública aceita códigos individuais e consolidados. Não expõe nomes ou conteúdo. Recuperação integral exige autenticação e autorização de todos os membros; o gestor só consulta seus próprios consolidados e o Super-Admin pode abrir qualquer código autorizado, com histórico do escopo global.
- Reimpressão do consolidado registra solicitação na tabela rda_consolidado_eventos, não comprova impressão física. Incluir as três novas tabelas nos backups.
- Bloquear acesso HTTP direto ao helper consolidated_data.php no Apache junto com report_data.php.

## Consolidado geral (Todas as gerências)
- O ID 0 é reservado ao consolidado geral. Não requer migração adicional: usa as tabelas da migração 003, com histórico e código próprios por competência e escopo.
- Inclui usuários não excluídos vinculados a uma gerência válida ou com perfil operacional Posto de Trabalho (6), Lider (10) ou Preposto (11), inclusive inativos, sem lotação e sem chamados. Contas exclusivamente administrativas sem lotação não integram o universo de colaboradores. Cada ID é incluído uma única vez.
- Preposto limitado aos seus vínculos atuais (e ao próprio RDA quando elegível), mesmo na opção Todas as gerências. Super-Admin consulta o universo completo. Demais perfis não acessam a emissão consolidada. Os relatórios anteriores por gerência não são alterados.
- Índice geral inclui a gerência registrada em cada RDA individual e ordem alfabética; cada colaborador inicia uma página. Não há limite fixo de colaboradores, mas a geração e impressão dependem de sessão, rede e recursos do navegador.
