'use client'

import { useEffect, useState, useCallback } from 'react'

type CicloEntregador = {
  id: number
  nome: string
  valor_padrao: number
  ultimo_pagamento_em: string | null
  inicio_ciclo: string | null
  total_entregues: number
  valor_total: string
}

type HistoricoItem = {
  id: number
  entregador_id: number
  entregador_nome: string
  data_inicio: string
  data_fim: string
  total_entregues: number
  total_valor: number
  valor_pago: number
  forma_pagamento: string
  data_pagamento: string
}

type ModalPagar = {
  entregador: CicloEntregador
  data_fechamento: string
  valor_pago: string
  forma_pagamento: string
}

const FORMAS_PAGAMENTO = ['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Transferência', 'Boleto', 'Cheque', 'Outro']

function formatBRL(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function hojeStr() {
  return new Date().toISOString().split('T')[0]
}

export default function PagamentosPage() {
  const [ciclos, setCiclos] = useState<CicloEntregador[]>([])
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Filtro
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState(false)

  // Modal
  const [modal, setModal] = useState<ModalPagar | null>(null)
  const [pagarLoading, setPagarLoading] = useState(false)

  // Aba ativa
  const [aba, setAba] = useState<'ciclos' | 'historico'>('ciclos')

  const carregar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (dataIni && filtroAtivo) params.set('data_ini', dataIni)
    if (dataFim && filtroAtivo) params.set('data_fim', dataFim)

    fetch(`/api/pagamentos?${params}`)
      .then(r => r.json())
      .then(data => {
        setCiclos(data.ciclos || [])
        setHistorico(data.historico || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [dataIni, dataFim, filtroAtivo])

  useEffect(() => { carregar() }, [carregar])

  function abrirModal(e: CicloEntregador) {
    setModal({
      entregador: e,
      data_fechamento: hojeStr(),
      valor_pago: e.valor_total,
      forma_pagamento: 'Dinheiro',
    })
  }

  async function confirmarPagamento() {
    if (!modal) return
    setPagarLoading(true)
    setMsg('')

    try {
      const res = await fetch('/api/pagamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregador_id: modal.entregador.id,
          data_inicio: modal.entregador.inicio_ciclo
            ? new Date(modal.entregador.inicio_ciclo).toISOString().split('T')[0]
            : undefined,
          data_fim: modal.data_fechamento,
          total_entregues: modal.entregador.total_entregues,
          total_valor: modal.entregador.valor_total,
          valor_pago: modal.valor_pago.replace(',', '.'),
          forma_pagamento: modal.forma_pagamento,
        })
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✅ ${data.mensagem}`)
        setModal(null)
        carregar()
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao pagar'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão')
    }
    setPagarLoading(false)
    setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🔄 Ciclos de Pagamento</h2>
          <p className="text-sm text-gray-500 mt-0.5">Calcula entregas desde o último pagamento de cada entregador</p>
        </div>
        <button onClick={carregar}
          className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5">
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

      {/* === FILTRO DE PERÍODO (para o histórico) === */}
      <div className="content-card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data DE</label>
            <input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data ATÉ</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" />
          </div>
          <div className="flex items-center gap-2 pb-1">
            <button onClick={() => { setFiltroAtivo(true); carregar() }}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition">
              📊 Filtrar
            </button>
            <button onClick={() => { setDataIni(''); setDataFim(''); setFiltroAtivo(false); }}
              className="px-3 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition">
              Limpar
            </button>
          </div>
        </div>
        {filtroAtivo && dataIni && dataFim && (
          <p className="text-xs text-gray-400 mt-2">
            Histórico filtrado: {new Date(dataIni).toLocaleDateString('pt-BR')} — {new Date(dataFim).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      {/* === ABAS === */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-gray-100 w-fit">
        <button onClick={() => setAba('ciclos')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            aba === 'ciclos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          🔄 Ciclo Atual
        </button>
        <button onClick={() => setAba('historico')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            aba === 'historico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          📜 Histórico ({historico.length})
        </button>
      </div>

      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
            Carregando...
          </div>
        </div>
      )}

      {!loading && aba === 'ciclos' && (
        <>
          {/* === CICLO POR ENTREGADOR === */}
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Ciclo por Entregador</h3>
              </div>
              <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                {ciclos.length} entregador(es)
              </span>
            </div>

            {ciclos.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum ciclo disponível. Os entregadores precisam ter entregas ou já ter recebido ao menos um pagamento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium text-right">Valor Padrão</th>
                      <th className="p-3 font-medium">Último Pagamento</th>
                      <th className="p-3 font-medium">Início do Ciclo</th>
                      <th className="p-3 font-medium text-right">Entregues no Período</th>
                      <th className="p-3 font-medium text-right">Valor a Pagar</th>
                      <th className="p-3 font-medium text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ciclos.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition">
                        <td className="p-3 font-medium text-gray-900">{e.nome}</td>
                        <td className="p-3 text-right text-gray-500 tabular-nums">{formatBRL(e.valor_padrao)}</td>
                        <td className="p-3 text-gray-500 text-xs">{fmtDate(e.ultimo_pagamento_em)}</td>
                        <td className="p-3 text-gray-500 text-xs">{fmtDate(e.inicio_ciclo)}</td>
                        <td className="p-3 text-right tabular-nums">
                          <span className="font-semibold text-gray-900">{e.total_entregues}</span>
                          <span className="text-gray-400 text-xs ml-1">entregas</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-gray-900 tabular-nums">{formatBRL(e.valor_total)}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => abrirModal(e)}
                            disabled={e.total_entregues === 0}
                            className="px-4 py-1.5 bg-violet-500 text-white rounded-lg text-xs font-medium hover:bg-violet-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
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

          {/* Resumo rápido */}
          {ciclos.length > 0 && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="content-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-lg">👥</div>
                <div>
                  <p className="text-xs text-gray-500">Entregadores</p>
                  <p className="text-xl font-bold text-gray-900">{ciclos.length}</p>
                </div>
              </div>
              <div className="content-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">📦</div>
                <div>
                  <p className="text-xs text-gray-500">Total Entregues</p>
                  <p className="text-xl font-bold text-gray-900">
                    {ciclos.reduce((a, e) => a + e.total_entregues, 0)}
                  </p>
                </div>
              </div>
              <div className="content-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg">💰</div>
                <div>
                  <p className="text-xs text-gray-500">Valor Total a Pagar</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatBRL(ciclos.reduce((a, e) => a + parseFloat(e.valor_total), 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && aba === 'historico' && (
        /* === HISTÓRICO === */
        <div className="content-card overflow-hidden">
          <div className="px-5 py-3 section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Histórico de Pagamentos</h3>
            </div>
            <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
              Últimos {Math.min(historico.length, 50)} registro(s)
            </span>
          </div>

          {historico.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum pagamento registrado ainda
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Entregador</th>
                    <th className="p-3 font-medium">Período</th>
                    <th className="p-3 font-medium text-right">Entregues</th>
                    <th className="p-3 font-medium text-right">Valor Ciclo</th>
                    <th className="p-3 font-medium text-right">Valor Pago</th>
                    <th className="p-3 font-medium">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition">
                      <td className="p-3 text-gray-500 text-xs">{fmtDate(h.data_pagamento)}</td>
                      <td className="p-3 font-medium text-gray-900">{h.entregador_nome}</td>
                      <td className="p-3 text-gray-500 text-xs">
                        {fmtDate(h.data_inicio)} → {fmtDate(h.data_fim)}
                      </td>
                      <td className="p-3 text-right text-gray-700 tabular-nums">{h.total_entregues}</td>
                      <td className="p-3 text-right text-gray-700 tabular-nums">{formatBRL(h.total_valor)}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600 tabular-nums">{formatBRL(h.valor_pago)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {h.forma_pagamento}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === MODAL DE CONFIRMAÇÃO === */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-4">💰 Confirmar Pagamento</h3>

            {/* Resumo */}
            <div className="bg-violet-50 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entregador</span>
                <span className="font-semibold text-gray-900">{modal.entregador.nome}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Início do Ciclo</span>
                <span className="text-gray-700">{fmtDate(modal.entregador.inicio_ciclo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entregues no Período</span>
                <span className="font-semibold text-gray-900">{modal.entregador.total_entregues}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-violet-200">
                <span className="font-medium text-gray-700">Valor Total do Ciclo</span>
                <span className="font-bold text-gray-900">{formatBRL(modal.entregador.valor_total)}</span>
              </div>
            </div>

            {/* Campos do formulário */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Fechamento</label>
                  <input type="date" value={modal.data_fechamento}
                    onChange={e => setModal({ ...modal, data_fechamento: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor a Pagar (R$)</label>
                  <input value={modal.valor_pago}
                    onChange={e => setModal({ ...modal, valor_pago: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg text-sm font-medium" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {FORMAS_PAGAMENTO.map(f => (
                    <button key={f}
                      type="button"
                      onClick={() => setModal({ ...modal, forma_pagamento: f })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                        modal.forma_pagamento === f
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

            {/* Ações */}
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={confirmarPagamento} disabled={pagarLoading}
                className="px-6 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition disabled:opacity-50 flex items-center gap-2">
                {pagarLoading ? 'Processando...' : '💰 Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}
