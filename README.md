# Portal RDA - Relatório Diário de Atividade (Full-Stack)

Interface moderna integrada ao banco de dados do GLPI 10 para gestão de produtividade e geração de RDAs assinados eletronicamente.

## 🛠️ Stack Tecnológica
- **Frontend**: React 19 + TypeScript + Tailwind CSS (Shadcn/UI)
- **Backend**: PHP 8.2+ (API REST via PDO)
- **Banco de Dados**: MySQL 8.0 / MariaDB (Estrutura GLPI 10)
- **Servidor**: Apache (httpd) em Oracle Linux 9.7 (aarch64/x86_64)

---

## 🚀 Guia de Instalação (Oracle Linux 9.7)

### 1. Requisitos do Sistema
Execute os comandos abaixo como `root` ou `sudo`:

```bash
# Atualizar o sistema
dnf update -y

# Instalar Servidor Web Apache
dnf install httpd -y
systemctl enable --now httpd

# Instalar PHP 8.2 e extensões necessárias
dnf install php php-mysqlnd php-pdo php-json php-mbstring php-gd -y

# Instalar Node.js 20+ (para Build do Frontend)
dnf module enable nodejs:20 -y
dnf install nodejs -y
```

### 2. Configuração do Backend (Variáveis de Ambiente)
As APIs estão localizadas em `public/api/`. Para facilitar a troca entre ambientes (Fisco/Reduc), você pode definir variáveis de ambiente no seu arquivo de configuração do Apache (`vhost`) ou no `.htaccess`:

```apache
# Exemplo no .htaccess ou vHost
SetEnv DB_HOST db.petro.local
SetEnv DB_NAME glpi_fisco
SetEnv DB_USER glpi_fisco
SetEnv DB_PASS SUA_SENHA_AQUI
```

Se as variáveis não forem encontradas, o sistema tentará conectar no banco **glpi_fisco** por padrão.

### 3. Build e Deploy do Frontend
No diretório raiz do projeto:

```bash
# Instalar dependências do React
npm install

# Gerar build de produção
npm run build

# Mover para o diretório do Apache (exemplo de caminho padrão)
mkdir -p /var/www/html/report
cp -r dist/* /var/www/html/report/
```

### 4. Configuração do Apache (.htaccess)
Certifique-se que o módulo `mod_rewrite` está ativo no Apache para suportar as rotas do React (Single Page Application).

---

## 🔐 Segurança e Auditoria
O sistema utiliza **Validação Eletrônica** baseada em:
1. Hash de senha nativo do GLPI (BCRYPT).
2. Captura de IP e Metadados do navegador no momento da emissão.
3. Carimbo com Timestamp e Geolocalização (via rede/GPS).
4. SQL Injection protection via PDO Prepared Statements.