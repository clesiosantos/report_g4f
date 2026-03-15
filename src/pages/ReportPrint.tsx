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

  const sortedTickets = useMemo(() => {
    if (!data?.tickets) return [];
    return [...data.tickets].sort((a, b) => a.data_criacao.localeCompare(b.data_criacao));
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
            <p className="text-[9px] font-semibold text-slate-600">Contrato: 5900.0131965.25.2 - G4F SOLUCOES CORPORATIVAS LTDA</p>
          </div>
          <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="Logo" className="h-8 w-auto" />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[10px] border border-slate-300 p-4 rounded-md mb-6 bg-slate-50/20">
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">COLABORADOR:</span> {data.user.name}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">NOME DE USUÁRIO:</span> {data.user.username}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">CHAVE:</span> {data.user.chave}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">GERÊNCIA:</span> {data.user.gerencia}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">CARGO:</span> {data.user.profile}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">E-MAIL:</span> {data.user.email}</div>
          <div className="border-b border-slate-100 pb-1"><span className="font-bold">ATIVIDADE:</span> {data.user.entidade}</div>
          <div className="border-b border-slate-100 pb-1 font-bold text-blue-800 text-[11px]">
            <span className="text-slate-900">PERÍODO:</span> {data.period}
          </div>
        </div>

        <div className="border border-slate-400 rounded-md overflow-hidden shadow-sm">
          <div className="bg-slate-100 border-b border-slate-400 p-2.5 text-[11px] font-bold uppercase tracking-widest text-center text-slate-800">
            Atividades Realizadas no Período
          </div>
          <div className="p-5 space-y-4 min-h-[400px]">
            {sortedTickets.length > 0 ? (
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300">
                    <th className="text-left py-2 w-24 font-bold text-slate-800">Data</th>
                    <th className="text-left py-2 font-bold text-slate-800">Descrição / Reporte e Aprovação</th>
                    <th className="text-right py-2 w-28 font-bold text-slate-800">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedTickets.map((ticket) => {
                    const statusUpper = (ticket.status_aprovacao || "").toUpperCase().trim();
                    const isApproved = statusUpper === 'APROVADO';
                    const isRejected = statusUpper.includes('NÃO') || statusUpper.includes('REJEITAD');

                    return (
                      <tr key={ticket.id}>
                        <td className="py-4 align-top font-bold text-slate-700">
                          {new Date(ticket.data_criacao.split(' ')[0] + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 align-top pr-6">
                          <div className="font-bold text-slate-900 leading-snug mb-1.5 text-[11px]">{ticket.titulo}</div>
                          <div className="text-slate-600 leading-relaxed text-[10px] mb-3">{ticket.descricao}</div>
                          
                          {/* Box de Fluxo e Reporte no Impresso */}
                          <div className="mt-3 p-3 bg-slate-50 border border-slate-300 rounded-md text-[9px] leading-tight space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-1.5">
                              <div>
                                <span className="font-bold text-blue-800 uppercase text-[8px]">Submissão:</span> {ticket.data_aprovacao_solicitada ? new Date(ticket.data_aprovacao_solicitada.replace(' ', 'T')).toLocaleString('pt-BR') : '-'}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-800 uppercase text-[8px]">Status:</span> 
                                <span className={isApproved ? 'text-green-700 font-extrabold flex items-center gap-1 justify-end' : (isRejected ? 'text-red-700 font-extrabold flex items-center gap-1 justify-end' : 'text-slate-800 font-bold')}>
                                  {isApproved && '✓ '}
                                  {isApproved ? 'APROVADO' : (ticket.status_aprovacao || 'PENDENTE')}
                                </span>
                              </div>
                            </div>
                            <div className="pb-1">
                              <span className="font-bold text-slate-700 uppercase text-[8px]">Fiscal de Campo:</span> {ticket.fiscal_campo || 'Aguardando atribuição'}
                            </div>
                            {ticket.reporte_enviado && (
                              <div className="mt-2 pt-2 border-t border-slate-200 italic text-slate-700 leading-normal">
                                <span className="font-bold not-italic text-blue-800 uppercase text-[8px] block mb-1">Reporte do Colaborador:</span> 
                                "{ticket.reporte_enviado}"
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 align-top text-right font-mono font-bold text-blue-800 text-[10px]">
                          #{ticket.id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-300 font-bold uppercase italic text-xl">
                Sem lançamentos no período
              </div>
            )}
          </div>
        </div>

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
          <span className="font-bold uppercase tracking-widest text-slate-500">Documento de Validação Interna</span>
        </div>
      </div>

      <div className="no-print fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button 
          onClick={() => window.print()} 
          className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all text-sm flex items-center gap-2"
        >
          Imprimir RDA
        </button>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-all text-sm"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  );
};

export default ReportPrint;