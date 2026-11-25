import { useState } from 'react';
import { Link } from 'react-router-dom';
import { glpiService, RDAProof } from '@/lib/glpi';

export default function VerifyRDA() {
  const [code, setCode] = useState('');
  const [proof, setProof] = useState<RDAProof | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <section className="max-w-xl mx-auto mt-12 bg-white rounded-lg border p-6 space-y-5">
        <h1 className="text-xl font-bold text-slate-900">Consultar autenticidade do RDA — Petro Tec</h1>
        <p className="text-sm text-slate-600">Informe o código de 32 caracteres impresso no relatório.</p>
        <form className="space-y-3" onSubmit={async e => {
          e.preventDefault(); setLoading(true); setProof(null); setError('');
          try { setProof(await glpiService.verifyRDA(code.trim().toUpperCase())); }
          catch (err) { setError(err instanceof Error ? err.message : 'Consulta indisponível.'); }
          finally { setLoading(false); }
        }}>
          <label className="block font-semibold" htmlFor="code">Código de autenticidade</label>
          <input id="code" className="w-full border rounded p-3 font-mono uppercase" value={code} onChange={e => { setCode(e.target.value); setProof(null); setError(''); }} maxLength={32} minLength={32} pattern="[A-Fa-f0-9]{32}" required disabled={loading} />
          <button className="bg-blue-700 text-white px-4 py-2 rounded" disabled={loading}>{loading ? 'Consultando...' : 'Consultar'}</button>
        </form>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        {proof && <div className="border rounded p-4 space-y-2 text-sm break-words">
          <h2 className="text-green-800 font-bold">Registro de emissão localizado e íntegro</h2>
          <p><b>Contrato:</b> {proof.contract}</p>
          <p><b>Competência:</b> {proof.period}</p>
          <p><b>Emissão (Brasília):</b> {new Date(proof.issued_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <p><b>Chamados registrados:</b> {proof.ticket_count}</p>
          <p><b>Código:</b> <span className="font-mono break-all">{proof.code}</span></p>
          <p><b>SHA-256 do registro:</b> <span className="font-mono break-all">{proof.sha256}</span></p>
          <p className="text-slate-600">A consulta confirma o registro no sistema, não a identidade de um PDF externo nem uma assinatura. Compare o documento com a versão registrada.</p>
          <Link className="text-blue-700 underline" to={'/print?code=' + proof.code}>Consultar RDA original (acesso autorizado)</Link>
        </div>}
        <Link className="text-blue-700 underline text-sm" to="/">Voltar ao portal</Link>
      </section>
    </main>
  );
}
