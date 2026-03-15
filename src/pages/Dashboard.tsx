"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { LogOut, Filter, Loader2, Download, XCircle, CalendarClock, MessageSquare, UserCheck, Send, Check, AlertCircle, Search, ChevronsUpDown } from "lucide-react";
import { glpiService, TicketReport, GLPIUser } from '@/lib/glpi';
import { showError } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [tickets, setTickets] = useState<TicketReport[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [subordinates, setSubordinates] = useState<GLPIUser[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<GLPIUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  
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
              <div className="flex-[0.4] w-full">
                <Label className="mb-2 block">Período de Competência</Label>
                <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); loadData(val, selectedColaborador?.id || user.id); }}>
                  <SelectTrigger className="w-full bg-white border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">{periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              
              {isManager && (
                <div className="flex-1 w-full">
                  <Label className="mb-2 block">Selecionar Colaborador (Busca Inteligente)</Label>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCombobox}
                        className="w-full justify-between bg-white border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-3 py-2 font-normal"
                      >
                        {selectedColaborador ? selectedColaborador.name : "Selecione um colaborador..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-white shadow-xl border-slate-200" align="start">
                      <Command className="bg-white">
                        <CommandInput placeholder="Digite o nome ou usuário..." className="h-10 text-sm" />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                          <CommandEmpty className="py-6 text-center text-sm text-slate-500">Nenhum colaborador encontrado.</CommandEmpty>
                          <CommandGroup heading="Ações">
                            <CommandItem
                              value={user.id.toString() + " " + user.name}
                              onSelect={() => {
                                setSelectedColaborador(user);
                                loadData(selectedPeriod, user.id);
                                setOpenCombobox(false);
                              }}
                              className="cursor-pointer hover:bg-blue-50 py-2.5 px-3 flex items-center gap-2"
                            >
                              <Check className={cn("h-4 w-4 text-blue-600", selectedColaborador?.id === user.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{user.name}</span>
                                <span className="text-[10px] text-blue-600 uppercase font-bold tracking-tight">Meu Perfil</span>
                              </div>
                            </CommandItem>
                          </CommandGroup>
                          <CommandGroup heading="Equipe">
                            {subordinates.filter(s => s.id !== user.id).map((sub) => (
                              <CommandItem
                                key={sub.id}
                                value={sub.id.toString() + " " + sub.name + " " + sub.username}
                                onSelect={() => {
                                  setSelectedColaborador(sub);
                                  loadData(selectedPeriod, sub.id);
                                  setOpenCombobox(false);
                                }}
                                className="cursor-pointer hover:bg-blue-50 py-2.5 px-3 flex items-center gap-2"
                              >
                                <Check className={cn("h-4 w-4 text-blue-600", selectedColaborador?.id === sub.id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-800">{sub.name}</span>
                                  <span className="text-[10px] text-slate-400">@{sub.username}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
              <Button className="bg-blue-700 hover:bg-blue-800 transition-colors w-full md:w-auto shadow-sm" onClick={handleExportPDF} disabled={tickets.length === 0}><Download className="mr-2 h-4 w-4" /> Gerar Documento RDA</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg overflow-hidden bg-white border-slate-200">
          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow>
                <TableHead className="w-[120px] font-bold text-slate-700">Data</TableHead>
                <TableHead className="font-bold text-slate-700">Atividade, Reporte e Fluxo de Aprovação</TableHead>
                <TableHead className="text-center w-[120px] font-bold text-slate-700">Ticket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></TableCell></TableRow>
              ) : groupedData.map(([date, items]) => (
                <TableRow key={date} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-bold py-6 align-top text-slate-700 text-sm">
                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="space-y-8">
                      {items.map((item, idx) => {
                        const statusRaw = (item.status_aprovacao || "").toUpperCase().trim();
                        const isApproved = statusRaw.includes('APROVAD') && !statusRaw.includes('NÃO');
                        const isRejected = statusRaw.includes('NÃO') || statusRaw.includes('REJEITAD');

                        return (
                          <div key={item.id} className={idx > 0 ? "pt-8 border-t border-slate-100" : ""}>
                            <div className="mb-4">
                              <div className="font-bold text-slate-900 text-base mb-1">{item.titulo}</div>
                              <p className="text-sm text-slate-600 leading-relaxed">{item.descricao}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <Send className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">Submissão / Reporte</span>
                                </div>
                                <div className="space-y-2.5">
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                    <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-bold uppercase">Data:</span> {formatDate(item.data_aprovacao_solicitada)}
                                  </div>
                                  {item.reporte_enviado && (
                                    <div className="mt-3 pt-3 border-t border-blue-100/60">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                                        <p className="text-[13px] text-slate-700 italic leading-relaxed font-medium">
                                          "{item.reporte_enviado}"
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <UserCheck className="w-4 h-4 text-slate-600" />
                                  <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Fiscalização</span>
                                </div>
                                <div className="space-y-3">
                                  <div className="text-[11px] text-slate-600">
                                    <span className="font-bold uppercase">Enviado para:</span> <span className="text-slate-800 font-bold">{item.fiscal_campo || 'Aguardando Atribuição'}</span>
                                  </div>
                                  <div className="pt-2">
                                    {item.status_aprovacao ? (
                                      <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase px-4 py-2 rounded-full border shadow-md transition-all ${
                                        isApproved 
                                        ? 'bg-green-600 text-white border-green-700' 
                                        : (isRejected ? 'bg-red-600 text-white border-red-700' : 'bg-amber-100 text-amber-700 border-amber-200')
                                      }`}>
                                        {isApproved ? (
                                          <>
                                            <Check className="w-4 h-4 stroke-[3px]" />
                                            <span>APROVADO</span>
                                          </>
                                        ) : isRejected ? (
                                          <>
                                            <AlertCircle className="w-4 h-4" />
                                            <span>{item.status_aprovacao}</span>
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="w-4 h-4" />
                                            <span>{item.status_aprovacao}</span>
                                          </>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase px-3.5 py-1.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300">
                                        Pendente
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-blue-700 text-sm align-top pt-6">
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