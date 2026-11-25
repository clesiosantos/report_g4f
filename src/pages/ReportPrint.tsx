"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RDARecord, glpiService } from '@/lib/glpi';
import { RDADocument, RDAPrintStyle } from '@/components/RDADocument';

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
  const requestPrint = async () => {
    if (printing || !data) return;
    setPrinting(true); setPrintError('');
    try { await glpiService.registerReprint(data.code); window.print(); }
    catch (err) { setPrintError(err instanceof Error ? err.message : 'Falha ao registrar reimpressão.'); }
    finally { setPrinting(false); }
  };

  if (error) return <div className="p-8 text-center"><p>{error}</p><button className="underline mt-4" onClick={() => navigate('/dashboard')}>Voltar ao Dashboard</button></div>;
  if (!data || !record) return <div className="p-20 text-center text-slate-400">Consultando emissão registrada...</div>;

  return (
    <div className="bg-white min-h-screen p-8 print:p-0 font-sans text-slate-900">
      <RDAPrintStyle />
      <RDADocument record={record} />

      {printError && <p role="alert" className="no-print text-center text-red-700">{printError}</p>}
      <div className="no-print fixed bottom-6 left-0 right-0 flex justify-center gap-4 z-50">
        <button disabled={printing} onClick={requestPrint} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold shadow-2xl hover:bg-blue-700 transition-all text-sm flex items-center gap-2">{printing ? "Registrando..." : "Imprimir RDA"}</button>
        <button onClick={() => navigate('/dashboard')} className="bg-white border border-slate-300 text-slate-700 px-8 py-2.5 rounded-full font-bold shadow-lg hover:bg-slate-50 transition-all text-sm">Voltar ao Dashboard</button>
      </div>
    </div>
  );
};

export default ReportPrint;