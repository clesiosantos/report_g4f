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
  preposto: string;
  periodo_avaliado: string;
  status: string;
  fiscal_campo: string;      // Nome do Fiscal
  status_aprovacao: string;  // Status (Ex: APROVADO)
  data_aprovacao_solicitada?: string; // Nova data para o Dashboard
}

export interface GLPIUser {
  id: number;
  name: string;      
  username: string;  
  chave: string;     
  email: string;
  gerencia: string;
  profile: string;
  entidade: string;
  lider: string;
  preposto: string;
  ip?: string;
  session_token?: string;
}

export const glpiService = {
  async login(user: string, pass: string): Promise<GLPIUser> {
    const response = await fetch('api/login.php', {
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
  async getPeriods(): Promise<string[]> {
    const response = await fetch('api/periods.php');
    if (!response.ok) throw new Error('Falha ao carregar períodos');
    return response.json();
  },
  async getTickets(period: string, userId: number): Promise<TicketReport[]> {
    const params = new URLSearchParams({ period, user_id: userId.toString() });
    const response = await fetch(`api/tickets.php?${params.toString()}`);
    if (!response.ok) throw new Error('Falha ao carregar tickets');
    return response.json();
  },
  async getSubordinates(managerId: number, role: string): Promise<GLPIUser[]> {
    const params = new URLSearchParams({ manager_id: managerId.toString(), role: role });
    const response = await fetch(`api/subordinates.php?${params.toString()}`);
    if (!response.ok) throw new Error('Falha ao carregar subordinados');
    return response.json();
  }
};