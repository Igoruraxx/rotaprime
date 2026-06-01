'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icons, statusBadgeClass, statusDotColor, statusLabel, formatCurrency, formatDateBR } from '@/lib/shared-helpers'
import { useFeature, FEATURES } from '@/lib/features'
import FeatureGuard from '@/components/feature-guard'

// ================================================================
// TYPES
// ================================================================

type Stats = {
  totalPacotes: number
  entreguesHoje: number
  emAndamento: number
  naCentral: number
}

type Financeiro = {
  previsto: number
  recebido: number
}

type UltimoPagamento = {
  data: string
  valor: number
}

type MiniPacote = {
  codigo: string
  endereco_entrega: string
  status: string
  valor_pacote: number
}

type DashboardData = {
  stats: Stats
  financeiro: Financeiro
  ultimoPagamento: UltimoPagamento | null
  ultimosPacotes: MiniPacote[]
}

type SessionInfo = {
  nome: string
  tipo: string
  exp: number | null
  id?: number
  entregador_id?: number
}

// ================================================================
// FEATURE SKELETON (carregando toggle)
// ================================================================

function FeatureLoadingSkeleton() {
  return (
    <div className="admin-content min-h-screen pb-8">
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mx-auto" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="content-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded mb-1" />
              <div className="w-12 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="content-card p-5">
          <div className="w-28 h-5 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="w-14 h-3 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-7 bg-gray-200 rounded" />
            </div>
            <div className="bg-gray-100 rounded-xl p-4">
              <div className="w-14 h-3 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-7 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
        <div className="content-card p-5">
          <div className="w-36 h-5 bg-gray-200 rounded mb-3" />
          <div className="w-48 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}

// ================================================================
// FEATURE DESABILITADA
// ================================================================

function FeatureDisabled() {
  return (
    <div className="admin-content min-h-screen flex items-center justify-center p-4">
      <div className="content-card p-8 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icons.Alert className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Modulo desabilitado</h2>
        <p className="text-sm text-gray-500">
          O dashboard do entregador esta temporariamente indisponivel.
          Entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  )
}

// ================================================================
// SKELETON COMPONENT (Loading State)
// ================================================================

function DashboardSkeleton() {
  return (
    <div className="admin-content min-h-screen pb-8">
      {/* Header skeleton */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <div>
              <div className="w-28 h-5 bg-gray-200 rounded animate-pulse" />
              <div className="w-20 h-3 bg-gray-100 rounded mt-1 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-14 h-8 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Cards skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="content-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200" />
                <div className="w-16 h-3 bg-gray-200 rounded" />
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded mb-1" />
              <div className="w-12 h-3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>

        {/* Financeiro skeleton */}
        <div className="content-card p-5 animate-pulse">
          <div className="w-28 h-5 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="w-14 h-3 bg-gray-200 rounded mb-2" />
              <div className="w-24 h-7 bg-gray-200 rounded" />
            </div>
            <div className="bg-emerald-600 rounded-xl p-4">
              <div className="w-14 h-3 bg-white/50 rounded mb-2" />
              <div className="w-24 h-7 bg-white/50 rounded" />
            </div>
          </div>
        </div>

        {/* Last payment skeleton */}
        <div className="content-card p-5 animate-pulse">
          <div className="w-36 h-5 bg-gray-200 rounded mb-3" />
          <div className="w-48 h-4 bg-gray-200 rounded" />
        </div>

        {/* Pacotes skeleton */}
        <div className="content-card p-5 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-40 h-5 bg-gray-200 rounded" />
            <div className="w-20 h-8 bg-gray-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <div className="w-20 h-4 bg-gray-200 rounded mb-2" />
                <div className="w-full h-3 bg-gray-200 rounded mb-2" />
                <div className="w-16 h-5 bg-gray-200 rounded mb-2" />
                <div className="w-14 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// ERROR COMPONENT
// ================================================================

function DashboardError({ mensagem, onTentarNovamente }: { mensagem: string; onTentarNovamente: () => void }) {
  return (
    <div className="admin-content min-h-screen flex items-center justify-center p-4">
      <div className="content-card p-8 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Icons.XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
        <p className="text-sm text-gray-500 mb-6">{mensagem}</p>
        <button
          onClick={onTentarNovamente}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-200 transition-all"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

// ================================================================
// MAIN DASHBOARD COMPONENT
// ================================================================

export default function EntregadorDashboard() {
  const router = useRouter()

  // ── Feature Toggle ───────────────────────────────────────────
  const dashboardAtivo = useFeature(FEATURES.DASHBOARD_ENTREGADOR)

  // ── State ────────────────────────────────────────────────────
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tempoRestante, setTempoRestante] = useState<number | null>(null)
  const [logouting, setLogouting] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Auth Check ───────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check')
      if (!res.ok) {
        router.push('/login')
        return null
      }
      const data: SessionInfo = await res.json()
      setSession(data)
      return data
    } catch {
      router.push('/login')
      return null
    }
  }, [router])

  // ── Dashboard Data Fetch ─────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/entregador/dashboard')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.erro || 'Falha ao carregar dados do dashboard')
      }
      const data: DashboardData = await res.json()
      setDashboard(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [router])

  // ── Initial Load ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      const sess = await fetchSession()
      if (cancelled || !sess) return
      await fetchDashboard()
    }

    init()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Session Timeout Countdown ────────────────────────────────
  useEffect(() => {
    if (!session?.exp) return
    const exp = session.exp

    function updateTime() {
      const now = Math.floor(Date.now() / 1000)
      const remaining = Math.max(0, exp - now)
      setTempoRestante(remaining)
    }

    updateTime()
    intervalRef.current = setInterval(updateTime, 30_000) // update every 30s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [session?.exp, session])

  // ── Session timeout warning ──────────────────────────────────
  const minutosRestantes = tempoRestante !== null ? Math.floor(tempoRestante / 60) : null
  const sessaoCritica = minutosRestantes !== null && minutosRestantes <= 2

  // ── Logout ───────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    setLogouting(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // continues anyway
    }
    router.push('/login')
  }, [router])

  // ── Retry ────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    fetchSession().then((sess) => {
      if (sess) fetchDashboard()
    })
  }, [fetchSession, fetchDashboard])

  // ── Feature Toggle Check (outermost layer) ──────────────────
  if (dashboardAtivo === null) {
    return <FeatureLoadingSkeleton />
  }

  if (dashboardAtivo === false) {
    return <FeatureDisabled />
  }

  // ── Loading State ────────────────────────────────────────────
  if (loading && !dashboard) {
    return <DashboardSkeleton />
  }

  // ── Error State ──────────────────────────────────────────────
  if (error && !dashboard) {
    return <DashboardError mensagem={error} onTentarNovamente={handleRetry} />
  }

  // ── Safe data access ─────────────────────────────────────────
  const stats = dashboard?.stats
  const financeiro = dashboard?.financeiro
  const ultimoPagamento = dashboard?.ultimoPagamento
  const ultimosPacotes = dashboard?.ultimosPacotes ?? []

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <FeatureGuard feature={FEATURES.DASHBOARD_ENTREGADOR}>
      <div className="admin-content min-h-screen pb-8">
        {/* ══════════════════════════════════════════════════════════
            HEADER
            ══════════════════════════════════════════════════════════ */}
        <header className="bg-white/90 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-20 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo + Nome */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <Icons.Truck className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                  Rota Prime
                </h1>
                <p className="text-xs text-gray-500 truncate">
                  {session?.nome || 'Entregador'}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Session timeout */}
              {minutosRestantes !== null && (
                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  sessaoCritica
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  <Icons.Clock className={`w-3.5 h-3.5 ${
                    sessaoCritica ? 'text-red-500' : 'text-gray-400'
                  }`} />
                  {sessaoCritica
                    ? `Expira em ${minutosRestantes} min`
                    : `${minutosRestantes} min`
                  }
                </div>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                disabled={logouting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                <Icons.LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>

          {/* Mobile session timeout bar */}
          {minutosRestantes !== null && (
            <div className="sm:hidden px-4 pb-2">
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                sessaoCritica ? 'text-red-500' : 'text-gray-400'
              }`}>
                <Icons.Clock className="w-3 h-3" />
                Sessao expira em {minutosRestantes} min
              </div>
            </div>
          )}
        </header>

        {/* ══════════════════════════════════════════════════════════
            MAIN CONTENT
            ══════════════════════════════════════════════════════════ */}
        <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">

          {/* ──── 1. CARDS DE INDICADORES ─────────────────────── */}
          <section>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Card 1 - Total de Pacotes */}
              <div className="group content-card p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icons.Box className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total de Pacotes
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
                  {stats?.totalPacotes ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">pacotes registrados</p>
              </div>

              {/* Card 2 - Entregues Hoje */}
              <div className="group content-card p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icons.Check className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Entregues Hoje
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
                  {stats?.entreguesHoje ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">entregas realizadas</p>
              </div>

              {/* Card 3 - Em Andamento */}
              <div className="group content-card p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icons.Route className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Em Andamento
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
                  {stats?.emAndamento ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">retirados + em rota</p>
              </div>

              {/* Card 4 - Na Central */}
              <div className="group content-card p-4 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 card-hover">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icons.Factory className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Na Central
                  </span>
                </div>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 tabular-nums">
                  {stats?.naCentral ?? 0}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">aguardando retirada</p>
              </div>
            </div>
          </section>

          {/* ──── 2. FINANCEIRO ──────────────────────────────────── */}
          <section>
            <div className="content-card p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <Icons.TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-semibold text-gray-900">Financeiro</h2>
              </div>

              {/* Sub-cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Previsto */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-200/60 rounded-xl p-4 transition-all hover:shadow-sm">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">
                    <Icons.TrendingUp className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" />
                    Previsto
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-green-800 tabular-nums">
                    {formatCurrency(financeiro?.previsto ?? 0)}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">valor total a receber</p>
                </div>

                {/* Recebido */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 border border-emerald-500/30 rounded-xl p-4 transition-all hover:shadow-md">
                  <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide mb-1.5">
                    <Icons.Check className="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" />
                    Recebido
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
                    {formatCurrency(financeiro?.recebido ?? 0)}
                  </p>
                  <p className="text-xs text-emerald-200 mt-0.5">valor total pago</p>
                </div>
              </div>
            </div>
          </section>

          {/* ──── 3. ULTIMO PAGAMENTO ────────────────────────────── */}
          <section>
            <div className="content-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Icons.Cash className="w-5 h-5 text-gray-500" />
                <h2 className="text-base font-semibold text-gray-900">Ultimo Pagamento</h2>
              </div>

              {ultimoPagamento ? (
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Icons.Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">
                      {formatDateBR(ultimoPagamento.data)}
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                  <p className="text-lg font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(ultimoPagamento.valor)}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Pago
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Icons.XCircle className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">Nenhum pagamento registrado</p>
                </div>
              )}
            </div>
          </section>

          {/* ──── 4. ULTIMOS PACOTES ─────────────────────────────── */}
          <section>
            <div className="content-card p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Icons.Package className="w-5 h-5 text-gray-500" />
                  <h2 className="text-base font-semibold text-gray-900">Ultimos Pacotes</h2>
                  {ultimosPacotes.length > 0 && (
                    <span className="text-xs text-gray-400 font-medium">
                      ({ultimosPacotes.length})
                    </span>
                  )}
                </div>
                <Link
                  href="/entregador/meus-pacotes"
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  Ver Todos
                  <Icons.ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {ultimosPacotes.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {ultimosPacotes.slice(0, 8).map((pacote) => (
                    <Link
                      key={pacote.codigo}
                      href={`/entregador/pacote/${pacote.codigo}`}
                      className="group block bg-gray-50/80 hover:bg-white border border-gray-200/60 hover:border-violet-200/60 rounded-xl p-3 transition-all duration-200 hover:shadow-sm"
                    >
                      {/* Codigo */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-800 font-mono truncate">
                          {pacote.codigo}
                        </span>
                        <Icons.ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" />
                      </div>

                      {/* Endereco (truncado) */}
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                        <Icons.MapPin className="w-3 h-3 inline-block mr-0.5 text-gray-400 align-text-bottom" />
                        {pacote.endereco_entrega}
                      </p>

                      {/* Status badge */}
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusBadgeClass(pacote.status)}`}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusDotColor(pacote.status) }} />
                          {pacote.status}
                        </span>

                        {/* Valor */}
                        {pacote.valor_pacote > 0 && (
                          <span className="text-xs font-semibold text-gray-700 tabular-nums">
                            {formatCurrency(pacote.valor_pacote)}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icons.Package className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-400">Nenhum pacote encontrado</p>
                  <p className="text-xs text-gray-300 mt-1">
                    Os pacotes aparecerao aqui quando forem atribuidos a voce
                  </p>
                </div>
              )}

              {/* Ver Todos (bottom, for mobile) */}
              {ultimosPacotes.length > 0 && (
                <div className="mt-4 text-center lg:hidden">
                  <Link
                    href="/entregador/meus-pacotes"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-violet-200 transition-all"
                  >
                    Ver Todos os Pacotes
                    <Icons.ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </FeatureGuard>
  )
}
