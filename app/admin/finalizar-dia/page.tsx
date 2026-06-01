'use client'

import { useEffect, useState } from 'react'

// --- Types ---
type ResumoHoje = {
  pacotesRegistrados: number
  pacotesEntregues: number
  pacotesPendentes: number
}

type EntregadorResumo = {
  id: number
  nome: string
  valorPadrao: number
  pacotes: number
  entregues: number
  falhas: number
  valorTotal: number
  finalizado: boolean
}

type HistoricoEntregador = {
  id: number
  data: string
  entregadorNome: string
  pacotes: number
  entregues: number
  falhas: number
  valorTotal: number
  valorPago: number
}

type HistoricoGeral = {
  id: number
  data: string
  totalPacotes: number
  totalEntregues: number
  valorTotal: number
}

type DadosFinalizarDia = {
  resumoHoje: ResumoHoje
  entregadores: EntregadorResumo[]
  historicoEntregadores: HistoricoEntregador[]
  historicoGeral: HistoricoGeral[]
}

// --- Helpers ---
function formatBRL(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// --- Component ---
export default function FinalizarDiaPage() {
  const [dados, setDados] = useState<DadosFinalizarDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [finalizando, setFinalizando] = useState(false)

  function carregar() {
    setLoading(true)
    fetch('/api/finalizar-dia')
      .then(r => r.json())
      .then((data: DadosFinalizarDia) => {
        setDados(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  async function handleFinalizarDia() {
    const confirmado = window.confirm(
      'Tem certeza que deseja finalizar o dia? Esta ação irá consolidar todas as entregas do dia e não poderá ser desfeita.'
    )
    if (!confirmado) return

    setFinalizando(true)
    setMsg('')

    try {
      const res = await fetch('/api/finalizar-dia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: false }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg(`✅ ${data.mensagem || 'Dia finalizado com sucesso!'}`)
        carregar()
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao finalizar o dia'}`)
      }
    } catch {
      setMsg('❌ Erro de conexão ao servidor')
    }

    setFinalizando(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const resumo = dados?.resumoHoje

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🔒 Finalizar Dia</h2>
          <p className="text-sm text-gray-500 mt-0.5">Consolide e finalize as entregas do dia atual</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={carregar}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={handleFinalizarDia}
            disabled={finalizando || !resumo || resumo.pacotesPendentes > 0}
            className="px-5 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {finalizando ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Finalizando...
              </>
            ) : (
              '🔒 Finalizar Dia'
            )}
          </button>
        </div>
      </div>

      {/* MENSAGEM */}
      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border flex items-center gap-2 ${
            msg.startsWith('✅')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <span>{msg}</span>
        </div>
      )}

      {/* AVISO DE PENDENTES */}
      {resumo && resumo.pacotesPendentes > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2">
          <span>⚠️ Ainda há {resumo.pacotesPendentes} pacote(s) pendente(s). Finalize as pendências antes de encerrar o dia.</span>
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

      {!loading && dados && (
        <>
          {/* === RESUMO DE HOJE === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-violet-200">
                  📦
                </div>
                <p className="text-xs font-medium text-gray-500">Pacotes Registrados</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{resumo?.pacotesRegistrados ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">total de pacotes no dia</p>
            </div>

            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-lg shadow-md shadow-emerald-200">
                  ✅
                </div>
                <p className="text-xs font-medium text-gray-500">Entregues</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{resumo?.pacotesEntregues ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">
                {resumo && resumo.pacotesRegistrados > 0
                  ? `${((resumo.pacotesEntregues / resumo.pacotesRegistrados) * 100).toFixed(0)}% de taxa de entrega`
                  : 'sem entregas hoje'}
              </p>
            </div>

            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-md shadow-amber-200">
                  ⏳
                </div>
                <p className="text-xs font-medium text-gray-500">Pendentes</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{resumo?.pacotesPendentes ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">aguardando finalização</p>
            </div>
          </div>

          {/* === TABELA: RESUMO POR ENTREGADOR === */}
          <div className="content-card mb-6 overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Resumo por Entregador</h3>
              </div>
              <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                {dados.entregadores.length} entregador(es)
              </span>
            </div>

            {dados.entregadores.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum entregador com atividade hoje
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Nome</th>
                      <th className="p-3 font-medium text-right">Valor Padrão</th>
                      <th className="p-3 font-medium text-right">Pacotes</th>
                      <th className="p-3 font-medium text-right">Entregues</th>
                      <th className="p-3 font-medium text-right">Falhas</th>
                      <th className="p-3 font-medium text-right">Valor Total</th>
                      <th className="p-3 font-medium text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.entregadores.map((e, idx) => (
                      <tr
                        key={e.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-900">{e.nome}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-gray-500 tabular-nums">{formatBRL(e.valorPadrao)}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{e.pacotes}</td>
                        <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{e.entregues}</td>
                        <td className="p-3 text-right text-red-500 font-medium tabular-nums">{e.falhas}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">{formatBRL(e.valorTotal)}</td>
                        <td className="p-3 text-center">
                          {e.finalizado ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Auto
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === FECHAMENTOS POR ENTREGADOR (HISTÓRICO) === */}
          <div className="content-card mb-6 overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Fechamentos por Entregador (Histórico)</h3>
              </div>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {dados.historicoEntregadores.length} registro(s)
              </span>
            </div>

            {dados.historicoEntregadores.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum fechamento de entregador encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium text-right">Pacotes</th>
                      <th className="p-3 font-medium text-right">Entregues</th>
                      <th className="p-3 font-medium text-right">Falhas</th>
                      <th className="p-3 font-medium text-right">Valor Total</th>
                      <th className="p-3 font-medium text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.historicoEntregadores.map(h => (
                      <tr
                        key={h.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition"
                      >
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(h.data)}</td>
                        <td className="p-3 font-medium text-gray-900">{h.entregadorNome}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{h.pacotes}</td>
                        <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{h.entregues}</td>
                        <td className="p-3 text-right text-red-500 font-medium tabular-nums">{h.falhas}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{formatBRL(h.valorTotal)}</td>
                        <td className="p-3 text-right font-semibold text-emerald-600 tabular-nums">
                          {h.valorPago > 0 ? formatBRL(h.valorPago) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* === DIAS FINALIZADOS (GERAL) === */}
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Dias Finalizados (Geral)</h3>
              </div>
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                {dados.historicoGeral.length} dia(s)
              </span>
            </div>

            {dados.historicoGeral.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum dia finalizado ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium text-right">Total Pacotes</th>
                      <th className="p-3 font-medium text-right">Entregues</th>
                      <th className="p-3 font-medium text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.historicoGeral.map(g => (
                      <tr
                        key={g.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition"
                      >
                        <td className="p-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(g.data)}</td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{g.totalPacotes}</td>
                        <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{g.totalEntregues}</td>
                        <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">{formatBRL(g.valorTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* INFORMAÇÃO RODAPÉ */}
          {dados.historicoGeral.length > 0 && (
            <div className="mt-4 text-center text-xs text-gray-400">
              Último dia finalizado: {fmtDate(dados.historicoGeral[0].data)}
            </div>
          )}
        </>
      )}

      {/* ESTADO VAZIO (sem dados no geral) */}
      {!loading && !dados && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-40">📋</div>
          <p className="text-gray-400 text-sm">Nenhum dado disponível no momento</p>
          <button
            onClick={carregar}
            className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition"
          >
            🔄 Tentar novamente
          </button>
        </div>
      )}
    </div>
  )
}
