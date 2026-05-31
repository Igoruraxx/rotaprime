'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Entregador = {
  id: number
  nome: string
  ativo: boolean
  valor_padrao: number
  telefone: string
  criado_em: string
  ultimo_pagamento_em: string | null
  pacotes: Pacote[]
}

type Pacote = {
  codigo: string
  data_chegada: string
  status: string
  valor_pacote: number
  pago: boolean
  endereco_entrega: string
}

export default function EntregadorDetalhePage() {
  const params = useParams()
  const [entregador, setEntregador] = useState<Entregador | null>(null)

  useEffect(() => {
    fetch(`/api/entregadores/${params.id}`)
      .then(r => r.json())
      .then(data => setEntregador(data.entregador))
  }, [params.id])

  if (!entregador) return <div className="text-gray-500">Carregando...</div>

  const pacotes = entregador.pacotes || []
  const total = pacotes.length
  const entregues = pacotes.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
  const valorTotal = pacotes.reduce((acc, p) => acc + (p.valor_pacote || 0), 0)
  const valorPago = pacotes.filter(p => p.pago).reduce((acc, p) => acc + (p.valor_pacote || 0), 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/entregadores" className="text-gray-500 hover:text-gray-700 text-sm">← Voltar</a>
        <h2 className="text-2xl font-bold text-gray-800">{entregador.nome}</h2>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entregador.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {entregador.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pacotes', value: total, color: 'bg-blue-500' },
          { label: 'Entregues', value: entregues, color: 'bg-green-500' },
          { label: 'Valor Total', value: `R$ ${valorTotal.toFixed(2)}`, color: 'bg-purple-500' },
          { label: 'Valor Pago', value: `R$ ${valorPago.toFixed(2)}`, color: 'bg-emerald-500' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border p-4">
            <div className={`w-3 h-3 rounded-full ${card.color} mb-2`} />
            <p className="text-xl font-bold text-gray-800">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Telefone:</span> <span className="font-medium">{entregador.telefone || '—'}</span></div>
          <div><span className="text-gray-500">Valor Padrão:</span> <span className="font-medium">R$ {entregador.valor_padrao.toFixed(2)}</span></div>
          <div><span className="text-gray-500">Cadastro:</span> <span className="font-medium">{new Date(entregador.criado_em).toLocaleDateString('pt-BR')}</span></div>
          <div><span className="text-gray-500">Último Pagamento:</span> <span className="font-medium">{entregador.ultimo_pagamento_em ? new Date(entregador.ultimo_pagamento_em).toLocaleDateString('pt-BR') : 'Nunca'}</span></div>
          {entregador.telefone && (
            <div>
              <a
                href={`https://wa.me/${entregador.telefone.replace(/\D/g, '')}`}
                target="_blank"
                className="text-green-600 hover:underline font-medium"
              >
                📱 WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Pacotes do Entregador */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-3 border-b bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-700">Pacotes ({pacotes.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Código</th>
                <th className="p-3">Data</th>
                <th className="p-3">Status</th>
                <th className="p-3">Endereço</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Pago</th>
              </tr>
            </thead>
            <tbody>
              {pacotes.map(p => (
                <tr key={p.codigo} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3">
                    <a href={`/admin/pacote/${p.codigo}`} className="text-blue-600 hover:underline font-medium">{p.codigo}</a>
                  </td>
                  <td className="p-3 text-gray-600">{new Date(p.data_chegada).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{p.status}</span>
                  </td>
                  <td className="p-3 text-gray-600 max-w-[200px] truncate">{p.endereco_entrega}</td>
                  <td className="p-3 text-gray-600">R$ {(p.valor_pacote || 0).toFixed(2)}</td>
                  <td className="p-3">{p.pago ? '✅' : '❌'}</td>
                </tr>
              ))}
              {pacotes.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">Nenhum pacote vinculado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
