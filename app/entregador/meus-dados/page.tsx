'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface EntregadorDados {
  id: number
  nome: string
  telefone: string | null
  cpf: string | null
  chave_pix: string | null
  banco_pagamento: string | null
  carteira_motorista: string | null
  valor_padrao: number
  ativo: boolean
  ultimo_pagamento_em: string | null
  criado_em: string
}

export default function MeusDadosPage() {
  const router = useRouter()
  const [dados, setDados] = useState<EntregadorDados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  // Campos editáveis
  const [telefone, setTelefone] = useState('')
  const [chavePix, setChavePix] = useState('')

  useEffect(() => {
    fetch('/api/entregador/meus-dados')
      .then(r => r.json())
      .then(data => {
        if (data.entregador) {
          setDados(data.entregador)
          setTelefone(data.entregador.telefone || '')
          setChavePix(data.entregador.chave_pix || '')
        } else {
          setError(data.erro || 'Erro ao carregar')
        }
      })
      .catch(() => setError('Erro de conexão'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMsg(null)

    try {
      const res = await fetch('/api/entregador/meus-dados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone: telefone.replace(/\D/g, ''),
          chave_pix: chavePix,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: data.mensagem || '✅ Dados salvos!' })
      } else {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao salvar' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !dados) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm">{error || 'Dados não encontrados'}</p>
        <button onClick={() => router.refresh()} className="mt-3 text-sm text-indigo-600 hover:underline">Tentar novamente</button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">👤 Meus Dados</h1>
        <p className="text-sm text-gray-500 mt-1">Visualize e edite suas informações pessoais</p>
      </div>

      {/* Card Informações */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Informações do Perfil</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">{dados.nome}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">CPF</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">{dados.cpf || '—'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">CNH</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">{dados.carteira_motorista || '—'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Banco</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">{dados.banco_pagamento || '—'}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Valor Padrão</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">R$ {Number(dados.valor_padrao).toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Cadastro</label>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2.5">
              {new Date(dados.criado_em).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      {/* Card Editável */}
      <form onSubmit={handleSalvar} className="rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">✏️ Dados Editáveis</h2>
        <p className="text-xs text-gray-400">Você pode alterar apenas telefone e chave PIX.</p>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            📞 Telefone
          </label>
          <input
            type="tel"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder="(34) 99999-9999"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            💳 Chave PIX
          </label>
          <input
            type="text"
            value={chavePix}
            onChange={e => setChavePix(e.target.value)}
            placeholder="CPF, email, telefone ou chave aleatória"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
          />
        </div>

        {/* Mensagem */}
        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
            msg.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.texto}
            <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {salvando ? (
            <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</>
          ) : '💾 Salvar Alterações'}
        </button>
      </form>

      {/* Segurança */}
      <div className="rounded-2xl bg-amber-50/60 border border-amber-200/60 p-4">
        <h3 className="text-xs font-bold text-amber-800 mb-1">🔒 Segurança</h3>
        <p className="text-[11px] text-amber-700/80">
          Utilize seu login e senha cadastrados pelo admin para acessar o sistema.
          Para alterar sua senha, solicite ao administrador.
        </p>
      </div>
    </div>
  )
}
