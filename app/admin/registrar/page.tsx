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

export default function RegistrarPage() {
  const router = useRouter()
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [transportadoras, setTransportadoras] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // === Toggles na ORDEM correta ===
  const [showTransportadora, setShowTransportadora] = useState(true)  // 1º
  const [showQuantidade, setShowQuantidade] = useState(true)          // 2º
  const [showEntregador, setShowEntregador] = useState(true)          // 3º
  // Demais toggles (fora de ordem)
  const [showDestinatario, setShowDestinatario] = useState(false)
  const [showDescricao, setShowDescricao] = useState(false)
  const [showValor, setShowValor] = useState(false)
  const [showPrazo, setShowPrazo] = useState(false)
  const [showObservacoes, setShowObservacoes] = useState(false)
  const [showEndereco, setShowEndereco] = useState(true)

  // === Campos do formulário ===
  const [valor, setValor] = useState('0,50')
  const [transportadora, setTransportadora] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [codigosPacote, setCodigosPacote] = useState<string[]>([''])
  const [entregadorId, setEntregadorId] = useState('')
  const [prazoAtivo, setPrazoAtivo] = useState(false)

  // Calcula prazo automático baseado na transportadora
  useEffect(() => {
    if (transportadora) {
      const t = transportadoras.find((t: any) => t.nome === transportadora)
      if (t?.prazo_entrega_dias) {
        const data = new Date()
        data.setDate(data.getDate() + t.prazo_entrega_dias)
        setPrazoAtivo(true)
      }
    }
  }, [transportadora, transportadoras])

  // Quando a quantidade muda, ajusta o número de campos de código
  useEffect(() => {
    setCodigosPacote(prev => {
      const nova = Array.from({ length: quantidade }, (_, i) => prev[i] || '')
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

    // Filtra códigos vazios
    const codigosValidos = codigosPacote.map(c => c.trim()).filter(Boolean)

    if (codigosValidos.length === 0) {
      setErro('Informe pelo menos 1 código de pacote')
      setLoading(false)
      return
    }

    const nf_remessa = form.get('nf_remessa')?.toString().trim() || ''

    // Monta payload base
    const payloadBase: Record<string, unknown> = {
      nf_remessa,
      quantidade: quantidade,
    }
    if (showEndereco) payloadBase.endereco_entrega = form.get('endereco_entrega')
    if (showDestinatario) payloadBase.destinatario = form.get('destinatario')
    if (showDescricao) payloadBase.descricao = form.get('descricao')
    if (showValor) payloadBase.valor_pacote = valor.replace(',', '.')
    if (showTransportadora && transportadora) payloadBase.transportadora = transportadora
    if (showObservacoes) payloadBase.observacoes = form.get('observacoes')

    // Entregador
    if (showEntregador && entregadorId) {
      payloadBase.entregador_id = parseInt(entregadorId)
    }

    // Prazo automático ou manual
    if (showPrazo && prazoAtivo) {
      // Se tem transportadora com prazo, calcula automático
      if (transportadora) {
        const t = transportadoras.find((t: any) => t.nome === transportadora)
        if (t?.prazo_entrega_dias) {
          const data = new Date()
          data.setDate(data.getDate() + t.prazo_entrega_dias)
          payloadBase.data_limite_entrega = data.toISOString()
        }
      }
      // Se o formulário tem data manual, usa ela
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
          codigos: codigosValidos,
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
          {/* ========== NF / Código Principal ========== */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              NF de Remessa
            </label>
            <input
              name="nf_remessa"
              type="text"
              placeholder="Número da NF (opcional)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          {/* ========== TOGGLES NA ORDEM: Transp → Qtd → Entregador ========== */}
          <div className="border border-gray-100 rounded-xl bg-gray-50/50 divide-y divide-gray-100">
            {/* 1º Transportadora */}
            <ToggleSwitch
              ativo={showTransportadora}
              onClick={() => setShowTransportadora(!showTransportadora)}
              label="🚚 Transportadora"
            />

            {/* 2º Quantidade */}
            <ToggleSwitch
              ativo={showQuantidade}
              onClick={() => setShowQuantidade(!showQuantidade)}
              label="📦 Quantidade [AGRUPAR]"
            />

            {/* 3º Entregador */}
            <ToggleSwitch
              ativo={showEntregador}
              onClick={() => setShowEntregador(!showEntregador)}
              label="👤 Atribuir Entregador"
            />

            {/* Demais toggles */}
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

          {/* ========== TRANSPORTADORA (1º) ========== */}
          {showTransportadora && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Transportadora
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
            </div>
          )}

          {/* ========== QUANTIDADE + CÓDIGOS [AGRUPAR] (2º) ========== */}
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
                ⚡ [AGRUPAR] Serão criados {quantidade} pacote(s) no mesmo fluxo
              </p>

              {/* Campos de código para cada pacote */}
              {quantidade > 1 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Códigos dos pacotes (automático se vazio):
                  </p>
                  {codigosPacote.map((cod, i) => (
                    <input
                      key={i}
                      type="text"
                      value={cod}
                      onChange={e => {
                        const novos = [...codigosPacote]
                        novos[i] = e.target.value
                        setCodigosPacote(novos)
                      }}
                      placeholder={`Código pacote #${i + 1} (deixe vazio para automático)`}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== ENTREGADOR (3º) ========== */}
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

          {/* ========== DEMAIS CAMPOS ========== */}
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
                required
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

          {/* ========== SUBMIT ========== */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-violet-200"
          >
            {loading
              ? '⏳ Registrando...'
              : quantidade > 1
                ? `📦 Registrar ${quantidade} Pacotes [AGRUPAR]`
                : '📦 Registrar Pacote'
            }
          </button>

          {/* Resumo do que vai acontecer */}
          {showEntregador && entregadorId && codigosPacote.filter(c => c.trim()).length > 0 && (
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
