import { decodeGlpiLabel } from '@/lib/glpiLabel';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { glpiService, RDAGroup, RDAGroupMember, RDAGroupHistory } from '@/lib/glpi';
import { getIssueLocation } from '@/lib/issueLocation';
import { useAuth } from '@/contexts/AuthContext';

export default function ConsolidatedRDA() {
  const navigate=useNavigate();
  const location=useLocation();
  const {user}=useAuth();
  const [groups,setGroups]=useState<RDAGroup[]>([]);
  const [periods,setPeriods]=useState<string[]>([]);
  const [group,setGroup]=useState(0);
  const [period,setPeriod]=useState('');
  const [members,setMembers]=useState<RDAGroupMember[]>([]);
  const [history,setHistory]=useState<RDAGroupHistory|null>(null);
  const [page,setPage]=useState(1);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [progress,setProgress]=useState({done:0,total:0,name:''});
  const running=useRef(false);
  const allowed=[4,11].includes(user?.profile_id ?? 0);
  useEffect(()=>{
    if(!allowed)return;
    let active=true;
    Promise.all([glpiService.getGroups(),glpiService.getPeriods()]).then(([g,p])=>{
      if(!active)return;
      setGroups(g);setPeriods(p);
      const requested=new URLSearchParams(location.search).get('period') || '';
      setPeriod(p.includes(requested)?requested:p[0] || '');
      setGroup(g[0]?.id || 0);
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[allowed,location.search]);
  useEffect(()=>{
    let active=true;setMembers([]);setHistory(null);
    if(!group)return;
    setLoading(true);setError('');
    glpiService.getGroupMembers(group).then(r=>{if(active)setMembers(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[group]);
  useEffect(()=>{
    let active=true;setHistory(null);
    if(!group||!period)return;
    glpiService.getGroupHistory(group,period,page).then(r=>{if(active)setHistory(r);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[group,period,page]);
  const generate=async()=>{
    if(running.current||!group||!period||loading)return;
    running.current=true;setBusy(true);setError('');
    try{
      const roster=await glpiService.getGroupMembers(group);
      if(!roster.length)throw new Error('Nenhum colaborador autorizado.');
      const geo=await getIssueLocation();
      const codes:Record<string,string>={};
      let done=0;
      for(const person of roster){
        setProgress({done,total:roster.length,name:person.name});
        const record=await glpiService.issueRDA(person.id,period,geo);
        codes[String(person.id)]=record.snapshot.code;
        done++;setProgress({done,total:roster.length,name:person.name});
      }
      const record=await glpiService.issueGroup(group,period,codes);
      navigate('/consolidado/print?code='+record.snapshot.code);
    }catch(e){setError((e instanceof Error?e.message:'Falha ao gerar consolidado.')+' As emissões individuais já concluídas permanecem registradas; tente novamente.');}
    finally{running.current=false;setBusy(false);}
  };
  if(!allowed)return <main className="p-8">Perfil não autorizado. <Link to="/dashboard">Voltar</Link></main>;
  return <main className="min-h-screen bg-slate-50 p-6">
    <section className="max-w-5xl mx-auto rounded-lg bg-white border p-6 space-y-5">
      <Link to="/dashboard" className="text-blue-700 underline">Voltar ao RDA Individual</Link>
      <h1 className="text-2xl font-bold">RDA Consolidado por Gerência</h1>
      <p className="text-sm text-slate-600">Selecione a competência e a gerência de lotação. O documento reúne todos os colaboradores autorizados, inclusive aqueles sem atividades registradas.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1"><span className="block font-semibold">Competência</span><select className="border rounded p-2 w-full" value={period} disabled={busy} onChange={e=>{setPeriod(e.target.value);setPage(1);}}>{periods.map(p=><option key={p}>{p}</option>)}</select></label>
        <label className="space-y-1"><span className="block font-semibold">Gerência de lotação</span><select className="border rounded p-2 w-full" value={group} disabled={busy} onChange={e=>{setGroup(Number(e.target.value));setPage(1);}}>{groups.map(g=><option key={g.id} value={g.id}>{decodeGlpiLabel(g.name)} ({g.count})</option>)}</select></label>
      </div>
      {error&&<p role="alert" className="text-red-700">{error}</p>}
      {loading?<p>Carregando colaboradores...</p>:<div className="border rounded p-4">
        <h2 className="font-semibold">{members.length} colaboradores autorizados</h2>
        <div className="max-h-60 overflow-y-auto mt-2 text-sm">{members.map(m=><div key={m.id} className="border-b py-1">{m.name}{!m.active?' (inativo)':''}</div>)}</div>
      </div>}
      <button className="bg-blue-700 text-white rounded px-5 py-3 disabled:opacity-50" disabled={busy||loading||!members.length||!period} onClick={generate}>{busy?'Gerando...':'Gerar RDA Consolidado'}</button>
      {busy&&<div className="space-y-2"><p>Processando {progress.done} de {progress.total}: {progress.name}</p><progress className="w-full" max={Math.max(1,progress.total)} value={progress.done}/><p className="text-sm">Mantenha esta página aberta até finalizar.</p></div>}
      <div className="border-t pt-4 space-y-3"><h2 className="font-bold">Histórico de consolidados</h2>
        {history?.items.length===0&&<p>Nenhuma emissão neste filtro.</p>}
        {history?.items.map(r=><div key={r.code} className="border rounded p-3 flex flex-wrap justify-between gap-2 text-sm"><div><b>V{r.revision}</b> · {r.revision===r.latest_revision?'Última versão emitida':'Versão anterior'} · {r.count} colaboradores<br/>{new Date(r.issued_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</div><Link className="text-blue-700 underline" to={'/consolidado/print?code='+r.code}>Abrir / reimprimir</Link></div>)}
        <div className="flex gap-3"><button disabled={page<=1||busy} onClick={()=>setPage(page-1)} className="border rounded px-3 disabled:opacity-40">Anterior</button><span>Página {page}</span><button disabled={!history?.has_more||busy} onClick={()=>setPage(page+1)} className="border rounded px-3 disabled:opacity-40">Próxima</button></div>
      </div>
    </section>
  </main>;
}
