# Portal RDA - Relatório Diário de Atividade

Este projeto é uma interface moderna e responsiva para a emissão de Relatórios Diários de Atividade (RDA), integrada ao sistema de chamados GLPI 10.

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19 com TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: Shadcn/UI (Radix UI)
- **Ícones**: Lucide React
- **Roteamento**: React Router DOM
- **Build Tool**: Vite

## 📋 Funcionalidades

1.  **Autenticação GLPI**: Interface de login preparada para integração com a API do GLPI (`initSession`).
2.  **Gestão de Perfis**:
    -   **Posto de Trabalho**: Visualiza e emite apenas o seu próprio relatório.
    -   **Líder**: Visualiza relatórios de todos os Postos de Trabalho vinculados e o seu próprio.
    -   **Preposto**: Acesso total a todos os relatórios de Postos e Líderes.
3.  **Filtros Avançados**: Seleção de período (Data Início/Fim) para filtragem dinâmica dos chamados.
4.  **Dashboard de Indicadores**: Cards com resumo de total de chamados, horas lançadas e período avaliado.
5.  **Exportação**: Preparado para exportação de relatórios em formato PDF.

## 🏗️ Arquitetura do Projeto

-   `src/lib/glpi.ts`: Camada de serviço que centraliza as chamadas de API e a lógica de negócios.
-   `src/pages/Login.tsx`: Gerenciamento de estado de autenticação e persistência local.
-   `src/pages/Dashboard.tsx`: Interface principal com tabela de dados e filtros.
-   `sql_otimizado.sql`: Script SQL para ser utilizado no processo de ETL ou diretamente no banco de dados para alimentar a aplicação.

## 🗄️ Lógica do Banco de Dados (ETL)

O relatório baseia-se em uma consulta otimizada que consolida dados das tabelas:
-   `glpi_tickets`: Dados principais do chamado.
-   `glpi_itilcategories`: Categorização do serviço.
-   `glpi_users`: Informações dos técnicos e usuários.
-   `glpi_task_time`: Cálculo de horas trabalhadas.

**Campo Adicionado**: Foi incluído o campo `content` da tabela `glpi_tickets` para exibir a descrição original de abertura do ticket no relatório.

## 🌐 Implantação (Apache)

Para rodar em produção no endereço `https://fisco.g4f.sharksolucoes.com.br`:

1.  **Build**: Execute `npm run build` para gerar a pasta `dist`.
2.  **Configuração Apache**:
    -   Utilize o arquivo `.htaccess` fornecido na pasta `public` para gerenciar o roteamento SPA.
    -   Configure o `VirtualHost` conforme o modelo `apache-vhost.conf`.
3.  **Módulos**: Certifique-se de que o `mod_rewrite` está ativo no servidor.

## 🧪 Testes de Perfil (Mock)

Para testar os diferentes níveis de acesso na interface atual:
-   **Posto**: Qualquer usuário (ex: `simone.moura`)
-   **Líder**: Usuário contendo "lider" (ex: `joao.lider`)
-   **Preposto**: Usuário contendo "preposto" (ex: `maria.preposto`)

---
*Desenvolvido para otimização de processos de suporte técnico e gestão de produtividade.*