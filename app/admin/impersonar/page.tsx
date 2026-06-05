'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Entregador = {
  id: number
  nome: string
  telefone: string | null
  ativo: boolean
}

export default function ImpersonarPage() {
  const router = useRouter()
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [loading, setLoading] = useState(true)
  const [impersonando, setImpersonando] = useState(false)
  const [msg, setMsg] = useState('')
  const [selecionado, setSelecionado] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setEntregadores(data.entregadores || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function impersonar() {
    if (!selecionado) return
    setImpersonando(true)
    setMsg('')

    try {
      const res = await fetch('/api/admin/impersonar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entregador_id: parseInt(selecionado) }),
      })
      const data = await res.json()
      if (res.ok) {
        window.location.href = data.redirect
      } else {
        setMsg(`❌ ${data.erro || 'Erro ao impersonar'}`)
        setImpersonando(false)
      }
    } catch {
      setMsg('❌ Erro de conexão')
      setImpersonando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">🔍 Impersonar Entregador</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Entre como um entregador para ver o sistema exatamente como ele vê.
          Você poderá aceitar pacotes e realizar ações em nome dele.
        </p>
      </div>

      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 bg-violet-50 text-violet-700 border border-violet-200">
          <span>{msg}</span>
        </div>
      )}

      <div className="content-card p-6">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : entregadores.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p className="text-sm">Nenhum entregador cadastrado</p>
            <a href="/admin/entregadores" className="link-btn mt-3 inline-flex">Cadastrar entregador</a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              {entregadores.map(e => (
                <label
                  key={e.id}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selecionado === String(e.id)
                      ? 'border-violet-400 bg-violet-50/50'
                      : 'border-gray-100 hover:border-gray-200'
                  } ${!e.ativo ? 'opacity-50' : ''}`}
                >
                  <input
                    type="radio"
                    name="entregador"
                    value={e.id}
                    checked={selecionado === String(e.id)}
                    onChange={() => setSelecionado(String(e.id))}
                    disabled={!e.ativo}
                    className="w-4 h-4 text-violet-600 focus:ring-violet-500"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">{e.nome}</span>
                    {e.telefone && (
                      <span className="text-xs text-gray-400 ml-2">{e.telefone}</span>
                    )}
                  </div>
                  {!e.ativo && (
                    <span className="text-xs text-gray-400 font-medium">Inativo</span>
                  )}
                </label>
              ))}
            </div>

            <button
              onClick={impersonar}
              disabled={!selecionado || impersonando}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {impersonando
                ? 'Entrando...'
                : selecionado
                  ? `🔍 Entrar como ${entregadores.find(e => e.id === parseInt(selecionado))?.nome}`
                  : 'Selecione um entregador'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
