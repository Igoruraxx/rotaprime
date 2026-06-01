import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('pacotes')
    .select('codigo, destinatario, endereco_entrega, status, valor_pacote, data_chegada')
    .in('status', ['Recebido pela Central', 'Aguardando Retirada'])
    .is('entregador_id', null)
    .order('data_chegada', { ascending: false })
    .limit(500)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ pacotes: data || [] })
}
