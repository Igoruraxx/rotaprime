import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'mensal'
  const mesParam = searchParams.get('mes') || ''
  const filtroData = searchParams.get('filtro_data') || 'chegada'

  // Calcular intervalo de datas
  let dataInicio: Date
  let dataFim: Date

  if (periodo === 'semanal') {
    dataFim = new Date()
    dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 7)
  } else if (periodo === 'quinzenal') {
    dataFim = new Date()
    dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 15)
  } else {
    // mensal — usa o mês informado ou o mês atual
    if (mesParam) {
      const [ano, mes] = mesParam.split('-').map(Number)
      dataInicio = new Date(ano, mes - 1, 1)
      dataFim = new Date(ano, mes, 0, 23, 59, 59)
    } else {
      const agora = new Date()
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
      dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59)
    }
  }

  const inicioStr = dataInicio.toISOString()
  const fimStr = dataFim.toISOString()

  // Definir qual coluna de data usar
  const colunaData = filtroData === 'entrega' ? 'data_entrega_real' : 'data_chegada'

  // Buscar pacotes do período
  const { data: pacotes, error } = await supabase
    .from('pacotes')
    .select(`
      codigo,
      data_chegada,
      data_entrega_real,
      status,
      valor_pacote,
      pago,
      data_pagamento,
      entregador_id,
      entregadores ( id, nome )
    `)
    .not(colunaData, 'is', null)
    .gte(colunaData, inicioStr)
    .lte(colunaData, fimStr)
    .order(colunaData, { ascending: false })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const lista = pacotes || []

  // Stats gerais
  const totalPacotes = lista.length
  const totalEntregues = lista.filter(p =>
    p.status === 'Entregue' || p.status === 'Validado pelo Admin'
  ).length
  const totalFalhas = lista.filter(p =>
    p.status === 'Retornado a Central'
  ).length
  const valorTotal = lista.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
  const totalPago = lista
    .filter(p => p.pago)
    .reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

  // Desempenho por entregador
  const entregadorMap = new Map<number, {
    id: number
    nome: string
    total: number
    entregues: number
    falhas: number
    valorTotal: number
    valorPago: number
  }>()

  for (const p of lista) {
    const eid = p.entregador_id
    if (!eid) continue

    if (!entregadorMap.has(eid)) {
      entregadorMap.set(eid, {
        id: eid,
        nome: ((p.entregadores as unknown as { nome: string }[] | null)?.[0]?.nome) || 'Desconhecido',
        total: 0,
        entregues: 0,
        falhas: 0,
        valorTotal: 0,
        valorPago: 0,
      })
    }

    const entry = entregadorMap.get(eid)!
    entry.total++
    if (p.status === 'Entregue' || p.status === 'Validado pelo Admin') entry.entregues++
    if (p.status === 'Retornado a Central') entry.falhas++
    entry.valorTotal += parseFloat(p.valor_pacote || '0')
    if (p.pago) entry.valorPago += parseFloat(p.valor_pacote || '0')
  }

  const desempenhoEntregadores = Array.from(entregadorMap.values())
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({
    periodo,
    dataInicio: inicioStr,
    dataFim: fimStr,
    stats: {
      totalPacotes,
      totalEntregues,
      totalFalhas,
      valorTotal: valorTotal.toFixed(2),
      totalPago: totalPago.toFixed(2),
    },
    desempenhoEntregadores,
    pacotes: lista.map(p => ({
      codigo: p.codigo,
      data_chegada: p.data_chegada,
      data_entrega_real: p.data_entrega_real,
      status: p.status,
      entregador: ((p.entregadores as unknown as { nome: string }[] | null)?.[0]?.nome) || null,
      valor_pacote: p.valor_pacote,
      pago: p.pago,
    })),
  })
}
