import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
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
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filtroEntregador = searchParams.get('entregador_id')

  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()

  const [
    { count: totalPegosHoje },
    { data: retiradosHoje },
    { data: repassadosHoje },
    { data: pendentesHoje },
    { data: entregadores }
  ] = await Promise.all([
    // Total retirados hoje
    supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .gte('data_retirada_central', inicioHoje)
      .lte('data_retirada_central', fimHoje)
      .match(filtroEntregador ? { entregador_id: parseInt(filtroEntregador) } : {}),

    // Retirados hoje (detalhes)
    supabase
      .from('pacotes')
      .select('codigo, data_retirada_central, status, entregadores(nome)')
      .not('data_retirada_central', 'is', null)
      .gte('data_retirada_central', inicioHoje)
      .lte('data_retirada_central', fimHoje)
      .match(filtroEntregador ? { entregador_id: parseInt(filtroEntregador) } : {})
      .order('data_retirada_central', { ascending: false }),

    // Repassados hoje
    supabase
      .from('pacotes')
      .select('codigo, data_repassado_entregador, status, entregadores(nome)')
      .not('data_repassado_entregador', 'is', null)
      .gte('data_repassado_entregador', inicioHoje)
      .lte('data_repassado_entregador', fimHoje)
      .match(filtroEntregador ? { entregador_id: parseInt(filtroEntregador) } : {})
      .order('data_repassado_entregador', { ascending: false }),

    // Pendentes hoje (data_limite_entrega = hoje, não entregues)
    supabase
      .from('pacotes')
      .select('codigo, data_limite_entrega, status, entregadores(nome)')
      .not('data_limite_entrega', 'is', null)
      .gte('data_limite_entrega', inicioHoje)
      .lte('data_limite_entrega', fimHoje)
      .not('status', 'in', '("Entregue","Validado pelo Admin")')
      .match(filtroEntregador ? { entregador_id: parseInt(filtroEntregador) } : {})
      .order('data_limite_entrega', { ascending: true }),

    // Entregadores ativos
    supabase
      .from('entregadores')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome'),
  ])

  const totalRepassadosHoje = repassadosHoje?.length || 0
  const totalPendentesHoje = pendentesHoje?.length || 0

  return NextResponse.json({
    stats: {
      totalPegosHoje: totalPegosHoje || 0,
      totalRepassadosHoje,
      totalPendentesHoje,
    },
    filtroEntregador: filtroEntregador || null,
    retirados: retiradosHoje || [],
    repassados: repassadosHoje || [],
    pendentes: pendentesHoje || [],
    entregadores: entregadores || [],
  })
}
