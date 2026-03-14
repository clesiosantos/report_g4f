"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, User, CalendarDays, Loader2, CalendarRange, ChevronRight } from "lucide-react";
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
      navigate('/');
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
  }, []);

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

  // Agrupamento de tickets por data para exibição
  const groupedData = useMemo(() => {
    const groups: Record<string, TicketReport[]> = {};
    tickets.forEach(ticket => {
      const date = ticket.data_criacao.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(ticket);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [tickets]);

  // Contagem distinta de dias baseada na data de abertura (date_criacao)
  const totalDays = groupedData.length;

  const handleLogout = () => {
    localStorage.removeItem('glpi_user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <img 
            src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" 
            alt="Logo RDA" 
            className="h-8 w-auto"
          />
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Portal RDA</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold text-slate-900 leading-tight">{user.name}</p>
            <p className="text-xs text-blue-600 font-medium">{user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:bg-red-50 hover:text-red-600">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-3 border-b mb-4">
            <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
              <Filter className="w-4 h-4 text-blue-600" /> Parâmetros de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="space-y-2 flex-1 w-full">
                <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                  <CalendarDays className="w-4 h-4" /> Período de Atividade
                </Label>
                <Select value={selectedPeriod} onValueChange={(val) => {
                  setSelectedPeriod(val);
                  loadData(val);
                }} disabled={loadingPeriods}>
                  <SelectTrigger className="w-full md:w-64 bg-slate-50 border-slate-200">
                    <SelectValue placeholder={loadingPeriods ? "Carregando..." : "Selecione o período"} />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button 
                  className="flex-1 md:w-48 bg-blue-600 hover:bg-blue-700" 
                  onClick={() => loadData(selectedPeriod)}
                  disabled={loading || loadingPeriods}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                  Atualizar Dados
                </Button>
                <Button variant="outline" className="flex gap-2 border-slate-200 hover:bg-slate-50">
                  <Download className="w-4 h-4" /> Exportar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Total de Chamados</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : tickets.length}</p>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Dias Lançados</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {loading ? '...' : totalDays} dias
                  </p>
                </div>
                <div className="bg-green-50 p-2 rounded-lg">
                  <CalendarRange className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-500 font-medium">Período Ativo</p>
                  <p className="text-xl font-bold text-purple-700 mt-1 truncate">{selectedPeriod || 'Nenhum'}</p>
                </div>
                <div className="bg-purple-50 p-2 rounded-lg">
                  <Filter className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b">
                  <TableRow>
                    <TableHead className="w-[120px] font-bold text-slate-700">Data Lançamento</TableHead>
                    <TableHead className="font-bold text-slate-700">Atividades Realizadas</TableHead>
                    <TableHead className="font-bold text-slate-700">Chamados</TableHead>
                    <TableHead className="font-bold text-slate-700">Posto de Trabalho</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          <p className="text-slate-500 font-medium">Consultando base do GLPI...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : groupedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center text-slate-500">
                        Nenhuma atividade encontrada para este período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedData.map(([date, items]) => (
                      <TableRow key={date} className="hover:bg-blue-50/30 transition-colors align-top">
                        <TableCell className="font-bold text-slate-700 py-4">
                          {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="max-w-xl py-4">
                          <div className="space-y-4">
                            {items.map((item, idx) => (
                              <div key={item.id} className={idx > 0 ? "pt-3 border-t border-slate-100" : ""}>
                                <div className="font-bold text-slate-800 text-sm mb-1">{item.titulo}</div>
                                <div className="text-xs text-slate-500 leading-relaxed italic">
                                  {item.descricao}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-wrap gap-1">
                            {items.map(item => (
                              <span key={item.id} className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                #{item.id}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">{items[0].posto_trabalho}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;