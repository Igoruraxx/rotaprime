'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/shared-helpers'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

/* ── Tipos ───────────────────────────────────────────────── */

type EntregadorResumo = {
  id: number
  nome: string
  telefone: string | null
  valor_padrao: number
  total: number
  entregues: number
  retornados: number
  valor_total: number
  finalizado: boolean
  finalizado_em: string | null
  finalizado_total_pacotes: number
  finalizado_total_entregues: number
  finalizado_total_falhas: number
  finalizado_valor_total: number
}

type DadosDia = {
  data: string
  dia_aberto: boolean
  abre_as: string
  fecha_as: string
  stats: {
    total_pacotes: number
    total_entregues: number
    total_pendentes: number
  }
  entregadores: EntregadorResumo[]
  todos_finalizados: boolean
}

/* ── Helpers ─────────────────────────────────────────────── */

function fmtHora(isoStr: string): string {
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

function calcCountdown(): { horas: number; minutos: number } {
  const agora = new Date()
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 0)
  const diff = fim.getTime() - agora.getTime()
  if (diff <= 0) return { horas: 0, minutos: 0 }
  const horas = Math.floor(diff / (1000 * 60 * 60))
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return { horas, minutos }
}

/* ── Componente Principal ────────────────────────────────── */

export default function FinalizarDiaPage() {
  const [dados, setDados] = useState<DadosDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgTipo, setMsgTipo] = useState<'success' | 'error'>('success')
  const [finalizando, setFinalizando] = useState<string | null>(null) // 'todos' | 'selecionados' | id
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set())
  const [countdown, setCountdown] = useState(calcCountdown())

  /* ── Countdown timer ──────────────────────────────────── */

  useEffect(() => {
    const timer = setInterval(() => setCountdown(calcCountdown()), 30000) // a cada 30s
    return () => clearInterval(timer)
  }, [])

  /* ── Carregar dados ───────────────────────────────────── */

  function carregar() {
    setLoading(true)
    fetch('/api/finalizar-dia')
      .then(r => r.json())
      .then((data: DadosDia) => {
        setDados(data)
        setSelecionados(new Set())
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  /* ── Finalizacao ──────────────────────────────────────── */

  const finalizar = useCallback(async (body: Record<string, unknown>, label: string) => {
    setFinalizando(label)
    setMsg('')

    try {
      const res = await fetch('/api/finalizar-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✅ ${data.mensagem || 'Finalizado com sucesso!'}`)
        setMsgTipo('success')
        carregar()
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao finalizar'}`)
        setMsgTipo('error')
      }
    } catch {
      setMsg('❌ Erro de conexao ao servidor')
      setMsgTipo('error')
    }

    setFinalizando(null)
    setTimeout(() => setMsg(''), 6000)
  }, [])

  function handleFinalizarEntregador(entregadorId: number) {
    const confirmado = window.confirm('Tem certeza que deseja finalizar o dia deste entregador?')
    if (!confirmado) return
    finalizar({ entregador_id: entregadorId }, String(entregadorId))
  }

  function handleFinalizarTodos() {
    const naoFinalizados = (dados?.entregadores || []).filter(e => !e.finalizado && e.total > 0)
    if (naoFinalizados.length === 0) {
      setMsg('⚠️ Todos os entregadores ja foram finalizados hoje.')
      setMsgTipo('error')
      setTimeout(() => setMsg(''), 4000)
      return
    }
    const confirmado = window.confirm(
      `Tem certeza que deseja finalizar o dia de TODOS os ${naoFinalizados.length} entregador(es) nao finalizados?`
    )
    if (!confirmado) return
    finalizar({}, 'todos')
  }

  function handleFinalizarSelecionados() {
    if (selecionados.size === 0) {
      setMsg('⚠️ Selecione pelo menos um entregador.')
      setMsgTipo('error')
      setTimeout(() => setMsg(''), 4000)
      return
    }
    const confirmado = window.confirm(
      `Tem certeza que deseja finalizar o dia de ${selecionados.size} entregador(es) selecionado(s)?`
    )
    if (!confirmado) return
    finalizar({ entregador_ids: Array.from(selecionados) }, 'selecionados')
  }

  /* ── Selecao ──────────────────────────────────────────── */

  function toggleSelect(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (!dados) return
    const naoFinalizados = dados.entregadores.filter(e => !e.finalizado)
    if (selecionados.size === naoFinalizados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(naoFinalizados.map(e => e.id)))
    }
  }

  /* ── Loading ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto text-center py-16">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
          Carregando...
        </div>
      </div>
    )
  }

  const naoFinalizados = (dados?.entregadores || []).filter(e => !e.finalizado)
  const todosSelecionados = naoFinalizados.length > 0 && selecionados.size === naoFinalizados.length

  /* ── Render ────────────────────────────────────────────── */

  return (
    <FeatureGuard feature={FEATURES.FINALIZAR_DIA}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🔒 Finalizar Dia</h2>
          <p className="text-sm text-gray-500 mt-0.5">Consolide e finalize as entregas do dia atual</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* MENSAGEM */}
      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            msgTipo === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <span>{msg}</span>
        </div>
      )}

      {/* ESTADO DO DIA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Status do dia */}
        <div className="content-card p-5 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md ${
              dados?.dia_aberto
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-200'
                : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-red-200'
            }`}>
              {dados?.dia_aberto ? '🟢' : '🔴'}
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Estado do Dia</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                dados?.dia_aberto
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {dados?.dia_aberto ? 'Dia Aberto' : 'Dia Fechado'}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Abre as: <span className="font-medium text-gray-600">{dados?.abre_as || '00:01'}</span></p>
            <p>Fecha as: <span className="font-medium text-gray-600">{dados?.fecha_as || '23:59'}</span></p>
          </div>
        </div>

        {/* Contagem regressiva */}
        <div className="content-card p-5 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-violet-200">
              ⏱️
            </div>
            <p className="text-xs font-medium text-gray-500">Tempo Restante</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {countdown.horas}h {String(countdown.minutos).padStart(2, '0')}min
          </p>
          <p className="text-xs text-gray-400 mt-1">para fechar o dia</p>
        </div>

        {/* Resumo rapido */}
        <div className="content-card p-5 card-hover">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-md shadow-amber-200">
              📊
            </div>
            <p className="text-xs font-medium text-gray-500">Resumo</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Pacotes:</span>
              <span className="font-semibold text-gray-900 tabular-nums">{dados?.stats.total_pacotes || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Entregues:</span>
              <span className="font-semibold text-emerald-600 tabular-nums">{dados?.stats.total_entregues || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Pendentes:</span>
              <span className="font-semibold text-amber-600 tabular-nums">{dados?.stats.total_pendentes || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AVISO DE PENDENCIAS */}
      {dados && dados.stats.total_pendentes > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2">
          <span>⚠️ Ainda ha {dados.stats.total_pendentes} pacote(s) pendente(s). Finalize as pendencias antes de encerrar o dia.</span>
        </div>
      )}

      {/* AUTO-FINALIZACAO */}
      <div className="mb-4 px-4 py-2 rounded-lg text-xs text-gray-400 bg-gray-50 border border-gray-200 flex items-center gap-2">
        <span>🤖</span>
        <span>Auto-finalizacao programada para as 23:59</span>
      </div>

      {/* LISTA DE ENTREGADORES */}
      <div className="content-card overflow-hidden">
        <div className="px-5 py-3 section-header flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Entregadores do Dia</h3>
          </div>
          <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
            {(dados?.entregadores || []).length} entregador(es)
          </span>
        </div>

        {/* Botoes de acao */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2 flex-wrap">
          <button
            onClick={handleFinalizarTodos}
            disabled={finalizando !== null}
            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {finalizando === 'todos' ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Finalizando...
              </>
            ) : (
              <>🔒 Finalizar Todos</>
            )}
          </button>
          <button
            onClick={handleFinalizarSelecionados}
            disabled={finalizando !== null || selecionados.size === 0}
            className="px-4 py-2 border border-violet-300 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-50 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {finalizando === 'selecionados' ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>🔒 Finalizar Selecionados ({selecionados.size})</>
            )}
          </button>
        </div>

        {/* Tabela de entregadores */}
        {(!dados || dados.entregadores.length === 0) ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum entregador com atividade hoje
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-3 pl-5 w-10">
                    {naoFinalizados.length > 0 && (
                      <input
                        type="checkbox"
                        checked={todosSelecionados}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    )}
                  </th>
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium text-right">Total</th>
                  <th className="p-3 font-medium text-right">Entregues</th>
                  <th className="p-3 font-medium text-right">Retornados</th>
                  <th className="p-3 font-medium text-right">Valor Total</th>
                  <th className="p-3 font-medium text-center">Estado</th>
                  <th className="p-3 font-medium text-center">Acao</th>
                </tr>
              </thead>
              <tbody>
                {dados.entregadores.map((e, idx) => {
                  const podeSelecionar = !e.finalizado && e.total > 0
                  return (
                    <tr
                      key={e.id}
                      className={`border-b border-gray-100 last:border-0 transition ${
                        e.finalizado ? 'bg-gray-50/50' : 'hover:bg-violet-50'
                      }`}
                    >
                      <td className="p-3 pl-5">
                        {podeSelecionar && (
                          <input
                            type="checkbox"
                            checked={selecionados.has(e.id)}
                            onChange={() => toggleSelect(e.id)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-medium text-gray-900">{e.nome}</span>
                            {e.telefone && (
                              <p className="text-[10px] text-gray-400">{e.telefone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-700 tabular-nums">{e.total}</td>
                      <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{e.entregues}</td>
                      <td className="p-3 text-right text-red-500 font-medium tabular-nums">{e.retornados}</td>
                      <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">
                        {formatCurrency(e.valor_total)}
                      </td>
                      <td className="p-3 text-center">
                        {e.finalizado ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Finalizado as {fmtHora(e.finalizado_em || new Date().toISOString())}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {e.finalizado ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : e.total > 0 ? (
                          <button
                            onClick={() => handleFinalizarEntregador(e.id)}
                            disabled={finalizando !== null}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-500 text-white hover:bg-violet-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                          >
                            {finalizando === String(e.id) ? (
                              <>
                                <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ...
                              </>
                            ) : (
                              <>🔒 Finalizar Dia</>
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </FeatureGuard>
  )
}
