'use client'

import { useEffect, useState, useRef } from 'react'

type Transportadora = {
  id: number
  nome: string
  prazo_entrega_dias: number | null
}

type Props = {
  value: string
  onChange: (nome: string) => void
  placeholder?: string
}

export default function SelectTransportadora({ value, onChange, placeholder }: Props) {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/transportadoras')
      .then(r => r.json())
      .then(data => setTransportadoras(data.transportadoras || []))
  }, [])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = transportadoras.filter(t =>
    t.nome.toLowerCase().includes(search.toLowerCase())
  )

  const selectedNome = transportadoras.find(t => t.nome === value)?.nome || value

  return (
    <div ref={ref} className="relative">
      {/* Campo falso que abre o dropdown */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 hover:border-gray-300 transition-all"
      >
        <span className={selectedNome ? 'text-gray-900' : 'text-gray-400'}>
          {selectedNome || placeholder || 'Selecionar transportadora...'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown com scroll */}
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl shadow-gray-200/50 overflow-hidden">
          {/* Campo de busca interna */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digitar para buscar..."
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-100 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              autoFocus
            />
          </div>
          {/* Lista scrollável */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                Nenhuma transportadora encontrada
              </div>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onChange(t.nome)
                    setOpen(false)
                    setSearch('')
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-violet-50 transition border-b border-gray-50 last:border-0 ${
                    value === t.nome ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span>{t.nome}</span>
                  {t.prazo_entrega_dias && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      (prazo: {t.prazo_entrega_dias}d)
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
