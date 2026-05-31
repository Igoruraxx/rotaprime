import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const entregador_id = searchParams.get('entregador_id')
  const data_ini = searchParams.get('data_ini')
  const data_fim = searchParams.get('data_fim')

  let query = supabase
    .from('pacotes')
    .select('*, entregadores(nome, telefone)')
    .not('foto', 'is', null)

  if (entregador_id) {
    query = query.eq('entregador_id', parseInt(entregador_id))
  }
  if (data_ini) {
    query = query.gte('data_chegada', data_ini)
  }
  if (data_fim) {
    query = query.lte('data_chegada', data_fim)
  }

  query = query.order('data_chegada', { ascending: false })

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  // Buscar entregadores para o filtro
  const { data: entregadores } = await supabase
    .from('entregadores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome')

  return NextResponse.json({
    fotos: data || [],
    entregadores: entregadores || []
  })
}
