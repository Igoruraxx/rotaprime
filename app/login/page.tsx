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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Rota Prime</h1>
          <p className="text-gray-500 mt-1">Sistema de Gestão de Entregas</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTipo('admin')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tipo === 'admin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setTipo('entregador')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              tipo === 'entregador'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Entregador
          </button>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tipo === 'admin' ? 'Nome do Admin' : 'Nome do Entregador'}
            </label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder={tipo === 'admin' ? 'admin' : 'Seu nome'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Sua senha"
            />
            <p className="text-xs text-gray-400 mt-1">
              {tipo === 'entregador' ? 'Deixe em branco se não tiver senha cadastrada' : ''}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
