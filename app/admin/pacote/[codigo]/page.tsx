'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SelectTransportadora from '@/components/select-transportadora'
import WhatsAppButton from '@/components/whatsapp-button'
import MapaRota from '@/components/mapa-rota'
import BotaoComprovante from '@/components/comprovante-pdf'

type Pacote = {
  codigo: string
  data_chegada: string
  nf_remessa: string
  descricao: string
  quantidade: number
  endereco_entrega: string
  data_limite_entrega: string
  entregador_id: number | null
  valor_pacote: number
  pago: boolean
  data_pagamento: string
  status: string
  data_repassado_entregador: string
  data_retirada_central: string
  data_entrega_real: string
  motivo_devolucao: string
  tentativa_atual: number
  validacao_admin: boolean
  data_validacao_admin: string
  observacoes: string
  destinatario: string
  transportadora: string
  foto: string
  gps_foto: string
  entregador_nome: string
  criado_em: string
  entregadores: { nome: string; telefone: string; valor_padrao: number } | null
}

const STATUS_LIST = [
  'Recebido pela Central',
  'Aguardando Retirada',
  'Retirado pelo Entregador',
  'Em Rota',
  'Entregue',
  'Retornado a Central',
  'Validado pelo Admin',
]

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-amber-500 text-white',
  'Aguardando Retirada': 'bg-violet-500 text-white',
  'Retirado pelo Entregador': 'bg-violet-500 text-white',
  'Em Rota': 'bg-violet-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

export default function PacoteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [pacote, setPacote] = useState<Pacote | null>(null)
  const [entregadores, setEntregadores] = useState<{ id: number; nome: string }[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)
  const [acaoMsg, setAcaoMsg] = useState('')
  const [whatsappLog, setWhatsappLog] = useState<{ id: number; data_envio: string; entregador_id: number }[]>([])

  function carregar() {
    fetch(`/api/pacotes/${params.codigo}`)
      .then(r => r.json())
      .then(data => setPacote(data.pacote))

    fetch(`/api/whatsapp?pacote_codigo=${params.codigo}`)
      .then(r => r.json())
      .then(data => setWhatsappLog(data.log || []))
      .catch(() => setWhatsappLog([]))

    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }

  useEffect(carregar, [params.codigo])

  async function acao(tipo: string, extra?: Record<string, unknown>) {
    setAcaoMsg('')
    const body: Record<string, unknown> = { ...extra }

    switch (tipo) {
      case 'atribuir':
        body.entregador_id = (document.getElementById('entregador_select') as HTMLSelectElement)?.value
        break
      case 'repassar':
        body.entregador_id = (document.getElementById('entregador_select') as HTMLSelectElement)?.value
        body.status = 'Aguardando Retirada'
        break
      case 'validar':
        body.validacao_admin = true
        body.status = 'Validado pelo Admin'
        break
      case 'pagar':
        body.pago = true
        break
      case 'estornar':
        body.pago = false
        body.data_pagamento = null
        break
      case 'reiniciar':
        body.status = 'Recebido pela Central'
        body.tentativa_atual = 0
        body.motivo_devolucao = ''
        body.data_retirada_central = null
        body.data_entrega_real = null
        body.data_repassado_entregador = null
        break
    }

    const res = await fetch(`/api/pacotes/${params.codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (res.ok) {
      setAcaoMsg(tipo === 'reiniciar' ? '✅ Pacote reiniciado!' : '✅ Ação realizada com sucesso!')
      carregar()
    } else {
      setAcaoMsg(`❌ ${data.erro || 'Erro'}`)
    }
  }

  if (!pacote) return <div className="text-gray-400 text-center py-12">Carregando...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm">← Voltar</button>
        <h2 className="text-2xl font-bold text-gray-900">{pacote.codigo}</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CORES[pacote.status] || 'bg-gray-50 text-gray-500 border border-gray-200'}`}>
          {pacote.status}
        </span>
      </div>

      {/* Mensagem de ação */}
      {acaoMsg && (
        <div className="bg-violet-50 text-violet-700 border border-violet-200 p-3 rounded-lg mb-4 text-sm">{acaoMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal: Info + Timeline + Edit */}
        <div className="lg:col-span-2 space-y-6">

          {/* TIMELINE */}
          {showTimeline && <Timeline pacote={pacote} />}

          {/* INFORMAÇÕES COMPLETAS */}
          <div className="content-card">
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">📋 Informações do Pacote</h3>
              <button onClick={() => setShowEdit(!showEdit)} className="link-btn-sm">
                {showEdit ? '✕ Fechar edição' : '✏️ Editar'}
              </button>
            </div>
            <div className="p-4">
              <GridInfo pacote={pacote} />
            </div>
          </div>

          {/* FORMULÁRIO DE EDIÇÃO COMPLETO */}
          {showEdit && (
            <EditFormCompleto
              codigo={pacote.codigo}
              pacote={pacote}
              entregadores={entregadores}
              onSave={() => { carregar(); setShowEdit(false) }}
              onCancel={() => setShowEdit(false)}
            />
          )}
        </div>

        {/* Coluna Lateral: Ações + Foto */}
        <div className="space-y-4">
          {/* Ações Rápidas */}
          <div className="content-card p-4 border-violet-500/20">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">⚡ Ações Rápidas</h3>
            <div className="space-y-2">
              {/* Selecionar entregador */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Entregador</label>
                <select id="entregador_select" className="w-full px-3 py-2 rounded-lg text-sm">
                  <option value="">Sem entregador</option>
                  {entregadores.map(e => (
                    <option key={e.id} value={e.id} selected={pacote.entregador_id === e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => acao('atribuir')} className="py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200">📌 Atribuir</button>
                <button onClick={() => acao('repassar')} className="py-2 btn-primary rounded-lg text-sm">📤 Repassar</button>
              </div>

              {/* Status - Admin override */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Alterar Status (override)</label>
                <div className="flex gap-2">
                  <select id="status_override" className="flex-1 px-3 py-2 rounded-lg text-sm">
                    {STATUS_LIST.map(s => (
                      <option key={s} value={s} selected={pacote.status === s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const novo = (document.getElementById('status_override') as HTMLSelectElement).value
                      acao('_status', { status: novo })
                    }}
                    className="px-3 py-2 btn-primary rounded-lg text-sm"
                  >
                    OK
                  </button>
                </div>
              </div>

              <hr className="my-2 border-gray-200" />

              {!pacote.pago && (
                <button onClick={() => acao('pagar')} className="w-full py-2 link-btn-green rounded-lg text-sm">💰 Marc. como Pago</button>
              )}
              {pacote.pago && (
                <button onClick={() => acao('estornar')} className="w-full py-2 bg-amber-100 text-amber-600 border border-amber-200 rounded-lg text-sm hover:bg-amber-200">↩️ Estornar Pag.</button>
              )}

              {pacote.status === 'Entregue' && !pacote.validacao_admin && (
                <button onClick={() => acao('validar')} className="w-full py-2 link-btn-green rounded-lg text-sm">✅ Validar Entrega</button>
              )}

              <button onClick={() => acao('reiniciar')} className="w-full py-2 bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-200">🔄 Reiniciar Pacote</button>

              <button onClick={() => setShowTimeline(!showTimeline)} className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-sm hover:bg-gray-200">
                {showTimeline ? '🙈 Ocultar' : '👁️ Mostrar'} Timeline
              </button>

              {/* WhatsApp */}
              {pacote.entregadores && (
                <>
                  <hr className="my-2 border-gray-200" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-medium text-gray-500">📱 WhatsApp</h4>
                      <WhatsAppButton
                        entregadorNome={(pacote.entregadores as { nome: string; telefone: string } | null)?.nome || ''}
                        entregadorId={pacote.entregador_id}
                        entregadorTelefone={(pacote.entregadores as { nome: string; telefone: string } | null)?.telefone}
                        pacoteCodigo={pacote.codigo}
                        endereco={pacote.endereco_entrega}
                        className="w-8 h-8 rounded-lg"
                      />
                    </div>
                    {/* Histórico de contatos */}
                    {whatsappLog.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {whatsappLog.map(log => (
                          <p key={log.id} className="text-[10px] text-gray-400 leading-tight">
                            📞 {new Date(log.data_envio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Foto + Mapa */}
          {pacote.foto && (
            <div className="content-card p-4">
              <h3 className="font-semibold text-gray-900 mb-2">📸 Foto da Entrega</h3>
              <img src={pacote.foto} alt="Foto da entrega" className="w-full rounded-lg mb-2 object-cover max-h-64" />
              {pacote.gps_foto && (
                <div className="mt-3">
                  <MapaRota
                    pontos={[{ lat: Number(pacote.gps_foto.split(',')[0]), lng: Number(pacote.gps_foto.split(',')[1]), codigo: pacote.codigo }]}
                    single={true}
                    altura="180px"
                  />
                  <a href={`https://www.google.com/maps?q=${pacote.gps_foto}`} target="_blank" rel="noopener noreferrer"
                    className="text-violet-600 text-sm hover:underline flex items-center gap-1 mt-2">
                    📍 Ver no Google Maps
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Comprovante PDF */}
          <div className="content-card p-4">
            <BotaoComprovante
              dados={{
                codigo: pacote.codigo,
                status: pacote.status,
                destinatario: pacote.destinatario || '',
                endereco_entrega: pacote.endereco_entrega || '',
                data_entrega: pacote.data_entrega_real,
                data_chegada: pacote.data_chegada || '',
                data_limite_entrega: pacote.data_limite_entrega || '',
                descricao: pacote.descricao,
                quantidade: pacote.quantidade,
                valor_pacote: Number(pacote.valor_pacote || 0),
                transportadora: pacote.transportadora,
                nf_remessa: pacote.nf_remessa,
                foto: pacote.foto,
                gps_foto: pacote.gps_foto,
                entregador_nome: pacote.entregador_nome,
                observacoes: pacote.observacoes,
              }}
              className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TIMELINE
// ============================================================
function Timeline({ pacote }: { pacote: Pacote }) {
  const eventos: { label: string; data: string | null; icone: string; cor: string; ativo: boolean }[] = [
    { label: 'Chegou na Central', data: pacote.criado_em || pacote.data_chegada, icone: '📦', cor: 'bg-gray-400', ativo: true },
    { label: 'Repassado ao Entregador', data: pacote.data_repassado_entregador, icone: '📤', cor: 'bg-amber-400', ativo: !!pacote.data_repassado_entregador },
    { label: 'Retirado pelo Entregador', data: pacote.data_retirada_central, icone: '✋', cor: 'bg-violet-400', ativo: !!pacote.data_retirada_central },
    { label: 'Entregue', data: pacote.data_entrega_real, icone: '✅', cor: 'bg-emerald-400', ativo: pacote.status === 'Entregue' || pacote.status === 'Validado pelo Admin' },
    { label: 'Validado pelo Admin', data: pacote.data_validacao_admin, icone: '👍', cor: 'bg-emerald-400', ativo: pacote.validacao_admin },
  ]

  // Se tem devolução, inserir
  if (pacote.motivo_devolucao || pacote.status === 'Retornado a Central') {
    eventos.splice(3, 0, {
      label: `Devolvido à Central${pacote.motivo_devolucao ? ': ' + pacote.motivo_devolucao : ''}`,
      data: null,
      icone: '🔄',
      cor: 'bg-red-400',
      ativo: pacote.status === 'Retornado a Central'
    })
  }

  // Status pago
  if (pacote.pago) {
    eventos.push({
      label: `Pago R$ ${(pacote.valor_pacote || 0).toFixed(2)}`,
      data: pacote.data_pagamento,
      icone: '💰',
      cor: 'bg-emerald-400',
      ativo: true
    })
  }

  const ativos = eventos.filter(e => e.ativo).length

  return (
    <div className="content-card p-4">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        📊 Linha do Tempo
        <span className="text-xs text-gray-400 font-normal">({ativos}/{eventos.length} etapas concluídas)</span>
      </h3>
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {eventos.map((ev, i) => (
            <div key={i} className="relative flex items-start gap-4">
              {/* Bolinha */}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                ev.ativo ? ev.cor + ' text-white' : 'bg-gray-50 text-gray-400'
              }`}>
                {ev.icone}
              </div>
              {/* Conteúdo */}
              <div className="flex-1 pt-1">
                <p className={`text-sm font-medium ${ev.ativo ? 'text-gray-900' : 'text-gray-400'}`}>
                  {ev.label}
                </p>
                {ev.data && (
                  <p className="text-xs text-gray-400">
                    {new Date(ev.data).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// GRID DE INFORMAÇÕES
// ============================================================
function GridInfo({ pacote }: { pacote: Pacote }) {
  const infos = [
    { label: 'Código', value: pacote.codigo, colspan: 1 },
    { label: 'Pacote, Nota Fiscal ou Remessa', value: pacote.nf_remessa || '—', colspan: 1 },
    { label: 'Destinatário', value: (pacote as Record<string, unknown>).destinatario || '—', colspan: 1 },
    { label: 'Status', value: pacote.status, colspan: 1 },
    { label: 'Transportadora', value: pacote.transportadora || '—', colspan: 1 },
    { label: 'Descrição', value: pacote.descricao || '—', colspan: 2 },
    { label: 'Endereço de Entrega', value: pacote.endereco_entrega, colspan: 2 },
    { label: 'Quantidade', value: pacote.quantidade, colspan: 1 },
    { label: 'Valor', value: `R$ ${(pacote.valor_pacote || 0).toFixed(2)}`, colspan: 1 },
    { label: 'Entregador', value: pacote.entregadores?.nome || '—', colspan: 1 },
    { label: 'Telefone Entregador', value: pacote.entregadores?.telefone || '—', colspan: 1 },
    { label: 'Data Chegada', value: pacote.data_chegada ? new Date(pacote.data_chegada).toLocaleString('pt-BR') : '—', colspan: 1 },
    { label: 'Data Limite', value: pacote.data_limite_entrega ? new Date(pacote.data_limite_entrega).toLocaleString('pt-BR') : '—', colspan: 1 },
    { label: 'Repassado em', value: pacote.data_repassado_entregador ? new Date(pacote.data_repassado_entregador).toLocaleString('pt-BR') : '—', colspan: 1 },
    { label: 'Retirado em', value: pacote.data_retirada_central ? new Date(pacote.data_retirada_central).toLocaleString('pt-BR') : '—', colspan: 1 },
    { label: 'Entrega Real', value: pacote.data_entrega_real ? new Date(pacote.data_entrega_real).toLocaleString('pt-BR') : '—', colspan: 1 },
    { label: 'Pago', value: pacote.pago ? `✅ Sim (${pacote.data_pagamento ? new Date(pacote.data_pagamento).toLocaleString('pt-BR') : ''})` : '❌ Não', colspan: 1 },
    { label: 'Validado Admin', value: pacote.validacao_admin ? `✅ Sim (${pacote.data_validacao_admin ? new Date(pacote.data_validacao_admin).toLocaleString('pt-BR') : ''})` : '⏳ Pendente', colspan: 1 },
    { label: 'Tentativas', value: pacote.tentativa_atual || 0, colspan: 1 },
    { label: 'Motivo Devolução', value: pacote.motivo_devolucao || '—', colspan: 2 },
    { label: 'Observações', value: pacote.observacoes || '—', colspan: 2 },
    { label: '📸 Foto', value: pacote.foto ? 'Sim' : 'Não', colspan: 1 },
    { label: '📍 GPS', value: pacote.gps_foto || '—', colspan: 1 },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
      {infos.map(info => (
        <div key={info.label} className={info.colspan === 2 ? 'md:col-span-2' : ''}>
          <span className="text-xs text-gray-500 block">{info.label}</span>
          <span className="text-sm font-medium text-gray-700">{String(info.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// FORMULÁRIO DE EDIÇÃO COMPLETO
// ============================================================
function EditFormCompleto({
  codigo, pacote, entregadores, onSave, onCancel
}: {
  codigo: string
  pacote: Pacote
  entregadores: { id: number; nome: string }[]
  onSave: () => void
  onCancel: () => void
}) {
  const toDatetimeLocal = (d: string | null) => {
    if (!d) return ''
    try { return new Date(d).toISOString().slice(0, 16) } catch { return '' }
  }

  const [form, setForm] = useState({
    nf_remessa: pacote.nf_remessa || '',
    destinatario: (pacote as Record<string, unknown>).destinatario as string || '',
    descricao: pacote.descricao || '',
    quantidade: pacote.quantidade || 1,
    endereco_entrega: pacote.endereco_entrega || '',
    valor_pacote: (pacote.valor_pacote || 0).toString().replace('.', ','),
    observacoes: pacote.observacoes || '',
    transportadora: pacote.transportadora || '',
    motivo_devolucao: pacote.motivo_devolucao || '',
    tentativa_atual: pacote.tentativa_atual || 0,
    entregador_id: pacote.entregador_id || '',
    status: pacote.status,
    pago: pacote.pago,
    validacao_admin: pacote.validacao_admin,
    data_chegada: toDatetimeLocal(pacote.data_chegada),
    data_limite_entrega: toDatetimeLocal(pacote.data_limite_entrega),
    data_repassado_entregador: toDatetimeLocal(pacote.data_repassado_entregador),
    data_retirada_central: toDatetimeLocal(pacote.data_retirada_central),
    data_entrega_real: toDatetimeLocal(pacote.data_entrega_real),
    data_pagamento: toDatetimeLocal(pacote.data_pagamento),
    data_validacao_admin: toDatetimeLocal(pacote.data_validacao_admin),
    foto: pacote.foto || '',
    gps_foto: pacote.gps_foto || '',
  })

  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  function set<K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function save() {
    setSaving(true)
    setErro('')

    const body: Record<string, unknown> = {
      ...form,
      valor_pacote: form.valor_pacote.replace(',', '.'),
      entregador_id: form.entregador_id ? parseInt(form.entregador_id as string) : null,
      data_chegada: form.data_chegada ? new Date(form.data_chegada).toISOString() : null,
      data_limite_entrega: form.data_limite_entrega ? new Date(form.data_limite_entrega).toISOString() : null,
      data_repassado_entregador: form.data_repassado_entregador ? new Date(form.data_repassado_entregador).toISOString() : null,
      data_retirada_central: form.data_retirada_central ? new Date(form.data_retirada_central).toISOString() : null,
      data_entrega_real: form.data_entrega_real ? new Date(form.data_entrega_real).toISOString() : null,
      data_pagamento: form.data_pagamento ? new Date(form.data_pagamento).toISOString() : null,
      data_validacao_admin: form.data_validacao_admin ? new Date(form.data_validacao_admin).toISOString() : null,
      foto: form.foto || null,
      gps_foto: form.gps_foto || null,
    }

    const res = await fetch(`/api/pacotes/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    if (!res.ok) {
      setErro(data.erro || 'Erro ao salvar')
      setSaving(false)
      return
    }

    setSaving(false)
    onSave()
  }

  return (
    <div className="content-card p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">✏️ Editar Pacote — Todos os Campos</h3>

      {erro && <div className="bg-red-100 text-red-600 border border-red-200 p-3 rounded-lg mb-4 text-sm">{erro}</div>}

      <div className="space-y-6">
        {/* Seção: Identificação */}
        <Section titulo="📋 Identificação">
          <Field label="Pacote, Nota Fiscal ou Remessa" cols={2}>
            <input value={form.nf_remessa} onChange={e => set('nf_remessa', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Destinatário" cols={2}>
            <input value={form.destinatario} onChange={e => set('destinatario', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Descrição" cols={2}>
            <input value={form.descricao} onChange={e => set('descricao', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Quantidade">
            <input type="number" value={form.quantidade} onChange={e => set('quantidade', parseInt(e.target.value) || 1)} min={1} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Transportadora">
            <SelectTransportadora
              value={form.transportadora}
              onChange={v => set('transportadora', v)}
              placeholder="Buscar transportadora..."
            />
          </Field>
        </Section>

        {/* Seção: Endereço e Valor */}
        <Section titulo="📍 Endereço & Valor">
          <Field label="Endereço de Entrega" cols={2}>
            <input value={form.endereco_entrega} onChange={e => set('endereco_entrega', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Valor (R$)">
            <input value={form.valor_pacote} onChange={e => set('valor_pacote', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Entregador">
            <select value={form.entregador_id as string} onChange={e => set('entregador_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm">
              <option value="">Sem entregador</option>
              {entregadores.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Field>
        </Section>

        {/* Seção: Status e Flags */}
        <Section titulo="⚙️ Status & Configurações">
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm">
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Tentativa Atual">
            <input type="number" value={form.tentativa_atual} onChange={e => set('tentativa_atual', parseInt(e.target.value) || 0)} min={0} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Pago">
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="pago" checked={!!form.pago} onChange={() => set('pago', true)} /> Sim</label>
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="pago" checked={!form.pago} onChange={() => set('pago', false)} /> Não</label>
            </div>
          </Field>
          <Field label="Validado pelo Admin">
            <div className="flex gap-3">
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="validado" checked={!!form.validacao_admin} onChange={() => set('validacao_admin', true)} /> Sim</label>
              <label className="flex items-center gap-1 text-sm"><input type="radio" name="validado" checked={!form.validacao_admin} onChange={() => set('validacao_admin', false)} /> Não</label>
            </div>
          </Field>
        </Section>

        {/* Seção: Datas */}
        <Section titulo="📅 Datas e Timestamps">
          <Field label="Data de Chegada">
            <input type="datetime-local" value={form.data_chegada} onChange={e => set('data_chegada', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Data Limite Entrega">
            <input type="datetime-local" value={form.data_limite_entrega} onChange={e => set('data_limite_entrega', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Repassado ao Entregador">
            <input type="datetime-local" value={form.data_repassado_entregador} onChange={e => set('data_repassado_entregador', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Retirado pelo Entregador">
            <input type="datetime-local" value={form.data_retirada_central} onChange={e => set('data_retirada_central', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Entrega Real">
            <input type="datetime-local" value={form.data_entrega_real} onChange={e => set('data_entrega_real', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Data Pagamento">
            <input type="datetime-local" value={form.data_pagamento} onChange={e => set('data_pagamento', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Data Validação Admin">
            <input type="datetime-local" value={form.data_validacao_admin} onChange={e => set('data_validacao_admin', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
        </Section>

        {/* Seção: Fotos e GPS */}
        <Section titulo="📸 Foto & GPS">
          <Field label="URL da Foto">
            <input value={form.foto} onChange={e => set('foto', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Coordenadas GPS">
            <input value={form.gps_foto} onChange={e => set('gps_foto', e.target.value)} placeholder="lat,lng" className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
        </Section>

        {/* Seção: Observações */}
        <Section titulo="📝 Observações">
          <Field label="Motivo Devolução" cols={2}>
            <textarea value={form.motivo_devolucao} onChange={e => set('motivo_devolucao', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
          <Field label="Observações" cols={2}>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg text-sm" />
          </Field>
        </Section>
      </div>

      {/* Botões */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={save} disabled={saving}
          className="flex-1 py-3 btn-primary rounded-lg font-medium disabled:opacity-50">
          {saving ? 'Salvando...' : '💾 Salvar Todas as Alterações'}
        </button>
        <button onClick={onCancel} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium hover:bg-gray-200">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Componentes Auxiliares
// ============================================================

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="content-card p-4">
      <h4 className="text-sm font-semibold text-gray-500 mb-3">{titulo}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  )
}

function Field({ label, cols, children }: { label: string; cols?: number; children: React.ReactNode }) {
  return (
    <div className={cols === 2 ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}
