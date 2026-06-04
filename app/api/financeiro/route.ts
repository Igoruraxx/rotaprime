import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// ═══════════════════════════════════════════════════════════════
// GET  → Ciclo de pagamento (desde o ÚLTIMO pagamento)
//
// ?entregador_id=N  → pacotes detalhados daquele entregador
// (sem param)       → resumo de todos os entregadores
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entregadorId = searchParams.get('entregador_id')

  // ── Se pediu UM entregador específico ───────────────────────
  if (entregadorId) {
    return await getPacotesEntregador(parseInt(entregadorId))
  }

  // ── Senão, resumo de TODOS os entregadores ──────────────────
  return await getResumoTodosEntregadores()
}

async function getPacotesEntregador(entregadorId: number) {
  // 1. Dados do entregador + último pagamento
  const { data: entregador } = await supabase
    .from('entregadores')
    .select('id, nome, valor_padrao, ultimo_pagamento_em')
    .eq('id', entregadorId)
    .single()

  if (!entregador) {
    return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
  }

  const inicioCiclo = entregador.ultimo_pagamento_em
    ? new Date(entregador.ultimo_pagamento_em)
    : new Date(0)

  // 2. Pacotes entregues/validados desde o último pagamento
  const { data: pacotes } = await supabase
    .from('pacotes')
    .select('codigo, status, valor_pacote, pago, data_pagamento, data_entrega_real, data_chegada, endereco_entrega, destinatario, entregador_id')
    .eq('entregador_id', entregadorId)
    .in('status', ['Entregue', 'Validado pelo Admin'])
    .order('data_entrega_real', { ascending: false })

  const pacotesCiclo = (pacotes || []).filter(p => {
    const dataEntrega = p.data_entrega_real || p.data_chegada
    if (!dataEntrega) return false
    return new Date(dataEntrega) >= inicioCiclo
  })

  // Buscar multas deste entregador no ciclo
  const { data: multas } = await supabase
    .from('multas')
    .select('pacote_codigo, dias_atraso, valor_multa, criado_em')
    .eq('entregador_id', entregadorId)

  const totalMultas = (multas || []).reduce((acc, m) => acc + Number(m.valor_multa || 0), 0)

  const totalPacotes = pacotesCiclo.length
  const valorTotal = pacotesCiclo.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
  const jaPago = pacotesCiclo.filter(p => p.pago).reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
  const pendente = valorTotal - jaPago

  return NextResponse.json({
    entregador: {
      id: entregador.id,
      nome: entregador.nome,
      valor_padrao: entregador.valor_padrao,
      ultimo_pagamento_em: entregador.ultimo_pagamento_em,
      inicio_ciclo: inicioCiclo.getTime() === 0 ? null : inicioCiclo.toISOString(),
    },
    stats: { totalPacotes, valorTotal: valorTotal.toFixed(2), jaPago: jaPago.toFixed(2), pendente: pendente.toFixed(2), descontos: totalMultas.toFixed(2) },
    pacotes: pacotesCiclo,
    multas: multas || [],
  })
}

async function getResumoTodosEntregadores() {
  const [
    { data: entregadores },
    { data: pacotes },
  ] = await Promise.all([
    supabase.from('entregadores').select('id, nome, valor_padrao, ultimo_pagamento_em').eq('ativo', true).order('nome'),
    supabase.from('pacotes').select('codigo, status, valor_pacote, pago, entregador_id, data_entrega_real, data_chegada')
      .not('entregador_id', 'is', null)
      .in('status', ['Entregue', 'Validado pelo Admin']),
  ])

  const listaPacotes = pacotes || []
  const listaEntregadores = entregadores || []

  let totalGeralPendente = 0
  let totalGeralPago = 0

  const resumo = listaEntregadores.map(e => {
    const ultimoPagamento = e.ultimo_pagamento_em ? new Date(e.ultimo_pagamento_em) : new Date(0)
    const inicioCiclo = e.ultimo_pagamento_em ? ultimoPagamento.toISOString() : null

    const pacotesCiclo = listaPacotes.filter(p => {
      if (p.entregador_id !== e.id) return false
      const dataEntrega = p.data_entrega_real || p.data_chegada
      if (!dataEntrega) return false
      return new Date(dataEntrega) >= ultimoPagamento
    })

    const total = pacotesCiclo.length
    const valorTotal = pacotesCiclo.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
    const pago = pacotesCiclo.filter(p => p.pago).reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
    const pendente = valorTotal - pago

    totalGeralPendente += pendente
    totalGeralPago += pago

    return {
      id: e.id,
      nome: e.nome,
      valor_padrao: e.valor_padrao || 0,
      ultimo_pagamento_em: e.ultimo_pagamento_em,
      inicio_ciclo: inicioCiclo,
      total,
      valor_total: valorTotal.toFixed(2),
      pago: pago.toFixed(2),
      pendente: pendente.toFixed(2),
      tem_pendencia: pendente > 0,
    }
  })

  return NextResponse.json({
    stats: {
      totalPendente: totalGeralPendente.toFixed(2),
      totalPago: totalGeralPago.toFixed(2),
      totalEntregadores: resumo.length,
    },
    resumo: resumo.filter(e => e.total > 0 || e.ultimo_pagamento_em),
  })
}

// ═══════════════════════════════════════════════════════════════
// POST → Pagar (entregador específico ou lote)
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { acao, entregador_id, valor_pago, forma_pagamento } = body

    if (acao === 'pagar-entregador') {
      return await pagarEntregador(entregador_id, valor_pago, forma_pagamento)
    }
    if (acao === 'pagar-lote') {
      return await pagarLote(body)
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar' }, { status: 500 })
  }
}

async function pagarEntregador(entregadorId: number, valorPago?: string, formaPagamento?: string) {
  if (!entregadorId) {
    return NextResponse.json({ erro: 'Informe o entregador' }, { status: 400 })
  }

  // 1. Buscar entregador + último pagamento
  const { data: entregador } = await supabase
    .from('entregadores')
    .select('id, nome, valor_padrao, ultimo_pagamento_em')
    .eq('id', entregadorId)
    .single()

  if (!entregador) {
    return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
  }

  const inicioCiclo = entregador.ultimo_pagamento_em
    ? new Date(entregador.ultimo_pagamento_em)
    : new Date(0)

  const agora = new Date()
  const agoraISO = agora.toISOString()

  // 2. Buscar pacotes do ciclo que ainda NÃO foram pagos
  const { data: todosPacotes } = await supabase
    .from('pacotes')
    .select('codigo, status, valor_pacote, pago, data_entrega_real, data_chegada')
    .eq('entregador_id', entregadorId)
    .in('status', ['Entregue', 'Validado pelo Admin'])
    .eq('pago', false)
    .order('data_entrega_real', { ascending: false })

  const pacotesPagar = (todosPacotes || []).filter(p => {
    const dataEntrega = p.data_entrega_real || p.data_chegada
    if (!dataEntrega) return false
    return new Date(dataEntrega) >= inicioCiclo
  })

  if (pacotesPagar.length === 0) {
    return NextResponse.json({ erro: 'Nenhum pacote pendente para este entregador' }, { status: 400 })
  }

  const totalEntregues = pacotesPagar.length
  const totalValor = pacotesPagar.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
  const valorEfetivo = valorPago ? parseFloat(valorPago.replace(',', '.')) : totalValor

  // 3. Marcar pacotes como pago
  const codigos = pacotesPagar.map(p => p.codigo)
  const { error: errPagar } = await supabase
    .from('pacotes')
    .update({ pago: true, data_pagamento: agoraISO })
    .in('codigo', codigos)

  if (errPagar) {
    return NextResponse.json({ erro: errPagar.message }, { status: 500 })
  }

  // 4. Registrar no histórico pagamentos_entregador
  const { error: errInsert } = await supabase
    .from('pagamentos_entregador')
    .insert({
      entregador_id: entregadorId,
      data_inicio: inicioCiclo.getTime() === 0
        ? agora.toISOString().split('T')[0]
        : inicioCiclo.toISOString().split('T')[0],
      data_fim: agora.toISOString().split('T')[0],
      total_entregues: totalEntregues,
      total_valor: totalValor,
      valor_pago: valorEfetivo,
      forma_pagamento: formaPagamento || 'Dinheiro',
      data_pagamento: agoraISO,
    })

  if (errInsert) {
    return NextResponse.json({ erro: errInsert.message }, { status: 500 })
  }

  // 5. Atualizar ultimo_pagamento_em do entregador → RESETA O CICLO
  const { error: errUpdate } = await supabase
    .from('entregadores')
    .update({ ultimo_pagamento_em: agoraISO })
    .eq('id', entregadorId)

  if (errUpdate) {
    return NextResponse.json({ erro: errUpdate.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    mensagem: `💰 Pagamento registrado! ${totalEntregues} entrega(s) · ${valorEfetivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    atualizados: totalEntregues,
    valor_pago: valorEfetivo.toFixed(2),
  })
}

async function pagarLote(body: any) {
  // Ação em lote: múltiplos códigos (legado / individual)
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

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    atualizados: data?.length || 0,
    mensagem: `${data?.length || 0} pacote(s) pagos!`,
  })
}
