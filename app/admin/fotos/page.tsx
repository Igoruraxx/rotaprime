'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type PacoteFoto = {
  codigo: string
  data_chegada: string
  data_entrega_real: string
  status: string
  foto: string
  gps_foto: string
  endereco_entrega: string
  destinatario: string
  entregador_id: number
  validacao_admin: boolean
  entregadores: { nome: string; telefone: string } | null
}

type Entregador = { id: number; nome: string }

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-white/[0.10] text-white/60',
  'Aguardando Retirada': 'bg-amber-500/15 text-amber-300',
  'Retirado pelo Entregador': 'bg-violet-500/15 text-violet-300',
  'Em Rota': 'bg-violet-500/15 text-violet-300',
  'Entregue': 'bg-emerald-500/15 text-emerald-300',
  'Retornado a Central': 'bg-red-500/15 text-red-300',
  'Validado pelo Admin': 'bg-emerald-500/15 text-emerald-300',
}

export default function FotosPage() {
  const router = useRouter()
  const [fotos, setFotos] = useState<PacoteFoto[]>([])
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [selectedEntregador, setSelectedEntregador] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  function carregar() {
    setLoading(true)
    let url = '/api/fotos'
    const params = new URLSearchParams()
    if (selectedEntregador) params.set('entregador_id', selectedEntregador)
    if (dataIni) params.set('data_ini', dataIni)
    if (dataFim) params.set('data_fim', dataFim)
    const qs = params.toString()
    if (qs) url += '?' + qs

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setFotos(data.fotos || [])
        setEntregadores(data.entregadores || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(carregar, [selectedEntregador, dataIni, dataFim])

  async function validar(codigo: string) {
    setMsg('')
    const res = await fetch(`/api/pacotes/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Validado pelo Admin', validacao_admin: true })
    })
    const data = await res.json()
    if (res.ok) {
      setMsg(`✅ Pacote ${codigo} validado com sucesso!`)
      carregar()
    } else {
      setMsg(`❌ ${data.erro || 'Erro ao validar'}`)
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const totalFotos = fotos.length
  const pendentesValidacao = fotos.filter(p => p.status === 'Entregue' && !p.validacao_admin).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">📸 Fotos das Entregas</h2>
          <p className="text-sm text-white/40 mt-1">
            {totalFotos} foto(s) · {pendentesValidacao} pendente(s) de validação
          </p>
        </div>
      </div>

      {/* Mensagem flash */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          {msg}
        </div>
      )}

      {/* Filtros */}
      <div className="content-card p-4 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-white/40 mb-1">Entregador</label>
            <select
              value={selectedEntregador}
              onChange={e => setSelectedEntregador(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            >
              <option value="">Todos</option>
              {entregadores.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Data Início</label>
            <input
              type="date"
              value={dataIni}
              onChange={e => setDataIni(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <button
            onClick={() => { setSelectedEntregador(''); setDataIni(''); setDataFim('') }}
            className="px-4 py-2 bg-white/[0.10] text-white/60 rounded-lg text-sm hover:bg-white/[0.18] transition"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16 text-white/30">Carregando fotos...</div>
      ) : fotos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-white/30">Nenhuma foto encontrada</p>
          <p className="text-xs text-white/20 mt-1">Os entregadores ainda não enviaram fotos das entregas</p>
        </div>
      ) : (
        <>
          {/* Grid de Fotos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fotos.map(p => (
              <div key={p.codigo} className="content-card overflow-hidden hover:shadow-md transition group">
                {/* Foto */}
                <div className="relative aspect-[4/3] bg-white/[0.07] overflow-hidden cursor-pointer"
                  onClick={() => window.open(p.foto, '_blank')}>
                  <img
                    src={p.foto}
                    alt={`Foto ${p.codigo}`}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-110"
                  />
                  {/* Overlay com zoom hint */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium bg-black/50 px-3 py-1 rounded-full transition">
                      🔍 Clique para ampliar
                    </span>
                  </div>
                  {/* Badge de status */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_CORES[p.status] || 'text-white/60'}`}>
                      {p.status}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  {/* Código + Link */}
                  <div className="flex items-center justify-between">
                    <a href={`/admin/pacote/${p.codigo}`}
                      className="font-bold link-btn-sm text-sm">
                      {p.codigo}
                    </a>
                    <span className="text-xs text-white/30">
                      {new Date(p.data_chegada).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  {/* Endereço */}
                  <p className="text-xs text-white/40 truncate" title={p.endereco_entrega}>
                    📍 {p.endereco_entrega}
                  </p>

                  {/* Entregador */}
                  {p.entregadores && (
                    <p className="text-xs text-white/40">
                      👤 {p.entregadores.nome}
                    </p>
                  )}

                  {/* GPS */}
                  {p.gps_foto && (
                    <a
                      href={`https://www.google.com/maps?q=${p.gps_foto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                    >
                      🗺️ Ver localização no Maps
                    </a>
                  )}

                  {/* Para "Entregue" — botão Validar grande + GPS */}
                  {p.status === 'Entregue' && !p.validacao_admin && (
                    <div className="pt-2 border-t border-white/[0.10] mt-2 space-y-2">
                      {p.gps_foto && (
                        <div className="text-xs text-white/40 bg-white/[0.06] p-2 rounded-lg">
                          <span className="font-medium">📍 Coordenadas:</span>{' '}
                          <a
                            href={`https://www.google.com/maps?q=${p.gps_foto}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:underline"
                          >
                            {p.gps_foto}
                          </a>
                        </div>
                      )}
                      <button
                        onClick={() => validar(p.codigo)}
                        className="w-full py-2.5 btn-primary text-sm font-bold flex items-center justify-center gap-2"
                      >
                        ✅ Validar Entrega
                      </button>
                    </div>
                  )}

                  {/* Já validado */}
                  {p.validacao_admin && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 bg-emerald-500/15 px-2 py-1 rounded-full">
                        ✅ Validado
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
