'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatBR, formatBRDate } from '@/lib/utils'
import BotaoComprovante from '@/components/comprovante-pdf'

interface FinanceiroData {
  previsoes: {
    repassados_central: { quantidade: number; valor: number }
    em_andamento: { quantidade: number; valor: number }
    a_receber: { quantidade: number; valor: number }
  }
  recebido: { total: number; quantidade: number }
  ultimo_pagamento: { data: string | null; valor: number; periodo: string | null; total_entregues: number } | null
  historico_ciclos: Array<{ data: string; valor: number; periodo: string; entregues: number }>
  hoje: { entregues: number }
  total_pacotes: number
  valor_padrao: number
}

export default function FinanceiroPage() {
  const router = useRouter()
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/entregador/financeiro')
      .then(r => r.json())
      .then(d => {
        if (d.erro) setError(d.erro)
        else setData(d)
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false))
  }, [])

  function fmt(v: number) {
    return `R$ ${v.toFixed(2)}`.replace('.', ',')
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
          </div>
          <div className="h-48 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={() => router.refresh()} className="mt-3 text-sm text-indigo-600 hover:underline">Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">💰 Financeiro</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.total_pacotes} pacotes · {data.hoje.entregues} entregue(s) hoje
        </p>
      </div>

      {/* Cards de Previsão */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Repassados pela Central */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🏭</span>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Repassados</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{fmt(data.previsoes.repassados_central.valor)}</p>
          <p className="text-xs text-blue-600 mt-1">{data.previsoes.repassados_central.quantidade} pacote(s) na central</p>
        </div>

        {/* Em Andamento */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚚</span>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Em Rota</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{fmt(data.previsoes.em_andamento.valor)}</p>
          <p className="text-xs text-amber-600 mt-1">{data.previsoes.em_andamento.quantidade} pacote(s) em andamento</p>
        </div>

        {/* A Receber */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">✅</span>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{fmt(data.previsoes.a_receber.valor)}</p>
          <p className="text-xs text-emerald-600 mt-1">{data.previsoes.a_receber.quantidade} entrega(s) pendente(s)</p>
        </div>
      </div>

      {/* Total Recebido */}
      <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total já Recebido</p>
          <span className="text-xs text-gray-500">{data.recebido.quantidade} pacote(s)</span>
        </div>
        <p className="text-3xl font-bold text-white">{fmt(data.recebido.total)}</p>
        {data.ultimo_pagamento && data.ultimo_pagamento.data && (
          <p className="text-xs text-gray-400 mt-1">
            Último recebimento: {formatBRDate(data.ultimo_pagamento.data)}
          </p>
        )}
      </div>

      {/* Último Pagamento */}
      {data.ultimo_pagamento && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">📅 Último Ciclo de Pagamento</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Valor</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{fmt(data.ultimo_pagamento.valor)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Entregues</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{data.ultimo_pagamento.total_entregues}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 col-span-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase">Período</p>
              <p className="text-sm font-bold text-gray-900 mt-1">{data.ultimo_pagamento.periodo || '—'}</p>
            </div>
          </div>
          {data.ultimo_pagamento.data && (
            <p className="text-xs text-gray-400 mt-3">
              Pago em: {formatBRDate(data.ultimo_pagamento.data)}
            </p>
          )}
        </div>
      )}

      {/* Histórico de Ciclos */}
      {data.historico_ciclos.length > 0 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">📊 Histórico de Pagamentos</h2>
          <div className="space-y-2">
            {data.historico_ciclos.map((ciclo, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fmt(ciclo.valor)}</p>
                    <p className="text-[10px] text-gray-400">{ciclo.periodo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">{ciclo.entregues} entregue(s)</p>
                  <p className="text-[10px] text-gray-400">{formatBRDate(ciclo.data)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Valor Padrão */}
      {data.valor_padrao > 0 && (
        <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4">
          <p className="text-xs font-semibold text-indigo-700">
            💰 Seu valor padrão por entrega é <strong>R$ {data.valor_padrao.toFixed(2)}</strong>
          </p>
          <p className="text-[11px] text-indigo-600/70 mt-0.5">
            Esse valor pode ser ajustado pelo administrador.
          </p>
        </div>
      )}
    </div>
  )
}
