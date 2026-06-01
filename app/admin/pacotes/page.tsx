'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WhatsAppButton from '@/components/whatsapp-button'

type Pacote = {
  codigo: string
  nf_remessa: string
  status: string
  destinatario: string | null
  endereco_entrega: string | null
  entregadores: { nome: string; telefone: string } | null
  entregador_id: number | null
  data_chegada: string
  data_limite_entrega: string | null
  pago: boolean
  transportadora: string | null
}

type Entregador = { id: number; nome: string }

const STATUS_BADGE: Record<string, string> = {
  'Recebido pela Central': 'bg-gray-100 text-gray-500',
  'Aguardando Retirada': 'bg-amber-500 text-white',
  'Retirado pelo Entregador': 'bg-violet-500 text-white',
  'Em Rota': 'bg-violet-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

const REGIOES = {
  'CENTRO': 'Zona Central',
  'NORTE': 'Zona Norte',
  'SUL': 'Zona Sul',
  'LESTE': 'Zona Leste',
  'OESTE': 'Zona Oeste',
} as const

const FILTROS_STATUS = [
  { value: '', label: 'Todos' },
  { value: 'Recebido pela Central', label: 'Na Central' },
  { value: 'Aguardando Retirada', label: 'Aguardando Retirada' },
  { value: 'Retirado pelo Entregador', label: 'Retirado' },
  { value: 'Em Rota', label: 'Em Rota' },
  { value: 'Entregue', label: 'Entregue' },
  { value: 'Retornado a Central', label: 'Retornado' },
  { value: 'Validado pelo Admin', label: 'Validado' },
]

function extractRegiao(endereco: string | null): string | null {
  if (!endereco) return null
  const upper = endereco.toUpperCase()
  for (const [key, value] of Object.entries(REGIOES)) {
    if (upper.includes(key)) return value
  }
  // Tentar extrair bairro comum entre parênteses ou após vírgula
  const match = endereco.match(/\(([^)]+)\)/)
  if (match) return match[1].trim()
  return null
}

export default function PacotesPage() {
  const router = useRouter()
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroEntregador, setFiltroEntregador] = useState('')
  const [filtroRegiao, setFiltroRegiao] = useState('')
  const [msg, setMsg] = useState('')

  // Batch select
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchEntregador, setBatchEntregador] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroStatus) params.set('status', filtroStatus)
    if (busca) params.set('busca', busca)

    try {
      const res = await fetch(`/api/pacotes?${params}`)
      const data = await res.json()
      setPacotes(data.pacotes || [])
    } catch {
      setPacotes([])
    }
    setLoading(false)
  }, [busca, filtroStatus])

  useEffect(() => {
    carregar()
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }, [carregar])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    carregar()
  }

  // Filtrar localmente por entregador e região
  const filtrados = pacotes.filter(p => {
    if (filtroEntregador) {
      const nomeEntregador = (p.entregadores as { nome: string } | null)?.nome || ''
      if (!nomeEntregador.toLowerCase().includes(filtroEntregador.toLowerCase())) return false
    }
    if (filtroRegiao) {
      const regiao = extractRegiao((p as Record<string, unknown>).endereco_entrega as string | null)
      if (regiao !== filtroRegiao) return false
    }
    return true
  })

  function toggleSelect(codigo: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtrados.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtrados.map(p => p.codigo)))
    }
  }

  async function atribuirLote() {
    if (selected.size === 0 || !batchEntregador) return
    setBatchLoading(true)
    setMsg('')

    try {
      const res = await fetch('/api/pacotes/lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigos: Array.from(selected),
          entregador_id: parseInt(batchEntregador),
        })
      })
      const data = await res.json()
      if (res.ok) {
        const nomeEntregador = entregadores.find(e => e.id === parseInt(batchEntregador))?.nome || ''
        setMsg(`✅ ${data.mensagem} → ${nomeEntregador}`)
        setSelected(new Set())
        setBatchEntregador('')
        carregar()
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao atribuir'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão')
    }
    setBatchLoading(false)
    setTimeout(() => setMsg(''), 4000)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📦 Pacotes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{pacotes.length} pacote(s) no total</p>
        </div>
        <a href="/admin/registrar" className="btn-primary px-5 py-2.5 rounded-xl text-sm">
          ➕ Novo
        </a>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 bg-violet-50 text-violet-700 border border-violet-200">
          <span>{msg}</span>
        </div>
      )}

      {/* === BARRA DE PESQUISA + FILTROS === */}
      <div className="content-card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="flex gap-2">
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Código, NFe ou destinatário..."
                className="flex-1 px-3 py-2 rounded-lg text-sm"
              />
              <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition font-medium">
                🔍
              </button>
            </div>
          </form>

          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setSelected(new Set()) }} className="w-full px-3 py-2 rounded-lg text-sm">
              {FILTROS_STATUS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Entregador</label>
            <select value={filtroEntregador} onChange={e => { setFiltroEntregador(e.target.value); setSelected(new Set()) }} className="w-full px-3 py-2 rounded-lg text-sm">
              <option value="">Todos</option>
              {entregadores.map(e => (
                <option key={e.id} value={e.nome}>{e.nome}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Região</label>
            <select value={filtroRegiao} onChange={e => { setFiltroRegiao(e.target.value); setSelected(new Set()) }} className="w-full px-3 py-2 rounded-lg text-sm">
              <option value="">Todas</option>
              {Object.entries(REGIOES).map(([k, v]) => (
                <option key={k} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* === BARRA DE AÇÃO EM LOTE === */}
      {filtrados.length > 0 && (
        <div className={`mb-4 p-3 rounded-xl border transition-all ${
          selected.size > 0
            ? 'bg-violet-50 border-violet-200'
            : 'bg-gray-50 border-gray-100'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={selected.size > 0 && selected.size === filtrados.length}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="font-medium">{selected.size > 0 ? `${selected.size} selecionado(s)` : 'Selecionar todos'}</span>
            </label>

            {selected.size > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <label className="text-xs text-gray-500 whitespace-nowrap">Atribuir a:</label>
                  <select
                    value={batchEntregador}
                    onChange={e => setBatchEntregador(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm min-w-[160px]"
                  >
                    <option value="">Selecionar entregador...</option>
                    {entregadores.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                  <button
                    onClick={atribuirLote}
                    disabled={batchLoading || !batchEntregador}
                    className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {batchLoading ? '...' : '📤 Atribuir'}
                  </button>
                </div>

                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  Limpar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
            Carregando...
          </div>
        </div>
      )}

      {/* TABELA */}
      {!loading && filtrados.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">Nenhum pacote encontrado</p>
          <a href="/admin/registrar" className="link-btn mt-3 inline-flex">➕ Registrar primeiro pacote</a>
        </div>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="content-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === filtrados.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="p-3 font-medium whitespace-nowrap">Pacote / NFe</th>
                  <th className="p-3 font-medium whitespace-nowrap">Destinatário</th>
                  <th className="p-3 font-medium whitespace-nowrap">Status</th>
                  <th className="p-3 font-medium whitespace-nowrap">Entregador</th>
                  <th className="p-3 font-medium whitespace-nowrap">Chegada</th>
                  <th className="p-3 font-medium whitespace-nowrap">Prazo</th>
                  <th className="p-3 font-medium whitespace-nowrap">Transportadora</th>
                  <th className="p-3 font-medium text-center">Pago</th>
                  <th className="p-3 font-medium text-center w-10">📱</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p => (
                  <tr
                    key={p.codigo}
                    onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                    className={`border-b border-gray-100 last:border-0 hover:bg-violet-50 transition cursor-pointer ${
                      selected.has(p.codigo) ? 'bg-violet-50' : ''
                    }`}
                  >
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(p.codigo)}
                        onChange={() => toggleSelect(p.codigo)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3">
                      <span className="link-btn-sm">{p.codigo}</span>
                      {p.nf_remessa && (
                        <span className="text-[10px] text-gray-400 block mt-0.5">{p.nf_remessa}</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{p.destinatario || '—'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{(p.entregadores as { nome: string } | null)?.nome || '—'}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {p.data_chegada
                        ? new Date(p.data_chegada).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="p-3 text-xs">
                      {p.data_limite_entrega ? (
                        <span className={`font-medium ${new Date(p.data_limite_entrega) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>
                          {new Date(p.data_limite_entrega).toLocaleDateString('pt-BR')}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">{p.transportadora || '—'}</td>
                    <td className="p-3 text-center">
                      {p.pago ? (
                        <span className="text-emerald-500 text-xs font-medium">✅</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                      {p.entregadores && (
                        <WhatsAppButton
                          entregadorNome={(p.entregadores as { nome: string; telefone: string } | null)?.nome || ''}
                          entregadorId={p.entregador_id}
                          entregadorTelefone={(p.entregadores as { nome: string; telefone: string } | null)?.telefone}
                          pacoteCodigo={p.codigo}
                          endereco={p.endereco_entrega}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
