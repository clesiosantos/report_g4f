"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LogOut, Filter, Loader2, Download, CheckCircle2, XCircle, CalendarClock, MessageSquare, UserCheck, Send } from "lucide-react";
import { glpiService, TicketReport, GLPIUser } from '@/lib/glpi';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [tickets, setTickets] = useState<TicketReport[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [subordinates, setSubordinates] = useState<GLPIUser[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<GLPIUser | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isSuperUser = useMemo(() => user?.username?.toLowerCase() === 'glpi', [user]);
  
  const isManager = useMemo(() => {
    if (isSuperUser) return true;
    if (!user?.profile) return false;
    const profile = user.profile.toUpperCase();
    return profile.includes('LIDER') || profile.includes('PREPOSTO') || profile.includes('ADMIN');
  }, [user, isSuperUser]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      try {
        const availablePeriods = await glpiService.getPeriods();
        setPeriods(availablePeriods);
        const defaultPeriod = availablePeriods[0] || "";
        setSelectedPeriod(defaultPeriod);

        if (isManager) {
          const role = isSuperUser ? 'SUPER_ADMIN' : (user.profile?.toUpperCase().includes('PREPOSTO') ? 'Preposto' : 'Lider');
          const subs = await glpiService.getSubordinates(user.id, role);
          setSubordinates(subs);
          setSelectedColaborador(user);
          if (defaultPeriod) loadData(defaultPeriod, user.id);
        } else {
          setSelectedColaborador(user);
          if (defaultPeriod) loadData(defaultPeriod, user.id);
        }
      } catch (err) {
        showError("Erro na inicialização do painel.");
      }
    };
    init();
  }, [user, isManager, isSuperUser]);

  const loadData = async (period: string, userId: number) => {
    if (!period || !userId) return;
    setLoading(true);
    try {
      const data = await glpiService.getTickets(period, userId);
      setTickets(data);
    } catch (err) {
      showError("Erro ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  };

  const groupedData = useMemo(() => {
    const groups: Record<string, TicketReport[]> = {};
    tickets.forEach(ticket => {
      const date = ticket.data_criacao.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(ticket);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [tickets]);

  const handleExportPDF = () => {
    if (!selectedPeriod || !selectedColaborador || !user) return;
    navigate('/print', { state: { tickets, user: selectedColaborador, currentUser: user, period: selectedPeriod } });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo G4F" className="h-8 v-auto" />
          <h1 className="text-xl font-bold text-slate-800">Portal RDA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-blue-600">{user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white shadow-md">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Filter className="w-4 h-4 text-blue-600" /> Filtros de Visualização</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <Label>Período de Competência</Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val, selectedColaborador?.id || user.id); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isManager && (
                <div className="flex-1 w-full">
                  <Label>Colaborador da Equipe</Label>
                  <Select value={selectedColaborador?.id.toString()} onValueChange={(id) => {
                    const col = subordinates.find(s => s.id === parseInt(id)) || (id === user.id.toString() ? user : null);
                    if (col) { setSelectedColaborador(col); loadData(selectedPeriod, col.id); }
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id.toString()}>{user.name} (Meu Perfil)</SelectItem>
                      {subordinates.filter(s => s.id !== user.id).map(sub => <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="bg-blue-700 w-full md:w-auto" onClick={handleExportPDF} disabled={tickets.length === 0}><Download className="mr-2 h-4 w-4" /> Gerar Documento RDA</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[120px]">Data Atividade</TableHead>
                <TableHead>Atividade, Reporte e Fluxo de Aprovação</TableHead>
                <TableHead className="text-center w-[120px]">Tickets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
              ) : groupedData.map(([date, items]) => (
                <TableRow key={date} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-bold py-5 align-top text-slate-700">
                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="py-5">
                    <div className="space-y-8">
                      {items.map((item, idx) => (
                        <div key={item.id} className={idx > 0 ? "pt-6 border-t border-slate-100" : ""}>
                          {/* 1. Cabeçalho do Ticket */}
                          <div className="mb-2">
                            <div className="font-bold text-slate-800 text-sm">{item.titulo}</div>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.descricao}</p>
                          </div>

                          {/* 2. Submissão e Reporte (O que foi escrito) */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="bg-blue-50/30 p-3 rounded-lg border border-blue-100/50">
                              <div className="flex items-center gap-2 mb-2">
                                <Send className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Submissão</span>
                              </div>
                              <div className="space-y-1">
                                <div className="text-[10px] text-slate-600 flex items-center gap-1">
                                  <CalendarClock className="w-3 h-3 text-slate-400" />
                                  <span className="font-semibold">Data:</span> {formatDate(item.data_aprovacao_solicitada)}
                                </div>
                                {item.reporte_enviado && (
                                  <div className="mt-2 pt-2 border-t border-blue-100/50">
                                    <div className="flex items-start gap-1.5">
                                      <MessageSquare className="w-3 h-3 text-blue-400 mt-0.5" />
                                      <p className="text-[11px] text-slate-600 italic leading-relaxed">
                                        "{item.reporte_enviado}"
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 3. Fiscalização e Status */}
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200/50">
                              <div className="flex items-center gap-2 mb-2">
                                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Fiscalização</span>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[10px] text-slate-600">
                                  <span className="font-semibold">Enviado para:</span> {item.fiscal_campo || 'Aguardando Atribuição'}
                                </div>
                                {item.status_aprovacao ? (
                                  <div className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                                    item.status_aprovacao.includes('APROVADO') 
                                    ? 'bg-green-100 text-green-700 border-green-200 shadow-sm' 
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                  }`}>
                                    {item.status_aprovacao.includes('APROVADO') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {item.status_aprovacao}
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                    Pendente
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-blue-700 text-xs align-top pt-5">
                    {items.map(i => `#${i.id}`).join(', ')}
                  </TableCell>
                </TableRow>
              ))}
              {tickets.length === 0 && !loading && (
                <TableRow><TableCell colSpan={3} className="h-48 text-center text-slate-400 font-medium italic">Nenhuma atividade registrada para o período ou colaborador selecionado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;