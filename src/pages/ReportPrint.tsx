"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<{ tickets: TicketReport[], user: GLPIUser, currentUser: GLPIUser, period: string } | null>(null);
  const [signatureDate] = useState(new Date().toLocaleString('pt-BR'));
  const [browserInfo, setBrowserInfo] = useState('');
  const [geoLoc, setGeoLoc] = useState('Localização via rede');

  useEffect(() => {
    const ua = navigator.userAgent;
    let browser = "Navegador";
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung";
    else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
    else if (ua.indexOf("Edge") > -1 || ua.indexOf("Edg") > -1) browser = "Edge";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    setBrowserInfo(browser);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const geoData = await response.json();
            const city = geoData.address.city || geoData.address.town || geoData.address.village || "Local";
            setGeoLoc(city);
          } catch (e) {
            setGeoLoc(`${latitude.toFixed(2)},${longitude.toFixed(2)}`);
          }
        },
        () => setGeoLoc('IP'),
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
      navigate('/dashboard');
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

  if (!data) return <div className="p-20 text-center">Carregando...</div>;

  const isEmittedByOther = data.currentUser && data.currentUser.id !== data.user.id;
  const approverName = isEmittedByOther ? data.currentUser.name : (data.user.lider || data.user.preposto || "Gestor Responsável");
  const approverRole = isEmittedByOther ? data.currentUser.profile : (data.user.lider ? "Líder" : (data.user.preposto ? "Preposto" : "Gestor"));

  // Carimbo eletrônico em destaque (formato caixa)
  const ElectronicValidation = ({ user }: { user: GLPIUser }) => (
    <div className="mt-3 p-2 border border-dashed border-blue-200 rounded-md bg-slate-50 text-[7px] text-slate-500 leading-tight text-left max-w-[220px] mx-auto">
      <span className="font-bold text-blue-700 block mb-1 text-center text-[7px] uppercase tracking-wider border-b border-blue-100 pb-0.5">
        VALIDAÇÃO ELETRÔNICA G4F
      </span>
      <div className="grid grid-cols-1 gap-0.5">
        <div><span className="font-bold">DATA/HORA:</span> {signatureDate}</div>
        <div><span className="font-bold">IP ORIGEM:</span> {user.ip || '0.0.0.0'}</div>
        <div><span className="font-bold">NAVEGADOR:</span> {browserInfo}</div>
        <div className="truncate"><span className="font-bold">LOCALIZAÇÃO:</span> {geoLoc}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
          tr { page-break-inside: avoid; }
        }
        .signature-font { font-family: 'Dancing Script', cursive; }
      `}} />
      
      <div className="max-w-[210mm] mx-auto">
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-4">
          <div className="space-y-0.5">
            <h1 className="text-md font-bold uppercase tracking-tight">Relatório Diário de Atividade - RDA</h1>
            <p className="text-[9px] font-semibold text-slate-600">Contrato: 015/2022 - G4F SOLUCOES CORPORATIVAS LTDA</p>
          </div>
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo" className="h-8 w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] border border-slate-300 p-3 rounded mb-4 bg-slate-50/20">
          <div className="border-b border-slate-100"><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div className="border-b border-slate-100"><span className="font-bold">NOME DE USUÁRIO:</span> {data.user.username}</div>
          <div className="border-b border-slate-100"><span className="font-bold">CHAVE:</span> {data.user.chave}</div>
          <div className="border-b border-slate-100"><span className="font-bold">GERÊNCIA:</span> {data.user.gerencia}</div>
          <div className="border-b border-slate-100"><span className="font-bold">CARGO:</span> {data.user.profile}</div>
          <div className="border-b border-slate-100"><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div className="border-b border-slate-100"><span className="font-bold">ATIVIDADE:</span> {data.user.entidade}</div>
          <div className="border-b border-slate-100 font-bold text-blue-800 text-[10px]">
            <span className="text-slate-900">PERÍODO:</span> {data.period}
          </div>
        </div>

        <table className="w-full text-[8.5px] border-collapse border border-slate-400">
          <thead>
            <tr className="bg-slate-100/80">
              <th className="border border-slate-400 p-1.5 text-left w-24 uppercase font-bold">Data / Dia</th>
              <th className="border border-slate-400 p-1.5 text-left uppercase font-bold">Atividades Realizadas</th>
              <th className="border border-slate-400 p-1.5 text-center w-20 uppercase font-bold">Chamados</th>
            </tr>
          </thead>
          <tbody>
            {fullPeriodDates.map(date => {
              const items = ticketsByDate[date] || [];
              const dateObj = new Date(date + 'T12:00:00');
              const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
              return (
                <tr key={date}>
                  <td className="border border-slate-400 p-1.5 font-bold align-top capitalize bg-slate-50/30">
                    {dateObj.toLocaleDateString('pt-BR')}<br/>
                    <span className="text-[7px] font-normal text-slate-500 italic">{dayOfWeek}</span>
                  </td>
                  <td className="border border-slate-400 p-1.5 align-top">
                    {items.length > 0 ? (
                      <div className="space-y-1">
                        {items.map((item, idx) => (
                          <div key={item.id} className={idx > 0 ? "pt-1 border-t border-slate-100" : ""}>
                            <div className="font-bold text-slate-800 leading-tight">{item.titulo}</div>
                            <div className="text-slate-600 leading-tight italic text-[8px]">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-300 font-bold uppercase italic py-1">Sem lançamento</div>
                    )}
                  </td>
                  <td className="border border-slate-400 p-1.5 align-top text-center font-mono font-bold text-blue-700">
                    {items.length > 0 ? items.map(i => `#${i.id}`).join(', ') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Seção de Assinaturas com Destaque */}
        <div className="mt-16 grid grid-cols-2 gap-12 items-start">
          <div className="flex flex-col h-full">
            <div className="min-h-[40px] flex items-end justify-center mb-1">
              <div className="signature-font text-2xl text-blue-900/80">{data.user.name}</div>
            </div>
            <div className="border-t border-slate-800 pt-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider">Assinatura do Colaborador</p>
              <p className="text-[8px] text-slate-500 mt-1">{data.user.name}</p>
              {!isEmittedByOther && <ElectronicValidation user={data.user} />}
              {isEmittedByOther && <div className="h-[60px]"></div>}
            </div>
          </div>

          <div className="flex flex-col h-full">
            <div className="min-h-[40px] flex items-end justify-center mb-1">
              {isEmittedByOther && <div className="signature-font text-2xl text-blue-900/80">{data.currentUser.name}</div>}
            </div>
            <div className="border-t border-slate-800 pt-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider">Aprovação / Validação</p>
              <p className="text-[9px] text-slate-700 mt-1 font-bold">{approverName}</p>
              <p className="text-[8px] text-slate-500 uppercase italic">{approverRole}</p>
              {isEmittedByOther && <ElectronicValidation user={data.currentUser} />}
              {!isEmittedByOther && <div className="h-[60px]"></div>}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-4 border-t border-slate-200 text-[8px] text-slate-400 flex justify-between italic">
          <span>Relatório gerado via Portal RDA - G4F SOLUÇÕES</span>
          <span className="font-bold uppercase">Documento Interno</span>
        </div>
      </div>

      <div className="no-print fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all text-sm flex items-center gap-2">Imprimir RDA</button>
        <button onClick={() => navigate('/dashboard')} className="bg-white border border-slate-300 text-slate-700 px-6 py-2 rounded-full font-bold shadow-md hover:bg-slate-50 transition-all text-sm">Voltar</button>
      </div>
    </div>
  );
};

export default ReportPrint;