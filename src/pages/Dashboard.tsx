"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, User, CalendarDays, Loader2, CalendarRange } from "lucide-react";
import { glpiService, TicketReport, GLPIUser } from '@/lib/glpi';
import { showError } from '@/utils/toast';

const Dashboard = () => {
  const [tickets, setTickets] = useState<TicketReport[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [user, setUser] = useState<GLPIUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('glpi_user');
    if (!storedUser) {
      navigate('/', { replace: true });
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    const init = async () => {
      setLoadingPeriods(true);
      try {
        const availablePeriods = await glpiService.getPeriods();
        setPeriods(availablePeriods);
        if (availablePeriods.length > 0) {
          const defaultPeriod = availablePeriods[0];
          setSelectedPeriod(defaultPeriod);
          loadData(defaultPeriod, parsedUser.id);
        }
      } catch (err) {
        showError("Erro ao carregar períodos.");
      } finally {
        setLoadingPeriods(false);
      }
    };
    
    init();
  }, [navigate]);

  const loadData = async (period: string, userId?: number) => {
    const targetUserId = userId || user?.id;
    if (!period || !targetUserId) return;
    
    setLoading(true);
    try {
      const data = await glpiService.getTickets(period, targetUserId);
      setTickets(data);
    } catch (err) {
      showError("Erro ao carregar atividades.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica para gerar todas as datas do período (10 do mês anterior a 09 do mês atual)
  const fullPeriodDates = useMemo(() => {
    if (!selectedPeriod) return [];
    
    // Assume formato "MES/ANO" ou "MES ANO" do banco
    const months: Record<string, number> = {
      'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'ABRIL': 3, 'MAIO': 4, 'JUNHO': 5,
      'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
    };

    const parts = selectedPeriod.toUpperCase().replace('/', ' ').split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);

    if (months[monthName] === undefined) return [];

    const endMonth = months[monthName];
    const endDate = new Date(year, endMonth, 9);
    const startDate = new Date(year, endMonth - 1, 10);

    const dates = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [selectedPeriod]);

  const ticketsByDate = useMemo(() => {
    const map: Record<string, TicketReport[]> = {};
    tickets.forEach(t => {
      const date = t.data_criacao.split(' ')[0];
      if (!map[date]) map[date] = [];
      map[date].push(t);
    });
    return map;
  }, [tickets]);

  const handleExportPDF = () => {
    if (!selectedPeriod || !user) return;
    // Enviamos as datas completas para o PDF também
    navigate('/print', { state: { tickets, user, period: selectedPeriod, fullDates: fullPeriodDates } });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo RDA" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Portal RDA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-blue-600">{user.gerencia}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Filter className="w-4 h-4 text-blue-600" /> Parâmetros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold"><CalendarDays className="w-4 h-4" /> Período de Atividade</Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val); }}>
                  <SelectTrigger className="w-full md:w-64 bg-slate-50"><SelectValue placeholder="Selecione o período" /></SelectTrigger>
                  <SelectContent>{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button className="flex-1 md:w-48 bg-blue-600 hover:bg-blue-700" onClick={() => loadData(selectedPeriod)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />} Atualizar
                </Button>
                <Button variant="outline" className="flex gap-2" onClick={handleExportPDF} disabled={!selectedPeriod || loading}>
                  <Download className="w-4 h-4" /> Exportar PDF
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
                  <TableHead className="w-[180px] font-bold">Data (Dia da Semana)</TableHead>
                  <TableHead className="font-bold">Atividades Realizadas</TableHead>
                  <TableHead className="w-[120px] font-bold">Chamados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : fullPeriodDates.map(date => {
                  const items = ticketsByDate[date] || [];
                  const dateObj = new Date(date + 'T12:00:00');
                  const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                  
                  return (
                    <TableRow key={date} className="hover:bg-slate-50 align-top">
                      <TableCell className="font-bold text-slate-700 py-4 capitalize">
                        {dateObj.toLocaleDateString('pt-BR')}<br/>
                        <span className="text-[10px] text-slate-400 font-normal">{dayOfWeek}</span>
                      </TableCell>
                      <TableCell className="py-4">
                        {items.length > 0 ? (
                          <div className="space-y-3">
                            {items.map((item, idx) => (
                              <div key={item.id} className={idx > 0 ? "pt-2 border-t border-slate-100" : ""}>
                                <div className="font-bold text-sm text-slate-800">{item.titulo}</div>
                                <div className="text-xs text-slate-500 italic">{item.descricao}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-sm">Sem lançamento para o dia</div>
                        )}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1">
                          {items.map(item => (
                            <span key={item.id} className="text-[10px] font-mono font-bold px-1 py-0.5 bg-blue-100 text-blue-700 rounded">#{item.id}</span>
                          ))}
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