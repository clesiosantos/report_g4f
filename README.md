# Portal RDA - Relatório Diário de Atividade (Full-Stack)

Interface moderna integrada ao GLPI 10 para gestão de produtividade.

## 🛠️ Stack Tecnológica
- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: PHP 8.2 (API REST)
- **Banco de Dados**: MySQL (GLPI 10)
- **Servidor**: Apache (httpd) em RHEL 9 (aarch64)

## 📁 Estrutura de Pastas
- `/src`: Código fonte do frontend React.
- `/public/api`: Endpoints PHP que consultam o banco de dados.
- `/dist`: Resultado do build pronto para o Apache.

## ⚙️ Configuração de Produção
1. Edite `public/api/db.php` com as credenciais do banco.
2. Execute `npm run build`.
3. Mova o conteúdo de `dist/` para `/var/www/html/rda/dist`.
4. Configure o VirtualHost no Apache conforme `apache-vhost.conf`.

## 🔐 Segurança
- Autenticação baseada no `password_hash` nativo do GLPI.
- Conexão via PDO com Prepared Statements contra SQL Injection.
- Roteamento seguro via Apache `.htaccess`.