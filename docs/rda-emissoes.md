# Registro de emissões RDA — Petro Tec

1. Execute `sql/001_rda_emissoes.sql` como administrador no banco glpi_tec antes de publicar. O usuário report_tec recebe somente SELECT e INSERT na nova tabela; os demais privilégios permanecem inalterados.
2. Compile e publique o frontend e as APIs da mesma revisão. Acrescente report_data ao bloqueio Apache de arquivos internos (db|config|auth|report_data).
3. A emissão ocorre somente após autorização de acesso ao colaborador e gravação no banco, com data UTC do servidor, código aleatório de 128 bits e SHA-256 dos bytes do snapshot JSON. Reimpressão consulta o mesmo snapshot e não cria outro código. Desde a migração 002, conteúdo igual ao da última versão reutiliza o código e registra um evento. Conteúdo alterado gera nova versão. A sequência A-B-A produz três versões.
4. /report/validar oferece consulta pública por código sem expor nomes, IP, localização ou descrição dos chamados. A versão original permanece acessível somente a usuário autenticado com autorização atual para o colaborador.
5. A localização é declarada pelo navegador; a consulta de cidade usa coordenadas arredondadas. Não há assinatura digital, aprovação automática ou hash dos bytes do PDF. O SHA-256 permite detectar divergência no snapshot armazenado, não protege contra um administrador capaz de reescrever snapshot e hash. Faça backup da tabela e defina retenção e acesso administrativo.

## Versionamento e auditoria

- Executar `sql/002_rda_versionamento.sql` antes de publicar. Não altera snapshots, hashes ou códigos antigos; a nova tabela recebe SELECT/INSERT apenas.
- O hash de conteúdo inclui contrato, competência, calendário, identificação do colaborador/preposto e todos os campos das atividades consultadas. Exclui emissor, hora de emissão, código, IP, navegador e localização. O SHA-256 do registro completo continua independente. Para registros antigos, o hash de conteúdo é calculado na leitura; para novos, fica no snapshot em `hash_conteudo`.
- Numeração por colaborador e competência, em ordem de ID. Emissões anteriores à migração são preservadas individualmente. GET_LOCK serializa as emissões do mesmo par no servidor MySQL; inserções da versão e do evento ocorrem na mesma transação. Não executar emissores de revisões diferentes simultaneamente durante a atualização.
- O Dashboard oferece histórico paginado de versões e eventos. A página pública mostra se é a última versão emitida, não se o GLPI mudou desde então. O carimbo original não muda quando outro usuário reutiliza o relatório; o novo usuário fica no evento de auditoria.
- Reimpressão pelo botão do portal registra uma solicitação, não a comprovação da impressão física ou do salvamento do PDF. Ctrl+P e cópias externas não são auditáveis pelo portal. Eventos antigos não são inventados.
- Incluir rda_emissao_eventos nos backups. O versionamento não substitui assinatura digital ou armazenamento dos bytes do PDF.
