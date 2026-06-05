import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const entregadorId = session.id
  const { searchParams } = new URL(request.url)
  const statusParam = searchParams.get('status') // 'todos' | 'pendentes' | 'entregues' | 'retornadas' | 'retirados' | 'ativos' | ou lista de status separados por vírgula
  const periodo = searchParams.get('periodo') // 'hoje' | '7d' | '7dias' | '30d' | '30dias' | 'tudo'
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')
  const busca = searchParams.get('busca') // busca por últimos dígitos do código

  let query = supabase
    .from('pacotes')
    .select('*')
    .eq('entregador_id', entregadorId)

  // Filtro por status - aceita key (pendentes/entregues) OU lista de status via vírgula
  if (statusParam && statusParam !== 'todos') {
    const statusKeys: Record<string, string[]> = {
      pendentes: ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota'],
      retirados: ['Retirado pelo Entregador', 'Em Rota'],
      ativos: ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota'],
      entregues: ['Entregue', 'Validado pelo Admin'],
      retornadas: ['Retornado a Central'],
    }

    if (statusKeys[statusParam]) {
      query = query.in('status', statusKeys[statusParam])
    } else {
      // Tenta interpretar como lista de status separados por vírgula
      const statusList = statusParam
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (statusList.length > 0) {
        query = query.in('status', statusList)
      }
    }
  }

  // Filtro por período (data_chegada)
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)

  if (periodo && periodo !== 'tudo') {
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)

    switch (periodo) {
      case 'hoje':
        break
      case '7d':
      case '7dias':
        inicio.setDate(inicio.getDate() - 7)
        break
      case '30d':
      case '30dias':
        inicio.setDate(inicio.getDate() - 30)
        break
    }

    query = query.gte('data_chegada', inicio.toISOString())
    query = query.lte('data_chegada', hoje.toISOString())
  }

  // Filtro por data personalizada
  if (dataInicio) {
    query = query.gte('data_chegada', new Date(dataInicio).toISOString())
  }
  if (dataFim) {
    const fim = new Date(dataFim)
    fim.setHours(23, 59, 59, 999)
    query = query.lte('data_chegada', fim.toISOString())
  }

  // Busca por últimos dígitos do código
  if (busca && busca.trim()) {
    query = query.ilike('codigo', `%${busca.trim()}`)
  }

  const { data: pacotes, error } = await query.order('data_chegada', {
    ascending: false,
  })

  if (error) {
    console.error('Erro ao buscar pacotes:', error)
    return NextResponse.json({ erro: 'Erro ao carregar pacotes' }, { status: 500 })
  }

  return NextResponse.json({ pacotes: pacotes || [] })
}
