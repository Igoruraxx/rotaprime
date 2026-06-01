'use client'

import { useEffect, useState } from 'react'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

type Transportadora = {
  id: number
  nome: string
  prazo_entrega_dias: number | null
  criado_em: string
}

export default function TransportadorasPage() {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [prazoDias, setPrazoDias] = useState('')
  const [editando, setEditando] = useState<Transportadora | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [removendo, setRemovendo] = useState<number | null>(null)

  async function carregar() {
    try {
      const res = await fetch('/api/transportadoras')
      const data = await res.json()
      setTransportadoras(data.transportadoras || [])
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao carregar transportadoras' })
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function resetForm() {
    setNome('')
    setPrazoDias('')
    setEditando(null)
  }

  function editar(t: Transportadora) {
    setEditando(t)
    setNome(t.nome)
    setPrazoDias(t.prazo_entrega_dias?.toString() || '')
    setMsg(null)
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)

    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      setMsg({ tipo: 'erro', texto: 'Nome da transportadora é obrigatório' })
      return
    }
    const prazo = parseInt(prazoDias, 10)
    if (isNaN(prazo) || prazo <= 0) {
      setMsg({ tipo: 'erro', texto: 'Prazo de entrega (dias) é obrigatório e deve ser maior que zero' })
      return
    }

    try {
      const url = editando
        ? `/api/transportadoras/${editando.id}`
        : '/api/transportadoras'
      const method = editando ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeTrim, prazo_entrega_dias: prazo }),
      })

      const data = await res.json()
      if (!res.ok) {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao salvar' })
        return
      }

      setMsg({ tipo: 'sucesso', texto: editando
        ? `Transportadora "${data.transportadora.nome}" atualizada!`
        : `Transportadora "${data.transportadora.nome}" criada!`
      })
      resetForm()
      carregar()
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    }
  }

  async function remover(id: number) {
    if (!confirm('Tem certeza que deseja remover esta transportadora?')) return
    setRemovendo(id)
    try {
      const res = await fetch(`/api/transportadoras/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: 'Transportadora removida!' })
        carregar()
      } else {
        const data = await res.json()
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao remover' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    }
    setRemovendo(null)
  }

  return (
    <FeatureGuard feature={FEATURES.TRANSPORTADORAS_CRUD}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">🚚 Transportadoras</h2>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.texto}
            <button onClick={() => setMsg(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Formulário */}
        <div className="content-card p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editando ? `✏️ Editando: ${editando.nome}` : '➕ Nova Transportadora'}
          </h3>
          <form onSubmit={salvar} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome da transportadora</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Jadlog, Correios, Transportadora X..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Prazo de entrega (dias) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={prazoDias}
                onChange={e => setPrazoDias(e.target.value)}
                placeholder="Ex: 5"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                required
              />
              <p className="text-[10px] text-gray-400 mt-1">Prazo padrão para cálculo automático da data limite de entrega</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all active:scale-[0.97] shadow-md shadow-violet-200"
              >
                {editando ? '💾 Salvar Alterações' : '➕ Adicionar'}
              </button>
              {editando && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Listagem */}
        <div className="content-card overflow-hidden">
          <h3 className="section-header px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
            📋 Lista de Transportadoras
            <span className="text-xs font-normal text-gray-400">({transportadoras.length})</span>
          </h3>
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-400">Carregando...</div>
          ) : transportadoras.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              Nenhuma transportadora cadastrada
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transportadoras.map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{t.nome}</span>
                    <span className="ml-3 text-xs text-gray-400">
                      Prazo: <strong>{t.prazo_entrega_dias || '—'} dias</strong>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => editar(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => remover(t.id)}
                      disabled={removendo === t.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FeatureGuard>
  )
}
