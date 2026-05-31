'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type ItemTabela = {
  codigo: string
  status: string
  entregadores: { nome: string } | null
  data_retirada_central?: string
  data_repassado_entregador?: string
  data_limite_entrega?: string
}

type EntregadorOpcao = { id: number; nome: string }

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-white/[0.06] text-white/60',
  'Aguardando Retirada': 'bg-amber-500/15 text-amber-300',
  'Retirado pelo Entregador': 'bg-violet-500/15 text-violet-300',
  'Em Rota': 'bg-violet-500/15 text-violet-300',
  'Entregue': 'bg-emerald-500/15 text-emerald-300',
  'Retornado a Central': 'bg-red-500/15 text-red-300',
  'Validado pelo Admin': 'bg-emerald-500/15 text-emerald-300',
}

export default function RelatorioPage() {
  const router = useRouter()
  const [dados, setDados] = useState<{
    stats: { totalPegosHoje: number; totalRepassadosHoje: number; totalPendentesHoje: number }
    retirados: ItemTabela[]
    repassados: ItemTabela[]
    pendentes: ItemTabela[]
    entregadores: EntregadorOpcao[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set())
  const [batchEntregador, setBatchEntregador] = useState('')

  function carregar() {
    setLoading(true)
    fetch('/api/relatorio')
      .then(r => r.json())
      .then(data => {
        setDados(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(carregar, [])

  function toggleSelect(codigo: string) {
    setSelectedBatch(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo)
      else next.add(codigo)
      return next
    })
  }

  function selectAll() {
    if (!dados) return
    const disponiveis = dados.retirados.filter(r => r.status === 'Recebido pela Central' || r.status === 'Retornado a Central')
    if (selectedBatch.size === disponiveis.length) {
      setSelectedBatch(new Set())
    } else {
      setSelectedBatch(new Set(disponiveis.map(r => r.codigo)))
    }
  }

  async function repassarLote() {
    if (selectedBatch.size === 0 || !batchEntregador) return
    setMsg('')

    const res = await fetch('/api/relatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigos: Array.from(selectedBatch),
        entregador_id: parseInt(batchEntregador),
      })
    })

    const data = await res.json()
    if (res.ok) {
      setMsg(`✅ ${data.mensagem}`)
      setSelectedBatch(new Set())
      setBatchEntregador('')
      carregar()
    } else {
      setMsg(`❌ ${data.erro || 'Erro ao repassar'}`)
    }
    setTimeout(() => setMsg(''), 4000)
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Pacotes disponíveis para lote (na central)
  const disponiveisLote = dados?.retirados.filter(
    r => r.status === 'Recebido pela Central' || r.status === 'Retornado a Central'
  ) || []

  if (!dados) {
    return <div className="text-center py-12 text-white/30">Carregando relatório...</div>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">📋 Relatório Diário</h2>
          <p className="text-sm text-white/40 capitalize mt-1">{hoje}</p>
        </div>
        <button onClick={carregar} className="px-4 py-2 bg-white/[0.06] text-white/60 rounded-lg text-sm hover:bg-white/[0.12] transition">
          🔄 Atualizar
        </button>
      </div>

      {/* Mensagem */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
          {msg}
        </div>
      )}

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="content-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center text-xl">✋</div>
          <div>
            <p className="text-2xl font-bold text-white">{dados.stats.totalPegosHoje}</p>
            <p className="text-xs text-white/40">Total Pegos Hoje</p>
          </div>
        </div>
        <div className="content-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-xl">⏳</div>
          <div>
            <p className="text-2xl font-bold text-white">{dados.stats.totalPendentesHoje}</p>
            <p className="text-xs text-white/40">Pendentes Hoje</p>
          </div>
        </div>
        <div className="content-card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-xl">📤</div>
          <div>
            <p className="text-2xl font-bold text-white">{dados.stats.totalRepassadosHoje}</p>
            <p className="text-xs text-white/40">Repassados Hoje</p>
          </div>
        </div>
      </div>

      {/* ============ REPASSAR EM LOTE ============ */}
      <div className="content-card mb-6 overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.08] bg-violet-500/10 flex items-center justify-between">
          <h3 className="font-semibold text-violet-300 flex items-center gap-2">
            📦 Repassar Pacotes em Lote
          </h3>
          <span className="text-xs text-violet-300 font-medium bg-violet-500/15 px-2 py-1 rounded-full">
            {selectedBatch.size} selecionado(s)
          </span>
        </div>

        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-medium text-white/40 mb-1">Entregador</label>
              <select
                value={batchEntregador}
                onChange={e => setBatchEntregador(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
              >
                <option value="">Selecionar entregador...</option>
                {dados.entregadores.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <button
              onClick={repassarLote}
              disabled={selectedBatch.size === 0 || !batchEntregador}
              className="px-6 py-2 btn-primary rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 Repassar {selectedBatch.size > 0 ? `${selectedBatch.size} pacote(s)` : ''}
            </button>
          </div>
        </div>

        {disponiveisLote.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/40 border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="p-3 pl-5 w-10">
                    <input
                      type="checkbox"
                      checked={disponiveisLote.length > 0 && selectedBatch.size === disponiveisLote.length}
                      onChange={selectAll}
                      className="rounded border-white/[0.08]"
                    />
                  </th>
                  <th className="p-3 font-medium">Código</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Chegada</th>
                </tr>
              </thead>
              <tbody>
                {disponiveisLote.map(p => (
                  <tr
                    key={p.codigo}
                    onClick={() => toggleSelect(p.codigo)}
                    className={`border-b border-white/[0.06] last:border-0 hover:bg-violet-500/[0.06] transition cursor-pointer ${
                      selectedBatch.has(p.codigo) ? 'bg-violet-500/[0.08]' : ''
                    }`}
                  >
                    <td className="p-3 pl-5">
                      <input
                        type="checkbox"
                        checked={selectedBatch.has(p.codigo)}
                        onChange={() => toggleSelect(p.codigo)}
                        className="rounded border-white/[0.08]"
                      />
                    </td>
                    <td className="p-3 font-medium text-violet-300">{p.codigo}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-white/[0.06]'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-white/40 text-xs">
                      {p.data_retirada_central
                        ? new Date(p.data_retirada_central).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-white/30 text-sm">
            Nenhum pacote disponível na Central para repassar no momento
          </div>
        )}
      </div>

      {/* ============ TABELAS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Retirados Hoje */}
        <TabelaSection
          titulo="✋ Retirados pelos Entregadores"
          vazia="Nenhum pacote retirado hoje"
          itens={dados.retirados}
          colunas={[
            { label: 'Código', render: p => <span className="font-medium link-btn-sm">{p.codigo}</span> },
            { label: 'Hora', render: p => p.data_retirada_central
              ? new Date(p.data_retirada_central).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—'
            },
            { label: 'Entregador', render: p => p.entregadores?.nome || '—' },
            { label: 'Status', render: p => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-white/[0.06]'}`}>
                {p.status}
              </span>
            )},
          ]}
          onRowClick={p => router.push(`/admin/pacote/${p.codigo}`)}
        />

        {/* Repassados Hoje */}
        <TabelaSection
          titulo="📤 Repassados aos Entregadores"
          vazia="Nenhum pacote repassado hoje"
          itens={dados.repassados}
          colunas={[
            { label: 'Código', render: p => <span className="font-medium link-btn-sm">{p.codigo}</span> },
            { label: 'Hora', render: p => p.data_repassado_entregador
              ? new Date(p.data_repassado_entregador).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—'
            },
            { label: 'Entregador', render: p => p.entregadores?.nome || '—' },
            { label: 'Status', render: p => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-white/[0.06]'}`}>
                {p.status}
              </span>
            )},
          ]}
          onRowClick={p => router.push(`/admin/pacote/${p.codigo}`)}
        />

        {/* Pendentes Hoje */}
        <TabelaSection
          titulo="⏳ Pendentes Hoje"
          vazia="Nenhum pacote pendente hoje 🎉"
          itens={dados.pendentes}
          colunas={[
            { label: 'Código', render: p => <span className="font-medium link-btn-sm">{p.codigo}</span> },
            { label: 'Prazo', render: p => p.data_limite_entrega
              ? new Date(p.data_limite_entrega).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              : '—'
            },
            { label: 'Entregador', render: p => p.entregadores?.nome || '—' },
            { label: 'Status', render: p => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-white/[0.06]'}`}>
                {p.status}
              </span>
            )},
          ]}
          onRowClick={p => router.push(`/admin/pacote/${p.codigo}`)}
        />
      </div>
    </div>
  )
}

// ============================================================
// TABELA SECTION
// ============================================================
function TabelaSection({
  titulo, vazia, itens, colunas, onRowClick
}: {
  titulo: string
  vazia: string
  itens: ItemTabela[]
  colunas: { label: string; render: (item: ItemTabela) => React.ReactNode }[]
  onRowClick: (item: ItemTabela) => void
}) {
  return (
    <div className="content-card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <h3 className="font-semibold text-white/70 text-sm">{titulo} ({itens.length})</h3>
      </div>
      {itens.length === 0 ? (
        <div className="p-6 text-center text-white/30 text-sm">{vazia}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/[0.06] bg-white/[0.02]">
                {colunas.map(c => (
                  <th key={c.label} className="p-3 font-medium whitespace-nowrap">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map(p => (
                <tr
                  key={p.codigo}
                  onClick={() => onRowClick(p)}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-violet-500/[0.06] transition cursor-pointer"
                >
                  {colunas.map(c => (
                    <td key={c.label} className="p-3 whitespace-nowrap">{c.render(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
