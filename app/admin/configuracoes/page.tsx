'use client'

import { useEffect, useState, useCallback } from 'react'

type Feature = {
  id: number
  chave: string
  nome: string
  descricao: string
  grupo: string
  ativo: boolean
  criado_em: string
}

const GRUPO_CORES: Record<string, string> = {
  'Geral': 'from-violet-500 to-purple-600',
  'Pacotes': 'from-orange-500 to-amber-600',
  'Entregadores': 'from-emerald-500 to-green-600',
  'Entregas': 'from-blue-500 to-cyan-600',
  'Financeiro': 'from-teal-500 to-cyan-600',
  'Relatorios': 'from-rose-500 to-pink-600',
  'Comunicacao': 'from-green-500 to-emerald-600',
  'Transportadoras': 'from-amber-500 to-yellow-600',
  'Seguranca': 'from-red-500 to-rose-600',
  'Dashboard': 'from-indigo-500 to-blue-600',
  'Sistema': 'from-slate-500 to-gray-600',
  'Configuracoes': 'from-slate-500 to-gray-600',
}

export default function ConfiguracoesPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [alterados, setAlterados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(data => setFeatures(data.features || []))
      .finally(() => setLoading(false))
  }, [])

  function toggleLocal(id: number) {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, ativo: !f.ativo } : f))
    setAlterados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function salvarTudo() {
    setSalvando(true)
    setMsg(null)
    let ok = 0
    let err = 0

    for (const id of Array.from(alterados)) {
      const f = features.find(x => x.id === id)
      if (!f) continue
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: f.chave, ativo: f.ativo }),
      })
      if (res.ok) ok++; else err++
    }

    setAlterados(new Set())
    if (err === 0) {
      setMsg({ tipo: 'sucesso', texto: `✅ ${ok} funcionalidade(s) salva(s) com sucesso! As mudanças já estão ativas.` })
    } else {
      setMsg({ tipo: 'erro', texto: `⚠️ ${ok} salva(s), ${err} erro(s)` })
    }
    setSalvando(false)
    setTimeout(() => setMsg(null), 5000)
  }

  const grupos: Record<string, Feature[]> = {}
  features.forEach(f => {
    if (!grupos[f.grupo]) grupos[f.grupo] = []
    grupos[f.grupo].push(f)
  })

  const totalAtivas = features.filter(f => f.ativo).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">⚙️ Controle do Sistema</h2>
          <p className="text-sm text-gray-500 mt-1">
            {totalAtivas}/{features.length} funcionalidades ativas
          </p>
        </div>
        {alterados.size > 0 && (
          <button
            onClick={salvarTudo}
            disabled={salvando}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-violet-200 inline-flex items-center gap-2"
          >
            {salvando ? (
              <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</>
            ) : (
              <>💾 Salvar ({alterados.size} alteração{alterados.size > 1 ? 'ões' : ''})</>
            )}
          </button>
        )}
      </div>

      {/* Mensagem */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up ${
          msg.tipo === 'sucesso'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg.texto}
          <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Info */}
      {alterados.size > 0 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2">
          ⚠️ Você tem {alterados.size} alteração{alterados.size > 1 ? 'ões' : ''} pendente{alterados.size > 1 ? 's' : ''}. Clique em <strong>Salvar</strong> para aplicar.
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([grupo, items]) => (
            <div key={grupo} className="content-card overflow-hidden">
              <div className={`px-5 py-3 bg-gradient-to-r ${GRUPO_CORES[grupo] || 'from-gray-600 to-gray-700'}`}>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  {grupo}
                  <span className="text-xs text-white/60 font-normal">
                    ({items.filter(f => f.ativo).length}/{items.length})
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(f => {
                  const foiAlterado = alterados.has(f.id)
                  return (
                    <div key={f.id}
                      className={`flex items-center justify-between px-5 py-3.5 transition-colors ${
                        foiAlterado ? 'bg-amber-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            f.ativo
                              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                              : 'bg-gray-300'
                          }`} />
                          <span className={`font-medium text-sm ${f.ativo ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                            {f.nome}
                          </span>
                          {foiAlterado && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                              alterado
                            </span>
                          )}
                          <code className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded hidden sm:inline">
                            {f.chave}
                          </code>
                        </div>
                        {f.descricao && (
                          <p className={`text-xs mt-0.5 ml-4 ${f.ativo ? 'text-gray-500' : 'text-gray-300 line-through'}`}>
                            {f.descricao}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleLocal(f.id)}
                        className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${
                          f.ativo
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                            : 'bg-gray-200'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                          f.ativo ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão Salvar fixo no bottom (mobile) */}
      {alterados.size > 0 && (
        <div className="fixed bottom-4 left-0 right-0 px-4 md:hidden z-40">
          <button
            onClick={salvarTudo}
            disabled={salvando}
            className="w-full rounded-xl bg-violet-600 text-white py-3.5 text-sm font-bold shadow-xl shadow-violet-300 active:scale-[0.98] transition-all"
          >
            {salvando ? 'Salvando...' : `💾 Salvar ${alterados.size} alteração${alterados.size > 1 ? 'ões' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
