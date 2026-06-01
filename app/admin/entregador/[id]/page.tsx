'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

type Entregador = {
  id: number
  nome: string
  ativo: boolean
  valor_padrao: number
  telefone: string
  criado_em: string
  ultimo_pagamento_em: string | null
  cpf?: string
  chave_pix?: string
  banco_pagamento?: string
  carteira_motorista?: string
  pacotes: Pacote[]
}

type Pacote = {
  codigo: string
  data_chegada: string
  status: string
  pago: boolean
  destinatario: string
}

type FiltroData = 'hoje' | 'ontem' | 'semana' | 'quinzena' | 'tudo'

const FILTROS: { key: FiltroData; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: 'semana', label: 'Semana' },
  { key: 'quinzena', label: 'Quinzena' },
  { key: 'tudo', label: 'Tudo' },
]

function calcularFiltro(filtro: FiltroData): { data_ini?: string; data_fim?: string } {
  const agora = new Date()
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59).toISOString()

  switch (filtro) {
    case 'hoje': {
      const ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString()
      return { data_ini: ini, data_fim: fim }
    }
    case 'ontem': {
      const ontem = new Date(agora)
      ontem.setDate(ontem.getDate() - 1)
      const ini = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate()).toISOString()
      const f = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59).toISOString()
      return { data_ini: ini, data_fim: f }
    }
    case 'semana': {
      const semana = new Date(agora)
      semana.setDate(semana.getDate() - 7)
      return { data_ini: semana.toISOString(), data_fim: fim }
    }
    case 'quinzena': {
      const quinzena = new Date(agora)
      quinzena.setDate(quinzena.getDate() - 15)
      return { data_ini: quinzena.toISOString(), data_fim: fim }
    }
    default:
      return {}
  }
}

const STATUS_CORES: Record<string, string> = {
  'Recebido pela Central': 'bg-gray-100 text-gray-500 border border-gray-200',
  'Aguardando Retirada': 'bg-amber-500 text-white',
  'Retirado pelo Entregador': 'bg-blue-500 text-white',
  'Em Rota': 'bg-indigo-500 text-white',
  'Entregue': 'bg-emerald-500 text-white',
  'Retornado a Central': 'bg-red-500 text-white',
  'Validado pelo Admin': 'bg-emerald-500 text-white',
}

export default function EntregadorDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const [entregador, setEntregador] = useState<Entregador | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<FiltroData>('tudo')

  function carregar(f: FiltroData) {
    setLoading(true)
    const paramsData = calcularFiltro(f)
    let url = `/api/entregadores/${params.id}`
    if (paramsData.data_ini) url += `?data_ini=${encodeURIComponent(paramsData.data_ini)}`
    if (paramsData.data_fim) url += `&data_fim=${encodeURIComponent(paramsData.data_fim)}`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setEntregador(data.entregador)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => carregar(filtro), [params.id, filtro])

  function selecionarFiltro(f: FiltroData) {
    setFiltro(f)
  }

  if (!entregador) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">Carregando...</div>
      </div>
    )
  }

  const pacotes = entregador.pacotes || []
  const totalPacotes = pacotes.length
  const entregues = pacotes.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
  const valorTotal = totalPacotes * (entregador.valor_padrao || 0)
  const valorPago = pacotes
    .filter(p => p.pago)
    .reduce((acc, p) => acc + (entregador.valor_padrao || 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => router.push('/admin/entregadores')} className="text-gray-500 hover:text-gray-700 text-sm">← Voltar</button>
        <h2 className="text-2xl font-bold text-gray-900">{entregador.nome}</h2>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
          entregador.ativo ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${entregador.ativo ? 'bg-emerald-400' : 'bg-gray-300'}`} />
          {entregador.ativo ? 'Ativo' : 'Inativo'}
        </span>
        <span className="text-xs text-gray-400">Cadastro: {new Date(entregador.criado_em).toLocaleDateString('pt-BR')}</span>
      </div>

      {/* Informações do perfil */}
      <div className="content-card p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-gray-500">Valor Padrão:</span>
              <span className="font-medium ml-1">R$ {entregador.valor_padrao.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">Telefone:</span>
              <span className="font-medium ml-1">{entregador.telefone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Último Pagamento:</span>
              <span className="font-medium ml-1">
                {entregador.ultimo_pagamento_em
                  ? new Date(entregador.ultimo_pagamento_em).toLocaleString('pt-BR')
                  : 'Nunca'}
              </span>
            </div>
          </div>
          <div className="w-full border-t border-gray-100 pt-3 mt-2" />
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div><span className="text-gray-500">CPF:</span><span className="font-medium ml-1">{entregador.cpf || '—'}</span></div>
            <div><span className="text-gray-500">Chave PIX:</span><span className="font-medium ml-1">{entregador.chave_pix || '—'}</span></div>
            <div><span className="text-gray-500">Banco:</span><span className="font-medium ml-1">{entregador.banco_pagamento || '—'}</span></div>
            <div><span className="text-gray-500">CNH:</span><span className="font-medium ml-1">{entregador.carteira_motorista || '—'}</span></div>
          </div>
          {entregador.telefone && (
            <a
              href={`https://wa.me/${entregador.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              <span>📱</span> WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Filtro de Data */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-500 font-medium mr-1">Filtrar por:</span>
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => selecionarFiltro(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filtro === f.key
                ? 'bg-violet-600/80 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Atualizando dados...</div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <CardResumo
              icone="📦"
              label="Total Pacotes"
              valor={totalPacotes}
              cor="from-violet-600/30 to-violet-500/20"
              formatar={false}
            />
            <CardResumo
              icone="✅"
              label="Entregues"
              valor={entregues}
              cor="from-emerald-600/30 to-emerald-500/20"
              formatar={false}
            />
            <CardResumo
              icone="💰"
              label="Valor Total"
              valor={valorTotal}
              cor="from-violet-600/40 to-purple-500/25"
              formatar={true}
            />
            <CardResumo
              icone="💳"
              label="Valor Pago"
              valor={valorPago}
              cor="from-emerald-600/40 to-emerald-500/25"
              formatar={true}
              extra={
                entregador.ultimo_pagamento_em
                  ? `Último pagamento: ${new Date(entregador.ultimo_pagamento_em).toLocaleDateString('pt-BR')}`
                  : undefined
              }
            />
          </div>

          {/* Lista de Pacotes */}
          <div className="content-card overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Pacotes {filtro !== 'tudo' ? `(${totalPacotes} no período)` : `(${totalPacotes} total)`}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 bg-gray-50">
                    <th className="p-3 pl-5 font-medium">Código</th>
                    <th className="p-3 font-medium">Data</th>
                    <th className="p-3 font-medium">Destinatário</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Valor</th>
                    <th className="p-3 pr-5 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {pacotes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-400">
                        {filtro !== 'tudo'
                          ? 'Nenhum pacote neste período'
                          : 'Nenhum pacote vinculado a este entregador'}
                      </td>
                    </tr>
                  ) : (
                    pacotes.map(p => (
                      <tr
                        key={p.codigo}
                        onClick={() => router.push(`/admin/pacote/${p.codigo}`)}
                        className="border-b border-gray-200 last:border-0 hover:bg-violet-50 transition cursor-pointer"
                      >
                        <td className="p-3 pl-5">
                          <span className="font-medium text-violet-600">{p.codigo}</span>
                        </td>
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {new Date(p.data_chegada).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 text-gray-500 max-w-[180px] truncate">
                          {p.destinatario || '—'}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CORES[p.status] || 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          R$ {(entregador.valor_padrao || 0).toFixed(2)}
                        </td>
                        <td className="p-3 pr-5">
                          {p.pago ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <span>✅</span> Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
                              <span>❌</span> Pendente
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// CARD DE RESUMO
// ============================================================
function CardResumo({
  icone, label, valor, cor, formatar, extra
}: {
  icone: string
  label: string
  valor: number
  cor: string
  formatar: boolean
  extra?: string
}) {
  return (
    <div className="content-card p-4 flex flex-col relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full bg-gradient-to-br ${cor} opacity-5`} />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icone}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {formatar ? `R$ ${valor.toFixed(2)}` : valor}
      </p>
      {extra && (
        <p className="text-gray-400 text-xs">{extra}</p>
      )}
    </div>
  )
}
