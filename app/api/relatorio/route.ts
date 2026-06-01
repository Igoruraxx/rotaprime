import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

const PAGE_SIZE = 50
const MAX_TOTAL = 15000

const TAB_STATUS_MAP: Record<string, string[]> = {
  repassado: ['Aguardando Retirada'],
  aceitar: ['Retirado pelo Entregador'],
  pendentes: ['Em Rota', 'Retornado a Central'],
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { codigos, entregador_id } = body

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({ erro: 'Selecione pelo menos um pacote' }, { status: 400 })
    }
    if (!entregador_id) {
      return NextResponse.json({ erro: 'Selecione um entregador' }, { status: 400 })
    }

    const agora = new Date().toISOString()

    const { data, error } = await supabase
      .from('pacotes')
      .update({
        entregador_id: parseInt(entregador_id),
        data_repassado_entregador: agora,
        status: 'Aguardando Retirada',
      })
      .in('codigo', codigos)
      .in('status', ['Recebido pela Central', 'Retornado a Central'])
      .select()

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      atualizados: data?.length || 0,
      mensagem: `${data?.length || 0} pacote(s) repassado(s) com sucesso!`
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar lote' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'repassado'
  const dataStr = searchParams.get('data')
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || String(PAGE_SIZE))))
  const filtroEntregador = searchParams.get('entregador_id')

  // Definir intervalo de data
  let dataInicio: Date
  let dataFim: Date
  if (dataStr) {
    dataInicio = new Date(dataStr + 'T00:00:00')
    dataFim = new Date(dataStr + 'T23:59:59')
  } else {
    const hoje = new Date()
    dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)
  }
  const inicioHoje = dataInicio.toISOString()
  const fimHoje = dataFim.toISOString()

  const statuses = TAB_STATUS_MAP[tab]
  if (!statuses) {
    return NextResponse.json({ erro: 'Tab invalida. Use: repassado, aceitar, pendentes' }, { status: 400 })
  }

  // Filtro base comum
  const filtroBase: Record<string, unknown> = {}
  if (filtroEntregador) {
    filtroBase.entregador_id = parseInt(filtroEntregador)
  }

  // Query dos stats (independente da tab)
  const [
    { count: totalPegosHoje },
    { count: totalRepassadosHoje },
    { count: totalPendentesHojeBase },
    { data: entregadores }
  ] = await Promise.all([
    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .gte('data_retirada_central', inicioHoje)
      .lte('data_retirada_central', fimHoje)
      .match(filtroBase),

    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .not('data_repassado_entregador', 'is', null)
      .gte('data_repassado_entregador', inicioHoje)
      .lte('data_repassado_entregador', fimHoje)
      .match(filtroBase),

    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .not('data_limite_entrega', 'is', null)
      .gte('data_limite_entrega', inicioHoje)
      .lte('data_limite_entrega', fimHoje)
      .not('status', 'in', '("Entregue","Validado pelo Admin")')
      .match(filtroBase),

    supabase
      .from('entregadores')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome'),
  ])

  // Query paginada por tab
  let query = supabase
    .from('pacotes')
    .select('codigo, destinatario, endereco_entrega, status, entregador_id, valor_pacote, entregadores!inner(nome, telefone), data_chegada, data_repassado_entregador, data_retirada_central, data_limite_entrega', { count: 'exact' })

  if (filtroEntregador) {
    query = query.eq('entregador_id', parseInt(filtroEntregador))
  }

  // Aplicar filtro de status por tab
  if (statuses.length === 1) {
    query = query.eq('status', statuses[0])
  } else {
    query = query.in('status', statuses)
  }

  // Filtro de data base: data_chegada dentro do intervalo
  query = query.gte('data_chegada', inicioHoje).lte('data_chegada', fimHoje)

  // Aplicar pagination via range (offset, offset+limit-1)
  const rangeStart = offset
  const rangeEnd = Math.min(offset + limit - 1, MAX_TOTAL - 1)

  const { data: pacotes, count: total, error } = await query
    .order('data_chegada', { ascending: false })
    .range(rangeStart, rangeEnd)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const totalClamped = Math.min(total || 0, MAX_TOTAL)

  return NextResponse.json({
    stats: {
      totalPegosHoje: totalPegosHoje || 0,
      totalRepassadosHoje: totalRepassadosHoje || 0,
      totalPendentesHoje: totalPendentesHojeBase || 0,
    },
    entregadores: entregadores || [],
    filtroEntregador: filtroEntregador || null,
    tab,
    pacotes: (pacotes || []).map((p: Record<string, unknown>) => {
      const e = (p.entregadores as unknown as { nome: string; telefone: string }[])?.[0]
      return {
        codigo: p.codigo,
        destinatario: p.destinatario || null,
        endereco_entrega: p.endereco_entrega || null,
        status: p.status,
        valor_pacote: p.valor_pacote || 0,
        entregador_id: p.entregador_id || null,
        entregador_nome: e?.nome || null,
        entregador_telefone: e?.telefone || null,
        data_chegada: p.data_chegada || null,
        data_repassado_entregador: p.data_repassado_entregador || null,
        data_retirada_central: p.data_retirada_central || null,
        data_limite_entrega: p.data_limite_entrega || null,
      }
    }),
    total: totalClamped,
    offset,
    limit,
    hasMore: offset + limit < totalClamped && totalClamped > 0,
  })
}
