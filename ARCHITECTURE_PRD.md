# PRD & Documentação de Arquitetura - Portal RDA (Fisco)

## 1. Visão Geral (Contexto Petrobras - Fisco)
O sistema é uma camada de visualização e auditoria para o GLPI 10. Ele extrai atividades (Tickets) de colaboradores e gera um documento PDF (RDA) com validade jurídica interna através de um carimbo de validação eletrônica.

## 2. Requisitos Funcionais (Core)
- **Autenticação**: Integrada com a tabela `glpi_users`. Validação via `password_verify` (BCRYPT).
- **Dashboard de Produtividade**:
  - Filtro por Período (baseado na tabela customizada `calendario`).
  - Visão de Gestor (Líder/Preposto): Permite selecionar subordinados.
- **Relatório RDA (Impressão)**:
  - Agrupamento de tickets por data.
  - Exibição de Título e Conteúdo (limpo de HTML).
  - Carimbo de Validação: Captura automática de IP, Navegador, Data/Hora e Geolocalização.

## 3. Arquitetura Técnica
### Frontend (React SPA)
- **Framework**: React 19 + TypeScript.
- **Roteamento**: `react-router-dom` (Base: `/report`).
- **Estado/Dados**: `TanStack Query` (React Query) para caching de chamadas API.
- **UI**: Shadcn/UI + Tailwind CSS (Estilo corporativo azul/branco).
- **Auth**: `AuthContext` armazena o token de sessão e metadados no `localStorage`.

### Backend (PHP API)
- **Linguagem**: PHP 8.2+.
- **Conexão**: PDO (Prepared Statements) para segurança contra SQL Injection.
- **Endpoints**:
  - `login.php`: Autenticação e extração de perfil (ACL).
  - `periods.php`: Busca meses de competência.
  - `tickets.php`: SQL principal que une `glpi_tickets` com a regra de negócio do calendário.
  - `subordinates.php`: Lógica de hierarquia via funções `fc_leader_prepost`.

## 4. Estrutura de Dados & SQL Crítico
O projeto depende de funções específicas no banco de dados `glpi_fisco`:
1. `fc_leader_prepost(users_id, tipo)`: Retorna o nome do gestor vinculado ao usuário.
2. `fc_manager_users(users_id)`: Retorna a gerência do usuário.
3. `calendario`: Tabela que define os intervalos de 20 a 19 do mês seguinte para fechamento do RDA Tec, identificados pelo mês de início (AAAA - MES).

## 5. Lógica de Validação Eletrônica (Documento)
O sistema utiliza o estado do navegador para garantir a integridade da assinatura:
- **IP**: Obtido pelo servidor PHP no login (`$_SERVER['REMOTE_ADDR']`).
- **Geo**: API `navigator.geolocation` + Reverse Geocoding (Nominatim/OSM) para obter Cidade-UF.
- **Audit**: O documento exibe explicitamente que a validação foi feita via senha individual.

## 6. Guia para Replicação (Projeto Reduc)
Para adaptar para a **Reduc**:
1. Alterar o `db.php` para apontar para o novo host/database.
2. Atualizar as URLs das imagens (Logos) nos componentes `Login`, `Dashboard` e `ReportPrint`.
3. Validar se as funções `fc_leader_prepost` existem no novo banco ou se a lógica de hierarquia será diferente.
4. Alterar o `vite.config.ts` se o `base` path for diferente de `/report/`.

---
**Autor**: Dyad AI Editor
**Data**: 2024
**Versão**: 1.0.0 (Fisco Original)