"use client";

// Tipagem para os dados do relatório baseados no seu SQL
export interface TicketReport {
  id: number;
  titulo: string;
  descricao: string;
  data_criacao: string;
  data_solucao: string;
  servico: string;
  posto_trabalho: string;
  gerencia_origem: string;
  lider: string;
  preposto: string;
  periodo_avaliado: string;
  status: string;
  tempo_total: number;
}

export type UserProfile = 'Posto de Trabalho' | 'Lider' | 'Preposto';

export interface GLPIUser {
  id: number;
  name: string;
  profile: UserProfile;
  session_token: string;
}

// Simulação da API do GLPI
export const glpiService = {
  async login(user: string, pass: string): Promise<GLPIUser> {
    // Aqui seria a chamada real: fetch(`${GLPI_URL}/initSession`, { headers: { 'Authorization': `Basic ${btoa(user + ':' + pass)}` } })
    console.log("Autenticando no GLPI...", { user });
    
    // Mock de resposta baseado no usuário para teste
    if (user.includes('lider')) return { id: 2, name: 'João Líder', profile: 'Lider', session_token: 'tk_lider' };
    if (user.includes('preposto')) return { id: 3, name: 'Maria Preposta', profile: 'Preposto', session_token: 'tk_preposto' };
    return { id: 1, name: 'Simone de Moura', profile: 'Posto de Trabalho', session_token: 'tk_posto' };
  },

  async getTickets(filters: { start: string, end: string, userId?: number }): Promise<TicketReport[]> {
    // Simulação dos dados retornados pelo seu SQL otimizado
    return [
      {
        id: 12345,
        titulo: "Ajuste de Estação de Trabalho",
        descricao: "O usuário informou que o monitor não liga após queda de energia.",
        data_criacao: "2025-10-26 08:00:00",
        data_solucao: "2025-10-26 10:30:00",
        servico: "Suporte Técnico > Hardware",
        posto_trabalho: "Simone de Moura",
        gerencia_origem: "TI Central",
        lider: "João Líder",
        preposto: "Maria Preposta",
        periodo_avaliado: "10-2025",
        status: "Fechado",
        tempo_total: 2.5
      },
      {
        id: 12346,
        titulo: "Instalação de Software",
        descricao: "Solicitação de instalação do pacote Office na máquina nova.",
        data_criacao: "2025-10-27 09:00:00",
        data_solucao: "2025-10-27 11:00:00",
        servico: "Suporte Técnico > Software",
        posto_trabalho: "Simone de Moura",
        gerencia_origem: "TI Central",
        lider: "João Líder",
        preposto: "Maria Preposta",
        periodo_avaliado: "10-2025",
        status: "Fechado",
        tempo_total: 2.0
      }
    ];
  }
};