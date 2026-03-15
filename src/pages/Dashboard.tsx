"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, CalendarDays, Loader2, Users } from "lucide-react";
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
        showError("Erro na inicialização do painel Reduc.");
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

  const handleColaboradorChange = (id: string) => {
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
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Petrobras_logo.svg/1280px-Petrobras_logo.svg.png" alt="Logo Reduc" className="h-8 w-auto" />
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Portal RDA - Reduc</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs text-green-600 font-medium">{user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filtros e Conteúdo idênticos, mas com acentos de cor verde para Reduc */}
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4 text-green-600" /> Parâmetros Reduc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                  <CalendarDays className="w-4 h-4" /> Período
                </Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val, selectedColaborador?.id || user.id); }}>
                  <SelectTrigger className="w-full bg-slate-50">
                    <SelectValue placeholder={loadingPeriods ? "Carregando..." : "Selecione o período"} />
                  </SelectTrigger>
                  <SelectContent>{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {isManager && (
                <div className="space-y-2 flex-1 w-full">
                  <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Users className="w-4 h-4" /> Colaborador
                  </Label>
                  <Select value={selectedColaborador?.id.toString()} onValueChange={handleColaboradorChange}>
                    <SelectTrigger className="w-full bg-slate-50 border-green-100">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id.toString()}>{user.name}</SelectItem>
                      {subordinates.map(sub => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 w-full md:w-auto">
                <Button className="flex-1 md:w-40 bg-green-700 hover:bg-green-800" onClick={() => loadData(selectedPeriod, selectedColaborador?.id || user.id)} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} Atualizar
                </Button>
                <Button variant="outline" className="flex gap-2" onClick={handleExportPDF} disabled={!selectedPeriod || loading}>
                  <Download className="w-4 h-4" /> Exportar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* ... Resto da tabela segue o mesmo padrão ... */}
        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                  <TableHead className="font-bold">Atividades Lançadas (Reduc)</TableHead>
                  <TableHead className="w-[120px] font-bold text-center">Chamados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-green-600" /></TableCell></TableRow>
                ) : groupedData.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-400">Nenhum chamado no período selecionado.</TableCell></TableRow>
                ) : groupedData.map(([date, items]) => (
                  <TableRow key={date} className="hover:bg-slate-50 align-top">
                    <TableCell className="font-bold text-slate-700 py-4">
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-3">
                        {items.map((item, idx) => (
                          <div key={item.id} className={idx > 0 ? "pt-2 border-t border-slate-100" : ""}>
                            <div className="font-bold text-sm text-slate-800 flex justify-between">
                              {item.titulo}
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-normal">
                                {item.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 italic leading-relaxed">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {items.map(item => (
                          <span key={item.id} className="text-[10px] font-mono font-bold px-1 py-0.5 bg-green-50 text-green-700 rounded border border-green-100">#{item.id}</span>
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