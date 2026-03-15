"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, CalendarDays, Loader2, Users, ShieldCheck } from "lucide-react";
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
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Flag exclusiva para o usuário 'glpi'
  const isSuperUser = useMemo(() => user?.username === 'glpi', [user]);

  // Se for super usuário, ele é automaticamente gestor com acesso total
  const isManager = useMemo(() => {
    if (isSuperUser) return true;
    if (!user?.profile) return false;
    const profile = user.profile.toUpperCase();
    return profile.includes('LIDER') || profile.includes('PREPOSTO');
  }, [user, isSuperUser]);

  useEffect(() => {
    if (user) {
      document.title = `Portal RDA - ${isSuperUser ? 'ADMINISTRADOR' : user.name}`;
    }
  }, [user, isSuperUser]);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoadingPeriods(true);
      try {
        const availablePeriods = await glpiService.getPeriods();
        setPeriods(availablePeriods);
        const defaultPeriod = availablePeriods[0] || "";
        setSelectedPeriod(defaultPeriod);

        if (isManager) {
          // Para o 'glpi', o papel passado é irrelevante no backend agora, mas mantemos a coerência
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
        showError("Erro na inicialização do painel administrativo.");
      } finally {
        setLoadingPeriods(false);
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

  const handleColaboradorChange = (id: string) => {
    // Busca na lista de subordinados ou verifica se é o próprio usuário logado
    const colaborador = subordinates.find(s => s.id === parseInt(id)) || (id === user?.id.toString() ? user : null);
    if (colaborador) {
      setSelectedColaborador(colaborador);
      loadData(selectedPeriod, colaborador.id);
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
    navigate('/print', { 
      state: { 
        tickets, 
        user: selectedColaborador, 
        currentUser: user, 
        period: selectedPeriod 
      } 
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo G4F" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Portal RDA - Fisco</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="flex items-center gap-1 justify-end">
              {isSuperUser && <ShieldCheck className="w-4 h-4 text-amber-500" title="Acesso Super Admin" />}
              <p className="text-sm font-bold text-slate-900">{user.name}</p>
            </div>
            <p className="text-xs text-blue-600 font-medium">{isSuperUser ? 'Acesso Administrativo Total' : user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:text-red-600" title="Sair">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700 font-bold">
              <Filter className="w-4 h-4 text-blue-600" /> 
              Filtros de Atividade 
              {isSuperUser && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2 uppercase tracking-widest font-bold">
                  Modo Super Admin
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                  <CalendarDays className="w-4 h-4 text-blue-500" /> Período Competência
                </Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val, selectedColaborador?.id || user.id); }}>
                  <SelectTrigger className="w-full bg-slate-50 border-slate-200">
                    <SelectValue placeholder={loadingPeriods ? "Carregando meses..." : "Selecione o período"} />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isManager && (
                <div className="space-y-2 flex-1 w-full">
                  <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Users className="w-4 h-4 text-blue-500" /> 
                    {isSuperUser ? "Selecionar Qualquer Colaborador" : "Subordinados Diretos"}
                  </Label>
                  <Select value={selectedColaborador?.id.toString()} onValueChange={handleColaboradorChange}>
                    <SelectTrigger className="w-full bg-slate-50 border-blue-100 ring-offset-blue-50">
                      <SelectValue placeholder="Busque ou selecione um nome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id.toString()}>{user.name} (Meu Perfil)</SelectItem>
                      {subordinates.filter(s => s.id !== user.id).map(sub => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 w-full md:w-auto">
                <Button className="flex-1 md:w-40 bg-blue-700 hover:bg-blue-800 shadow-md" onClick={() => loadData(selectedPeriod, selectedColaborador?.id || user.id)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><FileText className="w-4 h-4 mr-2" /> Visualizar</>}
                </Button>
                <Button variant="outline" className="flex gap-2 border-slate-300 hover:bg-slate-50" onClick={handleExportPDF} disabled={!selectedPeriod || loading || tickets.length === 0}>
                  <Download className="w-4 h-4" /> Gerar RDA
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow>
                  <TableHead className="w-[140px] font-bold text-slate-700">Data Atividade</TableHead>
                  <TableHead className="font-bold text-slate-700">Descrição das Atividades (GLPI)</TableHead>
                  <TableHead className="w-[140px] font-bold text-center text-slate-700">Tickets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-blue-600 opacity-50" /><p className="mt-4 text-slate-500 font-medium">Extraindo dados do GLPI...</p></TableCell></TableRow>
                ) : groupedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <CalendarDays className="w-12 h-12 mb-2 opacity-20" />
                        <p>Nenhuma atividade encontrada para este colaborador no período selecionado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : groupedData.map(([date, items]) => (
                  <TableRow key={date} className="hover:bg-slate-50/80 transition-colors align-top">
                    <TableCell className="font-bold text-slate-700 py-5">
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-5">
                      <div className="space-y-4">
                        {items.map((item, idx) => (
                          <div key={item.id} className={idx > 0 ? "pt-3 border-t border-slate-100" : ""}>
                            <div className="font-bold text-sm text-slate-800 flex justify-between items-start">
                              <span className="leading-tight">{item.titulo}</span>
                              <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold ml-4 whitespace-nowrap ${
                                item.status === 'Solucionado' || item.status === 'Fechado' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-amber-100 text-amber-700'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1.5 leading-relaxed text-justify pr-4">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-5 text-center">
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-[120px] mx-auto">
                        {items.map(item => (
                          <span key={item.id} className="text-[10px] font-mono font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100 shadow-sm">
                            #{item.id}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;