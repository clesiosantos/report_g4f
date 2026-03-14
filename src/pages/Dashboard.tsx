"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, LogOut, Filter, User, Calendar } from "lucide-react";
import { glpiService, TicketReport, GLPIUser } from '@/lib/glpi';

const Dashboard = () => {
  const [tickets, setTickets] = useState<TicketReport[]>([]);
  const [user, setUser] = useState<GLPIUser | null>(null);
  const [dateStart, setDateStart] = useState('2025-10-26');
  const [dateEnd, setDateEnd] = useState('2025-11-14');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('glpi_user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(storedUser));
    loadData();
  }, []);

  const loadData = async () => {
    const data = await glpiService.getTickets({ start: dateStart, end: dateEnd });
    setTickets(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('glpi_user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-600 w-6 h-6" />
          <h1 className="text-xl font-bold text-slate-800">Relatório Diário de Atividade (RDA)</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-500">{user.profile}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
            <LogOut className="w-5 h-5 text-slate-600" />
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Filtros */}
        <Card className="border-none shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros de Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Início</Label>
                <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Fim</Label>
                <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={loadData}>
                Atualizar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Resultados */}
        <Card className="border-none shadow-md overflow-hidden">
          <CardHeader className="bg-white border-b flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Atividades no Período</CardTitle>
            <Button variant="outline" size="sm" className="flex gap-2">
              <Download className="w-4 h-4" /> Exportar PDF
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="w-[100px]">Chamado</TableHead>
                    <TableHead>Título / Descrição de Abertura</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Posto de Trabalho</TableHead>
                    <TableHead>Data Solução</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-slate-50">
                      <TableCell className="font-bold text-blue-600">#{ticket.id}</TableCell>
                      <TableCell>
                        <div className="font-medium">{ticket.titulo}</div>
                        <div className="text-xs text-slate-500 line-clamp-2 mt-1 italic">
                          "{ticket.descricao}"
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ticket.servico}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-sm">{ticket.posto_trabalho}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{new Date(ticket.data_solucao).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-mono">{ticket.tempo_total.toFixed(1)}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Resumo de Perfil */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-600 font-medium">Total de Chamados</p>
              <p className="text-3xl font-bold text-blue-900">{tickets.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-6">
              <p className="text-sm text-green-600 font-medium">Horas Lançadas</p>
              <p className="text-3xl font-bold text-green-900">
                {tickets.reduce((acc, t) => acc + t.tempo_total, 0).toFixed(1)}h
              </p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="pt-6">
              <p className="text-sm text-purple-600 font-medium">Período Avaliado</p>
              <p className="text-3xl font-bold text-purple-900">{tickets[0]?.periodo_avaliado || '--'}</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;