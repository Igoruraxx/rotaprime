'use client'

import { useEffect, useState } from 'react'

type Pacote = {
  codigo: string
  data_chegada: string
  nf_remessa: string
  status: string
  endereco_entrega: string
  data_limite_entrega: string
  data_repassado_entregador: string
  tentativa_atual: number
  entregadores: { nome: string } | null
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    'Entregue': 'bg-emerald-500/15 text-emerald-300',
    'Validado pelo Admin': 'bg-emerald-500/15 text-emerald-300',
    'Retornado a Central': 'bg-red-500/15 text-red-300',
    'Recebido pela Central': 'bg-amber-500/15 text-amber-300',
    'Aguardando Retirada': 'bg-amber-500/15 text-amber-300',
    'Retirado pelo Entregador': 'bg-amber-500/15 text-amber-300',
  }
  return map[status] || 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
}

export default function PacotesPage() {
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    fetch('/api/pacotes')
      .then(r => r.json())
      .then(data => setPacotes(data.pacotes || []))
  }, [])

  const filtered = pacotes.filter(p => {
    if (filtroStatus && p.status !== filtroStatus) return false
    if (busca) {
      const q = busca.toLowerCase()
      if (!p.codigo.toLowerCase().includes(q) && !(p.nf_remessa || '').toLowerCase().includes(q) && !(p.entregadores?.nome || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const statusList = Array.from(new Set(pacotes.map(p => p.status)))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Pacotes</h2>
        <a href="/admin/registrar" className="btn-primary">
          + Novo
        </a>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por código, NF ou entregador..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg text-sm"
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
        >
          <option value="">Todos os status</option>
          {statusList.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="content-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/40 border-b border-white/[0.08]">
              <th className="p-3">Código</th>
              <th className="p-3">Chegada</th>
              <th className="p-3">NF</th>
              <th className="p-3">Status</th>
              <th className="p-3">Entregador</th>
              <th className="p-3">Repassado</th>
              <th className="p-3">Limite</th>
              <th className="p-3">Tent.</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.codigo} className="border-b border-white/[0.08] last:border-0 hover:bg-white/[0.06]">
                <td className="p-3">
                  <a href={`/admin/pacote/${p.codigo}`} className="link-btn-sm">
                    {p.codigo}
                  </a>
                </td>
                <td className="p-3 text-white/60">{new Date(p.data_chegada).toLocaleDateString('pt-BR')}</td>
                <td className="p-3 text-white/60">{p.nf_remessa || '—'}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-white/60">{p.entregadores?.nome || '—'}</td>
                <td className="p-3 text-white/60">
                  {p.data_repassado_entregador ? new Date(p.data_repassado_entregador).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-3 text-white/60">
                  {p.data_limite_entrega ? new Date(p.data_limite_entrega).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-3 text-white/60">{p.tentativa_atual || 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-white/30">Nenhum pacote encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
