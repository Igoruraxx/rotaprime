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

    const agora = new Date().toISOString()

    // Query base: pacotes do entregador com status "Recebido pela Central"
    let query = supabase
      .from('pacotes')
      .update({
        status: 'Retirado pelo Entregador',
        data_retirada_central: agora,
        data_repassado_entregador: agora,
      })
      .eq('entregador_id', entregadorId)
      .eq('status', 'Recebido pela Central')

    // Se passar códigos específicos, filtra
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
      mensagem: `${data?.length || 0} pacote(s) aceito(s) e movido(s) para "Em Andamento"!`,
      pacotes: data || [],
    })
  } catch (err) {
    console.error('Erro ao aceitar lote:', err)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
