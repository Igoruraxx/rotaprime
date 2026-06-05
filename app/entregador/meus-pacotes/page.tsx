'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Icons,
  statusBadgeClass,
  statusLabel,
  formatCurrency,
  formatDateBR,
  isAtrasado,
} from '@/lib/shared-helpers'

// ═══════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════

type TabId = 'recebidos' | 'andamento' | 'finalizados'

interface Pacote {
  codigo: string
  status: string
  endereco_entrega: string
  destinatario: string | null
  data_chegada: string
  data_limite_entrega: string | null
  valor_pacote: number
  foto: string | null
  observacoes: string | null
}

// ═══════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'recebidos', label: 'Recebidos', icon: '📦' },
  { id: 'andamento', label: 'Em Andamento', icon: '🚚' },
  { id: 'finalizados', label: 'Finalizados', icon: '✅' },
]

const STATUS_MAP: Record<TabId, string[]> = {
  recebidos: ['Recebido pela Central'],
  andamento: ['Retirado pelo Entregador', 'Em Rota'],
  finalizados: ['Entregue', 'Validado pelo Admin'],
}

// ═══════════════════════════════════════════
// MODAL DE ENTREGA (individual — foto + GPS obrigatórios)
// ═══════════════════════════════════════════

function EntregaModal({
  pacote,
  onClose,
  onConfirm,
}: {
  pacote: Pacote | null
  onClose: () => void
  onConfirm: (codigo: string, fotoBase64: string, gps: string, observacao: string) => void
}) {
  const [foto, setFoto] = useState<string | null>(null)
  const [gps, setGps] = useState<string>('')
  const [observacao, setObservacao] = useState('')
  const [capturando, setCapturando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFoto(null); setGps(''); setObservacao('')
  }, [pacote])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFoto(reader.result as string)
    reader.readAsDataURL(file)
  }

  const capturarGps = () => {
    if (!navigator.geolocation) { alert('Geolocalização indisponível'); return }
    setCapturando(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setGps(`${pos.coords.latitude},${pos.coords.longitude}`); setCapturando(false) },
      () => { alert('Não foi possível obter a localização'); setCapturando(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleConfirm = () => {
    if (!pacote) return
    onConfirm(pacote.codigo, foto ?? '', gps, observacao)
  }

  if (!pacote) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl mx-auto animate-slide-up">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 sm:hidden" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmar Entrega</h3>
        <p className="text-sm text-gray-500 mb-5">
          Pacote <span className="font-mono font-semibold">#{pacote.codigo}</span>
        </p>
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4 border border-amber-200">
          ⚠️ A finalização é individual. Cada pacote exige foto + GPS comprobatórios.
        </p>

        {/* Foto — OBRIGATÓRIA */}
        <label className="block mb-4">
          <span className="text-sm font-semibold text-gray-700 mb-1.5 block">
            📸 Foto da entrega <span className="text-red-500">*</span>
            {!foto && <span className="text-red-400 text-xs ml-2 font-normal">(obrigatória)</span>}
            {foto && <span className="text-emerald-500 text-xs ml-2 font-normal">✓ Capturada</span>}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
          />
          {foto && (
            <div className="mt-2 relative">
              <img src={foto} alt="Preview" className="rounded-xl w-full h-40 object-cover border border-gray-200" />
              <button onClick={() => setFoto(null)} className="absolute top-2 right-2 rounded-full bg-black/50 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70">✕</button>
            </div>
          )}
        </label>

        {/* GPS — OBRIGATÓRIO */}
        <div className="mb-4">
          <span className="text-sm font-semibold text-gray-700 mb-1.5 block">
            📍 Localização (GPS) <span className="text-red-500">*</span>
            {!gps && <span className="text-red-400 text-xs ml-2 font-normal">(obrigatório)</span>}
            {gps && <span className="text-emerald-500 text-xs ml-2 font-normal">✓ Capturado</span>}
          </span>
          <button
            onClick={capturarGps}
            disabled={capturando}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              gps ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            } active:scale-[0.98]`}
          >
            {capturando ? '⏳ Capturando...' : gps ? `📍 GPS: ${gps}` : '📌 Capturar GPS (recomendado ao ar livre)'}
          </button>
        </div>

        {/* Observação (opcional) */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Observação <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={3}
            placeholder="Observações sobre a entrega..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none resize-none transition-all"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!foto || !gps}
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 active:scale-[0.97] transition-all shadow-lg shadow-green-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!foto || !gps ? '📸 Capture foto + GPS primeiro' : '✅ Confirmar Entrega'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-3/4 bg-gray-100 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

export default function MeusPacotesPage() {
  const router = useRouter()

  const [tab, setTab] = useState<TabId>('recebidos')
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgTipo, setMsgTipo] = useState<'sucesso' | 'erro'>('sucesso')

  // --- Seleção em lote para Recebidos ---
  const [aceitando, setAceitando] = useState(false)
  const [selectedRecebidos, setSelectedRecebidos] = useState<Set<string>>(new Set())

  // --- Seleção em lote para Em Andamento (Iniciar Rota) ---
  const [iniciandoRota, setIniciandoRota] = useState(false)
  const [selectedAndamento, setSelectedAndamento] = useState<Set<string>>(new Set())

  // Busca por dígitos
  const [busca, setBusca] = useState('')

  // Modal de entrega (individual — único pacote por vez)
  const [pacoteEntrega, setPacoteEntrega] = useState<Pacote | null>(null)
  const [entregando, setEntregando] = useState(false)

  // ═══ Helper de mensagem ═══════════════════
  const mostrarMsg = useCallback((texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setMsg(texto)
    setMsgTipo(tipo)
    setTimeout(() => setMsg(''), 5000)
  }, [])

  // ═══ Buscar pacotes ═══════════════════════
  const fetchPacotes = useCallback(async () => {
    setLoading(true)
    try {
      const status = STATUS_MAP[tab].join(',')
      const params = new URLSearchParams({ status })

      if (tab === 'andamento' && busca.trim()) {
        params.set('busca', busca.trim())
      }

      const res = await fetch(`/api/entregador/pacotes?${params}`)
      if (!res.ok) {
        if (res.status === 401) return router.push('/login')
        throw new Error('Erro ao carregar')
      }
      const data = await res.json()
      setPacotes(data.pacotes || [])
      setSelectedRecebidos(new Set())
      setSelectedAndamento(new Set())
    } catch {
      mostrarMsg('❌ Erro ao carregar pacotes', 'erro')
    } finally {
      setLoading(false)
    }
  }, [tab, busca, router, mostrarMsg])

  useEffect(() => { fetchPacotes() }, [fetchPacotes])

  // ═══ CSRF token ══════════════════════════
  const getCsrf = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/entregador/csrf')
      const data = await res.json()
      return data.csrf_token || null
    } catch { return null }
  }, [])

  // ═══ 1. Aceitar lote (Recebido → Retirado) ═══════════════
  const aceitarLote = useCallback(async (todos?: boolean) => {
    const codigos = todos ? undefined : Array.from(selectedRecebidos)
    if (!todos && codigos?.length === 0) return

    setAceitando(true)
    try {
      const res = await fetch('/api/entregador/aceitar-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos }),
      })
      const data = await res.json()
      if (res.ok) {
        mostrarMsg(`✅ ${data.mensagem}`)
        fetchPacotes()
      } else {
        mostrarMsg(`❌ ${data.erro || 'Erro ao aceitar'}`, 'erro')
      }
    } catch {
      mostrarMsg('❌ Erro de conexão ao aceitar lote', 'erro')
    }
    setAceitando(false)
  }, [selectedRecebidos, fetchPacotes, mostrarMsg])

  // ═══ 2. Iniciar rota em lote (Retirado → Em Rota) ═══════
  const iniciarRotaLote = useCallback(async () => {
    const codigos = Array.from(selectedAndamento)
    if (codigos.length === 0) return

    setIniciandoRota(true)
    try {
      const res = await fetch('/api/entregador/iniciar-rota-lote', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos }),
      })
      const data = await res.json()
      if (res.ok) {
        mostrarMsg(`✅ ${data.mensagem}`)
        fetchPacotes()
      } else {
        mostrarMsg(`❌ ${data.erro || 'Erro ao iniciar rota'}`, 'erro')
      }
    } catch {
      mostrarMsg('❌ Erro de conexão ao iniciar rota em lote', 'erro')
    }
    setIniciandoRota(false)
  }, [selectedAndamento, fetchPacotes, mostrarMsg])

  // ═══ 3. Entregar pacote (INDIVIDUAL — nunca em lote) ═══
  const handleEntregar = useCallback(async (
    codigo: string, fotoBase64: string, gps: string, observacao: string
  ) => {
    setEntregando(true)

    // Upload da foto
    let fotoUrl = fotoBase64
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foto: fotoBase64, pasta: 'entregas' }),
      })
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json()
        fotoUrl = uploadData.url
      }
    } catch {
      mostrarMsg('⚠️ Foto enviada sem compressão (modo fallback)', 'erro')
    }

    const token = await getCsrf()
    if (!token) { mostrarMsg('❌ Erro de segurança. Recarregue a página.', 'erro'); setEntregando(false); return }

    try {
      const res = await fetch(`/api/entregador/pacotes/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'entregar',
          csrf_token: token,
          foto: fotoUrl,
          gps_foto: gps,
          observacoes: observacao || undefined,
        }),
      })
      if (res.ok) {
        mostrarMsg(`✅ ${codigo} entregue com sucesso!`)
        setPacoteEntrega(null)
        fetchPacotes()
      } else {
        const err = await res.json()
        mostrarMsg(`❌ ${err.erro || 'Erro ao entregar'}`, 'erro')
      }
    } catch {
      mostrarMsg('❌ Erro de conexão ao finalizar entrega', 'erro')
    }
    setEntregando(false)
  }, [getCsrf, fetchPacotes, mostrarMsg])

  // ═══ 4. Iniciar rota individual (1 pacote) ═══════════════
  const iniciarRotaIndividual = useCallback(async (codigo: string) => {
    const token = await getCsrf()
    if (!token) { mostrarMsg('❌ Erro de segurança. Recarregue.', 'erro'); return }

    try {
      const res = await fetch(`/api/entregador/pacotes/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'rota', csrf_token: token }),
      })
      if (res.ok) {
        mostrarMsg(`✅ ${codigo} → Em Rota`)
        fetchPacotes()
      } else {
        const e = await res.json()
        mostrarMsg(`❌ ${e.erro || 'Erro ao iniciar rota'}`, 'erro')
      }
    } catch {
      mostrarMsg('❌ Erro de conexão', 'erro')
    }
  }, [getCsrf, fetchPacotes, mostrarMsg])

  // ═══ Seleção em lote — Recebidos ════════════════════════
  function toggleSelectRecebidos(codigo: string) {
    setSelectedRecebidos(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo)
      return next
    })
  }

  function toggleTodosRecebidos() {
    if (selectedRecebidos.size === pacotes.length) setSelectedRecebidos(new Set())
    else setSelectedRecebidos(new Set(pacotes.map(p => p.codigo)))
  }

  // ═══ Seleção em lote — Em Andamento (só "Retirado pelo Entregador") ═══
  function podeIniciarRota(p: Pacote): boolean {
    return p.status === 'Retirado pelo Entregador'
  }

  function toggleSelectAndamento(codigo: string) {
    setSelectedAndamento(prev => {
      const next = new Set(prev)
      if (next.has(codigo)) next.delete(codigo); else next.add(codigo)
      return next
    })
  }

  function toggleTodosAndamento() {
    const selecionaveis = pacotes.filter(podeIniciarRota).map(p => p.codigo)
    if (selectedAndamento.size === selecionaveis.length && selecionaveis.length > 0) {
      setSelectedAndamento(new Set())
    } else {
      setSelectedAndamento(new Set(selecionaveis))
    }
  }

  const pacotesParaIniciarRota = pacotes.filter(podeIniciarRota)

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">📦 Meus Pacotes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {tab === 'recebidos' && 'Pacotes aguardando sua retirada na central'}
            {tab === 'andamento' && 'Pacotes que você já retirou — em rota de entrega'}
            {tab === 'finalizados' && 'Pacotes entregues e validados'}
          </p>
        </div>

        {/* Botão "Aceitar Todos" — só na aba Recebidos */}
        {tab === 'recebidos' && pacotes.length > 0 && (
          <button
            onClick={() => aceitarLote(true)}
            disabled={aceitando}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-emerald-200 transition-all disabled:opacity-50 shadow-md"
          >
            {aceitando ? '⏳ Aceitando...' : '📦 Aceitar Todos'}
          </button>
        )}
      </div>

      {/* MENSAGEM */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border ${
          msgTipo === 'sucesso'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          <span className="flex-1">{msg}</span>
          <button onClick={() => setMsg('')} className="opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ──── ABAS ──── */}
      <div className="flex gap-2 mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setBusca('') }}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              tab === t.id
                ? 'bg-gray-900 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {!loading && (
              <span className={`text-xs ml-1 ${tab === t.id ? 'text-white/70' : 'text-gray-400'}`}>
                ({pacotes.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ──── CAMPO DE BUSCA (só em "Em Andamento") ──── */}
      {tab === 'andamento' && (
        <div className="mb-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Digite os últimos 3 a 6 dígitos do código do pacote..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          {busca && (
            <p className="text-xs text-violet-600 mt-1.5 ml-2">
              Buscando por código terminando em <strong>{busca}</strong>
              {' · '}
              <button onClick={() => setBusca('')} className="underline hover:text-violet-800">Limpar</button>
            </p>
          )}
        </div>
      )}

      {/* ──── LOADING ──── */}
      {loading && <Skeleton />}

      {/* ──── LISTAS ──── */}
      {!loading && (
        <>
          {/* ═══════════ ABA RECEBIDOS ═══════════ */}
          {tab === 'recebidos' && (
            <>
              {pacotes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <span className="text-3xl">📭</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum pacote pendente</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Quando o administrador repassar pacotes para você, eles aparecerão aqui para retirada.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3 px-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecebidos.size === pacotes.length && pacotes.length > 0}
                        onChange={toggleTodosRecebidos}
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-gray-600">
                        {selectedRecebidos.size === pacotes.length ? 'Desmarcar todos' : `Selecionar todos (${pacotes.length})`}
                      </span>
                    </label>
                    {selectedRecebidos.size > 0 && (
                      <button
                        onClick={() => aceitarLote(false)}
                        disabled={aceitando}
                        className="ml-auto px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50 shadow-sm"
                      >
                        {aceitando ? 'Aceitando...' : `✅ Aceitar ${selectedRecebidos.size}`}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {pacotes.map(p => (
                      <div
                        key={p.codigo}
                        className={`bg-white rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                          selectedRecebidos.has(p.codigo) ? 'border-violet-400 bg-violet-50/50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => toggleSelectRecebidos(p.codigo)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedRecebidos.has(p.codigo)}
                            onChange={() => toggleSelectRecebidos(p.codigo)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-bold text-gray-900 font-mono">{p.codigo}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">Aguardando</span>
                            </div>
                            <p className="text-sm text-gray-600 truncate">👤 {p.destinatario || 'Sem destinatário'}</p>
                            <p className="text-xs text-gray-400 mt-1 truncate">📍 {p.endereco_entrega}</p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                              <span>📅 {formatDateBR(p.data_chegada)}</span>
                              <span>💰 {formatCurrency(p.valor_pacote)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════════ ABA EM ANDAMENTO ═══════════ */}
          {tab === 'andamento' && (
            <>
              {pacotes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <span className="text-3xl">🚚</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma entrega em andamento</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    {busca
                      ? `Nenhum pacote encontrado com código terminando em "${busca}"`
                      : 'Aceite pacotes na aba "Recebidos" para começar suas entregas.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Barra de seleção em lote para INICIAR ROTA */}
                  {pacotesParaIniciarRota.length > 0 && (
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAndamento.size === pacotesParaIniciarRota.length && pacotesParaIniciarRota.length > 0}
                          onChange={toggleTodosAndamento}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-600">
                          {selectedAndamento.size === pacotesParaIniciarRota.length
                            ? 'Desmarcar todos'
                            : `Selecionar disponíveis (${pacotesParaIniciarRota.length})`}
                        </span>
                      </label>

                      {selectedAndamento.size > 0 && (
                        <button
                          onClick={iniciarRotaLote}
                          disabled={iniciandoRota}
                          className="ml-auto px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-200 transition-all disabled:opacity-50 shadow-sm"
                        >
                          {iniciandoRota ? 'Iniciando...' : `🚚 Iniciar Rota (${selectedAndamento.size})`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ⚠️ Bloqueio de finalização em lote */}
                  <div className="mb-3 px-1">
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span>⚠️</span>
                      <span>
                        <strong>Finalização individual:</strong> cada pacote só pode ser finalizado
                        um por vez com foto + GPS obrigatórios. Não é possível finalizar em lote.
                      </span>
                    </div>
                  </div>

                  {/* Lista de pacotes */}
                  <div className="space-y-2">
                    {pacotes.map(p => {
                      const atrasado = isAtrasado(p.data_limite_entrega)
                      const podeRota = podeIniciarRota(p)

                      return (
                        <div key={p.codigo} className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                          atrasado ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                          <div className="flex items-start gap-3">
                            {/* Checkbox — só para pacotes que podem iniciar rota */}
                            {podeRota ? (
                              <input
                                type="checkbox"
                                checked={selectedAndamento.has(p.codigo)}
                                onChange={() => toggleSelectAndamento(p.codigo)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                              />
                            ) : (
                              <div className="w-4 h-4 mt-1 shrink-0" />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-bold text-gray-900 font-mono">{p.codigo}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeClass(p.status)}`}>
                                  {statusLabel(p.status)}
                                </span>
                                {atrasado && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">🔴 Atrasado</span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 truncate">👤 {p.destinatario || 'Sem destinatário'}</p>
                              <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.endereco_entrega}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                <span>📅 {formatDateBR(p.data_chegada)}</span>
                                <span>💰 {formatCurrency(p.valor_pacote)}</span>
                              </div>
                            </div>

                            {/* Ações */}
                            <div className="shrink-0">
                              {p.status === 'Em Rota' && (
                                <button
                                  onClick={() => setPacoteEntrega(p)}
                                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-green-200 transition-all shadow-md active:scale-95"
                                  title="Finalizar entrega — obrigatório foto + GPS"
                                >
                                  ✅ Entregar
                                </button>
                              )}
                              {podeRota && !selectedAndamento.has(p.codigo) && (
                                <button
                                  onClick={() => iniciarRotaIndividual(p.codigo)}
                                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-blue-200 transition-all shadow-md active:scale-95"
                                >
                                  🚚 Rota
                                </button>
                              )}
                              {podeRota && selectedAndamento.has(p.codigo) && (
                                <span className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-blue-100 text-blue-700">
                                  Selecionado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ═══════════ ABA FINALIZADOS ═══════════ */}
          {tab === 'finalizados' && (
            <>
              {pacotes.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <span className="text-3xl">📋</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum pacote finalizado</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Os pacotes entregues aparecerão aqui após validação do administrador.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pacotes.map(p => (
                    <div key={p.codigo} className="bg-white rounded-2xl p-4 border border-gray-100 transition-all">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-bold text-gray-900 font-mono">{p.codigo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadgeClass(p.status)}`}>
                              {statusLabel(p.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">👤 {p.destinatario || 'Sem destinatário'}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.endereco_entrega}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                            <span>📅 {formatDateBR(p.data_chegada)}</span>
                            <span>💰 {formatCurrency(p.valor_pacote)}</span>
                          </div>
                        </div>
                        {p.foto && (
                          <a
                            href={p.foto}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition"
                          >
                            📸 Foto
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* MODAL DE ENTREGA (individual — único por vez) */}
      <EntregaModal
        pacote={pacoteEntrega}
        onClose={() => !entregando && setPacoteEntrega(null)}
        onConfirm={handleEntregar}
      />
    </div>
  )
}
