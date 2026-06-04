'use client'

import { useState, useEffect, useCallback } from 'react'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

interface FotoPacote {
  codigo: string
  destinatario: string
  endereco_entrega: string
  status: string
  foto: string | null
  gps_foto: string | null
  data_entrega_real: string | null
  data_chegada: string
  entregador_id: number
  entregador_nome: string
  tem_foto: boolean
  tem_gps: boolean
  valor_pacote: number
  validacao_admin?: boolean
}

type FiltroPeriodo = 'hoje' | '7d' | '15d' | '60d'
type FiltroStatus = 'pendentes_validacao' | 'validados'

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const PERIODOS: { key: FiltroPeriodo; label: string }[] = [
  { key: 'hoje', label: '📅 Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '15d', label: '15 dias' },
  { key: '60d', label: '60 dias' },
]

const STATUS_FILTROS: { key: FiltroStatus; label: string }[] = [
  { key: 'pendentes_validacao', label: '⏳ Pendente' },
  { key: 'validados', label: '✅ Validado' },
]

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function AdminFotosPage() {
  const [fotos, setFotos] = useState<FotoPacote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>('hoje')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('pendentes_validacao')

  // Seleção
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [msgConfirmacao, setMsgConfirmacao] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [acaoEmProgresso, setAcaoEmProgresso] = useState(false)

  // ── Carregar ──────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        periodo: filtroPeriodo,
        status: filtroStatus,
      })
      const res = await fetch(`/api/admin/fotos?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setFotos(data.fotos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fotos')
    } finally {
      setLoading(false)
    }
  }, [filtroPeriodo, filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  // ── Ao trocar filtro, limpa seleção ───────────────────────
  useEffect(() => { setSelecionados(new Set()) }, [filtroPeriodo, filtroStatus])

  // ── Seleção ───────────────────────────────────────────────
  function toggleSelecao(codigo: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleTodos() {
    if (selecionados.size === fotos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(fotos.map(f => f.codigo)))
    }
  }

  // ── Ações ─────────────────────────────────────────────────
  async function executarAcao(acao: string, codigos?: string[]) {
    setAcaoEmProgresso(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/fotos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao,
          codigos: codigos || (selecionados.size > 0 ? Array.from(selecionados) : undefined),
          periodo: filtroPeriodo,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: data.mensagem || '✅ Operação concluída!' })
        setSelecionados(new Set())
        carregar()
      } else {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro na operação' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    } finally {
      setAcaoEmProgresso(false)
      setConfirmando(false)
      setMsgConfirmacao(null)
    }
  }

  // ── Contagens ─────────────────────────────────────────────
  const totalComFoto = fotos.filter(f => f.tem_foto).length
  const totalPendentes = fotos.filter(f => f.tem_foto && !f.validacao_admin).length

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <FeatureGuard feature={FEATURES.GESTAO_FOTOS_ADMIN}>
      <div className="max-w-6xl mx-auto">
        {/* ══════════ HEADER ══════════ */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📸 Fotos das Entregas</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {fotos.length} pacote(s) · {totalComFoto} com foto · {totalPendentes} pendente(s)
            </p>
          </div>
          <button onClick={carregar} disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5 disabled:opacity-50">
            🔄 Atualizar
          </button>
        </div>

        {/* ══════════ LINHA 1: HOje + Status ══════════ */}
        <div className="content-card p-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Periodo: Hoje (destacado) + demais */}
            <div className="flex rounded-xl bg-gray-100 p-0.5 gap-0.5">
              {PERIODOS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setFiltroPeriodo(p.key); setSelecionados(new Set()) }}
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

            {/* Status: Pendente / Validado */}
            <div className="flex rounded-xl bg-gray-100 p-0.5 gap-0.5">
              {STATUS_FILTROS.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setFiltroStatus(s.key); setSelecionados(new Set()) }}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    filtroStatus === s.key
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ Barra de Ações ══════════ */}
        <div className="content-card p-3 mb-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={selecionados.size === fotos.length && fotos.length > 0}
                onChange={toggleTodos}
                className="rounded"
              />
              {selecionados.size > 0
                ? <span className="font-semibold text-violet-600">{selecionados.size} selecionado(s)</span>
                : 'Selecionar todos'}
            </label>

            <div className="w-px h-4 bg-gray-200" />

            <button
              onClick={() => executarAcao('validar')}
              disabled={selecionados.size === 0 || acaoEmProgresso}
              className="px-4 py-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✅ Validar {selecionados.size > 0 && `(${selecionados.size})`}
            </button>

            <button
              onClick={() => {
                if (selecionados.size === 0) {
                  setMsgConfirmacao(`Limpar TODAS as fotos do período "${PERIODOS.find(p => p.key === filtroPeriodo)?.label}"?`)
                  return
                }
                setMsgConfirmacao(`Limpar ${selecionados.size} foto(s) selecionada(s)? O GPS será mantido.`)
              }}
              disabled={acaoEmProgresso}
              className="px-4 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-40"
            >
              🗑️ Limpar Fotos
            </button>
          </div>

          {/* Mensagem */}
          {msg && (
            <div className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
              msg.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {msg.texto}
              <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
            </div>
          )}
        </div>

        {/* ══════════ CORPO ══════════ */}
        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button onClick={carregar} className="text-sm font-semibold text-violet-600 hover:underline">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Vazio */}
        {!loading && !error && fotos.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3 opacity-30">📸</div>
            <p className="text-gray-400 text-sm">
              {filtroStatus === 'pendentes_validacao'
                ? 'Nenhuma foto pendente de validação no período selecionado.'
                : 'Nenhuma foto validada no período selecionado.'}
            </p>
          </div>
        )}

        {/* Lista */}
        {!loading && !error && fotos.length > 0 && (
          <div className="space-y-2">
            {fotos.map(f => (
              <div
                key={f.codigo}
                className={`rounded-xl border transition-all ${
                  selecionados.has(f.codigo)
                    ? 'border-violet-300 bg-violet-50/50 shadow-sm'
                    : 'border-gray-100 bg-white/80 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selecionados.has(f.codigo)}
                    onChange={() => toggleSelecao(f.codigo)}
                    className="rounded shrink-0"
                  />

                  {/* Indicador Foto */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 ${
                    f.tem_foto
                      ? f.validacao_admin ? 'bg-emerald-100' : 'bg-amber-100'
                      : 'bg-gray-100'
                  }`}>
                    {f.tem_foto ? (f.validacao_admin ? '✅' : '📸') : '📦'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-900">#{f.codigo}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        f.status === 'Entregue' || f.status === 'Validado pelo Admin'
                          ? 'bg-emerald-100 text-emerald-700'
                          : f.status === 'Retornado a Central'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>{f.status}</span>
                      {f.validacao_admin && (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Validado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      {f.destinatario} · {f.endereco_entrega?.substring(0, 60)}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                      <span>👤 {f.entregador_nome}</span>
                      {f.data_entrega_real && (
                        <span>📅 {new Date(f.data_entrega_real).toLocaleDateString('pt-BR')}</span>
                      )}
                      {f.tem_gps && <span>📍 GPS</span>}
                      {Number(f.valor_pacote) > 0 && (
                        <span>💰 R$ {Number(f.valor_pacote).toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 shrink-0">
                    {f.tem_foto && (
                      <a
                        href={f.foto!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                      >
                        👁️ Ver Foto
                      </a>
                    )}
                    {f.tem_gps && (
                      <a
                        href={`https://www.google.com/maps?q=${f.gps_foto}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        🗺️ Mapa
                      </a>
                    )}
                    {!f.validacao_admin && (
                      <button
                        onClick={() => executarAcao('validar', [f.codigo])}
                        disabled={acaoEmProgresso}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-40"
                      >
                        ✅ Validar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ MODAL CONFIRMAÇÃO ══════════ */}
      {msgConfirmacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => { setMsgConfirmacao(null); setConfirmando(false) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">⚠️ Confirmar</h3>
            <p className="text-sm text-gray-600 mb-6">{msgConfirmacao}</p>
            <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
              📍 As coordenadas GPS serão mantidas. Apenas as fotos serão removidas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setMsgConfirmacao(null); setConfirmando(false) }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => executarAcao('limpar_fotos')}
                disabled={acaoEmProgresso}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {acaoEmProgresso ? (
                  <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Apagando...</>
                ) : '🗑️ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeatureGuard>
  )
}
