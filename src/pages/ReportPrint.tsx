"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TicketReport, RDARecord, glpiService } from '@/lib/glpi';

const ReportPrint = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [record, setRecord] = useState<RDARecord | null>(null);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState('');
  const code = new URLSearchParams(location.search).get('code') || '';
  const autoPrint = Boolean(location.state?.autoPrint);
  const printed = useRef('');
  useEffect(() => {
    let active = true;
    setRecord(null);
    setError('');
    if (!code) { navigate('/dashboard', { replace: true }); return; }
    glpiService.getRDA(code).then(value => { if (active) setRecord(value); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Falha ao consultar emissão.'); });
    return () => { active = false; };
  }, [code, navigate]);
  const data = record?.snapshot;
  useEffect(() => {
    if (!data || data.code !== code || !autoPrint || printed.current === code) return;
    const timer = window.setTimeout(() => { printed.current = code; window.print(); }, 800);
    return () => clearTimeout(timer);
  }, [data, code, autoPrint]);
  const fullPeriodDates = data?.dates || [];
  const requestPrint = async () => {
    if (printing || !data) return;
    setPrinting(true); setPrintError('');
    try { await glpiService.registerReprint(data.code); window.print(); }
    catch (err) { setPrintError(err instanceof Error ? err.message : 'Falha ao registrar reimpressão.'); }
    finally { setPrinting(false); }
  };

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

  if (error) return <div className="p-8 text-center"><p>{error}</p><button className="underline mt-4" onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</button></div>;
  if (!data || !record) return <div className="p-20 text-center text-slate-400">Consultando emissão registrada...</div>;

  const issuedDate = new Date(data.issued_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const approverName = data.user.preposto || "Preposto não cadastrado";
  const ua = data.browser;
  const browserInfo = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ua || 'Não identificado';
  const verifyUrl = window.location.origin + import.meta.env.BASE_URL + 'validar';
  const ElectronicValidationBox = () => (
    <div className="rda-validation mt-6 p-3 border-2 border-dashed border-blue-500 rounded-lg bg-blue-50/30 text-[8pt] text-slate-800 leading-snug text-left">
      <div className="font-bold text-blue-800 mb-2 text-center text-[9pt] uppercase tracking-wide border-b border-blue-300 pb-1">REGISTRO DE EMISSÃO / VALIDAÇÃO ELETRÔNICA G4F</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div><b>EMITIDO POR:</b> {data.currentUser.name} ({data.currentUser.username})</div>
        <div><b>PERFIL DO EMISSOR:</b> {data.currentUser.profile}</div>
        <div><b>DATA/HORA (Brasília):</b> {issuedDate}</div>
        <div><b>VERSÃO DO DOCUMENTO:</b> {record.revision}</div>
        <div><b>MÉTODO:</b> Sessão autenticada via senha individual</div>
        <div><b>IP DE ORIGEM:</b> {data.ip || 'Não identificado'}</div>
        <div><b>NAVEGADOR:</b> {browserInfo}</div>
        <div className="col-span-2"><b>LOCALIZAÇÃO INFORMADA PELO NAVEGADOR:</b> {data.location}</div>
        <div className="col-span-2 border-t border-blue-200 pt-1"><b>CÓDIGO DE AUTENTICIDADE:</b> <span className="font-mono font-bold break-all">{data.code}</span></div>
        <div className="col-span-2"><b>SHA-256 DO REGISTRO:</b> <span className="font-mono break-all">{record.sha256}</span></div>
        <div className="col-span-2"><b>CONSULTA:</b> <a className="text-blue-800 underline break-all" href={verifyUrl}>{verifyUrl}</a></div>
      </div>
      <p className="mt-2 text-slate-600 text-[7.5pt]">Registro de emissão; não comprova aprovação ou assinatura do colaborador ou preposto.</p>
    </div>
  );

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 1.2cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rda-table thead { display: table-header-group; }
          .rda-table tbody tr { break-inside: auto; page-break-inside: auto; }
          .rda-table th { break-inside: avoid; }
          .rda-activity-title { break-after: avoid; page-break-after: avoid; }
          .no-print { display: none; }
          .rda-signatures, .rda-validation { break-inside: avoid; page-break-inside: avoid; }
        }
        .rda-table th, .rda-table td { border: 1px solid #64748b; }
        .rda-table th { background-color: #e2e8f0; }
        .rda-activity-description { white-space: pre-wrap; overflow-wrap: anywhere; }
      `}} />
      
      <div className="max-w-[210mm] mx-auto print:max-w-none">
        <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-4">
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold uppercase tracking-tight">Relatório Diário de Atividade - RDA</h1>
            <p className="text-[10pt] font-semibold text-slate-800">Contrato: {data.contract} - G4F SOLUCOES CORPORATIVAS LTDA</p>
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

        <div className="rda-signatures mt-12 grid grid-cols-2 gap-12 items-start">
          <div className="text-center">
            <div className="min-h-[48px]" />
            <div className="border-t border-slate-800 pt-2">
              <p className="text-[10pt] font-bold uppercase">Assinatura do Colaborador</p>
              <p className="text-[9pt] text-slate-700 mt-1">{data.user.name}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="min-h-[48px]" />
            <div className="border-t border-slate-800 pt-2">
              <p className="text-[10pt] font-bold uppercase">Aprovação / Validação</p>
              <p className="text-[9pt] font-bold text-slate-800 mt-1">{approverName}</p>
              <p className="text-[8pt] text-slate-600">Preposto responsável</p>
            </div>
          </div>
        </div>
        <ElectronicValidationBox />

        <div className="mt-12 pt-4 border-t border-slate-200 text-[8px] text-slate-400 flex justify-between italic">
          <span>Relatório gerado via Portal RDA - G4F SOLUÇÕES</span>
          <span className="font-bold uppercase tracking-widest">Documento Interno</span>
        </div>
      </div>

      {printError && <p role="alert" className="no-print text-center text-red-700">{printError}</p>}
      <div className="no-print fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button disabled={printing} onClick={requestPrint} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all text-sm flex items-center gap-2">{printing ? "Registrando..." : "Imprimir RDA"}</button>
        <button onClick={() => navigate('/dashboard')} className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-all text-sm">Voltar ao Dashboard</button>
      </div>
    </div>
  );
};

export default ReportPrint;