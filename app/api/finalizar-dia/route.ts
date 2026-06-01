import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { featureAtiva } from '@/lib/features'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
  const inicioOntem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1).toISOString()
  const fimOntem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1, 23, 59, 59).toISOString()

  const [
    { data: pacotesHoje },
    { data: entregadores },
    { data: finalizadosHoje },
    { data: historicoGeral },
    { data: historicoEntregadores },
    { count: ontemFinalizado },
  ] = await Promise.all([
    supabase
      .from('pacotes')
      .select('*, entregadores(nome)')
      .gte('data_chegada', inicioHoje)
      .lte('data_chegada', fimHoje),

    supabase.from('entregadores').select('id, nome, valor_padrao, ativo').eq('ativo', true).order('nome'),

    supabase
      .from('finalizacao_dia')
      .select('*')
      .gte('data', inicioHoje)
      .lte('data', fimHoje),

    supabase
      .from('finalizacao_dia')
      .select('*')
      .order('data', { ascending: false })
      .limit(30),

    supabase
      .from('finalizacao_dia_entregador')
      .select('*, entregadores!inner(nome)')
      .order('data', { ascending: false })
      .limit(50),

    supabase
      .from('finalizacao_dia')
      .select('*', { count: 'exact', head: true })
      .gte('data', inicioOntem)
      .lte('data', fimOntem),
  ])

  const lista = pacotesHoje || []
  const totalRegistrados = lista.length
  const totalEntregues = lista.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
  const totalPendentes = lista.filter(p => p.status !== 'Entregue' && p.status !== 'Validado pelo Admin').length
  const jaFinalizadoHoje = (finalizadosHoje || []).length > 0
  const ontemPrecisaFinalizar = (ontemFinalizado || 0) === 0

  // Resumo por entregador
  const resumoEntregadores = (entregadores || []).map(e => {
    const pEntregador = lista.filter(p => p.entregador_id === e.id)
    const entregues = pEntregador.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
    const falhas = pEntregador.filter(p => p.status === 'Retornado a Central')
    const valorTotal = entregues.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

    return {
      id: e.id,
      nome: e.nome,
      valor_padrao: e.valor_padrao || 0,
      total: pEntregador.length,
      entregues: entregues.length,
      falhas: falhas.length,
      valor_total: valorTotal.toFixed(2),
    }
  }).filter(e => e.total > 0)

  return NextResponse.json({
    data: hoje.toISOString().split('T')[0],
    jaFinalizadoHoje,
    stats: { totalRegistrados, totalEntregues, totalPendentes },
    resumoEntregadores,
    historicoGeral: historicoGeral || [],
    historicoEntregadores: (historicoEntregadores || []).map((h: any) => ({
      ...h,
      entregador_nome: (h.entregadores as unknown as { nome: string }[] | null)?.[0]?.nome || 'Desconhecido',
    })),
    precisaAutoFinalizar: ontemPrecisaFinalizar,
  })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { auto } = body

    const hoje = new Date()
    // Se for auto-finalização, finaliza ontem
    // Se for manual, finaliza hoje
    const dataFinalizar = auto
      ? new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1)
      : hoje

    const inicioStr = new Date(dataFinalizar.getFullYear(), dataFinalizar.getMonth(), dataFinalizar.getDate()).toISOString()
    const fimStr = new Date(dataFinalizar.getFullYear(), dataFinalizar.getMonth(), dataFinalizar.getDate(), 23, 59, 59).toISOString()
    const dataStr = dataFinalizar.toISOString().split('T')[0]

    // Verificar se já foi finalizado
    const { data: existente } = await supabase
      .from('finalizacao_dia')
      .select('id')
      .eq('data', dataStr)
      .limit(1)

    if (existente && existente.length > 0) {
      return NextResponse.json({ ok: true, mensagem: `Dia ${dataStr} já finalizado anteriormente` })
    }

    // Buscar pacotes do dia
    const { data: pacotes } = await supabase
      .from('pacotes')
      .select('*, entregadores!inner(id, nome)')
      .gte('data_chegada', inicioStr)
      .lte('data_chegada', fimStr)

    const lista = pacotes || []
    const totalRegistrados = lista.length
    const totalEntregues = lista.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
    const totalFalhas = lista.filter(p => p.status === 'Retornado a Central').length
    const valorTotal = lista
      .filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
      .reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

    // 1. Inserir finalização geral
    const { error: errGeral } = await supabase
      .from('finalizacao_dia')
      .insert({
        data: dataStr,
        total_pacotes: totalRegistrados,
        total_entregues: totalEntregues,
        total_falhas: totalFalhas,
        valor_total: valorTotal.toFixed(2),
      })

    if (errGeral) {
      return NextResponse.json({ erro: errGeral.message }, { status: 500 })
    }

    // 2. Inserir finalizações por entregador
    const entregadorMap = new Map<number, { nome: string; total: number; entregues: number; falhas: number; valorTotal: number }>()

    for (const p of lista) {
      const eid = p.entregador_id
      if (!eid) continue

      if (!entregadorMap.has(eid)) {
        const nome = ((p.entregadores as unknown as { nome: string }[])?.[0]?.nome) || 'Desconhecido'
        entregadorMap.set(eid, { nome, total: 0, entregues: 0, falhas: 0, valorTotal: 0 })
      }

      const entry = entregadorMap.get(eid)!
      entry.total++
      if (p.status === 'Entregue' || p.status === 'Validado pelo Admin') {
        entry.entregues++
        entry.valorTotal += parseFloat(p.valor_pacote || '0')
      }
      if (p.status === 'Retornado a Central') entry.falhas++
    }

    Array.from(entregadorMap.entries()).forEach(async ([entregador_id, info]) => {
      await supabase
        .from('finalizacao_dia_entregador')
        .insert({
          data: dataStr,
          entregador_id,
          total_pacotes: info.total,
          total_entregues: info.entregues,
          total_falhas: info.falhas,
          valor_total: info.valorTotal.toFixed(2),
        })
    })

    return NextResponse.json({
      ok: true,
      mensagem: `✅ Dia ${dataStr} finalizado com sucesso!\n${totalRegistrados} pacotes, ${totalEntregues} entregues, R$ ${valorTotal.toFixed(2)}`,
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao finalizar dia' }, { status: 500 })
  }
}
