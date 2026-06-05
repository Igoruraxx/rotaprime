import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || session.tipo !== 'entregador') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const entregadorId = session.entregador_id || session.id
    const body = await request.json()
    const { codigos } = body

    // Se não passar códigos, aceita todos pendentes do entregador
    let query = supabase
      .from('pacotes')
      .update({
        status: 'Aguardando Retirada',
        data_retirada_central: new Date().toISOString(),
      })
      .eq('entregador_id', entregadorId)
      .eq('status', 'Recebido pela Central')

    if (codigos && Array.isArray(codigos) && codigos.length > 0) {
      query = query.in('codigo', codigos)
    }

    const { data, error } = await query.select()

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      atualizados: data?.length || 0,
      mensagem: `${data?.length || 0} pacote(s) recebido(s) com sucesso!`,
      pacotes: data || [],
    })
  } catch (err) {
    console.error('Erro ao receber lote:', err)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
