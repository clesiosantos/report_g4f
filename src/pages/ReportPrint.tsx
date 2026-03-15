"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<{ tickets: TicketReport[], user: GLPIUser, period: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Tenta pegar do state da navegação (vindo do Dashboard)
    const state = location.state as any;
    
    if (state && state.user && state.period) {
      setData(state);
      // Agenda a impressão após garantir que o DOM renderizou
      const timer = setTimeout(() => {
        window.print();
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      // Caso de Refresh: tenta recuperar ao menos o usuário do localStorage
      const storedUser = localStorage.getItem('glpi_user');
      if (!storedUser) {
        navigate('/');
      } else {
        setError("As informações deste relatório não foram encontradas. Por favor, volte ao Dashboard e clique em 'Exportar PDF' novamente.");
      }
    }
  }, [location, navigate]);

  const fullPeriodDates = useMemo(() => {
    if (!data?.period) return [];
    
    try {
      const months: Record<string, number> = {
        'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'MARCO': 2, 'ABRIL': 3, 'MAIO': 4, 'JUNHO': 5,
        'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
      };

      const parts = data.period.toUpperCase().trim().replace('/', ' ').split(/\s+/);
      if (parts.length < 2) return [];

      const monthName = parts[0];
      const year = parseInt(parts[1]);

      if (months[monthName] === undefined || isNaN(year)) return [];

      const endMonth = months[monthName];
      const endDate = new Date(year, endMonth, 9);
      const startDate = new Date(year, endMonth - 1, 10);

      const dates = [];
      let current = new Date(startDate);
      let safety = 0;
      while (current <= endDate && safety < 40) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        safety++;
      }
      return dates;
    } catch (e) {
      return [];
    }
  }, [data]);

  const ticketsByDate = useMemo(() => {
    if (!data?.tickets) return {};
    const map: Record<string, TicketReport[]> = {};
    data.tickets.forEach(t => {
      if (!t.data_criacao) return;
      const date = t.data_criacao.split(' ')[0];
      if (!map[date]) map[date] = [];
      map[date].push(t);
    });
    return map;
  }, [data]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center border-t-4 border-amber-500">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Relatório Indisponível</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data || fullPeriodDates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Preparando seu RDA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
          tr { page-break-inside: avoid; }
        }
      `}} />
      
      <div className="max-w-[210mm] mx-auto">
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-4">
          <div className="space-y-1">
            <h1 className="text-md font-bold uppercase">Relatório Diário de Atividade - RDA</h1>
            <p className="text-[10px] font-semibold text-slate-600">Contrato: 015/2022 - G4F SOLUCOES CORPORATIVAS LTDA</p>
          </div>
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo" className="h-8 w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] border border-slate-300 p-3 rounded mb-4 bg-slate-50/30">
          <div><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div><span className="font-bold">FUNÇÃO:</span> {data.user.profile}</div>
          <div><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div><span className="font-bold">CHAVE:</span> {data.user.chave}</div>
          <div className="col-span-2"><span className="font-bold">GERÊNCIA LOTAÇÃO:</span> {data.user.gerencia}</div>
          <div className="col-span-2"><span className="font-bold">PERÍODO AVALIADO:</span> {data.period}</div>
        </div>

        <table className="w-full text-[9px] border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-400 p-1.5 text-left w-24">Data / Dia</th>
              <th className="border border-slate-400 p-1.5 text-left">Atividades Realizadas</th>
              <th className="border border-slate-400 p-1.5 text-center w-24">Chamados</th>
            </tr>
          </thead>
          <tbody>
            {fullPeriodDates.map(date => {
              const items = ticketsByDate[date] || [];
              const dateObj = new Date(date + 'T12:00:00');
              const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
              
              return (
                <tr key={date}>
                  <td className="border border-slate-400 p-1.5 font-bold align-top capitalize">
                    {dateObj.toLocaleDateString('pt-BR')}<br/>
                    <span className="text-[8px] font-normal text-slate-500">{dayOfWeek}</span>
                  </td>
                  <td className="border border-slate-400 p-1.5 align-top">
                    {items.length > 0 ? (
                      <div className="space-y-1.5">
                        {items.map((item, idx) => (
                          <div key={item.id} className={idx > 0 ? "pt-1 border-t border-slate-100" : ""}>
                            <div className="font-bold text-slate-800">{item.titulo}</div>
                            <div className="text-slate-600 leading-tight italic">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-400 font-bold uppercase italic">Sem lançamento para o dia</div>
                    )}
                  </td>
                  <td className="border border-slate-400 p-1.5 align-top text-center font-mono">
                    {items.length > 0 ? items.map(i => `#${i.id}`).join(', ') : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-16 grid grid-cols-2 gap-12 text-center text-[9px]">
          <div className="space-y-1">
            <div className="border-t border-slate-800 pt-1.5 font-bold">Assinatura do Colaborador</div>
            <div className="text-slate-400 uppercase">{data.user.name}</div>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-800 pt-1.5 font-bold">Aprovação / Validação</div>
            <div className="text-slate-400">Gestor Responsável</div>
          </div>
        </div>
      </div>

      <div className="no-print mt-8 flex justify-center gap-4 pb-10">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold">Imprimir RDA</button>
        <button onClick={() => navigate('/dashboard')} className="bg-slate-200 text-slate-800 px-6 py-2 rounded-full font-bold">Voltar</button>
      </div>
    </div>
  );
};

export default ReportPrint;