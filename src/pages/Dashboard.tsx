"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, CalendarDays, Loader2, Users, AlertCircle } from "lucide-react";
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

  const isManager = useMemo(() => {
    if (!user?.profile) return false;
    const profile = user.profile.toUpperCase();
    return profile.includes('LIDER') || profile.includes('PREPOSTO');
  }, [user]);

  useEffect(() => {
    if (user) document.title = `Dashboard RDA - ${user.name}`;
  }, [user]);

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
          const profile = user.profile.toUpperCase();
          const role = profile.includes('PREPOSTO') ? 'Preposto' : 'Lider';
          const subs = await glpiService.getSubordinates(user.id, role);
          setSubordinates(subs);
          setSelectedColaborador(user);
          if (defaultPeriod) loadData(defaultPeriod, user.id);
        } else {
          setSelectedColaborador(user);
          if (defaultPeriod) loadData(defaultPeriod, user.id);
        }
      } catch (err) {
        showError("Erro na inicialização.");
      } finally {
        setLoadingPeriods(false);
      }
    };
    init();
  }, [user, isManager]);

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

  /**
   * Lógica idêntica ao ReportPrint para garantir que todos os dias (10 a 09) apareçam
   */
  const fullPeriodDates = useMemo(() => {
    if (!selectedPeriod) return [];
    try {
      const monthsMap: Record<string, number> = {
        'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'MARCO': 2, 'ABRIL': 3, 'MAIO': 4, 'JUNHO': 5,
        'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
      };
      const rawPeriod = selectedPeriod.toUpperCase().trim();
      const parts = rawPeriod.split(/[\s\-/]+/).filter(p => p.length > 0);
      let monthIndex: number | null = null;
      let yearValue: number | null = null;

      parts.forEach(part => {
        if (monthsMap[part] !== undefined) monthIndex = monthsMap[part];
        else if (!isNaN(parseInt(part)) && part.length === 4) yearValue = parseInt(part);
      });

      if (monthIndex === null || yearValue === null) return [];

      const endDate = new Date(yearValue, monthIndex, 9);
      const startDate = new Date(yearValue, monthIndex - 1, 10);
      const dates = [];
      let current = new Date(startDate);

      while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates.reverse(); // Mais recente primeiro no Dashboard
    } catch (e) { return []; }
  }, [selectedPeriod]);

  const ticketsByDate = useMemo(() => {
    const map: Record<string, TicketReport[]> = {};
    tickets.forEach(t => {
      const date = t.data_referencia || t.data_criacao.split(' ')[0];
      if (!map[date]) map[date] = [];
      map[date].push(t);
    });
    return map;
  }, [tickets]);

  const handleExportPDF = () => {
    if (!selectedPeriod || !selectedColaborador || !user) return;
    navigate('/print', { 
      state: { tickets, user: selectedColaborador, currentUser: user, period: selectedPeriod } 
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-slate-800">Portal RDA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-blue-600 font-medium">{user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:text-red-600"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4 text-blue-600" /> Parâmetros de Filtro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold"><CalendarDays className="w-4 h-4" /> Período Operacional</Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val, selectedColaborador?.id || user.id); }}>
                  <SelectTrigger className="w-full bg-slate-50">
                    <SelectValue placeholder={loadingPeriods ? "Carregando..." : "Selecione o período"} />
                  </SelectTrigger>
                  <SelectContent>{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {isManager && (
                <div className="space-y-2 flex-1 w-full">
                  <Label className="flex items-center gap-2 text-slate-600 font-semibold"><Users className="w-4 h-4" /> Equipe / Colaborador</Label>
                  <Select value={selectedColaborador?.id.toString()} onValueChange={(id) => {
                    const colab = subordinates.find(s => s.id === parseInt(id)) || (id === user.id.toString() ? user : null);
                    if (colab) { setSelectedColaborador(colab); loadData(selectedPeriod, colab.id); }
                  }}>
                    <SelectTrigger className="w-full bg-slate-50 border-blue-100">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id.toString()}>{user.name} (Eu)</SelectItem>
                      {subordinates.map(sub => <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 w-full md:w-auto">
                <Button className="flex-1 md:w-40 bg-blue-700 hover:bg-blue-800" onClick={() => loadData(selectedPeriod, selectedColaborador?.id || user.id)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} Atualizar
                </Button>
                <Button variant="outline" className="flex gap-2" onClick={handleExportPDF} disabled={!selectedPeriod || loading}>
                  <Download className="w-4 h-4" /> Gerar RDA
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[140px] font-bold">Data / Dia</TableHead>
                  <TableHead className="font-bold">Atividades (Classificadas no Período)</TableHead>
                  <TableHead className="w-[120px] font-bold text-center">Referência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
                ) : fullPeriodDates.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-400">Selecione um período para visualizar as datas.</TableCell></TableRow>
                ) : fullPeriodDates.map(date => {
                  const dayItems = ticketsByDate[date] || [];
                  const dateObj = new Date(date + 'T12:00:00');
                  
                  return (
                    <TableRow key={date} className="hover:bg-slate-50 align-top">
                      <TableCell className="font-bold text-slate-700 py-4">
                        {dateObj.toLocaleDateString('pt-BR')}<br/>
                        <span className="text-[10px] text-slate-400 font-normal capitalize">
                          {dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        {dayItems.length > 0 ? (
                          <div className="space-y-3">
                            {dayItems.map((item, idx) => (
                              <div key={item.id} className={idx > 0 ? "pt-2 border-t border-slate-100" : ""}>
                                <div className="font-bold text-sm text-slate-800 flex justify-between items-start">
                                  {item.titulo}
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 ml-2 whitespace-nowrap">
                                    {item.status}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 italic mt-1 leading-relaxed">{item.descricao}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-300 italic text-sm py-2">
                            <AlertCircle className="w-3 h-3" /> Sem lançamentos registrados
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {dayItems.map(item => (
                            <span key={item.id} className="text-[10px] font-mono font-bold px-1 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">#{item.id}</span>
                          ))}
                          {dayItems.length === 0 && <span className="text-slate-200">-</span>}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;