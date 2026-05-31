'use client'

import { useEffect, useState } from 'react'

type Stats = {
  total: number
  validar: number
  atrasados: number
  central: number
}

type Pacote = {
  codigo: string
  data_chegada: string
  status: string
  endereco_entrega: string
  data_limite_entrega: string
  entregadores: { nome: string } | null
}

type Entregador = {
  id: number
  nome: string
  ativo: boolean
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() || ''
  if (s.includes('entregue')) return 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/25'
  if (s.includes('retornado') || s.includes('devolvido')) return 'bg-red-500/25 text-red-200 border border-red-500/25'
  if (s.includes('recebido') || s.includes('retirado')) return 'bg-amber-500/25 text-amber-200 border border-amber-500/25'
  if (s.includes('validado')) return 'bg-emerald-600/25 text-emerald-200 border border-emerald-500/25'
  return 'bg-violet-500/25 text-violet-200 border border-violet-500/25'
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [entregadores, setEntregadores] = useState<Entregador[]>([])

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setStats(data.stats)
        setPacotes(data.ultimosPacotes || [])
        setEntregadores(data.entregadores || [])
      })
  }, [])

  const cards = [
    { label: 'Total de Pacotes', value: stats?.total || 0 },
    { label: 'Pendentes Validação', value: stats?.validar || 0 },
    { label: 'Atrasados', value: stats?.atrasados || 0 },
    { label: 'Na Central', value: stats?.central || 0 },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className="content-card p-4">
            <div className="w-full h-0.5 bg-gradient-to-r from-violet-600/55 to-purple-600/20 rounded-full mb-3" />
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-white/40">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Ultimos Pacotes */}
      <div className="content-card p-4 mb-6">
        <h3 className="font-semibold text-white mb-3">Ultimos Pacotes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/[0.08]">
                <th className="pb-2 pr-4">Codigo</th>
                <th className="pb-2 pr-4">Chegada</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Entregador</th>
                <th className="pb-2">Data Limite</th>
              </tr>
            </thead>
            <tbody>
              {pacotes.map(p => (
                <tr key={p.codigo} className="border-b border-white/[0.08] last:border-0 hover:bg-white/[0.06]">
                  <td className="py-2 pr-4">
                    <a href={`/admin/pacote/${p.codigo}`} className="link-btn-sm">
                      {p.codigo}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-white/60">{new Date(p.data_chegada).toLocaleDateString('pt-BR')}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-white/60">{p.entregadores?.nome || '—'}</td>
                  <td className="py-2 text-white/60">
                    {p.data_limite_entrega ? new Date(p.data_limite_entrega).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
              {pacotes.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-white/30">Nenhum pacote registrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entregadores Ativos */}
      <div className="content-card p-4">
        <h3 className="font-semibold text-white mb-3">Entregadores Ativos</h3>
        <div className="flex flex-wrap gap-2">
          {entregadores.map(e => (
            <span key={e.id} className="px-3 py-1 bg-violet-500/25 text-violet-200 border border-violet-500/30 rounded-full text-sm">
              {e.nome}
            </span>
          ))}
          {entregadores.length === 0 && (
            <p className="text-sm text-white/30">Nenhum entregador cadastrado</p>
          )}
        </div>
      </div>
    </div>
  )
}
