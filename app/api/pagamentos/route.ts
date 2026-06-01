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

  const inicioFiltro = dataIni ? new Date(dataIni).toISOString() : ''
  const fimFiltro = dataFim ? new Date(dataFim + 'T23:59:59').toISOString() : ''

  const [
    { data: entregadores },
    { data: pacotes },
    { data: historicoDb },
  ] = await Promise.all([
    supabase.from('entregadores').select('id, nome, ativo, valor_padrao, ultimo_pagamento_em').eq('ativo', true).order('nome'),
    supabase.from('pacotes').select('codigo, status, valor_pacote, entregador_id, data_entrega_real, data_chegada').not('entregador_id', 'is', null),
    supabase.from('pagamentos_entregador')
      .select('*, entregadores!inner(nome)')
      .order('data_pagamento', { ascending: false })
      .limit(50),
  ])

  const listaPacotes = pacotes || []
  const listaEntregadores = entregadores || []
  const historico = (historicoDb || []).map((h: any) => ({
    id: h.id,
    entregador_id: h.entregador_id,
    entregador_nome: (h.entregadores as unknown as { nome: string }[] | null)?.[0]?.nome || 'Desconhecido',
    data_inicio: h.data_inicio,
    data_fim: h.data_fim,
    total_entregues: h.total_entregues,
    total_valor: h.total_valor,
    valor_pago: h.valor_pago,
    forma_pagamento: h.forma_pagamento || 'Dinheiro',
    data_pagamento: h.data_pagamento,
  }))

  // Calcular ciclo de cada entregador
  const ciclos = listaEntregadores.map(e => {
    const ultimoPagamento = e.ultimo_pagamento_em
      ? new Date(e.ultimo_pagamento_em)
      : null

    const inicioCiclo = ultimoPagamento || new Date(0) // se nunca pagou, desde o início

    // Pacotes entregues/validados desde o último pagamento
    const pacotesCiclo = listaPacotes.filter(p => {
      if (p.entregador_id !== e.id) return false
      if (p.status !== 'Entregue' && p.status !== 'Validado pelo Admin') return false
      const dataEntrega = p.data_entrega_real || p.data_chegada
      if (!dataEntrega) return false
      return new Date(dataEntrega) >= inicioCiclo
    })

    const totalEntregues = pacotesCiclo.length
    const valorTotal = pacotesCiclo.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

    return {
      id: e.id,
      nome: e.nome,
      valor_padrao: e.valor_padrao || 0,
      ultimo_pagamento_em: e.ultimo_pagamento_em,
      inicio_ciclo: ultimoPagamento ? ultimoPagamento.toISOString() : null,
      total_entregues: totalEntregues,
      valor_total: valorTotal.toFixed(2),
    }
  })

  // Filtrar histórico por período se informado
  const historicoFiltrado = (inicioFiltro && fimFiltro)
    ? historico.filter(h => {
        const d = new Date(h.data_pagamento)
        return d >= new Date(inicioFiltro) && d <= new Date(fimFiltro)
      })
    : historico

  return NextResponse.json({
    ciclos: ciclos.filter(c => c.total_entregues > 0 || c.ultimo_pagamento_em),
    historico: historicoFiltrado,
  })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { entregador_id, data_inicio, data_fim, total_entregues, total_valor, valor_pago, forma_pagamento } = body

    if (!entregador_id || !total_entregues || !total_valor || !valor_pago) {
      return NextResponse.json({ erro: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const agora = new Date()

    // 1. Inserir no histórico
    const { error: insertError } = await supabase
      .from('pagamentos_entregador')
      .insert({
        entregador_id: parseInt(entregador_id),
        data_inicio: data_inicio || new Date(0).toISOString().split('T')[0],
        data_fim: agora.toISOString().split('T')[0],
        total_entregues: parseInt(total_entregues),
        total_valor: parseFloat(total_valor),
        valor_pago: parseFloat(valor_pago),
        forma_pagamento: forma_pagamento || 'Dinheiro',
        data_pagamento: agora.toISOString(),
      })

    if (insertError) {
      return NextResponse.json({ erro: insertError.message }, { status: 500 })
    }

    // 2. Atualizar ultimo_pagamento_em do entregador
    const { error: updateError } = await supabase
      .from('entregadores')
      .update({ ultimo_pagamento_em: agora.toISOString() })
      .eq('id', parseInt(entregador_id))

    if (updateError) {
      return NextResponse.json({ erro: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensagem: `Pagamento registrado para ${total_entregues} entrega(s) — ${parseFloat(valor_pago).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao registrar pagamento' }, { status: 500 })
  }
}
