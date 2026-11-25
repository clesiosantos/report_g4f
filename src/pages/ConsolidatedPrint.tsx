import { decodeGlpiLabel } from '@/lib/glpiLabel';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { glpiService, RDAGroupRecord, RDARecord } from '@/lib/glpi';
import { RDADocument, RDAPrintStyle } from '@/components/RDADocument';
import { useAuth } from '@/contexts/AuthContext';

export default function ConsolidatedPrint(){
  const {user}=useAuth();
  const allowed=[4,11].includes(user?.profile_id ?? 0);
  const code=new URLSearchParams(useLocation().search).get('code')||'';
  const [batch,setBatch]=useState<RDAGroupRecord|null>(null);
  const [records,setRecords]=useState<RDARecord[]>([]);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [printing,setPrinting]=useState(false);
  useEffect(()=>{
    let active=true;setBatch(null);setRecords([]);setError('');setReady(false);
    async function load(){
      try{
        const b=await glpiService.getGroupRDA(code);
        if(!active)return;
        setBatch(b);
        const loaded:RDARecord[]=[];
        for(const item of b.snapshot.items){
          if(!active)return;
          const r=await glpiService.getRDA(item.code);
          if(r.sha256!==item.sha256)throw new Error('Integridade individual divergente.');
          if(!active)return;
          loaded.push(r);setRecords([...loaded]);
        }
        if(active)setReady(true);
      }catch(e){if(active)setError(e instanceof Error?e.message:'Falha ao carregar.');}
    }
    if(allowed) load();return()=>{active=false;};
  },[code,allowed]);
  if(!allowed)return <main className="p-8">Perfil não autorizado. <Link to="/dashboard">Voltar</Link></main>;
  if(!ready||!batch||error)return <main className="p-8 space-y-3"><Link to="/consolidado">Voltar</Link>{error?<p role="alert" className="text-red-700">{error}</p>:<p>Carregando relatórios: {records.length} de {batch?.snapshot.items.length ?? '...'}</p>}</main>;
  const s=batch.snapshot;
  const general=s.group_id===0;
  const total=s.items.reduce((n,i)=>n+i.ticket_count,0);
  const withTickets=s.items.filter(i=>i.ticket_count>0).length;
  const requestPrint=async()=>{
    if(printing)return;
    setPrinting(true);
    try{await glpiService.registerGroupReprint(code);window.print();}
    catch(e){setError(e instanceof Error?e.message:'Falha na impressão.');}
    finally{setPrinting(false);}
  };
  return <main className="bg-white text-slate-900 p-8 print:p-0">
    <RDAPrintStyle/>
    <style>{'@media print { .rda-new-page { break-before: page; page-break-before: always; } .rda-index-row { break-inside: avoid; } }'}</style>
    <section className="max-w-[210mm] mx-auto print:max-w-none space-y-6">
      <img src="https://raw.githubusercontent.com/clesiosantos/glpihmg4f/main/LOGOAZUL.png" alt="G4F" className="h-12 w-auto"/>
      <h1 className="text-3xl font-bold border-b-2 border-slate-800 pb-4">RELATÓRIO CONSOLIDADO {general ? 'GERAL ' : ''}DE ATIVIDADES — PETROBRAS TEC</h1>
      <p><b>Contrato:</b> {s.contract} — G4F SOLUÇÕES CORPORATIVAS LTDA</p>
      <p><b>Gerência:</b> {decodeGlpiLabel(s.group_name)}</p><p><b>Competência:</b> {s.period}</p>
      <p><b>Escopo:</b> {s.scope==='ALL'?(general?'Todos os colaboradores das gerências e perfis operacionais':'Todos os colaboradores cadastrados na gerência'):'Equipe autorizada do preposto'}</p>
      <div className="grid grid-cols-2 gap-4 border p-4">
        <p><b>Colaboradores:</b> {s.items.length}</p><p><b>Chamados:</b> {total}</p>
        <p><b>Com atividades:</b> {withTickets}</p><p><b>Sem atividades:</b> {s.items.length-withTickets}</p>
      </div>
      <div className="border-2 border-blue-500 rounded p-4 space-y-2 text-sm break-words">
        <h2 className="font-bold text-blue-800">AUTENTICIDADE DO CONSOLIDADO</h2>
        <p><b>Emissor:</b> {s.issuer.name} ({s.issuer.username}) — {s.issuer.profile}</p>
        <p><b>Emissão (Brasília):</b> {new Date(s.issued_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>
        <p><b>Versão:</b> {batch.revision}</p><p><b>Código:</b> <span className="font-mono break-all">{s.code}</span></p>
        <p><b>SHA-256:</b> <span className="font-mono break-all">{batch.sha256}</span></p>
        <p><b>Consulta:</b> {window.location.origin+import.meta.env.BASE_URL+'validar'}</p>
        <p>Registro de emissão, não assinatura ou aprovação eletrônica.</p>
      </div>
    </section>
    <section className="rda-new-page max-w-[210mm] mx-auto print:max-w-none mt-8 print:mt-0">
      <h2 className="text-xl font-bold mb-4">Índice de colaboradores</h2>
      <table className="w-full rda-table border-collapse text-sm"><thead><tr><th className="p-2">Nº</th><th className="p-2 text-left">Colaborador</th>{general&&<th className="p-2 text-left">Gerência</th>}<th className="p-2">Versão</th><th className="p-2">Chamados</th></tr></thead>
      <tbody>{s.items.map((i,n)=><tr className="rda-index-row" key={i.code}><td className="p-2">{n+1}</td><td className="p-2">{i.name}</td>{general&&<td className="p-2">{decodeGlpiLabel(i.gerencia)||"Não informada"}</td>}<td className="p-2 text-center">{i.revision}</td><td className="p-2 text-center">{i.ticket_count}</td></tr>)}</tbody></table>
    </section>
    {records.map(r=><section className="rda-new-page mt-8 print:mt-0" key={r.snapshot.code}><RDADocument record={r}/></section>)}
    <div className="no-print fixed bottom-4 left-0 right-0 flex justify-center gap-4"><Link className="bg-white border rounded px-4 py-3" to="/consolidado">Voltar</Link><button disabled={printing} onClick={requestPrint} className="bg-blue-700 text-white rounded px-4 py-3">{printing?'Registrando...':'Imprimir / salvar PDF consolidado'}</button></div>
  </main>;
}
