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

### 2. Configuração do Backend (PHP)
As APIs estão localizadas em `public/api/`.
Edite o arquivo `public/api/db.php` com as credenciais do seu banco GLPI:

```php
$host = 'db.petro.local';
$db   = 'glpi_fisco'; 
$user = 'glpi_fisco';     
$pass = 'SUA_SENHA_AQUI';
```

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

## 📁 Estrutura de Pastas Padronizada
- `/src`: Código fonte React (Componentes, Hooks, Páginas).
- `/src/pages`: Telas da aplicação (Login, Dashboard, ReportPrint).
- `/src/lib`: Serviços de integração e tipos TypeScript.
- `/public/api`: Endpoints PHP que realizam o consumo do Banco de Dados.
- `/dist`: Pacote compilado e otimizado para o servidor Apache.

---

## 🔍 Consultas SQL Utilizadas

### A. Listagem de Períodos (periods.php)
Busca os períodos disponíveis no calendário vinculados a chamados válidos.
```sql
SELECT c.periodo AS PERIODO 
FROM glpi_tickets t
INNER JOIN calendario c ON (DATE(COALESCE(t.solvedate, t.closedate, t.date)) = c.data)
WHERE t.status IN (2, 3, 4, 5, 6) AND t.is_deleted = 0
GROUP BY c.periodo
ORDER BY MAX(c.data) DESC;
```

### B. Listagem de Atividades/Tickets (tickets.php)
Extrai os chamados de um usuário específico em um determinado período.
```sql
SELECT 
    t.id, t.name as titulo, t.content as descricao,
    t.date as data_criacao, IFNULL(t.solvedate, t.closedate) as data_solucao,
    it.completename as servico,
    fc_users_name(t.users_id_recipient) AS posto_trabalho, 
    CASE t.status 
        WHEN 2 THEN 'Atribuído' WHEN 3 THEN 'Planejado' WHEN 4 THEN 'Pendente'
        WHEN 5 THEN 'Solucionado' WHEN 6 THEN 'Fechado'
    END as status
FROM glpi_tickets t
LEFT JOIN glpi_itilcategories it ON it.id = t.itilcategories_id
INNER JOIN calendario c ON (DATE(COALESCE(t.solvedate, t.closedate, t.date)) = c.data)
WHERE c.periodo = :period AND t.users_id_recipient = :user_id
AND t.status IN (2, 3, 4, 5, 6) AND t.is_deleted = 0
ORDER BY t.date DESC;
```

### C. Autenticação e Perfil (login.php)
Valida as credenciais e extrai metadados do colaborador (Chave, Cargo, Gerência).
```sql
SELECT
    u.id, u.name as login_user, u.password, u.realname, u.firstname, e.email,
    p.chavecolaboradorfield AS chave, pr.name AS profile_name, en.name AS entidade_name
FROM glpi_users u
LEFT JOIN glpi_useremails e ON (e.users_id = u.id AND e.is_default = 1)
LEFT JOIN glpi_plugin_fields_useragrupamentos p ON (p.items_id = u.id)
LEFT JOIN glpi_profiles_users pu ON (pu.users_id = u.id)
LEFT JOIN glpi_profiles pr ON (pr.id = pu.profiles_id)
LEFT JOIN glpi_entities en ON (en.id = pu.entities_id)
WHERE u.name = :user AND u.is_deleted = 0;
```

### D. Hierarquia/Subordinados (subordinates.php)
Identifica colaboradores vinculados a um Líder ou Preposto através das funções customizadas do banco.
```sql
SELECT 
    u.id, CONCAT(IFNULL(u.firstname, ''), ' ', IFNULL(u.realname, '')) as name,
    fc_leader_prepost(u.id, :role_type) AS gestor
FROM glpi_users u
WHERE fc_leader_prepost(u.id, :role_type) = :manager_name
AND u.is_deleted = 0;
```

---

## 🔐 Segurança e Auditoria
O sistema utiliza **Validação Eletrônica** baseada em:
1. Hash de senha nativo do GLPI (BCRYPT).
2. Captura de IP e Metadados do navegador no momento da emissão.
3. Carimbo com Timestamp e Geolocalização (via rede/GPS).
4. SQL Injection protection via PDO Prepared Statements.