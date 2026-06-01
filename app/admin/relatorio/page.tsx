'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import WhatsAppButton from '@/components/whatsapp-button'

type ItemTabela = {
  codigo: string
  status: string
  entregadores: { nome: string; telefone: string } | null
  entregador_id?: number | null
  endereco_entrega?: string | null
  data_retirada_central?: string
  data_repassado_entregador?: string
  data_limite_entrega?: string
}

type EntregadorOpcao = { id: number; nome: string }

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-gray-100 text-gray-500',
  'Aguardando Retirada': 'bg-amber-500 text-white',
  'Retirado pelo Entregador': 'bg-violet-500 text-white',
  'Em Rota': 'bg-violet-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

export default function RelatorioPage() {
  const router = useRouter()
  const [dados, setDados] = useState<{
    stats: { totalPegosHoje: number; totalRepassadosHoje: number; totalPendentesHoje: number }
    retirados: ItemTabela[]
    repassados: ItemTabela[]
    pendentes: ItemTabela[]
    entregadores: EntregadorOpcao[]
    filtroEntregador: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [filtroEntregador, setFiltroEntregador] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set())
  const [batchEntregador, setBatchEntregador] = useState('')

  function carregar(entregadorId = filtroEntregador) {
    setLoading(true)
    const url = entregadorId
      ? `/api/relatorio?entregador_id=${entregadorId}`
      : '/api/relatorio'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setDados(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  function handleFiltroChange(val: string) {
    setFiltroEntregador(val)
    carregar(val)
  }

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
    const disponiveis = dados.retirados.filter(r =>
      r.status === 'Recebido pela Central' || r.status === 'Retornado a Central'
    )
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

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  const disponiveisLote = dados?.retirados.filter(
    r => r.status === 'Recebido pela Central' || r.status === 'Retornado a Central'
  ) || []

  if (!dados) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 text-gray-400">
          <span className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
          Carregando relatório...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">📋 Relatório Diário</h2>
          <p className="text-sm text-gray-500 capitalize mt-0.5">{hoje}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro por Entregador */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Filtrar por:</label>
            <select
              value={filtroEntregador}
              onChange={e => handleFiltroChange(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm min-w-[180px]"
            >
              <option value="">Todos os entregadores</option>
              {dados.entregadores.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => carregar()}
            className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200 transition flex items-center gap-1.5"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* MENSAGEM */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-2">
          <span>{msg}</span>
        </div>
      )}

      {/* CARDS DE INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Pegos Hoje */}
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl shadow-lg shadow-violet-200">
            ✋
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalPegosHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Pegos Hoje</p>
            {filtroEntregador && (
              <p className="text-[10px] text-violet-500 font-medium mt-0.5 truncate">
                {dados.entregadores.find(e => e.id === parseInt(filtroEntregador))?.nome}
              </p>
            )}
          </div>
        </div>

        {/* Pendentes Hoje */}
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-200">
            ⏳
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalPendentesHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pendentes Hoje</p>
            {filtroEntregador && (
              <p className="text-[10px] text-violet-500 font-medium mt-0.5 truncate">
                {dados.entregadores.find(e => e.id === parseInt(filtroEntregador))?.nome}
              </p>
            )}
          </div>
        </div>

        {/* Repassados Hoje */}
        <div className="content-card p-5 flex items-center gap-4 card-hover">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-200">
            📤
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{dados.stats.totalRepassadosHoje}</p>
            <p className="text-xs text-gray-500 mt-0.5">Repassados Hoje</p>
            {filtroEntregador && (
              <p className="text-[10px] text-violet-500 font-medium mt-0.5 truncate">
                para {dados.entregadores.find(e => e.id === parseInt(filtroEntregador))?.nome}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ============ REPASSAR EM LOTE ============ */}
      <div className="content-card mb-8 overflow-hidden border-t-2 border-t-violet-400">
        <div className="px-5 py-3 section-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Repassar Pacotes em Lote</h3>
          </div>
          <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">
            {selectedBatch.size} selecionado(s)
          </span>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="min-w-[200px] flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Entregador</label>
              <select
                value={batchEntregador}
                onChange={e => setBatchEntregador(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
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
              className="px-6 py-2.5 btn-primary rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📤 Repassar {selectedBatch.size > 0 ? `${selectedBatch.size} pacote(s)` : ''}
            </button>
          </div>
        </div>

        {disponiveisLote.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="p-3 pl-5 w-10">
                    <input
                      type="checkbox"
                      checked={disponiveisLote.length > 0 && selectedBatch.size === disponiveisLote.length}
                      onChange={selectAll}
                      className="rounded"
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
                    className={`border-b border-gray-100 last:border-0 hover:bg-violet-50 transition cursor-pointer ${
                      selectedBatch.has(p.codigo) ? 'bg-violet-50' : ''
                    }`}
                  >
                    <td className="p-3 pl-5">
                      <input
                        type="checkbox"
                        checked={selectedBatch.has(p.codigo)}
                        onChange={() => toggleSelect(p.codigo)}
                        className="rounded"
                      />
                    </td>
                    <td className="p-3 font-medium text-violet-600">{p.codigo}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">
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
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum pacote disponível na Central para repassar no momento
          </div>
        )}
      </div>

      {/* ============ TRÊS TABELAS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Retirados */}
        <TabelaSection
          titulo={<><span className="w-2 h-2 rounded-full bg-violet-500 inline-block mr-2" />Retirados pelos Entregadores</>}
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
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500'}`}>
                {p.status}
              </span>
            )},
          ]}
          onRowClick={p => router.push(`/admin/pacote/${p.codigo}`)}
        />

        {/* 2. Repassados */}
        <TabelaSection
          titulo={<><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-2" />Repassados aos Entregadores</>}
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
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500'}`}>
                {p.status}
              </span>
            )},
          ]}
          onRowClick={p => router.push(`/admin/pacote/${p.codigo}`)}
        />

        {/* 3. Pendentes */}
        <TabelaSection
          titulo={<><span className="w-2 h-2 rounded-full bg-amber-500 inline-block mr-2" />Pendentes Hoje</>}
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
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500'}`}>
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
  titulo: React.ReactNode
  vazia: string
  itens: ItemTabela[]
  colunas: { label: string; render: (item: ItemTabela) => React.ReactNode }[]
  onRowClick: (item: ItemTabela) => void
}) {
  return (
    <div className="content-card overflow-hidden">
      <div className="px-4 py-3 section-header flex items-center">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center">
          {titulo}
          <span className="ml-2 text-xs font-normal text-gray-400">({itens.length})</span>
        </h3>
      </div>
      {itens.length === 0 ? (
        <div className="p-8 text-center text-gray-400 text-sm">{vazia}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="p-3 font-medium text-center w-10">📱</th>
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
                  className="border-b border-gray-100 last:border-0 hover:bg-violet-50 transition cursor-pointer"
                >
                  <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                    <WhatsAppButton
                      entregadorNome={p.entregadores?.nome || ''}
                      entregadorId={null}
                      entregadorTelefone={p.entregadores?.telefone}
                      pacoteCodigo={p.codigo}
                      className="mx-auto"
                    />
                  </td>
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
