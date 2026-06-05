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
        status: 'Recebido pela Central',
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
      mensagem: `${data?.length || 0} pacote(s) atribuído(s) com sucesso!`
    })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar lote' }, { status: 500 })
  }
}
