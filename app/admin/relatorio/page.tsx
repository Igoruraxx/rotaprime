'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  statusBadgeClass,
  statusLabel,
  formatCurrency,
  gerarWhatsAppLink,
} from '@/lib/shared-helpers'

/* ── Tipos ───────────────────────────────────────────────── */

type Pacote = {
  codigo: string
  destinatario: string | null
  endereco_entrega: string | null
  status: string
  valor_pacote: number
  entregador_id: number | null
  entregador_nome: string | null
  entregador_telefone: string | null
  data_chegada: string | null
  data_repassado_entregador: string | null
  data_retirada_central: string | null
  data_limite_entrega: string | null
}

type EntregadorOpcao = { id: number; nome: string }

type Stats = {
  totalPegosHoje: number
  totalRepassadosHoje: number
  totalPendentesHoje: number
}

type TabData = {
  pacotes: Pacote[]
  total: number
  offset: number
  hasMore: boolean
  loading: boolean
}

type TabsState = {
  repassado: TabData
  aceitar: TabData
  pendentes: TabData
}

type TabKey = keyof TabsState

/* ── Constantes ──────────────────────────────────────────── */

const TABS: { key: TabKey; icon: string; label: string; desc: string }[] = [
  { key: 'repassado', icon: '📤', label: 'Repassado', desc: 'Aguardando Retirada' },
  { key: 'aceitar', icon: '📥', label: 'Aceitar', desc: 'Retirado pelo Entregador' },
  { key: 'pendentes', icon: '⚠️', label: 'Pendencias', desc: 'Em Rota / Retornado' },
]

const PAGE_SIZE = 50

function hojeISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function tabDataVazio(): TabData {
  return { pacotes: [], total: 0, offset: 0, hasMore: false, loading: false }
}

/* ── Componente Principal ────────────────────────────────── */

export default function RelatorioPage() {
  const router = useRouter()

  const [stats, setStats] = useState<Stats>({ totalPegosHoje: 0, totalRepassadosHoje: 0, totalPendentesHoje: 0 })
  const [entregadores, setEntregadores] = useState<EntregadorOpcao[]>([])
  const [tabAtiva, setTabAtiva] = useState<TabKey>('repassado')
  const [tabs, setTabs] = useState<TabsState>({
    repassado: tabDataVazio(),
    aceitar: tabDataVazio(),
    pendentes: tabDataVazio(),
  })
  const [filtroEntregador, setFiltroEntregador] = useState('')
  const [filtroData, setFiltroData] = useState(hojeISO())
  const [usarHoje, setUsarHoje] = useState(true)
  const [carregandoInicial, setCarregandoInicial] = useState(true)
  const [msg, setMsg] = useState('')
  const initializedRef = useRef(false)

  /* ── fetchTab ─────────────────────────────────────────── */

  const fetchTab = useCallback(async (tab: TabKey, offset = 0, append = false) => {
    setTabs(prev => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true },
    }))

    const params = new URLSearchParams({ tab, offset: String(offset), limit: String(PAGE_SIZE) })
    if (filtroEntregador) params.set('entregador_id', filtroEntregador)
    params.set('data', filtroData)

    try {
      const res = await fetch(`/api/relatorio?${params}`)
      const data = await res.json()
      if (res.ok) {
        setStats(data.stats)
        setEntregadores(data.entregadores || [])
        setTabs(prev => ({
          ...prev,
          [tab]: {
            pacotes: append ? [...prev[tab].pacotes, ...data.pacotes] : data.pacotes,
            total: data.total,
            offset: data.offset,
            hasMore: data.hasMore,
            loading: false,
          },
        }))
      }
    } catch {
      setTabs(prev => ({
        ...prev,
        [tab]: { ...prev[tab], loading: false },
      }))
    }
  }, [filtroEntregador, filtroData])

  /* ── Inicializacao ────────────────────────────────────── */

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      Promise.all([
        fetchTab('repassado', 0, false),
        fetchTab('aceitar', 0, false),
        fetchTab('pendentes', 0, false),
      ]).finally(() => setCarregandoInicial(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Recarregar ao mudar filtro ───────────────────────── */

  useEffect(() => {
    if (initializedRef.current) {
      setCarregandoInicial(true)
      Promise.all([
        fetchTab('repassado', 0, false),
        fetchTab('aceitar', 0, false),
        fetchTab('pendentes', 0, false),
      ]).finally(() => setCarregandoInicial(false))
    }
  }, [filtroEntregador, filtroData, fetchTab])

  /* ── Carregar mais ────────────────────────────────────── */

  function carregarMais() {
    const td = tabs[tabAtiva]
    const nextOffset = td.offset + PAGE_SIZE
    fetchTab(tabAtiva, nextOffset, true)
  }

  /* ── Handlers ─────────────────────────────────────────── */

  function handleFiltroDataChange(val: string) {
    setFiltroData(val)
    setUsarHoje(false)
  }

  function handleHojeClick() {
    const h = hojeISO()
    setFiltroData(h)
    setUsarHoje(true)
  }

  function abrirWhatsApp(telefone: string | null, entregadorNome: string | null, codigo: string) {
    if (!telefone) return
    const link = gerarWhatsAppLink(telefone, `Ola ${entregadorNome || ''}! Sobre o pacote ${codigo}, pode informar o status?`)
    if (link) window.open(link, '_blank', 'noopener,noreferrer')
  }

  /* ── Loading inicial ──────────────────────────────────── */

  if (carregandoInicial) {
    return (
      <div className="max-w-7xl mx-auto text-center py-16">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
          Carregando relatorio...
        </div>
      </div>
    )
  }

  const td = tabs[tabAtiva]
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Relatorio Diario</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{hojeFormatado}</p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Data */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={handleHojeClick}
              className={`px-3 py-2 text-xs font-medium transition whitespace-nowrap ${
                usarHoje ? 'bg-violet-500 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              HOJE
            </button>
            <input
              type="date"
              value={filtroData}
              onChange={e => handleFiltroDataChange(e.target.value)}
              className="px-3 py-2 text-xs border-0 bg-white focus:ring-0 focus:outline-none min-w-[140px]"
            />
          </div>

          {/* Entregador */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap hidden sm:inline">Entregador:</label>
            <select
              value={filtroEntregador}
              onChange={e => setFiltroEntregador(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs min-w-[160px]"
            >
              <option value="">Todos os entregadores</option>
              {entregadores.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* MENSAGEM */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-2">
          <span>{msg}</span>
        </div>
      )}

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-200">
            📤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats.totalRepassadosHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Repassados Hoje</p>
          </div>
        </div>
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-200">
            ✋
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats.totalPegosHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Pegos Hoje</p>
          </div>
        </div>
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-200">
            ⚠️
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{stats.totalPendentesHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pendencias Hoje</p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="content-card mb-6 overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTabAtiva(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                tabAtiva === t.key
                  ? 'border-violet-500 text-violet-700 bg-violet-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <span className="text-xs text-gray-400">({tabs[t.key].total})</span>
            </button>
          ))}
        </div>

        {/* Conteudo da tab */}
        <div className="p-4">
          {/* Descricao da tab */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-500">{TABS.find(t => t.key === tabAtiva)?.desc}</p>
            {td.total > 0 && (
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                Exibindo {Math.min(td.pacotes.length, td.total)} de {td.total}
              </span>
            )}
          </div>

          {/* Lista de pacotes - Cards */}
          {td.pacotes.length === 0 && !td.loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <div className="text-3xl mb-2 opacity-40">📦</div>
              Nenhum pacote encontrado nesta aba
            </div>
          ) : (
            <div className="space-y-2">
              {td.pacotes.map(p => (
                <PacoteCard
                  key={`${tabAtiva}-${p.codigo}-${td.offset}`}
                  pacote={p}
                  onOpenDetail={() => router.push(`/admin/pacote/${p.codigo}`)}
                  onWhatsApp={() => abrirWhatsApp(p.entregador_telefone, p.entregador_nome, p.codigo)}
                />
              ))}
            </div>
          )}

          {/* Loading indicador */}
          {td.loading && (
            <div className="text-center py-4">
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin inline-block" />
              <span className="ml-2 text-sm text-gray-400">Carregando...</span>
            </div>
          )}

          {/* Botao carregar mais */}
          {td.hasMore && !td.loading && (
            <div className="text-center mt-4">
              <button
                onClick={carregarMais}
                className="px-6 py-2.5 btn-primary rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                📦 Carregar mais {PAGE_SIZE}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Card de Pacote ──────────────────────────────────────── */

function PacoteCard({
  pacote,
  onOpenDetail,
  onWhatsApp,
}: {
  pacote: Pacote
  onOpenDetail: () => void
  onWhatsApp: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onOpenDetail}
    >
      {/* Coluna esquerda: Codigo + Destinatario */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-violet-700 text-sm tracking-tight group-hover:text-violet-800 transition">
            {pacote.codigo}
          </span>
          <span className={`badge-status text-[11px] ${statusBadgeClass(pacote.status)}`}>
            {statusLabel(pacote.status)}
          </span>
        </div>
        {pacote.destinatario && (
          <p className="text-sm text-gray-800 mt-0.5 truncate">{pacote.destinatario}</p>
        )}
        {pacote.endereco_entrega && (
          <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md" title={pacote.endereco_entrega}>
            📍 {pacote.endereco_entrega}
          </p>
        )}
      </div>

      {/* Coluna direita: Info + Acoes */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Entregador + Valor */}
        <div className="text-right min-w-[80px]">
          {pacote.entregador_nome && (
            <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
              {pacote.entregador_nome}
            </p>
          )}
          {pacote.valor_pacote > 0 && (
            <p className="text-xs font-semibold text-emerald-600">
              {formatCurrency(pacote.valor_pacote)}
            </p>
          )}
        </div>

        {/* Acoes rapidas */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {/* WhatsApp */}
          {pacote.entregador_telefone && (
            <button
              onClick={onWhatsApp}
              title="WhatsApp"
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          )}

          {/* Abrir detalhe */}
          <button
            onClick={onOpenDetail}
            title="Abrir detalhe"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-50 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
