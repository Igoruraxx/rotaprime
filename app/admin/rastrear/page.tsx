'use client'

import { useState } from 'react'

type Resultado = {
  codigo: string
  nf_remessa: string
  endereco_entrega: string
  status: string
  entregadores: { nome: string } | null
}

export default function RastrearPage() {
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<Resultado | null>(null)

  async function buscar(texto: string) {
    setQ(texto)
    if (texto.length < 2) {
      setResultados([])
      setShowDropdown(false)
      return
    }
    const res = await fetch(`/api/pacotes/search?q=${encodeURIComponent(texto)}`)
    const data = await res.json()
    setResultados(data.resultados || [])
    setShowDropdown(true)
  }

  function selecionar(r: Resultado) {
    setSelected(r)
    setShowDropdown(false)
    setQ(r.codigo)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Rastrear Pacote</h2>

      <div className="relative mb-6">
        <input
          type="text"
          value={q}
          onChange={e => buscar(e.target.value)}
          onFocus={() => resultados.length > 0 && setShowDropdown(true)}
          placeholder="Buscar por código ou NF..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {showDropdown && resultados.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg">
            {resultados.map(r => (
              <button
                key={r.codigo}
                onClick={() => selecionar(r)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 text-sm"
              >
                <span className="font-medium text-blue-600">{r.codigo}</span>
                <span className="text-gray-500 ml-2">{r.nf_remessa}</span>
                <span className="block text-gray-400 text-xs truncate">{r.endereco_entrega}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">{selected.codigo}</h3>
            <a href={`/admin/pacote/${selected.codigo}`} className="text-blue-600 text-sm hover:underline">
              Ver detalhes →
            </a>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">NF</span><span>{selected.nf_remessa || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium">{selected.status}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Endereço</span><span className="text-right max-w-xs">{selected.endereco_entrega}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Entregador</span><span>{selected.entregadores?.nome || '—'}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
