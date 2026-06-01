'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type DesempenhoEntregador = {
  id: number
  nome: string
  total: number
  entregues: number
  falhas: number
  valorTotal: number
  valorPago: number
}

type PacoteItem = {
  codigo: string
  data_chegada: string
  data_entrega_real: string
  status: string
  entregador: string | null
  valor_pacote: string
  pago: boolean
}

type DadosRelatorio = {
  periodo: string
  dataInicio: string
  dataFim: string
  stats: {
    totalPacotes: number
    totalEntregues: number
    totalFalhas: number
    valorTotal: string
    totalPago: string
  }
  desempenhoEntregadores: DesempenhoEntregador[]
  pacotes: PacoteItem[]
}

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-gray-100 text-gray-500',
  'Aguardando Retirada': 'bg-amber-500 text-white',
  'Retirado pelo Entregador': 'bg-violet-500 text-white',
  'Em Rota': 'bg-violet-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatBRL(val: string | number) {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function mesOptions() {
  const opts: { value: string; label: string }[] = []
  const agora = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    opts.push({ value: val, label })
  }
  return opts
}

export default function RelatorioMensalPage() {
  const router = useRouter()
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mensal')
  const [mes, setMes] = useState(() => {
    const agora = new Date()
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  })
  const [filtroData, setFiltroData] = useState('chegada')

  const carregar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ periodo, mes, filtro_data: filtroData })
    fetch(`/api/relatorio-mensal?${params}`)
      .then(r => r.json())
      .then(data => {
        setDados(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [periodo, mes, filtroData])

  useEffect(() => { carregar() }, [carregar])

  const periodos = [
    { value: 'semanal', label: 'Semanal' },
    { value: 'quinzenal', label: 'Quinzenal' },
    { value: 'mensal', label: 'Mensal' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📊 Relatório Consolidado</h2>
          <p className="text-sm text-gray-500 mt-0.5">Desempenho por entregador em períodos personalizáveis</p>
        </div>
        <button
          onClick={carregar}
          className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5"
        >
          🔄 Atualizar
        </button>
      </div>

      {/* FILTROS */}
      <div className="content-card p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Período */}
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Período</label>
            <div className="flex gap-1 p-1 rounded-lg bg-gray-100">
              {periodos.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    periodo === p.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mês (só mostra no mensal) */}
          {periodo === 'mensal' && (
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Mês</label>
              <select
                value={mes}
                onChange={e => setMes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
              >
                {mesOptions().map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtrar por */}
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Filtrar por</label>
            <select
              value={filtroData}
              onChange={e => setFiltroData(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm"
            >
              <option value="chegada">Data de Chegada</option>
              <option value="entrega">Data de Entrega Real</option>
            </select>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
            Carregando relatório...
          </div>
        </div>
      )}

      {!loading && !dados && (
        <div className="text-center py-16 text-gray-400">
          Erro ao carregar relatório
        </div>
      )}

      {dados && (
        <>
          {/* CARDS DE INDICADORES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg shadow-md shadow-violet-200">
                  📦
                </div>
                <p className="text-xs font-medium text-gray-500">Total</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalPacotes}</p>
              <p className="text-xs text-gray-400 mt-1">pacotes no período</p>
            </div>

            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-lg shadow-md shadow-emerald-200">
                  ✅
                </div>
                <p className="text-xs font-medium text-gray-500">Entregues</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalEntregues}</p>
              <p className="text-xs text-gray-400 mt-1">
                {dados.stats.totalPacotes > 0
                  ? `${((dados.stats.totalEntregues / dados.stats.totalPacotes) * 100).toFixed(0)}% de taxa de entrega`
                  : 'sem dados'}
              </p>
            </div>

            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-lg shadow-md shadow-red-200">
                  ❌
                </div>
                <p className="text-xs font-medium text-gray-500">Falhas</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalFalhas}</p>
              <p className="text-xs text-gray-400 mt-1">retornados à central</p>
            </div>

            <div className="content-card p-5 card-hover">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-lg shadow-md shadow-amber-200">
                  💰
                </div>
                <p className="text-xs font-medium text-gray-500">Valor Total</p>
              </div>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">{formatBRL(dados.stats.valorTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">
                <span className="text-emerald-600 font-medium">{formatBRL(dados.stats.totalPago)}</span> pago
              </p>
            </div>
          </div>

          {/* TABELA DE DESEMPENHO POR ENTREGADOR */}
          <div className="content-card mb-6 overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Desempenho por Entregador</h3>
              </div>
              <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
                {dados.desempenhoEntregadores.length} entregador(es)
              </span>
            </div>

            {dados.desempenhoEntregadores.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum dado de entregador no período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium text-right">Total</th>
                      <th className="p-3 font-medium text-right">Entregues</th>
                      <th className="p-3 font-medium text-right">Falhas</th>
                      <th className="p-3 font-medium text-right">% Sucesso</th>
                      <th className="p-3 font-medium text-right">Valor Total</th>
                      <th className="p-3 font-medium text-right">Valor Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.desempenhoEntregadores.map((e, idx) => {
                      const taxa = e.total > 0 ? (e.entregues / e.total) * 100 : 0
                      return (
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
                          <td className="p-3 text-right text-gray-700 tabular-nums">{e.total}</td>
                          <td className="p-3 text-right text-emerald-600 font-medium tabular-nums">{e.entregues}</td>
                          <td className="p-3 text-right text-red-500 font-medium tabular-nums">{e.falhas}</td>
                          <td className="p-3 text-right tabular-nums">
                            <span className={`inline-flex items-center gap-1 font-medium ${
                              taxa >= 80 ? 'text-emerald-600' : taxa >= 50 ? 'text-amber-600' : 'text-red-500'
                            }`}>
                              {taxa.toFixed(0)}%
                              <span className="text-xs">
                                {taxa >= 80 ? '↑' : taxa >= 50 ? '→' : '↓'}
                              </span>
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-700 tabular-nums">{formatBRL(e.valorTotal)}</td>
                          <td className="p-3 text-right tabular-nums">
                            <span className={e.valorPago > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                              {formatBRL(e.valorPago)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABELA DE PACOTES DO PERÍODO */}
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Pacotes do Período</h3>
              </div>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {dados.pacotes.length} pacote(s)
              </span>
            </div>

            {dados.pacotes.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                Nenhum pacote encontrado no período
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                      <th className="p-3 font-medium">Código</th>
                      <th className="p-3 font-medium">Data</th>
                      <th className="p-3 font-medium">Entregador</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium text-right">Valor</th>
                      <th className="p-3 font-medium text-center">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.pacotes.map(p => (
                      <tr
                        key={p.codigo}
                        onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                        className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition cursor-pointer"
                      >
                        <td className="p-3">
                          <span className="link-btn-sm">{p.codigo}</span>
                        </td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {filtroData === 'entrega'
                            ? formatDate(p.data_entrega_real)
                            : formatDate(p.data_chegada)
                          }
                        </td>
                        <td className="p-3 text-gray-500">{p.entregador || '—'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-gray-700 tabular-nums">{formatBRL(p.valor_pacote)}</td>
                        <td className="p-3 text-center">
                          {p.pago ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              ✅ Pago
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

          {/* PERÍODO INFO */}
          <div className="mt-4 text-center text-xs text-gray-400">
            Período: {new Date(dados.dataInicio).toLocaleDateString('pt-BR')} — {new Date(dados.dataFim).toLocaleDateString('pt-BR')}
            &nbsp;·&nbsp; Filtrado por:{' '}
            {filtroData === 'entrega' ? 'Data de Entrega Real' : 'Data de Chegada'}
          </div>
        </>
      )}
    </div>
  )
}
