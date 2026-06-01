'use client'

import { useState, useEffect, useCallback } from 'react'

interface Entregador {
  id: number
  nome: string
  telefone: string
  ativo: boolean
}

interface PacoteCentral {
  codigo: string
  destinatario: string
  endereco_entrega: string
  status: string
  valor_pacote: number
  data_chegada: string
}

export default function RepasseLoteCard() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [pacotes, setPacotes] = useState<PacoteCentral[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [entregadorId, setEntregadorId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [repassando, setRepassando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [entRes, pacRes] = await Promise.all([
        fetch('/api/entregadores'),
        fetch('/api/admin/pacotes-central'),
      ])
      const entData = await entRes.json()
      const pacData = await pacRes.json()
      setEntregadores((entData.entregadores || []).filter((e: Entregador) => e.ativo))
      setPacotes(pacData.pacotes || [])
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro ao carregar dados' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function toggle(codigo: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo)
      return next
    })
  }

  function toggleTodos() {
    if (selecionados.size === pacotes.length) setSelecionados(new Set())
    else setSelecionados(new Set(pacotes.map(p => p.codigo)))
  }

  async function repassar() {
    if (!entregadorId || selecionados.size === 0) return
    setRepassando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/repassar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregador_id: Number(entregadorId),
          codigos: Array.from(selecionados),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsg({ tipo: 'sucesso', texto: data.mensagem || '✅ Repassados com sucesso!' })
        setSelecionados(new Set())
        carregar()
      } else {
        setMsg({ tipo: 'erro', texto: data.erro || 'Erro ao repassar' })
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão' })
    } finally {
      setRepassando(false)
    }
  }

  if (loading) {
    return <div className="content-card p-5 animate-pulse h-32" />
  }

  if (pacotes.length === 0) {
    return (
      <div className="content-card p-5 text-center">
        <p className="text-sm text-gray-400">Nenhum pacote na central aguardando repasse</p>
      </div>
    )
  }

  return (
    <div className="content-card p-5 space-y-4">
      <div className="section-header px-4 py-3 -mx-5 -mt-5 rounded-t-xl flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-gray-700">📤 Repasse em Lote</h3>
        <span className="text-xs text-gray-500">{pacotes.length} pacote(s) na central</span>
      </div>

      {/* Mensagem */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${
          msg.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {msg.texto}
        </div>
      )}

      {/* Seleção de Entregador + Botão */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-700 mb-1">Selecionar Entregador</label>
          <select
            value={entregadorId}
            onChange={e => setEntregadorId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          >
            <option value="">Escolha um entregador...</option>
            {entregadores.map(e => (
              <option key={e.id} value={e.id}>{e.nome}{e.telefone ? ` — ${e.telefone}` : ''}</option>
            ))}
          </select>
        </div>
        <button
          onClick={repassar}
          disabled={!entregadorId || selecionados.size === 0 || repassando}
          className="px-5 py-2 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97] shadow-md shadow-violet-200 whitespace-nowrap"
        >
          {repassando ? '⏳' : `📤 Repassar (${selecionados.size})`}
        </button>
      </div>

      {/* Lista de pacotes */}
      <div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer mb-2">
          <input type="checkbox" checked={selecionados.size === pacotes.length} onChange={toggleTodos} className="rounded" />
          Selecionar todos ({pacotes.length})
        </label>
        <div className="max-h-[400px] overflow-y-auto space-y-1">
          {pacotes.map(p => (
            <label key={p.codigo}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                selecionados.has(p.codigo) ? 'bg-violet-50 border-violet-200' : 'bg-white border-gray-100 hover:bg-gray-50'
              }`}
            >
              <input type="checkbox" checked={selecionados.has(p.codigo)} onChange={() => toggle(p.codigo)} className="rounded shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-900">#{p.codigo}</span>
                  <span className="text-xs text-gray-600 truncate">{p.destinatario || '—'}</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.endereco_entrega?.substring(0, 60)}</p>
              </div>
              {Number(p.valor_pacote) > 0 && (
                <span className="text-xs font-semibold text-gray-600 shrink-0">R$ {Number(p.valor_pacote).toFixed(2)}</span>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
