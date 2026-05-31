'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  name?: string
  required?: boolean
  placeholder?: string
}

type Transportadora = { id: number; nome: string }

export default function SelectTransportadora({ value, onChange, name, required, placeholder }: Props) {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [search, setSearch] = useState(value)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/transportadoras')
      .then(r => r.json())
      .then(data => {
        setTransportadoras(data.transportadoras || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    setSearch(value)
  }, [value])

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

  function selecionar(nome: string) {
    setSearch(nome)
    onChange(nome)
    setOpen(false)
  }

  function handleInputChange(texto: string) {
    setSearch(texto)
    onChange(texto)
    setOpen(true)
  }

  return (
    <div ref={ref} className="relative">
      {loading ? (
        <div className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-400">
          Carregando transportadoras...
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || "Digite para buscar ou cadastre nova..."}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoComplete="off"
          />
          {name && <input type="hidden" name={name} value={search} />}

          {open && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">
                  {search.trim().length >= 2
                    ? `"${search}" será cadastrada como nova`
                    : 'Nenhuma transportadora encontrada'}
                </div>
              ) : (
                filtered.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selecionar(t.nome)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm transition ${
                      search === t.nome ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    🚚 {t.nome}
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
