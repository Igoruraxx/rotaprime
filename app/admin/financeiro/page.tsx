'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

type Pacote = {
  codigo: string
  status: string
  valor_pacote: string
  pago: boolean
  data_pagamento: string | null
  data_chegada: string
  entregador_id: number | null
  entregadores: { nome: string } | null
}

type Entregador = {
  id: number
  nome: string
  valor_padrao: number
}

type ResumoEntregador = {
  id: number
  nome: string
  valor_padrao: number
  total: number
  entregues: number
  valorTotal: number
  pago: number
  pendente: number
}

type DadosFinanceiro = {
  data_ini: string
  data_fim: string
  stats: { totalPendente: string; totalPago: string }
  resumoEntregadores: ResumoEntregador[]
  pacotes: Pacote[]
  entregadores: Entregador[]
}

function formatBRL(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hojeStr() {
  return new Date().toISOString().split('T')[0]
}

function mesPassadoStr() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().split('T')[0]
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [dados, setDados] = useState<DadosFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataIni, setDataIni] = useState(mesPassadoStr())
  const [dataFim, setDataFim] = useState(hojeStr())
  const [msg, setMsg] = useState('')

  // Pagar período (geral)
  const [pagarLoading, setPagarLoading] = useState(false)

  // Pagar por entregador — datas individuais
  const [entregadorDatas, setEntregadorDatas] = useState<Record<number, { ini: string; fim: string }>>({})

  // Seleção de pacotes
  const [selectedPacotes, setSelectedPacotes] = useState<Set<string>>(new Set())

  // Modal editar valor
  const [modalValor, setModalValor] = useState<{ codigo: string; valor: string } | null>(null)

  const carregar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ data_ini: dataIni, data_fim: dataFim })
    fetch(`/api/financeiro?${params}`)
      .then(r => r.json())
      .then(data => {
        setDados(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [dataIni, dataFim])

  useEffect(() => { carregar() }, [carregar])

  function toggleSelectPacote(codigo: string) {
    setSelectedPacotes(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleSelectAll() {
    if (!dados) return
    const pagaveis = dados.pacotes.filter(
      p => (p.status === 'Entregue' || p.status === 'Validado pelo Admin') && !p.pago
    )
    if (selectedPacotes.size === pagaveis.length) {
      setSelectedPacotes(new Set())
    } else {
      setSelectedPacotes(new Set(pagaveis.map(p => p.codigo)))
    }
  }

  async function executarAcao(body: Record<string, unknown>) {
    setMsg('')
    try {
      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✅ ${data.mensagem}`)
        carregar()
        setSelectedPacotes(new Set())
      } else {
        setMsg(`❌ ${data.erro || 'Erro'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão')
    }
    setTimeout(() => setMsg(''), 5000)
  }

  async function pagarPeriodo() {
    setPagarLoading(true)
    await executarAcao({ acao: 'pagar-periodo', data_ini: dataIni, data_fim: dataFim })
    setPagarLoading(false)
  }

  async function pagarEntregador(eid: number) {
    const datas = entregadorDatas[eid]
    if (!datas?.ini || !datas?.fim) {
      setMsg('❌ Defina o período de pagamento para este entregador')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    await executarAcao({ acao: 'pagar-entregador', entregador_id: eid, data_ini: datas.ini, data_fim: datas.fim })
  }

  async function pagarPacotesSelecionados() {
    if (selectedPacotes.size === 0) return
    await executarAcao({ acao: 'pagar-lote', codigos: Array.from(selectedPacotes) })
  }

  async function estornarPacote(codigo: string) {
    await executarAcao({ acao: 'estornar', codigos: [codigo] })
  }

  function abrirEditarValor(codigo: string, valorAtual: string) {
    setModalValor({ codigo, valor: valorAtual })
  }

  async function salvarValor() {
    if (!modalValor) return
    await executarAcao({ acao: 'editar-valor', codigo: modalValor.codigo, valor_pacote: modalValor.valor.replace(',', '.') })
    setModalValor(null)
  }

  const pagaveis = dados?.pacotes.filter(
    p => (p.status === 'Entregue' || p.status === 'Validado pelo Admin') && !p.pago
  ) || []

  return (
    <FeatureGuard feature={FEATURES.DASHBOARD_FINANCEIRO}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">💰 Financeiro</h2>
          <p className="text-sm text-gray-500 mt-0.5">Controle centralizado de pagamentos</p>
        </div>
        <button
          onClick={carregar}
          className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5"
        >
          🔄 Atualizar
        </button>
      </div>

      {msg && (
        <div className={cn('mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2',
          msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          'bg-red-50 text-red-700 border-red-200'
        )}>
          <span>{msg}</span>
        </div>
      )}

      {/* === FILTRO POR PERÍODO === */}
      <div className="content-card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data Início</label>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <button onClick={carregar}
            className="px-5 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition">
            📊 Filtrar
          </button>
        </div>
        {dados?.data_ini && (
          <p className="text-xs text-gray-400 mt-2">
            Período: {new Date(dados.data_ini).toLocaleDateString('pt-BR')} — {new Date(dados.data_fim).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
            Carregando...
          </div>
        </div>
      )}

      {!loading && dados && (
        <>
          {/* === CARDS DE RESUMO === */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="content-card p-5 card-hover flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-200">
                ⏳
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Pacotes Pendentes</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">
                  {formatBRL(dados.stats.totalPendente)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pagaveis.length} pacote(s) aguardando
                </p>
              </div>
            </div>

            <div className="content-card p-5 card-hover flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-200">
                ✅
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">Pacotes Já Pagos</p>
                <p className="text-3xl font-bold text-gray-900 tabular-nums">
                  {formatBRL(dados.stats.totalPago)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">total já liquidado</p>
              </div>
            </div>
          </div>

          {/* === PAGAR PERÍODO (GERAL) === */}
          <div className="content-card mb-6 overflow-hidden border-t-2 border-t-violet-400">
            <div className="px-5 py-3 section-header flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Pagar Período (Geral)</h3>
            </div>
            <div className="p-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-500 flex-1 min-w-[200px]">
                Marca como pago <strong>todos</strong> os pacotes entregues/validados no período selecionado.
                <span className="block text-xs text-amber-600 mt-0.5">⚠️ Ação irreversível</span>
              </p>
              <button
                onClick={pagarPeriodo}
                disabled={pagarLoading}
                className="px-6 py-2.5 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {pagarLoading ? 'Processando...' : '💰 Pagar Todos no Período'}
              </button>
            </div>
          </div>

          {/* === RESUMO POR ENTREGADOR === */}
          <div className="content-card mb-6 overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Resumo por Entregador</h3>
              </div>
              <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                {dados.resumoEntregadores.length} entregador(es)
              </span>
            </div>

            {dados.resumoEntregadores.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum dado no período</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium text-right">Valor Padrão</th>
                      <th className="p-3 font-medium text-right">Total</th>
                      <th className="p-3 font-medium text-right">Entregues</th>
                      <th className="p-3 font-medium text-right">Valor Total</th>
                      <th className="p-3 font-medium text-right">Pago</th>
                      <th className="p-3 font-medium text-right">Pendente</th>
                      <th className="p-3 font-medium">Período Pagamento</th>
                      <th className="p-3 font-medium text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.resumoEntregadores.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition">
                        <td className="p-3 font-medium text-gray-900">{e.nome}</td>
                        <td className="p-3 text-right text-gray-500 tabular-nums">{formatBRL(e.valor_padrao)}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{e.total}</td>
                        <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{e.entregues}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{formatBRL(e.valorTotal)}</td>
                        <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{formatBRL(e.pago)}</td>
                        <td className="p-3 text-right tabular-nums">
                          <span className={`font-medium ${parseFloat(e.pendente.toFixed(2)) > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                            {formatBRL(e.pendente)}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="date"
                              value={entregadorDatas[e.id]?.ini || dataIni}
                              onChange={ev => setEntregadorDatas(prev => ({
                                ...prev,
                                [e.id]: { ini: ev.target.value, fim: prev[e.id]?.fim || dataFim }
                              }))}
                              className="px-2 py-1 rounded text-xs w-[110px]"
                            />
                            <span className="text-gray-300 text-xs">→</span>
                            <input
                              type="date"
                              value={entregadorDatas[e.id]?.fim || dataFim}
                              onChange={ev => setEntregadorDatas(prev => ({
                                ...prev,
                                [e.id]: { ini: prev[e.id]?.ini || dataIni, fim: ev.target.value }
                              }))}
                              className="px-2 py-1 rounded text-xs w-[110px]"
                            />
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => pagarEntregador(e.id)}
                            disabled={parseFloat(e.pendente.toFixed(2)) <= 0}
                            className="px-3 py-1 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            💰 Pagar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === LISTA DE PACOTES === */}
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Pacotes do Período</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  {dados.pacotes.length} pacote(s)
                </span>
                {pagaveis.length > 0 && (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedPacotes.size > 0 && selectedPacotes.size === pagaveis.length}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                      {selectedPacotes.size > 0 ? `${selectedPacotes.size} selec.` : 'Sel. todos'}
                    </label>
                    {selectedPacotes.size > 0 && (
                      <button
                        onClick={() => pagarPacotesSelecionados()}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition"
                      >
                        💰 Pagar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {dados.pacotes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum pacote no período</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 w-10"></th>
                      <th className="p-3 font-medium">Código</th>
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium text-right">Valor</th>
                      <th className="p-3 font-medium text-center">Pago</th>
                      <th className="p-3 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.pacotes.map(p => {
                      const isPagavel = (p.status === 'Entregue' || p.status === 'Validado pelo Admin')
                      const valorNum = parseFloat(p.valor_pacote || '0')
                      return (
                        <tr key={p.codigo}
                          className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition"
                        >
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            {isPagavel && !p.pago && (
                              <input
                                type="checkbox"
                                checked={selectedPacotes.has(p.codigo)}
                                onChange={() => toggleSelectPacote(p.codigo)}
                                className="rounded"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <button onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                              className="link-btn-sm">{p.codigo}</button>
                            <span className="text-[10px] text-gray-400 block mt-0.5">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">{(p.entregadores as { nome: string } | null)?.nome || '—'}</td>
                          <td className="p-3 text-right text-gray-700 tabular-nums font-medium">
                            {formatBRL(valorNum)}
                          </td>
                          <td className="p-3 text-center">
                            {p.pago ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium">
                                ✅ Pago
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                              {/* Editar valor */}
                              <button
                                onClick={() => abrirEditarValor(p.codigo, p.valor_pacote)}
                                className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs hover:bg-gray-200 transition"
                                title="Editar valor"
                              >
                                ✏️
                              </button>

                              {/* Marcar como pago (individual) */}
                              {isPagavel && !p.pago && (
                                <button
                                  onClick={() => executarAcao({ acao: 'pagar-pacote', codigos: [p.codigo] })}
                                  className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-xs hover:bg-emerald-200 transition"
                                  title="Marcar como pago"
                                >
                                  💰
                                </button>
                              )}

                              {/* Estornar */}
                              {p.pago && (
                                <button
                                  onClick={() => estornarPacote(p.codigo)}
                                  className="px-2 py-1 bg-red-100 text-red-500 rounded-lg text-xs hover:bg-red-200 transition"
                                  title="Estornar"
                                >
                                  ↩️
                                </button>
                              )}
                            </div>
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
      )}

      {/* === MODAL EDITAR VALOR === */}
      {modalValor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModalValor(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Editar Valor</h3>
            <p className="text-sm text-gray-500 mb-4">Pacote: <strong>{modalValor.codigo}</strong></p>

            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
            <input
              value={modalValor.valor}
              onChange={e => setModalValor({ ...modalValor, valor: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm mb-4"
              placeholder="0,00"
              autoFocus
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalValor(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={salvarValor}
                className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition">
                💾 Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FeatureGuard>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
