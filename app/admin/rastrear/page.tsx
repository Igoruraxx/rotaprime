'use client'

import { useState, useCallback } from 'react'

type Resultado = {
  codigo: string
  nf_remessa: string
  endereco_entrega: string
  destinatario: string
  status: string
  entregadores: { nome: string } | null
}

type CampoBusca = {
  id: string
  label: string
  placeholder: string
  tipo: 'codigo' | 'endereco' | 'destinatario'
}

const CAMPOS: CampoBusca[] = [
  { id: 'codigo', label: 'Código / NF', placeholder: 'Buscar por código ou NF...', tipo: 'codigo' },
  { id: 'endereco', label: 'Endereço', placeholder: 'Buscar por endereço de entrega...', tipo: 'endereco' },
  { id: 'destinatario', label: 'Destinatário', placeholder: 'Buscar por nome do destinatário...', tipo: 'destinatario' },
]

export default function RastrearPage() {
  const [buscas, setBuscas] = useState<Record<string, string>>({
    codigo: '',
    endereco: '',
    destinatario: '',
  })
  const [resultados, setResultados] = useState<Record<string, Resultado[]>>({})
  const [dropdowns, setDropdowns] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Resultado | null>(null)

  async function buscar(tipo: string, texto: string) {
    setBuscas(prev => ({ ...prev, [tipo]: texto }))
    if (texto.length < 2) {
      setResultados(prev => ({ ...prev, [tipo]: [] }))
      setDropdowns(prev => ({ ...prev, [tipo]: false }))
      return
    }
    const res = await fetch(`/api/pacotes/search?tipo=${tipo}&q=${encodeURIComponent(texto)}`)
    const data = await res.json()
    setResultados(prev => ({ ...prev, [tipo]: data.resultados || [] }))
    setDropdowns(prev => ({ ...prev, [tipo]: true }))
  }

  function selecionar(r: Resultado) {
    setSelected(r)
    // Fecha todos os dropdowns
    const fechados: Record<string, boolean> = {}
    CAMPOS.forEach(c => { fechados[c.id] = false })
    setDropdowns(fechados)
  }

  const statusCor = (status: string) => {
    const cores: Record<string, string> = {
      'Recebido pela Central': 'bg-amber-500/15 text-amber-300',
      'Aguardando Retirada': 'bg-amber-500/15 text-amber-300',
      'Retirado pelo Entregador': 'bg-amber-500/15 text-amber-300',
      'Em Rota': 'bg-violet-500/15 text-violet-300 border border-violet-500/25',
      'Entregue': 'bg-emerald-500/15 text-emerald-300',
      'Retornado a Central': 'bg-red-500/15 text-red-300',
      'Validado pelo Admin': 'bg-emerald-500/15 text-emerald-300',
    }
    return cores[status] || 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-6">Rastrear Pacote</h2>

      {/* 3 Campos de busca idênticos */}
      <div className="space-y-3 mb-6">
        {CAMPOS.map(campo => (
          <div key={campo.id} className="relative">
            <label className="block text-xs font-medium text-white/40 mb-1">{campo.label}</label>
            <input
              type="text"
              value={buscas[campo.id]}
              onChange={e => buscar(campo.tipo, e.target.value)}
              onFocus={() => (resultados[campo.id]?.length || 0) > 0 && setDropdowns(prev => ({ ...prev, [campo.id]: true }))}
              placeholder={campo.placeholder}
              className="w-full px-4 py-3 rounded-xl text-sm"
            />
            {dropdowns[campo.id] && resultados[campo.id]?.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#0f0a1a] border border-white/[0.08] rounded-xl shadow-xl shadow-violet-900/10">
                {resultados[campo.id].map(r => (
                  <button
                    key={r.codigo}
                    onClick={() => selecionar(r)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.04] border-b border-white/[0.04] last:border-0 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-violet-300">{r.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                    {r.destinatario && <span className="text-white/50 text-xs">{r.destinatario}</span>}
                    <span className="block text-white/30 text-xs truncate">{r.endereco_entrega}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Resultado selecionado */}
      {selected && (
        <div className="content-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">{selected.codigo}</h3>
            <a href={`/admin/pacote/${selected.codigo}`} className="link-btn-sm">
              Ver detalhes &rarr;
            </a>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">NF</span>
              <span className="text-white/60">{selected.nf_remessa || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Destinatário</span>
              <span className="text-white/60">{selected.destinatario || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Status</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCor(selected.status)}`}>
                {selected.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Endereço</span>
              <span className="text-white/60 text-right max-w-xs">{selected.endereco_entrega}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Entregador</span>
              <span className="text-white/60">{selected.entregadores?.nome || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
