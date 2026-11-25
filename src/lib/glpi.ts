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
export interface RDARecord { snapshot: RDAEmission; sha256: string; hash_conteudo: string; revision: number; latest_revision: number; reused?: boolean }
export interface RDAProof {
  type?: 'consolidated'; member_count?: number;
  code: string; contract: string; issued_at: string; period: string;
  ticket_count: number; sha256: string; revision: number; latest_revision: number;
}

export interface RDAHistoryItem {
  code: string; issued_at: string; issuer: string; issuer_profile: string;
  ticket_count: number; event_count: number; revision: number; latest_revision: number;
}
export interface RDAEvent {
  evento: 'EMISSAO' | 'REUTILIZACAO' | 'REIMPRESSAO_SOLICITADA';
  occurred_at: string; usuario_nome: string; usuario_login: string; perfil: string;
}
export interface RDAPage<T> { items: T[]; total: number; page: number; page_size: number }

export interface RDAGroup { id: number; name: string; count: number }
export interface RDAGroupMember { id: number; name: string; active: boolean }
export interface RDAGroupItem { user_id: number; name: string; gerencia?: string; code: string; sha256: string; revision: number; ticket_count: number }
export interface RDAGroupSnapshot {
  code: string; contract: string; group_id: number; group_name: string; period: string; scope: string;
  issued_at: string; issuer: { name: string; username: string; profile: string }; items: RDAGroupItem[];
}
export interface RDAGroupRecord { snapshot: RDAGroupSnapshot; sha256: string; revision: number; latest_revision: number; reused?: boolean }
export interface RDAGroupHistory { items: {code: string; issued_at: string; revision: number; latest_revision: number; count: number}[]; has_more: boolean }

const api = `${import.meta.env.BASE_URL}api/`;
async function rdaResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Operação indisponível.');
  return data as T;
}

export const glpiService = {
  async getGroups(): Promise<RDAGroup[]> { return rdaResponse(await fetch(api + 'consolidated.php')); },
  async getGroupMembers(group: number): Promise<RDAGroupMember[]> {
    return rdaResponse(await fetch(api + 'consolidated.php?' + new URLSearchParams({ group_id: String(group) })));
  },
  async issueGroup(group: number, period: string, codes: Record<string,string>): Promise<RDAGroupRecord> {
    return rdaResponse(await fetch(api + 'consolidated.php', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({group_id:group,period,codes}) }));
  },
  async getGroupRDA(code: string): Promise<RDAGroupRecord> {
    return rdaResponse(await fetch(api + 'consolidated.php?' + new URLSearchParams({code})));
  },
  async getGroupHistory(group: number, period: string, page: number): Promise<RDAGroupHistory> {
    return rdaResponse(await fetch(api + 'consolidated.php?' + new URLSearchParams({group_id:String(group),period,page:String(page),history:'1'})));
  },
  async registerGroupReprint(code: string): Promise<void> {
    await rdaResponse(await fetch(api + 'consolidated.php', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reprint',code})}));
  },

  async getRDAHistory(userId: number, period: string, page = 1): Promise<RDAPage<RDAHistoryItem>> {
    return rdaResponse(await fetch(api + 'history.php?' + new URLSearchParams({ user_id: String(userId), period, page: String(page) })));
  },
  async getRDAEvents(code: string, page = 1): Promise<RDAPage<RDAEvent>> {
    return rdaResponse(await fetch(api + 'history.php?' + new URLSearchParams({ code, page: String(page) })));
  },
  async registerReprint(code: string): Promise<void> {
    await rdaResponse(await fetch(api + 'issue.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reprint', code })
    }));
  },

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