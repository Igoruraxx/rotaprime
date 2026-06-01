'use client'

import { useState, useEffect } from 'react'

export default function PredefinicoesPage() {
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [executando, setExecutando] = useState<string | null>(null)

  // Valores de predefinições
  const [valorGlobal, setValorGlobal] = useState('')
  const [diasFotos, setDiasFotos] = useState('30')

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">🎛️ Predefinições</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure ações em massa, valores padrão e preferências do sistema
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

      {/* ── VALOR PADRÃO ── */}
      <div className="content-card p-6">
        <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
          💰 Valor Padrão de Entrega
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Define um valor padrão que será aplicado a TODOS os pacotes (ativos, não validados).
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor por pacote (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
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
            {executando === 'aplicar_valor_global' ? '⏳' : '📦 Aplicar em Todos os Pacotes'}
          </button>
        </div>
      </div>

      {/* ── VALOR ENTREGADORES + PACOTES ── */}
      <div className="content-card p-6">
        <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
          👥 Valor Padrão + Pacotes (Entregadores)
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Define o valor padrão em TODOS os entregadores ativos e aplica em TODOS os seus pacotes.
        </p>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor por pacote (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorGlobal}
              onChange={e => setValorGlobal(e.target.value)}
              placeholder="Ex: 0.50"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>
          <button
            onClick={() => executar('aplicar_valor_entregadores', { numero: valorGlobal })}
            disabled={executando !== null || !valorGlobal || Number(valorGlobal) <= 0}
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-green-200 whitespace-nowrap"
          >
            {executando === 'aplicar_valor_entregadores' ? '⏳' : '👥 Atualizar Entregadores + Pacotes'}
          </button>
        </div>
      </div>

      {/* ── RESETAR RETORNADOS ── */}
      <div className="content-card p-6">
        <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
          🔄 Resetar Pacotes Retornados
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Move TODOS os pacotes com status &quot;Retornado à Central&quot; para &quot;Aguardando Retirada&quot;, liberando-os para uma nova tentativa de entrega.
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => executar('resetar_status_retornados')}
            disabled={executando !== null}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-amber-200"
          >
            {executando === 'resetar_status_retornados' ? '⏳ Resetando...' : '🔄 Resetar Todos os Retornados'}
          </button>
        </div>
      </div>

      {/* ── LIMPAR FOTOS ANTIGAS ── */}
      <div className="content-card p-6">
        <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
          🗂️ Limpeza de Fotos Antigas
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Remove fotos de pacotes com mais de X dias desde a entrega. O GPS é sempre mantido.
        </p>

        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dias</label>
            <input
              type="number"
              min="1"
              max="365"
              value={diasFotos}
              onChange={e => setDiasFotos(e.target.value)}
              className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>
          <button
            onClick={() => executar('limpar_fotos_antigas', { numero: diasFotos })}
            disabled={executando !== null}
            className="px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-red-200"
          >
            {executando === 'limpar_fotos_antigas' ? '⏳' : `🗑️ Limpar Fotos > ${diasFotos} dias`}
          </button>
        </div>
      </div>

      {/* ── RESUMO ── */}
      <div className="content-card p-6">
        <h3 className="section-header px-4 py-3 -mx-6 -mt-6 rounded-t-xl mb-5">
          📋 Resumo de Ações
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-violet-500 mt-0.5">💰</span>
            <div>
              <p className="font-semibold text-gray-900">Valor Global em Pacotes</p>
              <p className="text-gray-500 text-xs">Aplica um valor fixo a todos os pacotes não validados</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">👥</span>
            <div>
              <p className="font-semibold text-gray-900">Valor Global em Entregadores</p>
              <p className="text-gray-500 text-xs">Define o valor padrão nos entregadores E aplica aos seus pacotes</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">🔄</span>
            <div>
              <p className="font-semibold text-gray-900">Resetar Retornados</p>
              <p className="text-gray-500 text-xs">Devolve pacotes retornados para "Aguardando Retirada"</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">🗑️</span>
            <div>
              <p className="font-semibold text-gray-900">Limpeza Programada</p>
              <p className="text-gray-500 text-xs">Remove fotos antigas mantendo apenas coordenadas GPS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
