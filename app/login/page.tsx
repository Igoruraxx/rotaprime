'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [tipo, setTipo] = useState<'admin' | 'entregador'>('admin')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, nome, senha })
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.erro || 'Erro ao fazer login')
        return
      }

      if (data.tipo === 'admin') {
        router.push('/admin')
      } else {
        router.push('/entregador')
      }
    } catch {
      setErro('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500/8 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 12px rgba(249, 115, 22, 0.4))' }}>🚛</span>
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.3))' }}>📦</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Rota Prime</h1>
          <p className="text-white/40 text-sm mt-1 font-medium">Sistema de Gestão de Entregas</p>
        </div>

        {/* Card glass */}
        <div className="card-premium p-8 glow-purple">
          {/* Seletor Admin / Entregador */}
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <button
              onClick={() => setTipo('admin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                tipo === 'admin'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              👤 Admin
            </button>
            <button
              onClick={() => setTipo('entregador')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                tipo === 'entregador'
                  ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              🚚 Entregador
            </button>
          </div>

          {erro && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-lg mb-4 text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">
                {tipo === 'admin' ? 'Nome do Admin' : 'Nome do Entregador'}
              </label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                placeholder={tipo === 'admin' ? 'admin' : 'Seu nome'}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                placeholder="Sua senha"
              />
              <p className="text-xs text-white/30 mt-1.5">
                {tipo === 'entregador' ? 'Deixe em branco se não tiver senha cadastrada' : ''}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          Rota Prime v2.0 · Gestão de Entregas Premium
        </p>
      </div>
    </div>
  )
}
