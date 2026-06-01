'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import SelectTransportadora from '@/components/select-transportadora'

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
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  // Estados dos toggles
  const [showDestinatario, setShowDestinatario] = useState(false)
  const [showDescricao, setShowDescricao] = useState(false)
  const [showQuantidade, setShowQuantidade] = useState(false)
  const [showValor, setShowValor] = useState(false)
  const [showEntregador, setShowEntregador] = useState(false)
  const [showPrazo, setShowPrazo] = useState(false)
  const [showTransportadora, setShowTransportadora] = useState(false)
  const [showObservacoes, setShowObservacoes] = useState(false)

  const [valor, setValor] = useState('0,50')
  const [prazoAtivo, setPrazoAtivo] = useState(false)
  const [transportadora, setTransportadora] = useState('')

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso('')

    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      nf_remessa: form.get('nf_remessa'),
      endereco_entrega: form.get('endereco_entrega'),
    }

    if (showDestinatario) body.destinatario = form.get('destinatario')
    if (showDescricao) body.descricao = form.get('descricao')
    if (showQuantidade) body.quantidade = form.get('quantidade') || 1
    if (showValor) body.valor_pacote = valor.replace(',', '.')
    if (showTransportadora) body.transportadora = form.get('transportadora')
    if (showObservacoes) body.observacoes = form.get('observacoes')

    const entregadorId = form.get('entregador_id')
    if (showEntregador && entregadorId) body.entregador_id = entregadorId

    if (showPrazo && prazoAtivo && form.get('data_limite_entrega')) {
      body.data_limite_entrega = form.get('data_limite_entrega')
    }

    try {
      const res = await fetch('/api/pacotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.erro || 'Erro ao registrar')
        return
      }
      setSucesso(`✅ Pacote ${data.pacote.codigo} registrado com sucesso!`)
      // Recarregar após 2s
      setTimeout(() => router.push(`/admin/pacote/${data.pacote.codigo}`), 1500)
    } catch {
      setErro('Erro de conexao')
    } finally {
      setLoading(false)
    }
  }

  function handleEntregadorChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value)
    const ent = entregadores.find(e => e.id === id)
    if (ent) {
      setValor(ent.valor_padrao.toFixed(2).replace('.', ','))
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">➕ Registrar Pacote</h2>
          <p className="text-sm text-gray-500 mt-0.5">Preencha os campos obrigatórios e ative toggle para mais opções</p>
        </div>
        <a href="/admin/pacotes" className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
          ← Voltar
        </a>
      </div>

      {erro && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
          <span>❌</span> {erro}
        </div>
      )}

      {sucesso && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-3 rounded-xl mb-4 text-sm flex items-center gap-2">
          <span>{sucesso}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* === CARD OBRIGATÓRIO === */}
        <div className="content-card overflow-hidden">
          <div className="px-5 py-3 section-header flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Campos obrigatórios</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Pacote, Nota Fiscal ou Remessa <span className="text-red-400">*</span>
                </label>
                <input name="nf_remessa" required className="w-full px-3 py-2.5 rounded-lg text-sm" placeholder="Ex: NF-12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Endereço de Entrega <span className="text-red-400">*</span>
                </label>
                <input name="endereco_entrega" required className="w-full px-3 py-2.5 rounded-lg text-sm" placeholder="Rua, número, bairro..." />
              </div>
            </div>
          </div>
        </div>

        {/* === CAMPOS ATIVADOS (aparecem ACIMA dos toggles) === */}
        {(showDestinatario || showDescricao || showQuantidade || showValor || showEntregador || showPrazo || showTransportadora || showObservacoes) && (
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 section-header flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Campos ativados</h3>
            </div>
            <div className="p-5 space-y-4">
              {showDestinatario && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Destinatário</label>
                  <input name="destinatario" className="w-full px-3 py-2.5 rounded-lg text-sm" placeholder="Nome do destinatário" />
                </div>
              )}

              {showDescricao && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                  <input name="descricao" className="w-full px-3 py-2.5 rounded-lg text-sm" placeholder="Ex: Caixa de eletrônicos" />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showQuantidade && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantidade</label>
                    <input name="quantidade" type="number" defaultValue={1} min={1} className="w-full px-3 py-2.5 rounded-lg text-sm" />
                  </div>
                )}

                {showValor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor (R$)</label>
                    <input
                      value={valor}
                      onChange={e => setValor(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {showEntregador && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Entregador</label>
                  <select name="entregador_id" onChange={handleEntregadorChange} className="w-full px-3 py-2.5 rounded-lg text-sm">
                    <option value="">Sem atribuição</option>
                    {entregadores.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {showPrazo && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <label className="text-sm font-medium text-gray-700">Ativar prazo</label>
                    <button
                      type="button"
                      onClick={() => setPrazoAtivo(!prazoAtivo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        prazoAtivo ? 'bg-violet-500' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
                        prazoAtivo ? 'translate-x-[22px]' : 'translate-x-[2px]'
                      }`} />
                    </button>
                  </div>
                  {prazoAtivo && (
                    <input name="data_limite_entrega" type="datetime-local" className="w-full px-3 py-2.5 rounded-lg text-sm" />
                  )}
                </div>
              )}

              {showTransportadora && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Transportadora</label>
                  <SelectTransportadora
                    value={transportadora}
                    onChange={setTransportadora}
                    name="transportadora"
                    placeholder="Buscar transportadora..."
                  />
                </div>
              )}

              {showObservacoes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                  <textarea name="observacoes" rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm" placeholder="Informações adicionais..." />
                </div>
              )}
            </div>
          </div>
        )}

        {/* === CARD DE TOGGLES === */}
        <div className="content-card overflow-hidden">
          <div className="px-5 py-3 section-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Informações adicionais</h3>
            </div>
            <span className="text-[10px] text-gray-400 font-medium">Ative conforme necessário</span>
          </div>

          {/* Lista de toggles */}
          <div className="divide-y divide-gray-100">
            <ToggleSwitch ativo={showDestinatario} onClick={() => setShowDestinatario(!showDestinatario)} label="📋 Destinatário" />
            <ToggleSwitch ativo={showDescricao} onClick={() => setShowDescricao(!showDescricao)} label="📝 Descrição do pacote" />
            <ToggleSwitch ativo={showQuantidade} onClick={() => setShowQuantidade(!showQuantidade)} label="🔢 Quantidade de itens" />
            <ToggleSwitch ativo={showValor} onClick={() => setShowValor(!showValor)} label="💰 Valor do frete" />
            <ToggleSwitch ativo={showEntregador} onClick={() => setShowEntregador(!showEntregador)} label="👤 Atribuir a entregador" />
            <ToggleSwitch ativo={showPrazo} onClick={() => setShowPrazo(!showPrazo)} label="⏰ Prazo de entrega" />
            <ToggleSwitch ativo={showTransportadora} onClick={() => setShowTransportadora(!showTransportadora)} label="🚚 Transportadora" />
            <ToggleSwitch ativo={showObservacoes} onClick={() => setShowObservacoes(!showObservacoes)} label="📌 Observações" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3.5 rounded-xl text-sm font-semibold tracking-wide"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Registrando...
            </span>
          ) : '📦 Registrar Pacote'}
        </button>
      </form>
    </div>
  )
}
