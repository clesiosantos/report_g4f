# Registro de emissões RDA — Petro Tec

1. Execute `sql/001_rda_emissoes.sql` como administrador no banco glpi_tec antes de publicar. O usuário report_tec recebe somente SELECT e INSERT na nova tabela; os demais privilégios permanecem inalterados.
2. Compile e publique o frontend e as APIs da mesma revisão. Acrescente report_data ao bloqueio Apache de arquivos internos (db|config|auth|report_data).
3. A emissão ocorre somente após autorização de acesso ao colaborador e gravação no banco, com data UTC do servidor, código aleatório de 128 bits e SHA-256 dos bytes do snapshot JSON. Reimpressão consulta o mesmo snapshot e não cria outro código. Cada nova emissão gera novo registro.
4. /report/validar oferece consulta pública por código sem expor nomes, IP, localização ou descrição dos chamados. A versão original permanece acessível somente a usuário autenticado com autorização atual para o colaborador.
5. A localização é declarada pelo navegador; a consulta de cidade usa coordenadas arredondadas. Não há assinatura digital, aprovação automática ou hash dos bytes do PDF. O SHA-256 permite detectar divergência no snapshot armazenado, não protege contra um administrador capaz de reescrever snapshot e hash. Faça backup da tabela e defina retenção e acesso administrativo.
