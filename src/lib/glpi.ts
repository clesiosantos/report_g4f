"use client";

export interface TicketReport {
  id: number;
  titulo: string;
  descricao: string;
  data_criacao: string;
  data_solucao: string;
  data_referencia: string; // Adicionado para agrupamento preciso
  servico: string;
  posto_trabalho: string;
  gerencia_origem: string;
  lider: string;
  preposto: string;
  periodo_avaliado: string;
  status: string;
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
  profile_id?: number;
}

export interface RDAEmission {
  version: number;
  code: string;
  contract: string;
  issued_at: string;
  period: string;
  dates: string[];
  user: GLPIUser & { preposto_id: number };
  currentUser: GLPIUser;
  tickets: TicketReport[];
  ip: string;
  browser: string;
  location: string;
}
export interface RDARecord { snapshot: RDAEmission; sha256: string }
export interface RDAProof {
  code: string; contract: string; issued_at: string; period: string;
  ticket_count: number; sha256: string;
}

const api = `${import.meta.env.BASE_URL}api/`;
async function rdaResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Operação indisponível.');
  return data as T;
}

export const glpiService = {
  async issueRDA(userId: number, period: string, location: string): Promise<RDARecord> {
    return rdaResponse<RDARecord>(await fetch(api + 'issue.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, period, location })
    }));
  },
  async getRDA(code: string): Promise<RDARecord> {
    return rdaResponse<RDARecord>(await fetch(api + 'issue.php?' + new URLSearchParams({ code })));
  },
  async verifyRDA(code: string): Promise<RDAProof> {
    return rdaResponse<RDAProof>(await fetch(api + 'verify.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }));
  },

  async me(): Promise<GLPIUser | null> {
    const response = await fetch(api + 'session.php');
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('Falha na sessao');
    return response.json();
  },

  async logout(): Promise<void> {
    const response = await fetch(api + 'logout.php', { method: 'POST' });
    if (!response.ok) throw new Error('Falha ao encerrar sessao');
  },

  async login(user: string, pass: string): Promise<GLPIUser> {
    const response = await fetch(api + 'login.php', {
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
    const response = await fetch(api + 'periods.php');
    if (!response.ok) throw new Error('Falha ao carregar períodos');
    return response.json();
  },

  async getTickets(period: string, userId: number): Promise<TicketReport[]> {
    const params = new URLSearchParams({ 
      period, 
      user_id: userId.toString() 
    });
    const response = await fetch(`${api}tickets.php?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error('Falha ao carregar tickets');
    }

    return response.json();
  },

  async getSubordinates(managerId: number): Promise<GLPIUser[]> {
    const params = new URLSearchParams({ 
      manager_id: managerId.toString() 
    });
    const response = await fetch(`${api}subordinates.php?${params.toString()}`);
    if (!response.ok) throw new Error('Falha ao carregar subordinados');
    return response.json();
  }
};