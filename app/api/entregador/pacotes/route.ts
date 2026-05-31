import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const entregadorId = session.id

  const { data, error } = await supabase
    .from('pacotes')
    .select('*')
    .eq('entregador_id', entregadorId)
    .order('data_chegada', { ascending: false })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ pacotes: data })
}
