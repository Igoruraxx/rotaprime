'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Icons, formatCurrency, formatDateBR } from '@/lib/shared-helpers'

interface Pacote {
  codigo: string
  status: string
  endereco_entrega: string
  destinatario: string
  data_chegada: string
  data_repassado_entregador: string | null
  valor_pacote: number
  transportadora: string
  descricao: string
  quantidade: number
}

export default function AcompanhamentoPage() {
  const router = useRouter()
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [recebendo, setRecebendo] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function carregar() {
    setLoading(true)
    try {
      const res = await fetch('/api/entregador/pacotes?status=Recebido pela Central')
      if (!res.ok) {
        if (res.status === 401) return router.push('/login')
        throw new Error('Erro ao carregar')
      }
      const data = await res.json()
      setPacotes(data.pacotes || [])
    } catch {
      setMensagem('❌ Erro ao carregar pacotes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  function toggle(codigo: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === pacotes.length) setSelected(new Set())
    else setSelected(new Set(pacotes.map(p => p.codigo)))
  }

  async function receberLote() {
    const codigos = Array.from(selected)
    if (codigos.length === 0) return
    setRecebendo(true)
    setMensagem('')

    try {
      const res = await fetch('/api/entregador/receber-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos }),
      })
      const data = await res.json()
      if (res.ok) {
        setMensagem(`✅ ${data.mensagem}`)
        setSelected(new Set())
        carregar()
      } else {
        setMensagem(`❌ ${data.erro || 'Erro ao receber'}`)
      }
    } catch {
      setMensagem('❌ Erro de conexão')
    }
    setRecebendo(false)
    setTimeout(() => setMensagem(''), 4000)
  }

  async function receberTodos() {
    setRecebendo(true)
    setMensagem('')

    try {
      const res = await fetch('/api/entregador/receber-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setMensagem(`✅ ${data.mensagem}`)
        setSelected(new Set())
        carregar()
      } else {
        setMensagem(`❌ ${data.erro || 'Erro ao receber'}`)
      }
    } catch {
      setMensagem('❌ Erro de conexão')
    }
    setRecebendo(false)
    setTimeout(() => setMensagem(''), 4000)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Acompanhamento</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {pacotes.length} pacote(s) aguardando sua confirmação
          </p>
        </div>
        <div className="flex gap-2">
          {pacotes.length > 0 && (
            <>
              <button
                onClick={receberTodos}
                disabled={recebendo}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50"
              >
                {recebendo ? 'Recebendo...' : '📦 Receber Todos'}
              </button>
            </>
          )}
        </div>
      </div>

      {mensagem && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 bg-violet-50 text-violet-700 border border-violet-200">
          <span>{mensagem}</span>
        </div>
      )}

      {/* LISTA */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="content-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-200 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : pacotes.length === 0 ? (
        <div className="content-card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Icons.Check className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum pacote pendente</h3>
          <p className="text-sm text-gray-500">
            Quando o administrador repassar pacotes para você, eles aparecerão aqui para confirmação.
          </p>
        </div>
      ) : (
        <>
          {/* SELECT ALL */}
          <div className="flex items-center gap-3 mb-3 px-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === pacotes.length}
                onChange={toggleAll}
                className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm font-medium text-gray-600">
                {selected.size === pacotes.length
                  ? 'Desmarcar todos'
                  : `Selecionar todos (${pacotes.length})`}
              </span>
            </label>
            {selected.size > 0 && (
              <button
                onClick={receberLote}
                disabled={recebendo}
                className="ml-auto px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50"
              >
                {recebendo ? 'Recebendo...' : `✅ Receber ${selected.size} pacote(s)`}
              </button>
            )}
          </div>

          {/* CARDS */}
          <div className="space-y-2">
            {pacotes.map(p => (
              <div
                key={p.codigo}
                className={`content-card p-4 cursor-pointer transition-all border-2 ${
                  selected.has(p.codigo)
                    ? 'border-violet-400 bg-violet-50/50'
                    : 'border-transparent hover:border-gray-200'
                }`}
                onClick={() => toggle(p.codigo)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.codigo)}
                    onChange={() => toggle(p.codigo)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 font-mono">{p.codigo}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                        Aguardando
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {p.destinatario || 'Sem destinatário'} · {p.endereco_entrega}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span>📦 {p.descricao || 'Sem descrição'}</span>
                      <span>📅 {formatDateBR(p.data_chegada)}</span>
                      <span>🚚 {p.transportadora || '-'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(p.valor_pacote)}</p>
                    <p className="text-xs text-gray-400">{p.quantidade} un.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
