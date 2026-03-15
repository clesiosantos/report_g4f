"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<{ tickets: TicketReport[], user: GLPIUser, period: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureDate] = useState(new Date().toLocaleString('pt-BR'));
  const [browserInfo, setBrowserInfo] = useState('');
  const [geoLoc, setGeoLoc] = useState('Localização via rede');

  useEffect(() => {
    // Detectar navegador simplificado
    const ua = navigator.userAgent;
    let browser = "Navegador Desconhecido";
    if (ua.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
    else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Microsoft Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Google Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Apple Safari";
    setBrowserInfo(browser);

    // Tentar obter localização e converter para nome
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const geoData = await response.json();
            const city = geoData.address.city || geoData.address.town || geoData.address.village || "Cidade não identificada";
            const state = geoData.address.state || "";
            setGeoLoc(`${city}${state ? ' - ' + state : ''} (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`);
          } catch (e) {
            setGeoLoc(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        },
        () => setGeoLoc('Acesso à localização negado'),
        { timeout: 8000 }
      );
    }

    const state = location.state as any;
    if (state && state.user && state.period) {
      setData(state);
      const timer = setTimeout(() => {
        try { window.print(); } catch (e) {}
      }, 3000); 
      return () => clearTimeout(timer);
    } else {
      const storedUser = localStorage.getItem('glpi_user');
      if (!storedUser) navigate('/');
      else setError("Dados do relatório não encontrados. Por favor, exporte novamente.");
    }
  }, [location, navigate]);

  const fullPeriodDates = useMemo(() => {
    if (!data?.period) return [];
    try {
      const monthsMap: Record<string, number> = {
        'JANEIRO': 0, 'FEVEREIRO': 1, 'MARÇO': 2, 'MARCO': 2, 'ABRIL': 3, 'MAIO': 4, 'JUNHO': 5,
        'JULHO': 6, 'AGOSTO': 7, 'SETEMBRO': 8, 'OUTUBRO': 9, 'NOVEMBRO': 10, 'DEZEMBRO': 11
      };
      const rawPeriod = data.period.toUpperCase().trim();
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
      return dates;
    } catch (e) { return []; }
  }, [data]);

  const ticketsByDate = useMemo(() => {
    if (!data?.tickets) return {};
    const map: Record<string, TicketReport[]> = {};
    data.tickets.forEach(t => {
      const date = t.data_criacao.split(' ')[0];
      if (!map[date]) map[date] = [];
      map[date].push(t);
    });
    return map;
  }, [data]);

  if (error || (data && fullPeriodDates.length === 0)) {
    return <div className="p-20 text-center font-bold">{error || "Erro ao processar período do relatório."}</div>;
  }

  if (!data) return <div className="p-20 text-center">Carregando...</div>;

  const approverName = data.user.lider || data.user.preposto || "Gestor Responsável";

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        @media print {
          @page { size: A4; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
          tr { page-break-inside: avoid; }
        }
        
        .signature-font {
          font-family: 'Dancing Script', cursive;
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

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] border border-slate-300 p-3 rounded mb-4 bg-slate-50/30">
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">CHAVE COLABORADOR:</span> {data.user.chave}</div>
          
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">CARGO:</span> {data.user.profile}</div>
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">GERÊNCIA LOTAÇÃO:</span> {data.user.gerencia}</div>
          
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">ATIVIDADE PRINCIPAL:</span> {data.user.entidade}</div>
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">NOME DE USUÁRIO:</span> {data.user.name.split(' ')[0]}</div>
          
          <div className="py-0.5 border-b border-slate-100"><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div className="col-span-1 py-0.5 border-b border-slate-100 font-bold text-blue-700"><span className="text-slate-900 font-bold">PERÍODO AVALIADO:</span> {data.period}</div>
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

        <div className="mt-12 grid grid-cols-2 gap-12 items-end">
          <div className="flex flex-col items-center">
            <div className="mb-1 signature-font text-xl text-blue-800">{data.user.name}</div>
            <div className="w-full border-t border-slate-800 pt-1 text-center">
              <p className="text-[9px] font-bold">Assinatura do Colaborador</p>
              <div className="mt-2 p-1.5 border border-dashed border-slate-300 rounded bg-slate-50 text-[6px] text-slate-500 leading-tight text-left">
                <span className="font-bold text-blue-700 block mb-1 text-center text-[7px] uppercase tracking-wider">
                  Validado eletronicamente com senha
                </span>
                <div className="grid grid-cols-1 gap-0.5">
                  <div>• Data/Hora: <span className="font-bold text-slate-700">{signatureDate}</span></div>
                  <div>• Endereço IP: <span className="font-bold text-slate-700">{data.user.ip || 'Localhost'}</span></div>
                  <div>• Navegador: <span className="font-bold text-slate-700">{browserInfo}</span></div>
                  <div>• Localização: <span className="font-bold text-slate-700">{geoLoc}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center pb-[10px]">
            <div className="h-10 w-full"></div>
            <div className="w-full border-t border-slate-800 pt-1 text-center">
              <p className="text-[9px] font-bold">Aprovação / Validação</p>
              <p className="text-[8px] text-slate-700 mt-1 uppercase font-bold">{approverName}</p>
              <p className="text-[7px] text-slate-500 uppercase">{data.user.lider ? "Líder" : (data.user.preposto ? "Preposto" : "Gestor")}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-2 border-t border-slate-200 text-[7px] text-slate-400 flex justify-between italic">
          <span>Relatório gerado via Portal RDA - Integrado ao GLPI</span>
          <span>Página 1 de 1</span>
        </div>
      </div>

      <div className="no-print mt-8 flex justify-center gap-4 pb-10">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          Imprimir RDA
        </button>
        <button onClick={() => navigate('/dashboard')} className="bg-slate-200 text-slate-800 px-6 py-2 rounded-full font-bold hover:bg-slate-300 transition-colors">
          Voltar
        </button>
      </div>
    </div>
  );
};

export default ReportPrint;