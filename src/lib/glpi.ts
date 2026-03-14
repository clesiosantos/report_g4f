"use client";

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

export const glpiService = {
  async login(user: string, pass: string): Promise<GLPIUser> {
    const response = await fetch('/api/login.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Falha na autenticação');
    }

    return response.json();
  },

  async getTickets(filters: { start: string, end: string }): Promise<TicketReport[]> {
    const params = new URLSearchParams({
      start: filters.start,
      end: filters.end
    });

    const response = await fetch(`/api/tickets.php?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Falha ao carregar tickets');
    }

    const data = await response.json();
    // Garantir que tempo_total seja número
    return data.map((t: any) => ({
      ...t,
      tempo_total: parseFloat(t.tempo_total) || 0
    }));
  }
};