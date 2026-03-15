# PRD & Documentação de Arquitetura - Portal RDA

## 1. Objetivo do Projeto
Automatizar e digitalizar o processo de emissão do Relatório Diário de Atividade (RDA) da unidade REDUC, integrando diretamente com o banco de dados do GLPI 10 e garantindo a rastreabilidade das ações através de validação eletrônica.

## 2. Requisitos Funcionais

### 2.1 Autenticação e Autorização (ACL)
- O login é validado contra a tabela `glpi_users`.
- **Perfis**:
  - **Colaborador**: Vê apenas suas próprias atividades.
  - **Líder/Preposto**: Pode visualizar e exportar RDAs de subordinados vinculados através da função `fc_leader_prepost`.
  - **Super Usuário (glpi)**: Acesso total a todos os colaboradores do banco.

### 2.2 Dashboard
- Filtro por competência baseado na tabela `calendario` (ciclos do dia 10 ao 09).
- Listagem de tickets agrupados por data.
- Exibição de metadados de aprovação (Fiscal de Campo, Reporte do Colaborador, Status de Aprovação).

### 2.3 Emissão de RDA (Documento)
- Geração de layout de impressão A4 via CSS `@media print`.
- **Carimbo de Validação**: 
  - Captura de IP (via PHP).
  - Geolocalização Reversa (via OpenStreetMap API).
  - Assinatura estilizada (Dancing Script).

## 3. Arquitetura Técnica

### 3.1 Backend (PHP API)
- **Estrutura**: Scripts modulares em `public/api/`.
- **db.php**: Gerencia a conexão PDO e o carregamento de variáveis de ambiente do `.env`.
- **tickets.php**: SQL complexo que realiza JOINs entre `glpi_tickets`, `glpi_itilfollowups` e `calendario` para consolidar o relatório.
- **subordinates.php**: Implementa a lógica de hierarquia dinâmica.

### 3.2 Frontend (React SPA)
- **Roteamento**: `react-router-dom` com suporte a `basename="/report"`.
- **Estado Global**: `AuthContext` para persistência de sessão e `TanStack Query` para cache de dados.
- **Componentes UI**: Utilização de Shadcn/UI customizado com as cores da G4F (Azul Corporativo).

## 4. Regras de Negócio e SQL
O sistema depende das seguintes funções SQL implementadas no banco de dados GLPI:
1. `fc_leader_prepost(users_id, tipo)`: Onde tipo 1=Líder e 2=Preposto.
2. `fc_manager_users(users_id)`: Retorna a gerência/centro de custo.
3. `fc_get_last_approval_status(ticket_id, periodo)`: Recupera o status da aprovação fiscal.

## 5. Manutenção e Suporte
- **Logs**: Erros de banco são reportados com HTTP 500 em formato JSON.
- **Variáveis**: O nome da unidade e URLs da API podem ser alterados via arquivo `.env`.

---
**Status do Projeto**: Concluído / Em Produção
**Versão**: 1.2.0 (Build Final REDUC)