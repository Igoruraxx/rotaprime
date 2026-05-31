'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Pacote = {
  codigo: string
  data_chegada: string
  endereco_entrega: string
  data_limite_entrega: string
  status: string
  observacoes: string
  tentativa_atual: number
  valor_pacote: number
  foto: string | null
  gps_foto: string | null
}

type Aba = 'ativos' | 'entregues' | 'devolvidos'

export default function EntregadorPage() {
  const router = useRouter()
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<Aba>('ativos')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<{ codigo: string; acao: string } | null>(null)
  const [erro, setErro] = useState('')
  const [fotoBase64, setFotoBase64] = useState('')
  const [gps, setGps] = useState('')
  const [motivo, setMotivo] = useState('')

  function carregar() {
    setLoading(true)
    fetch('/api/entregador/pacotes')
      .then(r => r.json())
      .then(data => {
        setPacotes(data.pacotes || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(carregar, [])

  const ativos = pacotes.filter(p => ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota'].includes(p.status))
  const entregues = pacotes.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
  const devolvidos = pacotes.filter(p => p.status === 'Retornado a Central')
  const central = pacotes.filter(p => p.status === 'Recebido pela Central')

  async function executarAcao() {
    if (!actionModal) return
    setActionLoading(actionModal.codigo)
    setErro('')

    // Upload foto primeiro se tiver
    let fotoUrl = ''
    if (actionModal.acao === 'entregar' && fotoBase64) {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: fotoBase64, pasta: 'entregas' })
      })
      const uploadData = await uploadRes.json()
      if (uploadRes.ok) {
        fotoUrl = uploadData.url
      } else {
        setErro('Erro ao fazer upload da foto')
        setActionLoading(null)
        return
      }
    }

    const body: Record<string, unknown> = { acao: actionModal.acao }
    if (actionModal.acao === 'entregar') {
      if (fotoUrl) body.foto = fotoUrl
      if (gps) body.gps_foto = gps
    }
    if (actionModal.acao === 'devolver' && motivo) {
      body.motivo_devolucao = motivo
    }

    const res = await fetch(`/api/entregador/pacotes/${actionModal.codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro || 'Erro')
      setActionLoading(null)
      return
    }

    setActionModal(null)
    setFotoBase64('')
    setGps('')
    setMotivo('')
    setActionLoading(null)
    carregar()
  }

  function capturarGPS() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => setGps('GPS indisponível')
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Rota Prime</h1>
            <p className="text-xs text-gray-500">Painel do Entregador</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-red-600 hover:text-red-800">Sair</button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4">
        {/* Cards totais */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Pendentes', value: ativos.length + central.length, cor: 'bg-blue-500' },
            { label: 'Em Rota', value: ativos.filter(p => p.status === 'Em Rota').length, cor: 'bg-indigo-500' },
            { label: 'Entregues', value: entregues.length, cor: 'bg-green-500' },
            { label: 'Devolvidos', value: devolvidos.length, cor: 'bg-red-500' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl shadow-sm border p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([
            { id: 'ativos', label: `Ativos (${ativos.length + central.length})` },
            { id: 'entregues', label: `Entregues (${entregues.length})` },
            { id: 'devolvidos', label: `Devolvidos (${devolvidos.length})` },
          ] as { id: Aba; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                aba === tab.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {erro && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{erro}</div>
        )}

        {/* Lista de Pacotes */}
        {loading ? (
          <div className="text-center text-gray-500 py-8">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {listarPacotes(aba, { central, ativos, entregues, devolvidos }).map(p => (
              <PacoteCard
                key={p.codigo}
                pacote={p}
                actionLoading={actionLoading}
                onAcao={(acao) => {
                  if (acao === 'retirar' || acao === 'rota') {
                    executarAcaoSimples(p.codigo, acao)
                  } else {
                    setActionModal({ codigo: p.codigo, acao })
                    setFotoBase64('')
                    setGps('')
                    setMotivo('')
                  }
                }}
              />
            ))}
            {listarPacotes(aba, { central, ativos, entregues, devolvidos }).length === 0 && (
              <div className="text-center text-gray-400 py-8">
                {aba === 'ativos' ? 'Nenhum pacote ativo no momento' : 
                 aba === 'entregues' ? 'Nenhum pacote entregue ainda' : 'Nenhum pacote devolvido'}
              </div>
            )}
          </div>
        )}

        {/* Modal de Ação */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setActionModal(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {actionModal.acao === 'entregar' ? '✅ Confirmar Entrega' : 
                 actionModal.acao === 'devolver' ? '🔄 Devolver à Central' : 'Ação'}
              </h3>

              {actionModal.acao === 'entregar' && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📸 Foto da Entrega (opcional)</label>
                    <input type="file" accept="image/*" capture="environment"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = () => setFotoBase64(reader.result as string)
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">📍 Localização</label>
                    <div className="flex gap-2">
                      <input value={gps} onChange={e => setGps(e.target.value)} placeholder="lat,lng" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                      <button onClick={capturarGPS} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">📍 GPS</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
                    <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
              )}

              {actionModal.acao === 'devolver' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Devolução *</label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} required className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={executarAcao} disabled={actionLoading === actionModal.codigo}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === actionModal.codigo ? 'Processando...' : 'Confirmar'}
                </button>
                <button onClick={() => setActionModal(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )

  async function executarAcaoSimples(codigo: string, acao: string) {
    setActionLoading(codigo)
    setErro('')
    const res = await fetch(`/api/entregador/pacotes/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao })
    })
    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro || 'Erro')
    }
    setActionLoading(null)
    carregar()
  }
}

function listarPacotes(aba: Aba, grupos: {
  central: Pacote[]; ativos: Pacote[]; entregues: Pacote[]; devolvidos: Pacote[]
}): Pacote[] {
  if (aba === 'ativos') return [...grupos.central, ...grupos.ativos].sort((a, b) => a.data_chegada < b.data_chegada ? 1 : -1)
  if (aba === 'entregues') return grupos.entregues
  return grupos.devolvidos
}

function PacoteCard({ pacote, actionLoading, onAcao }: {
  pacote: Pacote
  actionLoading: string | null
  onAcao: (acao: string) => void
}) {
  const acoes = getAcoes(pacote.status)

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-bold text-gray-800 text-sm">{pacote.codigo}</span>
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${badgeCor(pacote.status)}`}>
            {pacote.status}
          </span>
        </div>
        {pacote.tentativa_atual > 0 && (
          <span className="text-xs text-red-500 font-medium">Tentativa {pacote.tentativa_atual}</span>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-1">{pacote.endereco_entrega}</p>
      <p className="text-xs text-gray-400 mb-2">
        Chegada: {new Date(pacote.data_chegada).toLocaleString('pt-BR')}
        {pacote.data_limite_entrega && ` · Prazo: ${new Date(pacote.data_limite_entrega).toLocaleDateString('pt-BR')}`}
      </p>

      {acoes.length > 0 && (
        <div className="flex gap-2 mt-2">
          {acoes.map(a => (
            <button
              key={a.acao}
              onClick={() => onAcao(a.acao)}
              disabled={actionLoading === pacote.codigo}
              className={`${a.cor} text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50`}
            >
              {actionLoading === pacote.codigo ? '...' : a.label}
            </button>
          ))}
        </div>
      )}

      {pacote.foto && (
        <div className="mt-2">
          <img src={pacote.foto} alt="Foto" className="w-20 h-20 object-cover rounded-lg" />
          {pacote.gps_foto && (
            <a href={`https://www.google.com/maps?q=${pacote.gps_foto}`} target="_blank" className="text-blue-600 text-xs hover:underline ml-2">📍 Maps</a>
          )}
        </div>
      )}
    </div>
  )
}

function getAcoes(status: string): { label: string; acao: string; cor: string }[] {
  const mapa: Record<string, { label: string; acao: string; cor: string }[]> = {
    'Aguardando Retirada': [{ label: '✋ Retirar', acao: 'retirar', cor: 'bg-blue-500' }],
    'Retirado pelo Entregador': [{ label: '🚚 Iniciar Rota', acao: 'rota', cor: 'bg-indigo-500' }],
    'Em Rota': [
      { label: '✅ Entregar', acao: 'entregar', cor: 'bg-green-500' },
      { label: '🔄 Devolver', acao: 'devolver', cor: 'bg-red-500' },
    ],
  }
  return mapa[status] || []
}

function badgeCor(status: string): string {
  const cores: Record<string, string> = {
    'Recebido pela Central': 'bg-gray-100 text-gray-700',
    'Aguardando Retirada': 'bg-yellow-100 text-yellow-700',
    'Retirado pelo Entregador': 'bg-blue-100 text-blue-700',
    'Em Rota': 'bg-indigo-100 text-indigo-700',
    'Entregue': 'bg-green-100 text-green-700',
    'Retornado a Central': 'bg-red-100 text-red-700',
    'Validado pelo Admin': 'bg-emerald-100 text-emerald-700',
  }
  return cores[status] || 'bg-gray-100 text-gray-700'
}
