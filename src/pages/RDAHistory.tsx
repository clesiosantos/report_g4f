import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { glpiService, RDAHistoryItem, RDAEvent, RDAPage } from '@/lib/glpi';

const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const labels = { EMISSAO: 'Emissão de nova versão', REUTILIZACAO: 'Geração sem alteração', REIMPRESSAO_SOLICITADA: 'Reimpressão solicitada' };

function Pager({ page, total, pageSize, setPage }: { page: number; total: number; pageSize: number; setPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="flex items-center gap-3 text-sm">
    <button className="border rounded px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
    <span>Página {page} de {pages}</span>
    <button className="border rounded px-3 py-1 disabled:opacity-40" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</button>
  </div>;
}

export default function RDAHistory() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const userId = Number(params.get('user_id'));
  const period = params.get('period') || '';
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<RDAPage<RDAHistoryItem> | null>(null);
  const [selected, setSelected] = useState('');
  const [eventPage, setEventPage] = useState(1);
  const [events, setEvents] = useState<RDAPage<RDAEvent> | null>(null);
  const [error, setError] = useState('');
  const [eventError, setEventError] = useState('');
  useEffect(() => {
    let active = true;
    setHistory(null); setError(''); setSelected(''); setEvents(null);
    if (!userId || !period) { setError('Selecione o colaborador e a competência no Dashboard.'); return; }
    glpiService.getRDAHistory(userId, period, page).then(r => { if (active) setHistory(r); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [userId, period, page]);
  useEffect(() => {
    let active = true;
    setEvents(null); setEventError('');
    if (!selected) return;
    glpiService.getRDAEvents(selected, eventPage).then(r => { if (active) setEvents(r); })
      .catch(e => { if (active) setEventError(e.message); });
    return () => { active = false; };
  }, [selected, eventPage]);
  return <main className="min-h-screen bg-slate-50 p-6">
    <section className="max-w-4xl mx-auto bg-white border rounded-lg p-6 space-y-5">
      <Link className="text-blue-700 underline text-sm" to="/dashboard">Voltar ao Dashboard</Link>
      <h1 className="text-xl font-bold">Histórico de emissões — Petro Tec</h1>
      <p className="text-sm text-slate-600">Competência: {period} · Colaborador ID {userId}</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!history && !error && <p>Carregando histórico...</p>}
      {history && history.total === 0 && <p>Nenhum relatório emitido para esta competência.</p>}
      {history?.items.map(item => <article key={item.code} className="border rounded p-4 space-y-2 text-sm">
        <div className="flex flex-wrap gap-3 items-center"><b>Versão {item.revision}</b><span className={item.revision === item.latest_revision ? 'text-green-800' : 'text-amber-800'}>{item.revision === item.latest_revision ? 'Última versão emitida' : 'Versão anterior'}</span></div>
        <p><b>Emissão:</b> {formatDate(item.issued_at)} — {item.issuer} ({item.issuer_profile})</p>
        <p><b>Chamados:</b> {item.ticket_count} · <b>Eventos auditados:</b> {item.event_count}</p>
        <p className="font-mono break-all">{item.code}</p>
        <div className="flex flex-wrap gap-4">
          <Link className="text-blue-700 underline" to={'/print?code=' + item.code}>Abrir / reimprimir</Link>
          <button className="text-blue-700 underline" onClick={() => { setEventPage(1); setSelected(selected === item.code ? '' : item.code); }}>{selected === item.code ? 'Ocultar eventos' : 'Ver eventos'}</button>
        </div>
        {selected === item.code && <div className="border-t pt-3 space-y-2">
          {eventError && <p className="text-red-700">{eventError}</p>}
          {!events && !eventError && <p>Carregando eventos...</p>}
          {events?.total === 0 && <p className="text-slate-600">Sem eventos auditados após a implantação do versionamento. A emissão original consta acima.</p>}
          {events?.items.map((e, i) => <div key={i} className="border-b pb-2"><b>{labels[e.evento] || e.evento}</b><p>{formatDate(e.occurred_at)} — {e.usuario_nome || e.usuario_login} ({e.perfil})</p></div>)}
          {events && events.total > 0 && <Pager page={eventPage} total={events.total} pageSize={events.page_size} setPage={setEventPage} />}
        </div>}
      </article>)}
      {history && history.total > 0 && <Pager page={page} total={history.total} pageSize={history.page_size} setPage={setPage} />}
    </section>
  </main>;
}
