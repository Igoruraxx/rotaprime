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
        <h2 className="text-2xl font-bold text-gray-800">Pacotes</h2>
        <a href="/admin/registrar" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
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
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos os status</option>
          {statusList.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b bg-gray-50">
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
              <tr key={p.codigo} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3">
                  <a href={`/admin/pacote/${p.codigo}`} className="text-blue-600 hover:underline font-medium">
                    {p.codigo}
                  </a>
                </td>
                <td className="p-3 text-gray-600">{new Date(p.data_chegada).toLocaleDateString('pt-BR')}</td>
                <td className="p-3 text-gray-600">{p.nf_remessa || '—'}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-gray-600">{p.entregadores?.nome || '—'}</td>
                <td className="p-3 text-gray-600">
                  {p.data_repassado_entregador ? new Date(p.data_repassado_entregador).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-3 text-gray-600">
                  {p.data_limite_entrega ? new Date(p.data_limite_entrega).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="p-3 text-gray-600">{p.tentativa_atual || 0}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400">Nenhum pacote encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
