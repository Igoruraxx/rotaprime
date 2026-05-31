'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

type Entregador = { id: number; nome: string; valor_padrao: number }

export default function RegistrarPage() {
  const router = useRouter()
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [valor, setValor] = useState('0,50')
  const [prazoAtivo, setPrazoAtivo] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const form = new FormData(e.currentTarget)
    const body: Record<string, unknown> = {
      nf_remessa: form.get('nf_remessa'),
      endereco_entrega: form.get('endereco_entrega'),
      descricao: form.get('descricao'),
      quantidade: form.get('quantidade') || 1,
      valor_pacote: valor.replace(',', '.'),
      observacoes: form.get('observacoes'),
      transportadora: form.get('transportadora'),
    }

    const entregadorId = form.get('entregador_id')
    if (entregadorId) body.entregador_id = entregadorId

    if (prazoAtivo && form.get('data_limite_entrega')) {
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
      router.push(`/admin/pacote/${data.pacote.codigo}`)
    } catch {
      setErro('Erro de conexão')
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
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Registrar Pacote</h2>

      {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{erro}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NF / Remessa *</label>
              <input name="nf_remessa" required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input name="quantidade" type="number" defaultValue={1} min={1} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço de Entrega *</label>
            <input name="endereco_entrega" required className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entregador</label>
              <select name="entregador_id" onChange={handleEntregadorChange} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Sem atribuição</option>
                {entregadores.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
              <input
                value={valor}
                onChange={e => setValor(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <details className="bg-white rounded-xl shadow-sm border p-4">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer">Opções adicionais</summary>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input name="descricao" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Prazo de Entrega</label>
              <input type="checkbox" checked={prazoAtivo} onChange={e => setPrazoAtivo(e.target.checked)} className="rounded border-gray-300" />
            </div>
            {prazoAtivo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Limite</label>
                <input name="data_limite_entrega" type="datetime-local" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportadora</label>
              <input name="transportadora" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
              <textarea name="observacoes" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </details>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar Pacote'}
        </button>
      </form>
    </div>
  )
}
