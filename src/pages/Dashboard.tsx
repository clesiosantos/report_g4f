"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, CalendarDays, Loader2 } from "lucide-react";
import { glpiService, TicketReport } from '@/lib/glpi';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
  const [tickets, setTickets] = useState<TicketReport[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(true);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      setLoadingPeriods(true);
      try {
        const availablePeriods = await glpiService.getPeriods();
        setPeriods(availablePeriods);
        if (availablePeriods.length > 0) {
          const defaultPeriod = availablePeriods[0];
          setSelectedPeriod(defaultPeriod);
          loadData(defaultPeriod);
        }
      } catch (err) {
        showError("Erro ao carregar períodos.");
      } finally {
        setLoadingPeriods(false);
      }
    };
    
    init();
  }, [user]);

  const loadData = async (period: string) => {
    if (!period || !user) return;
    
    setLoading(true);
    try {
      const data = await glpiService.getTickets(period, user.id);
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
    if (!selectedPeriod || !user) return;
    navigate('/print', { state: { tickets, user, period: selectedPeriod } });
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
            <p className="text-xs text-blue-600 font-medium">{user.gerencia}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="bg-white border-none shadow-md">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4 text-blue-600" /> Parâmetros de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold"><CalendarDays className="w-4 h-4" /> Período de Atividade</Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val); }}>
                  <SelectTrigger className="w-full md:w-64 bg-slate-50">
                    <SelectValue placeholder={loadingPeriods ? "Carregando..." : "Selecione o período"} />
                  </SelectTrigger>
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
                  <TableHead className="w-[120px] font-bold">Data</TableHead>
                  <TableHead className="font-bold">Atividades Lançadas</TableHead>
                  <TableHead className="w-[120px] font-bold text-center">Chamados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
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
                            <div className="font-bold text-sm text-slate-800">{item.titulo}</div>
                            <div className="text-xs text-slate-500 italic leading-relaxed">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {items.map(item => (
                          <span key={item.id} className="text-[10px] font-mono font-bold px-1 py-0.5 bg-blue-100 text-blue-700 rounded">#{item.id}</span>
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