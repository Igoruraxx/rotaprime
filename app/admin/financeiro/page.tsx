'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

type EntregadorResumo = {
  id: number
  nome: string
  valor_padrao: number
  ultimo_pagamento_em: string | null
  inicio_ciclo: string | null
  total: number
  valor_total: string
  pago: string
  pendente: string
  tem_pendencia: boolean
}

type PacoteCiclo = {
  codigo: string
  status: string
  valor_pacote: string
  pago: boolean
  data_pagamento: string | null
  data_entrega_real: string | null
  data_chegada: string
  endereco_entrega?: string
  destinatario?: string
}

type StatsGerais = {
  totalPendente: string
  totalPago: string
  totalEntregadores: number
}

type DadosUmEntregador = {
  entregador: {
    id: number
    nome: string
    valor_padrao: number
    ultimo_pagamento_em: string | null
    inicio_ciclo: string | null
  }
  stats: { totalPacotes: number; valorTotal: string; jaPago: string; pendente: string }
  pacotes: PacoteCiclo[]
}

type DadosTodos = {
  stats: StatsGerais
  resumo: EntregadorResumo[]
}

type ViewMode = 'todos' | 'entregador'

type FormaPagamento = 'Pix' | 'Dinheiro' | 'Outro'

const FORMAS_PAGAMENTO: FormaPagamento[] = ['Pix', 'Dinheiro', 'Outro']

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fmtBRL(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function FinanceiroPage() {
  const router = useRouter()

  // ── Modo de visualização ──────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('todos')
  const [entregadorSelecionado, setEntregadorSelecionado] = useState<number | ''>('')

  // ── Dados ──────────────────────────────────────────────────
  const [dadosTodos, setDadosTodos] = useState<DadosTodos | null>(null)
  const [dadosEntregador, setDadosEntregador] = useState<DadosUmEntregador | null>(null)
  const [listaEntregadores, setListaEntregadores] = useState<{ id: number; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  // ── Modal de pagamento ─────────────────────────────────────
  const [modalPagar, setModalPagar] = useState<{
    entregadorId: number
    entregadorNome: string
    totalPacotes: number
    valorTotal: string
    valorPago: string
    formaPagamento: FormaPagamento
  } | null>(null)
  const [pagarLoading, setPagarLoading] = useState(false)

  // ── Carregar lista de entregadores (para o select) ────────
  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setListaEntregadores(data.entregadores || [])
      })
      .catch(() => {})
  }, [])

  // ── Carregar dados (todos ou um entregador) ───────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setMsg(null)

    try {
      if (viewMode === 'entregador' && entregadorSelecionado) {
        const res = await fetch(`/api/financeiro?entregador_id=${entregadorSelecionado}`)
        const data = await res.json()
        if (res.ok) {
          setDadosEntregador(data)
          setDadosTodos(null)
        } else {
          setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao carregar' })
        }
      } else {
        const res = await fetch('/api/financeiro')
        const data = await res.json()
        if (res.ok) {
          setDadosTodos(data)
          setDadosEntregador(null)
        } else {
          setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao carregar' })
        }
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    }

    setLoading(false)
  }, [viewMode, entregadorSelecionado])

  // Recarregar quando mudar modo/entregador
  useEffect(() => {
    if (viewMode === 'todos' || (viewMode === 'entregador' && entregadorSelecionado)) {
      carregar()
    } else {
      setDadosEntregador(null)
      setDadosTodos(null)
      setLoading(false)
    }
  }, [viewMode, entregadorSelecionado, carregar])

  // ── Trocar modo ───────────────────────────────────────────
  function mudarModo(modo: ViewMode) {
    setViewMode(modo)
    if (modo === 'todos') {
      setEntregadorSelecionado('')
    }
  }

  function selecionarEntregador(id: number | '') {
    setEntregadorSelecionado(id)
    if (id) {
      setViewMode('entregador')
    } else {
      setViewMode('todos')
    }
  }

  // ── Abrir modal de pagamento ──────────────────────────────
  function abrirModalPagar(entregadorId: number, nome: string, totalPacotes: number, valorTotal: string) {
    setModalPagar({
      entregadorId,
      entregadorNome: nome,
      totalPacotes,
      valorTotal,
      valorPago: valorTotal,
      formaPagamento: 'Dinheiro',
    })
  }

  // ── Confirmar pagamento ───────────────────────────────────
  async function confirmarPagamento() {
    if (!modalPagar) return
    setPagarLoading(true)
    setMsg(null)

    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'pagar-entregador',
          entregador_id: modalPagar.entregadorId,
          valor_pago: modalPagar.valorPago,
          forma_pagamento: modalPagar.formaPagamento,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: data.mensagem })
        setModalPagar(null)
        carregar() // ← recarrega: ciclo zerado, lista limpa
      } else {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao pagar' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    }

    setPagarLoading(false)
    setTimeout(() => setMsg(null), 6000)
  }

  // ── Contagem de pacotes pendentes (para o modo "todos") ───
  const totalPendentes = dadosTodos?.resumo.reduce((acc, e) => acc + (e.tem_pendencia ? 1 : 0), 0) || 0

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <FeatureGuard feature={FEATURES.DASHBOARD_FINANCEIRO}>
      <div className="max-w-7xl mx-auto">
        {/* ══════════════ HEADER ══════════════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">💰 Financeiro</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {viewMode === 'todos'
                ? 'Ciclo de pagamento desde o último pagamento de cada entregador'
                : 'Pacotes do entregador desde o último pagamento'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={carregar} disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5 disabled:opacity-50">
              🔄 Atualizar
            </button>
          </div>
        </div>

        {/* ══════════════ SELETOR DE ENTREGADOR ══════════════ */}
        <div className="content-card p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[250px] flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                👤 Entregador
              </label>
              <select
                value={entregadorSelecionado}
                onChange={e => selecionarEntregador(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              >
                <option value="">📋 Todos os entregadores</option>
                {listaEntregadores.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1 pb-1">
              <button
                onClick={() => mudarModo('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'todos'
                    ? 'bg-violet-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                📋 Todos
              </button>
              <button
                onClick={() => {
                  if (entregadorSelecionado) mudarModo('entregador')
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === 'entregador'
                    ? 'bg-violet-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                } ${!entregadorSelecionado ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={!entregadorSelecionado}
              >
                👤 Individual
              </button>
            </div>
          </div>
        </div>

        {/* ══════════════ MENSAGEM ══════════════ */}
        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            msg.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            <span>{msg.texto}</span>
            <button onClick={() => setMsg(null)} className="ml-auto opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ══════════════ LOADING ══════════════ */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-flex items-center gap-2 text-gray-400">
              <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
              Carregando...
            </div>
          </div>
        )}

        {/* ══════════════ CONTEÚDO ══════════════ */}
        {!loading && viewMode === 'todos' && dadosTodos && (
          <RenderTodos
            dados={dadosTodos}
            onPagar={abrirModalPagar}
          />
        )}

        {!loading && viewMode === 'entregador' && dadosEntregador && (
          <RenderEntregador
            dados={dadosEntregador}
            onPagar={abrirModalPagar}
            router={router}
          />
        )}

        {!loading && viewMode === 'entregador' && !dadosEntregador && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">👤</p>
            <p className="text-sm">Selecione um entregador para ver os pacotes desde o último pagamento</p>
          </div>
        )}

        {/* ══════════════ MODAL DE PAGAMENTO ══════════════ */}
        {modalPagar && (
          <ModalPagar
            modal={modalPagar}
            loading={pagarLoading}
            onUpdate={setModalPagar}
            onConfirm={confirmarPagamento}
            onClose={() => setModalPagar(null)}
          />
        )}
      </div>
    </FeatureGuard>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODO: TODOS OS ENTREGADORES
// ═══════════════════════════════════════════════════════════════

function RenderTodos({
  dados,
  onPagar,
}: {
  dados: DadosTodos
  onPagar: (id: number, nome: string, total: number, valorTotal: string) => void
}) {
  const totalPendenteNum = parseFloat(dados.stats.totalPendente)
  const totalPagoNum = parseFloat(dados.stats.totalPago)
  const comPendencia = dados.resumo.filter(e => e.tem_pendencia)

  return (
    <>
      {/* CARDS DE RESUMO GLOBAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="content-card p-5 card-hover flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-200">
            ⏳
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Total Pendente</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{fmtBRL(totalPendenteNum)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{comPendencia.length} entregador(es) com pendência</p>
          </div>
        </div>

        <div className="content-card p-5 card-hover flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-200">
            ✅
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Já Pago no Ciclo</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{fmtBRL(totalPagoNum)}</p>
            <p className="text-xs text-gray-400 mt-0.5">total já liquidado</p>
          </div>
        </div>

        <div className="content-card p-5 card-hover flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-200">
            👥
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-0.5">Entregadores</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.resumo.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{dados.stats.totalEntregadores} ativos no total</p>
          </div>
        </div>
      </div>

      {/* TABELA DE RESUMO POR ENTREGADOR */}
      <div className="content-card overflow-hidden">
        <div className="px-5 py-3 section-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Resumo por Entregador</h3>
          </div>
          <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
            {dados.resumo.length} entregador(es)
          </span>
        </div>

        {dados.resumo.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nenhum dado de ciclo disponível</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-3 font-medium">Entregador</th>
                  <th className="p-3 font-medium">Valor Padrão</th>
                  <th className="p-3 font-medium">Início do Ciclo</th>
                  <th className="p-3 font-medium text-right">Pacotes</th>
                  <th className="p-3 font-medium text-right">Valor Total</th>
                  <th className="p-3 font-medium text-right">Pago</th>
                  <th className="p-3 font-medium text-right">Pendente</th>
                  <th className="p-3 font-medium text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {dados.resumo.map(e => {
                  const pendenteNum = parseFloat(e.pendente)
                  return (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition">
                      <td className="p-3 font-medium text-gray-900">{e.nome}</td>
                      <td className="p-3 text-gray-500 tabular-nums">{fmtBRL(e.valor_padrao)}</td>
                      <td className="p-3 text-gray-500 text-xs">{fmtDate(e.inicio_ciclo)}</td>
                      <td className="p-3 text-right text-gray-700 tabular-nums">{e.total}</td>
                      <td className="p-3 text-right text-gray-700 tabular-nums font-medium">{fmtBRL(e.valor_total)}</td>
                      <td className="p-3 text-right text-emerald-600 tabular-nums">{fmtBRL(e.pago)}</td>
                      <td className="p-3 text-right tabular-nums">
                        <span className={`font-medium ${pendenteNum > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                          {fmtBRL(pendenteNum)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onPagar(e.id, e.nome, e.total, e.pendente)}
                          disabled={!e.tem_pendencia}
                          className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          💰 Pagar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODO: UM ENTREGADOR
// ═══════════════════════════════════════════════════════════════

function RenderEntregador({
  dados,
  onPagar,
  router,
}: {
  dados: DadosUmEntregador
  onPagar: (id: number, nome: string, total: number, valorTotal: string) => void
  router: ReturnType<typeof useRouter>
}) {
  const stats = dados.stats
  const pendenteNum = parseFloat(stats.pendente)
  const jaPagoNum = parseFloat(stats.jaPago)
  const descontosNum = parseFloat((stats as any).descontos || '0')
  const multas = (dados as any).multas || []
  const pacotesNaoPagos = dados.pacotes.filter(p => !p.pago)

  function maisDe15Dias(dataStr: string | null): boolean {
    if (!dataStr) return false
    const data = new Date(dataStr)
    const agora = new Date()
    const diff = agora.getTime() - data.getTime()
    return diff >= 15 * 24 * 60 * 60 * 1000
  }

  return (
    <>
      {/* CARD DO ENTREGADOR */}
      <div className="content-card p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-200">
            👤
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{dados.entregador.nome}</h3>
            <p className="text-sm text-gray-500">
              {dados.entregador.ultimo_pagamento_em
                ? `Último pagamento: ${fmtDate(dados.entregador.ultimo_pagamento_em)}`
                : 'Nunca recebeu pagamento'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Valor padrão</p>
            <p className="text-lg font-bold text-gray-900">{fmtBRL(dados.entregador.valor_padrao)}</p>
          </div>
        </div>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-0.5">Pacotes no Ciclo</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stats.totalPacotes}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-0.5">Valor Total</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtBRL(stats.valorTotal)}</p>
          </div>
          <div className={`rounded-xl p-4 ${pendenteNum > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <p className="text-xs text-gray-500 mb-0.5">Pendente</p>
            <p className={`text-2xl font-bold tabular-nums ${pendenteNum > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {fmtBRL(pendenteNum)}
            </p>
          </div>
        </div>

        {/* DESCONTOS (multas por atraso) */}
        {descontosNum > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-700">
                {multas.length} multa(s) por atraso — R$ {descontosNum.toFixed(2)} em descontos
              </p>
              <p className="text-[10px] text-red-500 mt-0.5">Valor reduzido automaticamente do pacote (R$ 1/dia)</p>
            </div>
          </div>
        )}

        {/* BOTÃO PAGAR */}
        {pacotesNaoPagos.length > 0 && (
          <div className="mt-5 flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-200">
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                💰 {pacotesNaoPagos.length} pacote(s) pendente(s)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Valor a pagar: <strong className="text-violet-700">{fmtBRL(pendenteNum)}</strong>
              </p>
            </div>
            <button
              onClick={() => onPagar(dados.entregador.id, dados.entregador.nome, pacotesNaoPagos.length, stats.pendente)}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-violet-200 transition-all active:scale-[0.98]"
            >
              💰 Pagar Tudo
            </button>
          </div>
        )}
      </div>

      {/* LISTA DE PACOTES */}
      <div className="content-card overflow-hidden">
        <div className="px-5 py-3 section-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Pacotes desde o último pagamento</h3>
          </div>
          <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
            {stats.totalPacotes} pacote(s)
          </span>
        </div>

        {dados.pacotes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum pacote entregue/validado desde o último pagamento
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Destinatário</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Data Entrega</th>
                  <th className="p-3 font-medium text-right">Valor</th>
                  <th className="p-3 font-medium text-center">Pago</th>
                </tr>
              </thead>
              <tbody>
                {dados.pacotes.map(p => {
                  const valor = parseFloat(p.valor_pacote || '0')
                  return (
                    <tr
                      key={p.codigo}
                      onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                      className={`border-b border-gray-100 last:border-0 hover:bg-violet-50 transition cursor-pointer ${
                        p.pago ? 'opacity-60' : ''
                      } ${
                        !p.pago && (maisDe15Dias(p.data_entrega_real) || maisDe15Dias(p.data_chegada))
                          ? 'bg-amber-50/70'
                          : ''
                      }`}
                    >
                      <td className="p-3">
                        <span className="link-btn-sm">{p.codigo}</span>
                      </td>
                      <td className="p-3 text-gray-500">{p.destinatario || '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'Validado pelo Admin'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status === 'Entregue'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{fmtDateTime(p.data_entrega_real)}</td>
                      <td className="p-3 text-right text-gray-700 tabular-nums font-medium">{fmtBRL(valor)}</td>
                      <td className="p-3 text-center">
                        {p.pago ? (
                          <span className="text-emerald-500 text-sm">✅</span>
                        ) : (
                          <span className="text-gray-300 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {/* TOTAL FOOTER */}
              <tfoot>
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={4} className="p-3 text-right text-gray-700 text-sm">TOTAL</td>
                  <td className="p-3 text-right text-gray-900 tabular-nums">{fmtBRL(stats.valorTotal)}</td>
                  <td className="p-3 text-center text-emerald-600 text-sm">
                    {jaPagoNum > 0 ? `✅ ${fmtBRL(jaPagoNum)}` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* TABELA DE MULTAS (descontos por atraso) */}
        {multas.length > 0 && (
          <div className="mt-4">
            <div className="px-5 py-3 section-header flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Multas por Atraso (R$ 1/dia)</h3>
              <span className="text-xs font-medium bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                {multas.length} multa(s) · {fmtBRL(descontosNum)}
              </span>
            </div>
            <div className="overflow-x-auto bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="p-3 font-medium">Pacote</th>
                    <th className="p-3 font-medium text-right">Dias Atraso</th>
                    <th className="p-3 font-medium text-right">Valor Desconto</th>
                    <th className="p-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {multas.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-red-50 transition">
                      <td className="p-3">
                        <button onClick={() => router.push(`/admin/pacote/${m.pacote_codigo}`)}
                          className="link-btn-sm">{m.pacote_codigo}</button>
                      </td>
                      <td className="p-3 text-right text-gray-700 tabular-nums">{m.dias_atraso} dia(s)</td>
                      <td className="p-3 text-right font-medium text-red-600 tabular-nums">
                        -{fmtBRL(m.valor_multa)}
                      </td>
                      <td className="p-3 text-gray-500 text-xs">{fmtDateTime(m.criado_em)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="p-3 text-right text-gray-700">TOTAL DESCONTOS</td>
                    <td className="p-3 text-right text-red-600 tabular-nums">-{fmtBRL(descontosNum)}</td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// MODAL DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════

function ModalPagar({
  modal,
  loading,
  onUpdate,
  onConfirm,
  onClose,
}: {
  modal: {
    entregadorId: number
    entregadorNome: string
    totalPacotes: number
    valorTotal: string
    valorPago: string
    formaPagamento: FormaPagamento
  }
  loading: boolean
  onUpdate: (m: typeof modal) => void
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 mb-1">💰 Confirmar Pagamento</h3>
        <p className="text-sm text-gray-500 mb-5">
          {modal.entregadorNome} · {modal.totalPacotes} pacote(s) no ciclo
        </p>

        {/* Resumo */}
        <div className="bg-violet-50 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Entregador</span>
            <span className="font-semibold text-gray-900">{modal.entregadorNome}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pacotes no Ciclo</span>
            <span className="font-semibold text-gray-900">{modal.totalPacotes}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-violet-200">
            <span className="font-medium text-gray-700">Valor Total do Ciclo</span>
            <span className="font-bold text-gray-900">{fmtBRL(modal.valorTotal)}</span>
          </div>
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor a Pagar (R$)</label>
              <input
                value={modal.valorPago}
                onChange={e => onUpdate({ ...modal, valorPago: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de Pagamento</label>
              <div className="grid grid-cols-3 gap-2">
                {FORMAS_PAGAMENTO.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onUpdate({ ...modal, formaPagamento: f })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      modal.formaPagamento === f
                        ? 'bg-violet-500 text-white border-violet-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-6 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition disabled:opacity-50 flex items-center gap-2">
            {loading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Processando...
              </>
            ) : (
              '💰 Confirmar Pagamento'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
