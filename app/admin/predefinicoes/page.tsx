'use client'

import { useState } from 'react'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

export default function PredefinicoesPage() {
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [executando, setExecutando] = useState<string | null>(null)
  const [valorGlobal, setValorGlobal] = useState('')
  const [diasFotos, setDiasFotos] = useState('30')
  const [percentualMulta, setPercentualMulta] = useState('10')
  const [percentualReajuste, setPercentualReajuste] = useState('')
  const [diasCongelar, setDiasCongelar] = useState('30')
  const [previsaoData, setPrevisaoData] = useState<any[] | null>(null)

  async function executar(acao: string, payload: Record<string, unknown> = {}) {
    setExecutando(acao)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/predefinicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...payload }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: data.mensagem })
        if (acao === 'previsao_pagamentos' && data.entregadores) {
          setPrevisaoData(data.entregadores)
        } else if (acao !== 'previsao_pagamentos') {
          setPrevisaoData(null)
        }
      } else {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    } finally {
      setExecutando(null)
    }
  }

  return (
    <FeatureGuard feature={FEATURES.VALOR_PADRAO_ENTREGA}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🎛️ Predefinições</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure ações em massa, valores padrão e manutenção do sistema
          </p>
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up ${
            msg.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.texto}
            <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ══════ VALORES ══════ */}
        <div className="content-card p-6">
          <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
            💰 Valores Padrão
          </h3>
          <div className="space-y-4">
            {/* Valor Global */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor por pacote (R$)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={valorGlobal}
                  onChange={e => setValorGlobal(e.target.value)}
                  placeholder="Ex: 0.50"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
              </div>
              <button
                onClick={() => executar('aplicar_valor_global', { numero: valorGlobal })}
                disabled={executando !== null || !valorGlobal || Number(valorGlobal) <= 0}
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-violet-200 whitespace-nowrap"
              >
                {executando === 'aplicar_valor_global' ? '⏳' : '📦 Em Todos os Pacotes'}
              </button>
              <button
                onClick={() => executar('aplicar_valor_entregadores', { numero: valorGlobal })}
                disabled={executando !== null || !valorGlobal || Number(valorGlobal) <= 0}
                className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-green-200 whitespace-nowrap"
              >
                {executando === 'aplicar_valor_entregadores' ? '⏳' : '👥 + Entregadores'}
              </button>
            </div>

            {/* Reajuste Percentual */}
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Reajuste percentual em TODOS os pacotes (%)
              </label>
              <div className="flex items-end gap-2">
                <input
                  type="number" step="0.1"
                  value={percentualReajuste}
                  onChange={e => setPercentualReajuste(e.target.value)}
                  placeholder="Ex: 10 ou -5"
                  className="w-32 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
                <button
                  onClick={() => executar('reajuste_percentual', { numero: percentualReajuste })}
                  disabled={executando !== null || !percentualReajuste}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-blue-200"
                >
                  {executando === 'reajuste_percentual' ? '⏳' : '📊 Aplicar Reajuste'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ STATUS EM MASSA ══════ */}
        <div className="content-card p-6">
          <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
            ⚠️ Gestão de Status em Massa
          </h3>
          <div className="space-y-4">
            {/* Marcar Atrasados */}
            <div className="flex items-start justify-between p-4 bg-red-50/50 rounded-xl border border-red-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">⚠️ Marcar Atrasados</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Marca todos os pacotes com data limite vencida como <strong>ATRASADOS</strong>
                </p>
              </div>
              <button
                onClick={() => executar('marcar_atrasados')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-red-200 whitespace-nowrap"
              >
                {executando === 'marcar_atrasados' ? '⏳' : '⚠️ Marcar'}
              </button>
            </div>

            {/* Multa por Atraso */}
            <div className="flex items-start justify-between p-4 bg-orange-50/50 rounded-xl border border-orange-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">💰 Aplicar Multa por Atraso</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Aplica um percentual de multa sobre o valor dos pacotes atrasados
                </p>
              </div>
              <div className="flex items-end gap-2">
                <input
                  type="number" step="0.1" min="0"
                  value={percentualMulta}
                  onChange={e => setPercentualMulta(e.target.value)}
                  className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
                <span className="text-xs text-gray-500 pb-2">%</span>
                <button
                  onClick={() => executar('aplicar_multa_atraso', { numero: percentualMulta })}
                  disabled={executando !== null || !percentualMulta || Number(percentualMulta) <= 0}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-orange-200"
                >
                  {executando === 'aplicar_multa_atraso' ? '⏳' : '💲 Multar'}
                </button>
              </div>
            </div>

            {/* Resetar Retornados */}
            <div className="flex items-start justify-between p-4 bg-amber-50/50 rounded-xl border border-amber-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">🔄 Resetar Retornados</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Move pacotes &quot;Retornado à Central&quot; para &quot;Aguardando Retirada&quot;
                </p>
              </div>
              <button
                onClick={() => executar('resetar_status_retornados')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-amber-200"
              >
                {executando === 'resetar_status_retornados' ? '⏳' : '🔄 Resetar'}
              </button>
            </div>

            {/* Congelar Antigos */}
            <div className="flex items-start justify-between p-4 bg-blue-50/50 rounded-xl border border-blue-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">🧊 Congelar Antigos</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Congela pacotes ativos com data limite vencida há mais de X dias
                </p>
              </div>
              <div className="flex items-end gap-2">
                <input
                  type="number" min="1"
                  value={diasCongelar}
                  onChange={e => setDiasCongelar(e.target.value)}
                  className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <span className="text-xs text-gray-500 pb-2">dias</span>
                <button
                  onClick={() => executar('congelar_antigos', { numero: diasCongelar })}
                  disabled={executando !== null || !diasCongelar}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-blue-200"
                >
                  {executando === 'congelar_antigos' ? '⏳' : '🧊 Congelar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ PAGAMENTOS PENDENTES ══════ */}
        <div className="content-card p-6">
          <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
            💳 Pagamentos Pendentes Futuros
          </h3>
          <div className="space-y-4">
            {/* Marcar Pendentes */}
            <div className="flex items-start justify-between p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">💳 Marcar Pendentes de Pagamento</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Marca pacotes <strong>Entregues/Finalizados</strong> com pagamento não realizado
                </p>
              </div>
              <button
                onClick={() => executar('marcar_pendentes_pagamento')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-emerald-200 whitespace-nowrap"
              >
                {executando === 'marcar_pendentes_pagamento' ? '⏳' : '💳 Marcar'}
              </button>
            </div>

            {/* Prévia de Pagamentos */}
            <div className="flex flex-col p-4 bg-teal-50/50 rounded-xl border border-teal-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">📊 Prévia de Pagamentos</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mostra um resumo de todos os pacotes pendentes de pagamento, agrupado por entregador
                  </p>
                </div>
                <button
                  onClick={() => executar('previsao_pagamentos')}
                  disabled={executando !== null}
                  className="px-4 py-2 rounded-xl bg-teal-500 text-white text-xs font-bold hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-teal-200 whitespace-nowrap"
                >
                  {executando === 'previsao_pagamentos' ? '⏳' : '📊 Ver Prévia'}
                </button>
              </div>

              {/* Tabela de prévia */}
              {previsaoData && previsaoData.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-teal-200">
                        <th className="text-left py-2 px-2 font-semibold text-teal-800">Entregador</th>
                        <th className="text-right py-2 px-2 font-semibold text-teal-800">Pacotes</th>
                        <th className="text-right py-2 px-2 font-semibold text-teal-800">Valor Total</th>
                        <th className="text-right py-2 px-2 font-semibold text-teal-800">Entregues</th>
                        <th className="text-right py-2 px-2 font-semibold text-teal-800">Em Rota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previsaoData.map((item: any, i: number) => (
                        <tr key={i} className="border-b border-teal-100 hover:bg-teal-50/50">
                          <td className="py-2 px-2 font-medium text-gray-900">{item.entregador_nome}</td>
                          <td className="py-2 px-2 text-right">{item.total_pacotes}</td>
                          <td className="py-2 px-2 text-right font-medium text-emerald-700">
                            R$ {Number(item.valor_total || 0).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">{item.qtd_entregues}</td>
                          <td className="py-2 px-2 text-right text-gray-600">{item.qtd_em_rota}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-teal-100/50">
                        <td className="py-2 px-2 text-teal-800">TOTAL</td>
                        <td className="py-2 px-2 text-right">
                          {previsaoData.reduce((a: number, i: any) => a + (i.total_pacotes || 0), 0)}
                        </td>
                        <td className="py-2 px-2 text-right text-emerald-800">
                          R$ {previsaoData.reduce((a: number, i: any) => a + Number(i.valor_total || 0), 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {previsaoData.reduce((a: number, i: any) => a + (i.qtd_entregues || 0), 0)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {previsaoData.reduce((a: number, i: any) => a + (i.qtd_em_rota || 0), 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {previsaoData && previsaoData.length === 0 && (
                <div className="mt-3 text-center text-xs text-gray-400 py-3">
                  ✅ Nenhum pagamento pendente encontrado
                </div>
              )}
            </div>

            {/* Ações Combinadas */}
            <div className="flex items-start justify-between p-4 bg-purple-50/50 rounded-xl border border-purple-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">⚡ Marcar Atrasados + Pendências (Combo)</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Executa <strong>marcação de atrasados</strong> + <strong>pendentes de pagamento</strong> de uma só vez
                </p>
              </div>
              <button
                onClick={() => executar('marcar_atrasados_completo')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-purple-200 whitespace-nowrap"
              >
                {executando === 'marcar_atrasados_completo' ? '⏳' : '⚡ Executar Combo'}
              </button>
            </div>
          </div>
        </div>

        {/* ══════ LIMPEZA E REVERSÃO ══════ */}
        <div className="content-card p-6">
          <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
            🧹 Limpeza e Reversão
          </h3>
          <div className="space-y-4">
            {/* Limpar Atrasados */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900 text-sm">✅ Limpar Marcas de Atraso</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove todas as marcações de atraso dos pacotes</p>
              </div>
              <button
                onClick={() => executar('limpar_marcas_atraso')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-xs font-bold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-gray-200"
              >
                {executando === 'limpar_marcas_atraso' ? '⏳' : '✅ Limpar'}
              </button>
            </div>

            {/* Descongelar */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900 text-sm">🔥 Descongelar Tudo</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove congelamento de todos os pacotes</p>
              </div>
              <button
                onClick={() => executar('descongelar')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-xs font-bold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-gray-200"
              >
                {executando === 'descongelar' ? '⏳' : '🔥 Descongelar'}
              </button>
            </div>

            {/* Limpar Pendências de Pagamento */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900 text-sm">✅ Limpar Pendências de Pagamento</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove todas as marcações de pendência de pagamento</p>
              </div>
              <button
                onClick={() => executar('limpar_pendencias_pagamento')}
                disabled={executando !== null}
                className="px-4 py-2 rounded-xl bg-gray-600 text-white text-xs font-bold hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-gray-200"
              >
                {executando === 'limpar_pendencias_pagamento' ? '⏳' : '✅ Limpar'}
              </button>
            </div>

            {/* Limpar Fotos */}
            <div className="flex items-start justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <p className="font-semibold text-gray-900 text-sm">🗑️ Limpar Fotos Antigas</p>
                <p className="text-xs text-gray-500 mt-0.5">Remove fotos de pacotes entregues há mais de X dias</p>
              </div>
              <div className="flex items-end gap-2">
                <input
                  type="number" min="1" max="365"
                  value={diasFotos}
                  onChange={e => setDiasFotos(e.target.value)}
                  className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <span className="text-xs text-gray-500 pb-2">dias</span>
                <button
                  onClick={() => executar('limpar_fotos_antigas', { numero: diasFotos })}
                  disabled={executando !== null}
                  className="px-4 py-2 rounded-xl bg-red-400 text-white text-xs font-bold hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-red-200"
                >
                  {executando === 'limpar_fotos_antigas' ? '⏳' : '🗑️ Limpar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ RESUMO ══════ */}
        <div className="content-card p-6">
          <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
            📋 Guia Rápido
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2 bg-violet-50 rounded-xl p-3">
              <span className="text-violet-500 mt-0.5">💰</span>
              <div>
                <p className="font-semibold text-gray-900">Valor Global</p>
                <p className="text-gray-500 text-xs">Aplica valor fixo a todos os pacotes</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
              <span className="text-green-500 mt-0.5">👥</span>
              <div>
                <p className="font-semibold text-gray-900">Valor + Entregadores</p>
                <p className="text-gray-500 text-xs">Atualiza entregadores e seus pacotes</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
              <span className="text-blue-500 mt-0.5">📊</span>
              <div>
                <p className="font-semibold text-gray-900">Reajuste %</p>
                <p className="text-gray-500 text-xs">Aumenta/reduz valores em percentual</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div>
                <p className="font-semibold text-gray-900">Atrasados</p>
                <p className="text-gray-500 text-xs">Marca pacotes com data vencida</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-orange-50 rounded-xl p-3">
              <span className="text-orange-500 mt-0.5">💲</span>
              <div>
                <p className="font-semibold text-gray-900">Multa</p>
                <p className="text-gray-500 text-xs">Percentual extra sobre atrasados</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 rounded-xl p-3">
              <span className="text-amber-500 mt-0.5">🔄</span>
              <div>
                <p className="font-semibold text-gray-900">Reset Retornados</p>
                <p className="text-gray-500 text-xs">Libera retornados para nova tentativa</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-blue-50 rounded-xl p-3">
              <span className="text-blue-400 mt-0.5">🧊</span>
              <div>
                <p className="font-semibold text-gray-900">Congelar/Descongelar</p>
                <p className="text-gray-500 text-xs">Gerencia pacotes parados</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-emerald-50 rounded-xl p-3">
              <span className="text-emerald-500 mt-0.5">💳</span>
              <div>
                <p className="font-semibold text-gray-900">Pendentes Pagamento</p>
                <p className="text-gray-500 text-xs">Marca entregues não pagos</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-teal-50 rounded-xl p-3">
              <span className="text-teal-500 mt-0.5">📊</span>
              <div>
                <p className="font-semibold text-gray-900">Prévia Financeira</p>
                <p className="text-gray-500 text-xs">Resumo de pagamentos por entregador</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-purple-50 rounded-xl p-3">
              <span className="text-purple-500 mt-0.5">⚡</span>
              <div>
                <p className="font-semibold text-gray-900">Combo Atrasados</p>
                <p className="text-gray-500 text-xs">Atrasados + Pendências de uma vez</p>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
              <span className="text-red-300 mt-0.5">🗑️</span>
              <div>
                <p className="font-semibold text-gray-900">Limpeza</p>
                <p className="text-gray-500 text-xs">Remove fotos, atraso e pendências</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FeatureGuard>
  )
}
