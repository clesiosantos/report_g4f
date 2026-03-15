"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<{ tickets: TicketReport[], user: GLPIUser, period: string } | null>(null);

  useEffect(() => {
    const state = location.state as any;
    if (!state || !state.tickets || !state.user) {
      navigate('/dashboard');
      return;
    }
    setData(state);
    
    setTimeout(() => {
      window.print();
    }, 1000);
  }, [location, navigate]);

  const groupedData = useMemo(() => {
    if (!data) return [];
    const groups: Record<string, TicketReport[]> = {};
    data.tickets.forEach(ticket => {
      const date = ticket.data_criacao.split(' ')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(ticket);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const dateRange = useMemo(() => {
    if (!groupedData.length) return "";
    const dates = groupedData.map(g => g[0]).sort();
    const start = new Date(dates[0] + 'T12:00:00').toLocaleDateString('pt-BR');
    const end = new Date(dates[dates.length - 1] + 'T12:00:00').toLocaleDateString('pt-BR');
    return `${start} a ${end}`;
  }, [groupedData]);

  if (!data) return null;

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      `}} />
      
      <div className="max-w-[210mm] mx-auto border border-slate-100 p-8 print:border-none print:p-0">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-lg font-bold uppercase">Relatório Diário de Atividade - RDA</h1>
            <p className="text-xs font-semibold">Contrato: 015/2022 - G4F SOLUCOES CORPORATIVAS LTDA</p>
          </div>
          <img 
            src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" 
            alt="Logo" 
            className="h-10 w-auto"
          />
        </div>

        {/* Info do Colaborador */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] border border-slate-300 p-3 rounded mb-6 bg-slate-50/30">
          <div><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div><span className="font-bold">FUNÇÃO:</span> {data.user.profile}</div>
          <div><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div><span className="font-bold">CHAVE:</span> {data.user.chave}</div>
          <div><span className="font-bold">GERÊNCIA DE ORIGEM:</span> {data.user.gerencia}</div>
          <div><span className="font-bold">PERÍODO AVALIADO:</span> {dateRange}</div>
        </div>

        {/* Tabela de Atividades */}
        <table className="w-full text-[10px] border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-400 p-2 text-left w-20">Data</th>
              <th className="border border-slate-400 p-2 text-left">Atividades Realizadas</th>
              <th className="border border-slate-400 p-2 text-center w-28">Chamados</th>
            </tr>
          </thead>
          <tbody>
            {groupedData.map(([date, items]) => (
              <tr key={date}>
                <td className="border border-slate-400 p-2 font-bold align-top">
                  {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR')}
                </td>
                <td className="border border-slate-400 p-2 align-top">
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={item.id} className={idx > 0 ? "pt-2 border-t border-slate-100" : ""}>
                        <div className="font-bold text-slate-800 mb-0.5">{item.titulo}</div>
                        <div className="text-slate-600 leading-tight">{item.descricao}</div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="border border-slate-400 p-2 align-top text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {items.map(item => (
                      <span key={item.id} className="font-mono bg-slate-100 border border-slate-200 px-1 rounded">
                        #{item.id}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rodapé de Assinaturas */}
        <div className="mt-24 grid grid-cols-2 gap-16 text-center text-[10px]">
          <div className="space-y-1">
            <div className="border-t border-slate-800 pt-2 font-bold">Assinatura do Colaborador</div>
            <div className="text-slate-500 uppercase">{data.user.name}</div>
          </div>
          <div className="space-y-1">
            <div className="border-t border-slate-800 pt-2 font-bold">Aprovação / Validação</div>
            <div className="text-slate-500">Gestor Responsável</div>
          </div>
        </div>
      </div>

      <div className="no-print mt-8 flex justify-center gap-4 pb-10">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg hover:bg-blue-700 transition-all font-bold"
        >
          Confirmar Impressão
        </button>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-slate-200 text-slate-800 px-6 py-2 rounded-full shadow-md hover:bg-slate-300 transition-all font-bold"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default ReportPrint;