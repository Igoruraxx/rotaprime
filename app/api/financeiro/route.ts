import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const dataIni = searchParams.get('data_ini') || ''
  const dataFim = searchParams.get('data_fim') || ''

  const inicio = dataIni ? new Date(dataIni).toISOString() : ''
  const fim = dataFim ? new Date(dataFim + 'T23:59:59').toISOString() : ''

  function dateFilter(q: any) {
    if (inicio && fim) return q.gte('data_chegada', inicio).lte('data_chegada', fim)
    return q
  }

  const [
    { data: entregadores },
    { data: pacotes },
  ] = await Promise.all([
    supabase.from('entregadores').select('id, nome, valor_padrao').eq('ativo', true).order('nome'),
    dateFilter(
      supabase
        .from('pacotes')
        .select('codigo, status, valor_pacote, pago, data_pagamento, data_chegada, entregador_id, entregadores(nome)')
    ) as Promise<{ data: any[] | null }>,
  ])

  const lista = pacotes || []
  const listaEntregadores = entregadores || []

  // Cards
  let totalPendenteR$ = 0
  let totalPagoR$ = 0

  for (const p of lista) {
    const valor = parseFloat(p.valor_pacote || '0')
    if (p.status === 'Entregue' || p.status === 'Validado pelo Admin') {
      if (p.pago) totalPagoR$ += valor
      else totalPendenteR$ += valor
    }
  }

  // Resumo por entregador
  const entregadorMap = new Map<number, {
    id: number
    nome: string
    valor_padrao: number
    total: number
    entregues: number
    valorTotal: number
    pago: number
    pendente: number
  }>()

  for (const e of listaEntregadores) {
    entregadorMap.set(e.id, {
      id: e.id,
      nome: e.nome,
      valor_padrao: e.valor_padrao || 0,
      total: 0,
      entregues: 0,
      valorTotal: 0,
      pago: 0,
      pendente: 0,
    })
  }

  for (const p of lista) {
    const eid = p.entregador_id
    if (!eid || !entregadorMap.has(eid)) continue
    const entry = entregadorMap.get(eid)!
    entry.total++
    const valor = parseFloat(p.valor_pacote || '0')
    if (p.status === 'Entregue' || p.status === 'Validado pelo Admin') {
      entry.entregues++
      entry.valorTotal += valor
      if (p.pago) entry.pago += valor
      else entry.pendente += valor
    }
  }

  const resumoEntregadores = Array.from(entregadorMap.values())
    .filter(e => e.total > 0 || e.entregues > 0)
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({
    data_ini: inicio,
    data_fim: fim,
    stats: {
      totalPendente: totalPendenteR$.toFixed(2),
      totalPago: totalPagoR$.toFixed(2),
    },
    resumoEntregadores,
    pacotes: lista,
    entregadores: listaEntregadores,
  })
}

// ==================== POST ====================

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { acao } = body

    if (acao === 'pagar-periodo') {
      return await pagarPeriodo(body)
    }
    if (acao === 'pagar-entregador') {
      return await pagarEntregador(body)
    }
    if (acao === 'pagar-pacote') {
      return await pagarPacote(body)
    }
    if (acao === 'pagar-lote') {
      return await pagarLote(body)
    }
    if (acao === 'estornar') {
      return await estornar(body)
    }
    if (acao === 'editar-valor') {
      return await editarValor(body)
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 })
  }
}

async function pagarPeriodo(body: any) {
  const { data_ini, data_fim } = body
  if (!data_ini || !data_fim) {
    return NextResponse.json({ erro: 'Informe data início e fim' }, { status: 400 })
  }

  const inicio = new Date(data_ini).toISOString()
  const fim = new Date(data_fim + 'T23:59:59').toISOString()
  const agora = new Date().toISOString()

  const { data, error } = await supabase
    .from('pacotes')
    .update({ pago: true, data_pagamento: agora })
    .in('status', ['Entregue', 'Validado pelo Admin'])
    .eq('pago', false)
    .gte('data_chegada', inicio)
    .lte('data_chegada', fim)
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    atualizados: data?.length || 0,
    mensagem: `${data?.length || 0} pacote(s) pagos com sucesso!`
  })
}

async function pagarEntregador(body: any) {
  const { entregador_id, data_ini, data_fim } = body
  if (!entregador_id || !data_ini || !data_fim) {
    return NextResponse.json({ erro: 'Informe entregador, data início e fim' }, { status: 400 })
  }

  const inicio = new Date(data_ini).toISOString()
  const fim = new Date(data_fim + 'T23:59:59').toISOString()
  const agora = new Date().toISOString()

  const { data, error } = await supabase
    .from('pacotes')
    .update({ pago: true, data_pagamento: agora })
    .eq('entregador_id', parseInt(entregador_id))
    .in('status', ['Entregue', 'Validado pelo Admin'])
    .eq('pago', false)
    .gte('data_chegada', inicio)
    .lte('data_chegada', fim)
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    atualizados: data?.length || 0,
    mensagem: `${data?.length || 0} pacote(s) pagos para o entregador!`
  })
}

async function pagarPacote(body: any) {
  const { codigos } = body
  if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
    return NextResponse.json({ erro: 'Informe pelo menos um código' }, { status: 400 })
  }

  const agora = new Date().toISOString()
  const { data, error } = await supabase
    .from('pacotes')
    .update({ pago: true, data_pagamento: agora })
    .in('codigo', codigos)
    .in('status', ['Entregue', 'Validado pelo Admin'])
    .eq('pago', false)
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    atualizados: data?.length || 0,
    mensagem: `${data?.length || 0} pacote(s) pagos!`
  })
}

async function pagarLote(body: any) {
  return await pagarPacote(body)
}

async function estornar(body: any) {
  const { codigos } = body
  if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
    return NextResponse.json({ erro: 'Informe pelo menos um código' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pacotes')
    .update({ pago: false, data_pagamento: null })
    .in('codigo', codigos)
    .select()

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    atualizados: data?.length || 0,
    mensagem: `${data?.length || 0} estorno(s) realizado(s)!`
  })
}

async function editarValor(body: any) {
  const { codigo, valor_pacote } = body
  if (!codigo || !valor_pacote) {
    return NextResponse.json({ erro: 'Informe código e valor' }, { status: 400 })
  }

  const { error } = await supabase
    .from('pacotes')
    .update({ valor_pacote: parseFloat(valor_pacote) })
    .eq('codigo', codigo)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, mensagem: 'Valor atualizado!' })
}
