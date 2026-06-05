'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDateBR, isAtrasado, statusBadgeClass, statusLabel } from '@/lib/shared-helpers'
import { TRANSICOES } from '@/lib/maquina-estados'

// ═══════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════

type Pacote = {
  codigo: string
  nf_remessa: string
  status: string
  destinatario: string | null
  endereco_entrega: string | null
  data_chegada: string
  data_limite_entrega: string | null
  entregador_id: number | null
  transportadora: string | null
  valor_pacote: number
  descricao: string | null
  quantidade: number
  foto: string | null
  entregadores: { nome: string; telefone: string } | null
}

type Stats = {
  total: number
  pendentesValidacao: number
  atrasados: number
  naCentral: number
}

type FiltroLista = 'todos' | 'pendentes' | 'atrasados' | 'central' | null

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

export default function AcompanhamentoTransportadoraPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [transportadoras, setTransportadoras] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAtivo, setFiltroAtivo] = useState<FiltroLista>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [novoStatusLote, setNovoStatusLote] = useState('')
  const [msg, setMsg] = useState('')
  const [filtroTransportadora, setFiltroTransportadora] = useState('')
  const [buscando, setBuscando] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/acompanhamento')
      if (!res.ok) {
        if (res.status === 401) return router.push('/login')
        throw new Error('Erro ao carregar')
      }
      const data = await res.json()
      setStats(data.stats)
      setPacotes(data.ultimosPacotes || [])
      setTransportadoras(data.transportadoras || [])
    } catch {
      setMsg('❌ Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { carregar() }, [carregar])

  // Filtrar pacotes conforme o card clicado + filtros extras
  const pacotesFiltrados = pacotes.filter(p => {
    // Filtro do card clicado
    if (filtroAtivo === 'pendentes' && p.status !== 'Entregue') return false
    if (filtroAtivo === 'atrasados' && !isAtrasado(p.data_limite_entrega)) return false
    if (filtroAtivo === 'central' && !['Recebido pela Central', 'Aguardando Retirada', 'Retornado a Central'].includes(p.status)) return false

    // Filtro transportadora
    if (filtroTransportadora && p.transportadora !== filtroTransportadora) return false

    // Busca por código ou destinatário
    if (buscando) {
      const busca = buscando.toLowerCase()
      const matchCodigo = p.codigo.toLowerCase().includes(busca)
      const matchDest = (p.destinatario || '').toLowerCase().includes(busca)
      const matchNF = (p.nf_remessa || '').toLowerCase().includes(busca)
      if (!matchCodigo && !matchDest && !matchNF) return false
    }

    return true
  })

  // Agrupa por transportadora para exibir nos cards
  const totalUnico = new Set(pacotes.map(p => p.codigo)).size
  const pendentesUnico = new Set(pacotes.filter(p => p.status === 'Entregue').map(p => p.codigo)).size
  const atrasadosUnico = new Set(pacotes.filter(p => isAtrasado(p.data_limite_entrega)).map(p => p.codigo)).size
  const centralUnico = new Set(pacotes.filter(p =>
    ['Recebido pela Central', 'Aguardando Retirada', 'Retornado a Central'].includes(p.status)
  ).map(p => p.codigo)).size

  // Stats reais (do banco) ou fallback para o filtro local
  const exibirStats = stats || {
    total: totalUnico,
    pendentesValidacao: pendentesUnico,
    atrasados: atrasadosUnico,
    naCentral: centralUnico,
  }

  // Cards
  const cards = [
    {
      key: 'todos' as FiltroLista,
      emoji: '📦',
      label: 'Total de Pacotes',
      valor: exibirStats.total,
      descricao: 'Todos os pacotes cadastrados pela central',
      cor: 'from-violet-600 to-indigo-600',
      corSombra: 'shadow-violet-200',
      corBg: 'bg-violet-50',
      corTexto: 'text-violet-700',
    },
    {
      key: 'pendentes' as FiltroLista,
      emoji: '⏳',
      label: 'Pendentes de Validação',
      valor: exibirStats.pendentesValidacao,
      descricao: 'Entregues com foto — aguardando sua validação',
      cor: 'from-amber-500 to-orange-500',
      corSombra: 'shadow-amber-200',
      corBg: 'bg-amber-50',
      corTexto: 'text-amber-700',
    },
    {
      key: 'atrasados' as FiltroLista,
      emoji: '🔴',
      label: 'Atrasados',
      valor: exibirStats.atrasados,
      descricao: 'Passaram da data limite de entrega',
      cor: 'from-red-500 to-rose-600',
      corSombra: 'shadow-red-200',
      corBg: 'bg-red-50',
      corTexto: 'text-red-700',
    },
    {
      key: 'central' as FiltroLista,
      emoji: '🏛️',
      label: 'Na Central',
      valor: exibirStats.naCentral,
      descricao: 'Recebidos, aguardando retirada ou retornados',
      cor: 'from-blue-500 to-sky-500',
      corSombra: 'shadow-blue-200',
      corBg: 'bg-blue-50',
      corTexto: 'text-blue-700',
    },
  ]

  function toggleSelect(codigo: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === pacotesFiltrados.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pacotesFiltrados.map(p => p.codigo)))
    }
  }

  function statusLink(pacote: Pacote): string {
    // Status que o admin pode avançar rapidamente
    if (pacote.status === 'Entregue') return 'Validado pelo Admin'
    if (pacote.status === 'Retornado a Central') return 'Aguardando Retirada'
    return ''
  }

  async function handleStatusClick(pacote: Pacote) {
    const destino = statusLink(pacote)
    if (!destino) {
      router.push(`/admin/pacote/${pacote.codigo}`)
      return
    }

    try {
      const res = await fetch(`/api/pacotes/${pacote.codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: destino }),
      })
      if (res.ok) {
        carregar()
        setMsg(`✅ ${pacote.codigo} → "${destino}"`)
        setTimeout(() => setMsg(''), 3000)
      } else {
        const data = await res.json()
        setMsg(`❌ ${data.erro || 'Erro ao atualizar'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão')
    }
  }

  async function alterarStatusLote() {
    if (selected.size === 0 || !novoStatusLote) return
    setAlterandoStatus(true)
    setMsg('')

    try {
      const res = await fetch('/api/admin/acompanhamento/lote-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigos: Array.from(selected),
          novoStatus: novoStatusLote,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✅ ${data.mensagem}`)
        setSelected(new Set())
        setNovoStatusLote('')
        carregar()
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao alterar status'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão')
    }
    setAlterandoStatus(false)
    setTimeout(() => setMsg(''), 5000)
  }

  function getTransicoesDisponiveis(): string[] {
    if (selected.size === 0) return []
    // Coleta status dos pacotes selecionados
    const statusSet = new Set<string>()
    for (const p of pacotes) {
      if (selected.has(p.codigo)) statusSet.add(p.status)
    }
    // Se todos são do mesmo status, mostra as transições válidas
    if (statusSet.size === 1) {
      const statusAtual = Array.from(statusSet)[0]
      return TRANSICOES[statusAtual] || []
    }
    // Se são de status diferentes, mostra opções comuns
    // (admin pode forçar qualquer transição, então mostra todas)
    return Object.keys(TRANSICOES)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🚚 Acompanhamento</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtroAtivo
              ? `Mostrando "${cards.find(c => c.key === filtroAtivo)?.label}"`
              : 'Visão geral de todos os pacotes nas transportadoras'}
            {filtroTransportadora && ` · ${filtroTransportadora}`}
          </p>
        </div>
        {filtroAtivo && (
          <button
            onClick={() => { setFiltroAtivo(null); setSelected(new Set()) }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            ✕ Limpar filtro
          </button>
        )}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          msg.startsWith('✅')
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-auto opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* === CARDS CLICÁVEIS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(card => (
          <button
            key={card.key}
            onClick={() => { setFiltroAtivo(card.key === filtroAtivo ? null : card.key); setSelected(new Set()) }}
            className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 border-2 ${
              filtroAtivo === card.key
                ? 'border-gray-900 shadow-lg scale-[1.02]'
                : 'border-gray-100 hover:border-gray-300 hover:shadow-md'
            } ${card.corBg}`}
          >
            {/* Gradiente decorativo no canto */}
            <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${card.cor} opacity-10`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{card.emoji}</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {filtroAtivo === card.key ? 'ATIVO' : 'CLICAR'}
                </span>
              </div>
              <p className={`text-3xl font-black ${card.corTexto} mb-1`}>
                {loading ? '...' : card.valor.toLocaleString('pt-BR')}
              </p>
              <p className="text-sm font-bold text-gray-900 mb-0.5">{card.label}</p>
              <p className="text-xs text-gray-500 leading-snug">{card.descricao}</p>
            </div>
          </button>
        ))}
      </div>

      {/* === FILTROS ADICIONAIS === */}
      <div className="content-card p-3 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <input
              type="text"
              value={buscando}
              onChange={e => setBuscando(e.target.value)}
              placeholder="🔍 Buscar por código, NF ou destinatário..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          {/* Filtro transportadora */}
          <select
            value={filtroTransportadora}
            onChange={e => setFiltroTransportadora(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm border border-gray-200 bg-white min-w-[180px]"
          >
            <option value="">🚚 Todas transportadoras</option>
            {transportadoras.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {selected.size > 0 && (
            <span className="text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg">
              {selected.size} selecionado(s)
            </span>
          )}
        </div>
      </div>

      {/* === BARRA DE AÇÃO EM LOTE === */}
      {selected.size > 0 && (
        <div className="mb-5 p-4 rounded-2xl bg-violet-50 border-2 border-violet-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-violet-900">
              ⚡ {selected.size} pacote(s) selecionado(s)
            </span>

            <div className="w-px h-6 bg-violet-200" />

            <select
              value={novoStatusLote}
              onChange={e => setNovoStatusLote(e.target.value)}
              className="px-4 py-2 rounded-xl text-sm border border-violet-200 bg-white min-w-[220px]"
            >
              <option value="">Alterar status para...</option>
              {getTransicoesDisponiveis().map(s => (
                <option key={s} value={s}>→ {s}</option>
              ))}
            </select>

            <button
              onClick={alterarStatusLote}
              disabled={alterandoStatus || !novoStatusLote}
              className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-200"
            >
              {alterandoStatus ? 'Alterando...' : '✅ Aplicar'}
            </button>

            <button
              onClick={() => { setSelected(new Set()); setNovoStatusLote('') }}
              className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-white transition"
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* === LOADING === */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
            Carregando...
          </div>
        </div>
      )}

      {/* === LISTA DE PACOTES === */}
      {!loading && (
        <>
          {pacotesFiltrados.length === 0 ? (
            <div className="content-card p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <span className="text-3xl">📭</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum pacote encontrado</h3>
              <p className="text-sm text-gray-500">
                {filtroAtivo
                  ? `Nenhum pacote na categoria "${cards.find(c => c.key === filtroAtivo)?.label}"`
                  : 'Nenhum pacote cadastrado ainda'}
                {filtroTransportadora && ` para ${filtroTransportadora}`}
              </p>
            </div>
          ) : (
            <>
              {/* SELECT ALL */}
              <div className="flex items-center gap-3 mb-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.size === pacotesFiltrados.length && pacotesFiltrados.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-sm font-medium text-gray-600">
                    {selected.size === pacotesFiltrados.length
                      ? 'Desmarcar todos'
                      : `Selecionar todos (${pacotesFiltrados.length})`}
                  </span>
                </label>

                <span className="text-xs text-gray-400">
                  {filtroAtivo
                    ? `Filtrando por: ${cards.find(c => c.key === filtroAtivo)?.label}`
                    : 'Últimos 50 pacotes cadastrados'}
                  {filtroTransportadora && ` · ${filtroTransportadora}`}
                </span>
              </div>

              {/* CARDS DE PACOTES */}
              <div className="space-y-2">
                {pacotesFiltrados.map(p => {
                  const atrasado = isAtrasado(p.data_limite_entrega)
                  const acaoRapida = statusLink(p)

                  return (
                    <div
                      key={p.codigo}
                      className={`content-card transition-all border-2 ${
                        selected.has(p.codigo)
                          ? 'border-violet-400 bg-violet-50/50'
                          : atrasado && p.status !== 'Entregue' && p.status !== 'Validado pelo Admin'
                            ? 'border-red-200 bg-red-50/30'
                            : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={selected.has(p.codigo)}
                            onChange={() => toggleSelect(p.codigo)}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mt-1"
                          />

                          {/* Info do pacote — clicável para ir ao detalhe */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-gray-900 font-mono">{p.codigo}</span>
                              {p.nf_remessa && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono">
                                  NF: {p.nf_remessa}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(p.status)}`}>
                                {statusLabel(p.status)}
                              </span>
                              {atrasado && p.status !== 'Entregue' && p.status !== 'Validado pelo Admin' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                                  🔴 Atrasado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                              <span>👤 {p.destinatario || 'Sem destinatário'}</span>
                              <span>📅 {formatDateBR(p.data_chegada)}</span>
                              <span>🚚 {p.transportadora || '-'}</span>
                              <span>💰 {formatCurrency(p.valor_pacote)}</span>
                            </div>
                            {p.endereco_entrega && (
                              <p className="text-xs text-gray-400 mt-1 truncate max-w-xl">
                                📍 {p.endereco_entrega}
                              </p>
                            )}
                          </div>

                          {/* Ações rápidas */}
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {acaoRapida ? (
                              <button
                                onClick={() => handleStatusClick(p)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition shadow-sm"
                                title={`Avançar para: ${acaoRapida}`}
                              >
                                ✅ {acaoRapida === 'Validado pelo Admin' ? 'Validar' : 'Avançar'}
                              </button>
                            ) : (
                              <button
                                onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                              >
                                👁️ Detalhes
                              </button>
                            )}
                            {p.foto && (
                              <a
                                href={p.foto}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-center"
                                onClick={e => e.stopPropagation()}
                              >
                                📸 Foto
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
