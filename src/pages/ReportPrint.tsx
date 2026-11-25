"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, GLPIUser } from '@/lib/glpi';
import { getPeriodDates } from '@/lib/period';

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
            const state = geoData.address.state || "";
            setGeoLoc(state ? `${city} - ${state}` : city);
          } catch (e) {
            setGeoLoc(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        },
        () => setGeoLoc('Acesso via rede corporativa'),
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

  const fullPeriodDates = useMemo(() => getPeriodDates(data?.period ?? ''), [data?.period]);

  const ticketsByDate = useMemo(() => {
    if (!data?.tickets) return {};
    const map: Record<string, TicketReport[]> = {};
    data.tickets.forEach(t => {
      // Agora usa exclusivamente a data_referencia (vinculada ao ticket.date no SQL)
      const date = t.data_referencia || t.data_criacao.split(' ')[0];
      if (!map[date]) map[date] = [];
      map[date].push(t);
    });
    return map;
  }, [data]);

  if (!data) return <div className="p-20 text-center text-slate-400">Preparando documento para impressão...</div>;

  const isEmittedByOther = data.currentUser && data.currentUser.id !== data.user.id;
  const approverName = isEmittedByOther ? data.currentUser.name : (data.user.lider || data.user.preposto || "Gestor Responsável");
  const approverRole = isEmittedByOther ? data.currentUser.profile : (data.user.lider ? "Líder" : (data.user.preposto ? "Preposto" : "Gestor"));

  const ElectronicValidationBox = ({ user }: { user: GLPIUser }) => (
    <div className="mt-4 p-2.5 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/30 text-[7px] text-slate-600 leading-tight text-left max-w-[240px] mx-auto shadow-sm">
      <div className="font-bold text-blue-700 block mb-1.5 text-center text-[8px] uppercase tracking-widest border-b border-blue-200 pb-1">
        VALIDAÇÃO ELETRÔNICA G4F
      </div>
      <div className="space-y-0.5">
        <div><span className="font-bold text-slate-800">DATA/HORA:</span> {signatureDate}</div>
        <div><span className="font-bold text-slate-800">MÉTODO:</span> Validado via Senha Individual</div>
        <div><span className="font-bold text-slate-800">IP DE ORIGEM:</span> {user.ip || '0.0.0.0'}</div>
        <div><span className="font-bold text-slate-800">NAVEGADOR:</span> {browserInfo}</div>
        <div className="truncate"><span className="font-bold text-slate-800">LOCALIZAÇÃO:</span> {geoLoc}</div>
        <div className="mt-1 pt-1 border-t border-blue-100 text-[6px] text-blue-500 font-bold text-center italic">
          Autenticidade garantida pelo sistema Portal RDA
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rda-table thead { display: table-header-group; }
          .rda-table tbody tr { break-inside: auto; page-break-inside: auto; }
          .rda-table th { break-inside: avoid; }
          .rda-activity-title { break-after: avoid; page-break-after: avoid; }
          .no-print { display: none; }
        }
        .rda-table th, .rda-table td { border: 1px solid #64748b; }
        .rda-table th { background-color: #e2e8f0; }
        .rda-activity-description { white-space: pre-wrap; overflow-wrap: anywhere; }
        .signature-font { font-family: 'Dancing Script', cursive; }
      `}} />
      
      <div className="max-w-[210mm] mx-auto print:max-w-none">
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-4">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold uppercase tracking-tight">Relatório Diário de Atividade - RDA</h1>
            <p className="text-[10pt] font-semibold text-slate-800">Contrato: 5900.0134711.26.7 - G4F SOLUCOES CORPORATIVAS LTDA</p>
          </div>
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo" className="h-8 w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9pt] border border-slate-500 p-3 rounded mb-4 bg-slate-50/20">
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">NOME DE USUÁRIO:</span> {data.user.username}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">CHAVE:</span> {data.user.chave}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">GERÊNCIA:</span> {data.user.gerencia}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">CARGO:</span> {data.user.profile}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div className="border-b border-slate-300 py-0.5"><span className="font-bold">ATIVIDADE:</span> {data.user.entidade}</div>
          <div className="border-b border-slate-300 py-0.5 font-bold text-blue-800 text-[9pt]">
            <span className="text-slate-900">PERÍODO:</span> {data.period}
          </div>
        </div>

        <table className="rda-table w-full table-fixed text-[9pt] border-collapse border border-slate-500">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-slate-500 px-2 py-2 text-left w-[24mm] uppercase font-bold">Data / Dia</th>
              <th className="border border-slate-500 px-2 py-2 text-left uppercase font-bold">Atividades Realizadas</th>
              <th className="border border-slate-500 px-2 py-2 text-center w-[20mm] uppercase font-bold">Chamados</th>
            </tr>
          </thead>
          <tbody>
            {fullPeriodDates.map(date => {
              const items = ticketsByDate[date] || [];
              const dateObj = new Date(date + 'T12:00:00');
              const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
              return (
                <tr key={date}>
                  <td className="border border-slate-500 px-2 py-2 font-bold align-top capitalize bg-slate-50/30">
                    {dateObj.toLocaleDateString('pt-BR')}<br/>
                    <span className="text-[8pt] font-normal text-slate-700">{dayOfWeek}</span>
                  </td>
                  <td className="border border-slate-500 px-2 py-2 align-top">
                    {items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item, idx) => (
                          <div key={item.id} className={idx > 0 ? "pt-2 border-t border-slate-400" : ""}>
                            <div className="rda-activity-title font-bold text-slate-900 text-[10pt] leading-snug mb-1 break-words">{item.titulo}</div>
                            <div className="rda-activity-description text-slate-900 text-[10pt] leading-[1.45]">{item.descricao}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-600 font-semibold uppercase py-1">Sem lançamento</div>
                    )}
                  </td>
                  <td className="border border-slate-500 px-2 py-2 align-top text-center font-mono font-bold text-blue-800 break-words">
                    {items.length > 0 ? items.map(i => `#${i.id}`).join(', ') : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-20 grid grid-cols-2 gap-12 items-start">
          <div className="text-center">
            <div className="min-h-[40px] flex items-end justify-center mb-1">
              <div className="signature-font text-2xl text-blue-900/80">{data.user.name}</div>
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider">Assinatura do Colaborador</p>
              <p className="text-[8px] text-slate-500 mt-0.5">{data.user.name}</p>
              {!isEmittedByOther && <ElectronicValidationBox user={data.user} />}
            </div>
          </div>

          <div className="text-center">
            <div className="min-h-[40px] flex items-end justify-center mb-1">
              {isEmittedByOther && <div className="signature-font text-2xl text-blue-900/80">{data.currentUser.name}</div>}
            </div>
            <div className="border-t border-slate-800 pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider">Aprovação / Validação</p>
              <p className="text-[9px] text-slate-700 mt-0.5 font-bold">{approverName}</p>
              <p className="text-[8px] text-slate-500 uppercase italic">{approverRole}</p>
              {isEmittedByOther && <ElectronicValidationBox user={data.currentUser} />}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-4 border-t border-slate-200 text-[8px] text-slate-400 flex justify-between italic">
          <span>Relatório gerado via Portal RDA - G4F SOLUÇÕES</span>
          <span className="font-bold uppercase tracking-widest">Documento Interno</span>
        </div>
      </div>

      <div className="no-print fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button onClick={() => window.print()} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all text-sm flex items-center gap-2">Imprimir RDA</button>
        <button onClick={() => navigate('/dashboard')} className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-all text-sm">Voltar ao Dashboard</button>
      </div>
    </div>
  );
};

export default ReportPrint;