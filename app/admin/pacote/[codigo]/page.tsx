'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
  transportadora: string
  foto: string
  gps_foto: string
  entregadores: { nome: string; telefone: string } | null
}

export default function PacoteDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [pacote, setPacote] = useState<Pacote | null>(null)
  const [entregadores, setEntregadores] = useState<{ id: number; nome: string }[]>([])
  const [showEdit, setShowEdit] = useState(false)

  function carregar() {
    fetch(`/api/pacotes/${params.codigo}`)
      .then(r => r.json())
      .then(data => setPacote(data.pacote))

    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }

  useEffect(carregar, [params.codigo])

  async function acao(tipo: string, extra?: Record<string, unknown>) {
    const body: Record<string, unknown> = { ...extra }
    
    switch (tipo) {
      case 'atribuir':
      case 'repassar':
        body.entregador_id = (document.getElementById('entregador_select') as HTMLSelectElement)?.value
        if (tipo === 'repassar') {
          body.status = 'Aguardando Retirada'
          body.data_repassado_entregador = new Date().toISOString()
        }
        break
      case 'validar':
        body.validacao_admin = true
        body.data_validacao_admin = new Date().toISOString()
        body.status = 'Validado pelo Admin'
        break
      case 'pagar':
        body.pago = true
        body.data_pagamento = new Date().toISOString()
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

    if (res.ok) carregar()
  }

  if (!pacote) return <div className="text-gray-500">Carregando...</div>

  const dados = [
    { label: 'NF / Remessa', value: pacote.nf_remessa || '—' },
    { label: 'Status', value: pacote.status },
    { label: 'Descrição', value: pacote.descricao || '—' },
    { label: 'Quantidade', value: pacote.quantidade },
    { label: 'Endereço', value: pacote.endereco_entrega },
    { label: 'Data Limite', value: pacote.data_limite_entrega ? new Date(pacote.data_limite_entrega).toLocaleString('pt-BR') : '—' },
    { label: 'Entregador', value: pacote.entregadores?.nome || '—' },
    { label: 'Valor', value: `R$ ${(pacote.valor_pacote || 0).toFixed(2)}` },
    { label: 'Pago', value: pacote.pago ? '✅ Sim' : '❌ Não' },
    { label: 'Data Pagamento', value: pacote.data_pagamento ? new Date(pacote.data_pagamento).toLocaleString('pt-BR') : '—' },
    { label: 'Repassado em', value: pacote.data_repassado_entregador ? new Date(pacote.data_repassado_entregador).toLocaleString('pt-BR') : '—' },
    { label: 'Retirado em', value: pacote.data_retirada_central ? new Date(pacote.data_retirada_central).toLocaleString('pt-BR') : '—' },
    { label: 'Entrega Real', value: pacote.data_entrega_real ? new Date(pacote.data_entrega_real).toLocaleString('pt-BR') : '—' },
    { label: 'Tentativas', value: pacote.tentativa_atual || 0 },
    { label: 'Validado', value: pacote.validacao_admin ? '✅ Sim' : '⏳ Não' },
    { label: 'Motivo Devolução', value: pacote.motivo_devolucao || '—' },
    { label: 'Observações', value: pacote.observacoes || '—' },
    { label: 'Transportadora', value: pacote.transportadora || '—' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">← Voltar</button>
        <h2 className="text-2xl font-bold text-gray-800">{pacote.codigo}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-4 space-y-3">
          {dados.map(d => (
            <div key={d.label} className="flex justify-between border-b pb-2 last:border-0">
              <span className="text-sm text-gray-500">{d.label}</span>
              <span className="text-sm font-medium text-gray-800">{String(d.value)}</span>
            </div>
          ))}
        </div>

        {/* Ações */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Ações</h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <select id="entregador_select" className="flex-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Selecionar entregador</option>
                  {entregadores.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => acao('atribuir')} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Atribuir</button>
              <button onClick={() => acao('repassar')} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Repassar Agora</button>

              {pacote.status === 'Entregue' && !pacote.validacao_admin && (
                <button onClick={() => acao('validar')} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">✅ Validar Entrega</button>
              )}

              {!pacote.pago && (
                <button onClick={() => acao('pagar')} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">💰 Marcar como Pago</button>
              )}
              {pacote.pago && (
                <button onClick={() => acao('estornar')} className="w-full py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600">↩️ Estornar Pagamento</button>
              )}

              <button onClick={() => acao('reiniciar')} className="w-full py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">🔄 Reiniciar Pacote</button>

              <button onClick={() => setShowEdit(!showEdit)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                ✏️ {showEdit ? 'Fechar' : 'Editar Pacote'}
              </button>
            </div>
          </div>

          {/* Foto */}
          {pacote.foto && (
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-gray-800 mb-2">📸 Foto da Entrega</h3>
              <img src={pacote.foto} alt="Foto" className="w-full rounded-lg mb-2" />
              {pacote.gps_foto && (
                <a href={`https://www.google.com/maps?q=${pacote.gps_foto}`} target="_blank" className="text-blue-600 text-sm hover:underline">
                  📍 Ver no Maps
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edição inline */}
      {showEdit && (
        <EditForm codigo={pacote.codigo} pacote={pacote} onSave={carregar} />
      )}
    </div>
  )
}

function EditForm({ codigo, pacote, onSave }: { codigo: string; pacote: Pacote; onSave: () => void }) {
  const [form, setForm] = useState({
    nf_remessa: pacote.nf_remessa || '',
    endereco_entrega: pacote.endereco_entrega || '',
    descricao: pacote.descricao || '',
    valor_pacote: (pacote.valor_pacote || 0).toString(),
    observacoes: pacote.observacoes || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await fetch(`/api/pacotes/${codigo}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-4 mt-4">
      <h3 className="font-semibold text-gray-800 mb-3">✏️ Editar Pacote</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">NF</label>
          <input value={form.nf_remessa} onChange={e => setForm({ ...form, nf_remessa: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
          <input value={form.valor_pacote} onChange={e => setForm({ ...form, valor_pacote: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
          <input value={form.endereco_entrega} onChange={e => setForm({ ...form, endereco_entrega: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>
      <button onClick={save} disabled={saving} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}
