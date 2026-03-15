# Portal RDA - Relatório Diário de Atividade (Versão Final - REDUC)

Interface de alta performance integrada ao banco de dados do GLPI 10 para gestão de produtividade e geração de RDAs com validade jurídica interna.

## 📋 Funcionalidades Principais
- **Dashboard de Produtividade**: Visualização clara de tickets solucionados/fechados por período.
- **Gestão Hierárquica**: Líderes e Prepostos podem visualizar e emitir RDAs de seus subordinados via busca inteligente (Combobox).
- **Validação Eletrônica**: Sistema de carimbo digital que captura IP, Browser, Localização e Timestamp para auditoria.
- **Impressão Otimizada**: Geração de documento PDF (A4) seguindo os padrões visuais da G4F.

## 🛠️ Stack Tecnológica
- **Frontend**: React 19, TypeScript, Tailwind CSS, Shadcn/UI.
- **Backend**: PHP 8.2+ (API REST com PDO).
- **Banco de Dados**: MySQL 8.0 / MariaDB (Estrutura GLPI 10 + Funções Customizadas).
- **Servidor**: Apache (httpd) em Oracle Linux 9.7.

## 🚀 Deploy e Instalação (Ambiente Produção)

### 1. Preparação do Servidor
```bash
# Instalar dependências básicas
dnf update -y
dnf install httpd php php-mysqlnd php-pdo php-json nodejs -y
systemctl enable --now httpd
```

### 2. Configuração do Projeto
O sistema foi desenhado para rodar no diretório `/report` do servidor Web.
```bash
# Clone e Build
git clone -b REDUC https://github.com/clesiosantos/report_g4f.git
cd report_g4f
npm install
npm run build
```

### 3. Variáveis de Ambiente
O sistema utiliza um arquivo `.env` para configurações sensíveis. **Este arquivo é ignorado pelo Git por segurança.** 
Crie um arquivo `.env` na raiz com:
```ini
DB_HOST=localhost
DB_NAME=glpi_reduc
DB_USER=seu_usuario
DB_PASS=sua_senha
GLPI_APP_TOKEN=seu_token_aqui
```

### 4. Permissões de Pasta
Certifique-se que o usuário `apache` tem permissão de leitura na pasta `dist` e execução nos scripts PHP em `public/api/`.

---

## 🔐 Segurança
- Autenticação via `password_verify` nativa do GLPI.
- Proteção contra SQL Injection usando Prepared Statements (PDO).
- Logs de auditoria embutidos no documento gerado.

**Desenvolvido por Dyad AI para G4F Soluções Corporativas.**