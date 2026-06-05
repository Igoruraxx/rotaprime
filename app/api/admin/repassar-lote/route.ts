import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { entregador_id, codigos } = body

    if (!entregador_id || !codigos || codigos.length === 0) {
      return NextResponse.json({ erro: 'Entregador e pacotes são obrigatórios' }, { status: 400 })
    }

    // Verifica se o entregador existe
    const { data: ent } = await supabase
      .from('entregadores')
      .select('id, nome, ativo, valor_padrao')
      .eq('id', entregador_id)
      .single()

    if (!ent) {
      return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
    }

    if (!ent.ativo) {
      return NextResponse.json({ erro: 'Entregador inativo' }, { status: 400 })
    }

    const valorPadrao = Number(ent.valor_padrao || 0)

    const { data: pacotes, error } = await supabase
      .from('pacotes')
      .update({
        entregador_id: entregador_id,
        status: 'Recebido pela Central',
        data_repassado_entregador: new Date().toISOString(),
        valor_pacote: valorPadrao > 0 ? valorPadrao : undefined,
      })
      .in('codigo', codigos)
      .select('codigo')

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: `✅ ${pacotes?.length || 0} pacote(s) repassado(s) para ${ent.nome}!`,
      quantidade: pacotes?.length || 0,
      entregador: ent.nome,
    })
  } catch (err) {
    console.error('Erro repasse em lote:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
