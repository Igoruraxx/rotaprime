'use client'

import { useEffect, useState } from 'react'

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
  'Configurações': 'from-slate-500 to-gray-600',
}

export default function ConfiguracoesPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  function carregar() {
    setLoading(true)
    fetch('/api/configuracoes')
      .then(r => r.json())
      .then(data => {
        setFeatures(data.features || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(carregar, [])

  async function toggle(f: Feature) {
    const res = await fetch('/api/configuracoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: f.chave, ativo: !f.ativo })
    })

    if (res.ok) {
      setFeatures(prev => prev.map(p => p.id === f.id ? { ...p, ativo: !p.ativo } : p))
      setMsg(`⚡ ${!f.ativo ? 'Habilitado' : 'Desabilitado'}: ${f.nome}`)
    } else {
      const data = await res.json()
      setMsg(`❌ ${data.erro || 'Erro'}`)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  // Agrupar features
  const grupos: Record<string, Feature[]> = {}
  features.forEach(f => {
    if (!grupos[f.grupo]) grupos[f.grupo] = []
    grupos[f.grupo].push(f)
  })

  const totalAtivas = features.filter(f => f.ativo).length
  const total = features.length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">⚙️ Controle do Sistema</h2>
          <p className="text-sm text-white/50 mt-1">
            {totalAtivas}/{total} funcionalidades ativas
          </p>
        </div>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-white/10 text-white border border-white/20 backdrop-blur-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-white/40">Carregando...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([grupo, items]) => (
            <div key={grupo} className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
              {/* Grupo header */}
              <div className={`px-5 py-3 bg-gradient-to-r ${GRUPO_CORES[grupo] || 'from-gray-600 to-gray-700'}`}>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  {grupo}
                  <span className="text-xs text-white/60 font-normal">
                    ({items.filter(f => f.ativo).length}/{items.length})
                  </span>
                </h3>
              </div>

              {/* Features */}
              <div className="divide-y divide-white/5">
                {items.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${f.ativo ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-gray-600'}`} />
                        <span className="font-medium text-white text-sm">{f.nome}</span>
                        <code className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded">
                          {f.chave}
                        </code>
                      </div>
                      {f.descricao && (
                        <p className="text-xs text-white/40 mt-0.5 ml-4">{f.descricao}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggle(f)}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${
                        f.ativo
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                          : 'bg-white/10'
                      }`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md ${
                        f.ativo ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
