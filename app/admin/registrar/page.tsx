'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import SelectTransportadora from '@/components/select-transportadora'
import FeatureGuard from '@/components/feature-guard'
import { FEATURES } from '@/lib/features'

type Entregador = { id: number; nome: string; valor_padrao: number }

function ToggleSwitch({ ativo, onClick, label }: { ativo: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-gray-50 transition group"
    >
      <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          ativo ? 'bg-violet-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
            ativo ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  )
}

// Linha do biper: NF/Remessa + Código
type LinhaPacote = { nf_remessa: string; codigo: string }

export default function RegistrarPage() {
  const router = useRouter()
  const [entregadores, setEntregadores] = useState<Entregador[]>([] as Entregador[])
  const [transportadoras, setTransportadoras] = useState<any[]>([] as any[])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // === Toggles ===
  const [showQuantidade, setShowQuantidade] = useState(true)          // 1º — único ligado inicialmente
  const [showEntregador, setShowEntregador] = useState(false)
  const [showDestinatario, setShowDestinatario] = useState(false)
  const [showDescricao, setShowDescricao] = useState(false)
  const [showValor, setShowValor] = useState(false)
  const [showPrazo, setShowPrazo] = useState(false)
  const [showObservacoes, setShowObservacoes] = useState(false)
  const [showEndereco, setShowEndereco] = useState(false)

  // === Campos ===
  const [valor, setValor] = useState('0,50')
  const [transportadora, setTransportadora] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [linhasPacote, setLinhasPacote] = useState<LinhaPacote[]>([{ nf_remessa: '', codigo: '' }])
  const [entregadorId, setEntregadorId] = useState('')
  const [prazoAtivo, setPrazoAtivo] = useState(false)

  // Prazo automático baseado na transportadora
  useEffect(() => {
    if (transportadora) {
      const t = transportadoras.find((t: any) => t.nome === transportadora)
      if (t?.prazo_entrega_dias) {
        setPrazoAtivo(true)
      }
    }
  }, [transportadora, transportadoras])

  // Quando a quantidade muda, ajusta as linhas (biper)
  useEffect(() => {
    setLinhasPacote(prev => {
      const nova: LinhaPacote[] = Array.from({ length: quantidade }, (_, i) =>
        prev[i] || { nf_remessa: '', codigo: '' }
      )
      return nova
    })
  }, [quantidade])

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setEntregadores(data.entregadores || [])
      })
    fetch('/api/transportadoras')
      .then(r => r.json())
      .then(data => {
        setTransportadoras(data.transportadoras || [])
      })
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')

    const form = new FormData(e.currentTarget)

    // Transportadora é obrigatória
    if (!transportadora) {
      setErro('Selecione uma transportadora')
      setLoading(false)
      return
    }

    // Monta array de pacotes a partir das linhas do biper
    const pacotesParaCriar = linhasPacote
      .filter(l => l.codigo.trim() || l.nf_remessa.trim()) // pelo menos 1 campo preenchido
      .map(l => ({
        nf_remessa: l.nf_remessa.trim(),
        codigo: l.codigo.trim() || undefined, // undefined = gera automático
      }))

    if (pacotesParaCriar.length === 0) {
      setErro('Preencha pelo menos 1 linha (NF/Remessa ou Código)')
      setLoading(false)
      return
    }

    // Payload base
    const payloadBase: Record<string, unknown> = {
      transportadora,
      quantidade: pacotesParaCriar.length,
    }

    if (showEndereco) {
      const endereco = form.get('endereco_entrega')?.toString().trim()
      if (endereco) payloadBase.endereco_entrega = endereco
    }
    if (showDestinatario) payloadBase.destinatario = form.get('destinatario')
    if (showDescricao) payloadBase.descricao = form.get('descricao')
    if (showValor) payloadBase.valor_pacote = valor.replace(',', '.')
    if (showObservacoes) payloadBase.observacoes = form.get('observacoes')

    // Entregador
    if (showEntregador && entregadorId) {
      payloadBase.entregador_id = parseInt(entregadorId)
    }

    // Prazo automático ou manual
    if (showPrazo && prazoAtivo) {
      if (transportadora) {
        const t = transportadoras.find((t: any) => t.nome === transportadora)
        if (t?.prazo_entrega_dias) {
          const data = new Date()
          data.setDate(data.getDate() + t.prazo_entrega_dias)
          payloadBase.data_limite_entrega = data.toISOString()
        }
      }
      const dataManual = form.get('data_limite_entrega')?.toString()
      if (dataManual) {
        payloadBase.data_limite_entrega = dataManual
      }
    }

    try {
      const res = await fetch('/api/pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadBase,
          codigos: pacotesParaCriar.map(l => l.codigo).filter(Boolean),
          nfs_remessa: pacotesParaCriar.map(l => l.nf_remessa).filter(Boolean),
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro || 'Erro ao registrar')
        return
      }
      const qtd = data.pacotes?.length || 1
      setSucesso(`${qtd} pacote(s) registrado(s) com sucesso!`)
      setTimeout(() => {
        if (data.pacotes?.[0]?.codigo) {
          router.push(`/admin/pacote/${data.pacotes[0].codigo}`)
        } else {
          router.push('/admin/pacotes')
        }
      }, 1500)
    } catch {
      setErro('Erro de conexao')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FeatureGuard feature={FEATURES.VALOR_PADRAO_ENTREGA}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📦 Registrar Pacote</h2>

        {erro && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
            ❌ {erro}
          </div>
        )}
        {sucesso && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✅ {sucesso}
          </div>
        )}

        <form onSubmit={handleSubmit} className="content-card p-6 space-y-6">
          {/* ========== TRANSPORTADORA (OBRIGATÓRIO) ========== */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              🚚 Transportadora <span className="text-red-500">*</span>
            </label>
            <SelectTransportadora
              value={transportadora}
              onChange={setTransportadora}
            />
            {transportadora && (
              <p className="text-[10px] text-gray-400 mt-1">
                Prazo automático será calculado com base nos dias da transportadora
              </p>
            )}
            {!transportadora && (
              <p className="text-[10px] text-red-400 mt-1">
                Selecione uma transportadora cadastrada
              </p>
            )}
          </div>

          {/* ========== CAMPOS ATIVOS (abrem acima dos toggles) ========== */}
          <div className="space-y-4">
            {showQuantidade && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Quantidade de pacotes [AGRUPAR]
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantidade}
                  onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
                <p className="text-[10px] text-amber-600 mt-1">
                  ⚡ [AGRUPAR] Serão criados {quantidade} pacote(s) no mesmo fluxo — use o biper
                </p>

                {/* Linhas NF/Remessa/Código */}
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    NF / Remessa / Código <span className="text-red-500">*</span> (preencha ao menos 1 campo por linha):
                  </p>
                  {linhasPacote.map((linha, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={linha.nf_remessa}
                        onChange={e => {
                          const novos = [...linhasPacote]
                          novos[i] = { ...novos[i], nf_remessa: e.target.value }
                          setLinhasPacote(novos)
                        }}
                        placeholder={`NF/Remessa #${i + 1}`}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                      />
                      <input
                        type="text"
                        value={linha.codigo}
                        onChange={e => {
                          const novos = [...linhasPacote]
                          novos[i] = { ...novos[i], codigo: e.target.value }
                          setLinhasPacote(novos)
                        }}
                        placeholder={`Código #${i + 1} (vazio = automático)`}
                        className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showEntregador && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Atribuir a entregador
                </label>
                <select
                  value={entregadorId}
                  onChange={e => setEntregadorId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                >
                  <option value="">Selecionar entregador...</option>
                  {entregadores.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
                {entregadorId && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    ⚡ Ao selecionar, o pacote já será liberado direto para o entregador (pula a Central)
                  </p>
                )}
              </div>
            )}

            {showDestinatario && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Destinatário</label>
                <input name="destinatario" type="text" placeholder="Nome do destinatário"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
            )}

            {showDescricao && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                <textarea name="descricao" rows={2} placeholder="Descrição do conteúdo..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
            )}

            {showEndereco && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Endereço de entrega</label>
                <input name="endereco_entrega" type="text" placeholder="Rua, número, bairro, cidade..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
            )}

            {showValor && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Valor por pacote (R$)</label>
                <input
                  type="number" step="0.01" min="0"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
            )}

            {showPrazo && (
              <div>
                <label className="flex items-center gap-2 mb-1.5">
                  <input
                    type="checkbox"
                    checked={prazoAtivo}
                    onChange={e => setPrazoAtivo(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs font-semibold text-gray-700">Definir prazo de entrega</span>
                </label>
                {prazoAtivo && (
                  <input
                    name="data_limite_entrega"
                    type="datetime-local"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                )}
              </div>
            )}

            {showObservacoes && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Observações</label>
                <textarea name="observacoes" rows={2} placeholder="Observações adicionais..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
            )}
          </div>

          {/* ========== LISTA DE TOGGLES FIXA (sempre no mesmo lugar) ========== */}
          <div className="border border-gray-100 rounded-xl bg-gray-50/50 divide-y divide-gray-100">
            <ToggleSwitch
              ativo={showQuantidade}
              onClick={() => setShowQuantidade(!showQuantidade)}
              label="📦 Quantidade [AGRUPAR]"
            />
            <ToggleSwitch
              ativo={showEntregador}
              onClick={() => setShowEntregador(!showEntregador)}
              label="👤 Atribuir Entregador"
            />
            <ToggleSwitch
              ativo={showDestinatario}
              onClick={() => setShowDestinatario(!showDestinatario)}
              label="👤 Destinatário"
            />
            <ToggleSwitch
              ativo={showDescricao}
              onClick={() => setShowDescricao(!showDescricao)}
              label="📝 Descrição"
            />
            <ToggleSwitch
              ativo={showValor}
              onClick={() => setShowValor(!showValor)}
              label="💰 Valor por pacote"
            />
            <ToggleSwitch
              ativo={showPrazo}
              onClick={() => setShowPrazo(!showPrazo)}
              label="📅 Prazo de entrega"
            />
            <ToggleSwitch
              ativo={showEndereco}
              onClick={() => setShowEndereco(!showEndereco)}
              label="📍 Endereço de entrega"
            />
            <ToggleSwitch
              ativo={showObservacoes}
              onClick={() => setShowObservacoes(!showObservacoes)}
              label="📋 Observações"
            />
          </div>

          {/* ========== SUBMIT ========== */}
          <button
            type="submit"
            disabled={loading || !transportadora}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-violet-200"
          >
            {loading
              ? '⏳ Registrando...'
              : !transportadora
                ? '⚠️ Selecione uma transportadora'
                : quantidade > 1
                  ? `📦 Registrar ${quantidade} Pacotes [AGRUPAR]`
                  : '📦 Registrar Pacote'
            }
          </button>

          {/* Resumo do fluxo automático */}
          {showEntregador && entregadorId && linhasPacote.filter(l => l.codigo.trim() || l.nf_remessa.trim()).length > 0 && (
            <div className="px-4 py-3 rounded-xl bg-violet-50 border border-violet-100 text-xs text-violet-700">
              ⚡ <strong>Fluxo automático:</strong> Os pacotes serão registrados e já liberados para o entregador,
              pulando o status &quot;Recebido pela Central&quot; — mesma data e hora para entrada e liberação.
            </div>
          )}
        </form>
      </div>
    </FeatureGuard>
  )
}
