"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<{ tickets: TicketReport[], user: GLPIUser, period: string } | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (msg: string) => {
    console.log(`[RDA-DEBUG] ${msg}`);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const state = location.state as any;
    addLog("Iniciando componente ReportPrint");
    addLog(`State recebido: ${state ? "Sim" : "Não"}`);

    if (state && state.user && state.period) {
      addLog(`Usuário: ${state.user.name}`);
      addLog(`Período: ${state.period}`);
      addLog(`Quantidade de tickets: ${state.tickets?.length || 0}`);
      setData(state);
      
      const timer = setTimeout(() => {
        addLog("Chamando window.print()");
        try {
          window.print();
        } catch (e) {
          addLog(`Erro ao imprimir: ${e}`);
        }
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      const storedUser = localStorage.getItem('glpi_user');
      addLog(`Usuário no localStorage: ${storedUser ? "Sim" : "Não"}`);
      if (!storedUser) {
        addLog("Redirecionando para login por falta de credenciais");
        navigate('/');
      } else {
        setError("As informações de navegação foram perdidas (provavelmente por um refresh). Por favor, gere o relatório novamente no Dashboard.");
      }
    }
  }, [location, navigate]);

  const fullPeriodDates = useMemo(() => {
    if (!data?.period) {
      addLog("Cálculo de datas ignorado: falta dado de período");
      return [];
    }
    
    try {
      const months: Record<string, number> = {
        'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'MARCO': 2, 'ABRIL': 3, 'MAIO': 4, 'JUNHO': 5,
        'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
      };

      const rawPeriod = data.period.toUpperCase().trim();
      addLog(`Processando período string: "${rawPeriod}"`);
      
      const parts = rawPeriod.replace('/', ' ').split(/\s+/);
      addLog(`Partes identificadas: ${JSON.stringify(parts)}`);

      if (parts.length < 2) {
        throw new Error(`Formato de período inválido. Esperado "MÊS ANO" ou "MÊS/ANO", recebido: "${rawPeriod}"`);
      }

      const monthName = parts[0];
      const year = parseInt(parts[1]);
      const endMonth = months[monthName];

      if (endMonth === undefined) {
        throw new Error(`Mês "${monthName}" não reconhecido no mapeamento.`);
      }

      if (isNaN(year)) {
        throw new Error(`Ano "${parts[1]}" não é um número válido.`);
      }

      // Regra: de 10 do mês anterior a 09 do mês atual
      const endDate = new Date(year, endMonth, 9);
      const startDate = new Date(year, endMonth - 1, 10);
      
      addLog(`Datas calculadas: Início=${startDate.toISOString().split('T')[0]}, Fim=${endDate.toISOString().split('T')[0]}`);

      const dates = [];
      let current = new Date(startDate);
      let safety = 0;
      while (current <= endDate && safety < 40) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        safety++;
      }
      
      addLog(`Total de dias no período: ${dates.length}`);
      return dates;
    } catch (e: any) {
      addLog(`ERRO NO PARSING: ${e.message}`);
      setError(`Erro técnico ao processar período: ${e.message}`);
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl w-full border-t-4 border-red-500">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Falha ao Gerar Relatório</h2>
          <div className="bg-red-50 text-red-700 p-4 rounded mb-6 text-sm font-mono whitespace-pre-wrap">
            {error}
          </div>
          <div className="text-left mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Logs de Depuração:</h3>
            <div className="bg-slate-900 text-slate-300 p-3 rounded text-[10px] h-40 overflow-y-auto font-mono">
              {debugLog.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
          <button onClick={() => navigate('/dashboard')} className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition-colors">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data || fullPeriodDates.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="text-slate-700 font-bold">Preparando seu RDA...</p>
            <p className="text-xs text-slate-400 mt-1">Isso pode levar alguns segundos conforme o volume de dados.</p>
          </div>
        </div>
        <div className="mt-10 max-w-sm w-full px-4">
          <div className="bg-slate-900/5 p-4 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Status do Processamento:</p>
            <div className="text-[9px] font-mono text-slate-600 space-y-1">
              {debugLog.slice(-3).map((log, i) => <div key={i} className="truncate">{log}</div>)}
            </div>
          </div>
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