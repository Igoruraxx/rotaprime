'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import WhatsAppButton from '@/components/whatsapp-button'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

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

type FiltroPeriodo = 'hoje' | '7d' | '15d' | '60d'

const STATUS_BADGE: Record<string, string> = {
  'Recebido pela Central': 'bg-gray-100 text-gray-500',
  'Aguardando Retirada': 'bg-amber-500 text-white',
  'Retirado pelo Entregador': 'bg-violet-500 text-white',
  'Em Rota': 'bg-violet-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

const PERIODOS: { key: FiltroPeriodo; label: string }[] = [
  { key: 'hoje', label: '📅 Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '15d', label: '15 dias' },
  { key: '60d', label: '60 dias' },
]

function filtrarPorPeriodo(dataChegada: string, periodo: FiltroPeriodo): boolean {
  if (periodo === 'hoje') {
    const hoje = new Date()
    const d = new Date(dataChegada)
    return d.toDateString() === hoje.toDateString()
  }
  const limite = new Date()
  const dias = periodo === '7d' ? 7 : periodo === '15d' ? 15 : 60
  limite.setDate(limite.getDate() - dias)
  return new Date(dataChegada) >= limite
}

export default function PacotesPage() {
  const router = useRouter()
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [transportadoras, setTransportadoras] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('hoje')
  const [filtroEntregador, setFiltroEntregador] = useState('')
  const [filtroTransportadora, setFiltroTransportadora] = useState('')
  const [msg, setMsg] = useState('')

  // Batch select
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchEntregador, setBatchEntregador] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/pacotes')
      const data = await res.json()
      setPacotes(data.pacotes || [])
    } catch {
      setPacotes([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
    fetch('/api/transportadoras')
      .then(r => r.json())
      .then(data => {
        const nomes = (data.transportadoras || []).map((t: any) => t.nome)
        setTransportadoras(nomes)
      })
  }, [carregar])

  // Filtrar
  const filtrados = pacotes.filter(p => {
    if (filtroEntregador) {
      const nomeEntregador = (p.entregadores as { nome: string } | null)?.nome || ''
      if (!nomeEntregador.toLowerCase().includes(filtroEntregador.toLowerCase())) return false
    }
    if (filtroTransportadora) {
      if ((p.transportadora || '') !== filtroTransportadora) return false
    }
    if (!filtrarPorPeriodo(p.data_chegada, filtroPeriodo)) return false
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
    <FeatureGuard feature={FEATURES.PACOTES_CRUD}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📦 Pacotes</h2>
            <p className="text-sm text-gray-500 mt-0.5">{filtrados.length} pacote(s) · {pacotes.length} no total</p>
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

        {/* === PERÍODO + FILTROS === */}
        <div className="content-card p-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-gray-100 p-0.5 gap-0.5">
              {PERIODOS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setFiltroPeriodo(p.key); setSelected(new Set()) }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    filtroPeriodo === p.key
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  } ${p.key === 'hoje' ? 'min-w-[90px]' : ''}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

            <select
              value={filtroEntregador}
              onChange={e => { setFiltroEntregador(e.target.value); setSelected(new Set()) }}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white"
            >
              <option value="">👤 Todos entregadores</option>
              {entregadores.map(e => (
                <option key={e.id} value={e.nome}>{e.nome}</option>
              ))}
            </select>

            <select
              value={filtroTransportadora}
              onChange={e => { setFiltroTransportadora(e.target.value); setSelected(new Set()) }}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white"
            >
              <option value="">🚚 Todas transportadoras</option>
              {transportadoras.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
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
                      className="px-3 py-1.5 rounded-lg text-sm min-w-[160px] border border-gray-200"
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
            <p className="text-sm">Nenhum pacote encontrado no período</p>
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
                    <th className="p-3 font-medium whitespace-nowrap">Status</th>
                    <th className="p-3 font-medium whitespace-nowrap">Entregador</th>
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
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status] || 'bg-gray-100 text-gray-500'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{(p.entregadores as { nome: string } | null)?.nome || '—'}</td>
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
    </FeatureGuard>
  )
}
