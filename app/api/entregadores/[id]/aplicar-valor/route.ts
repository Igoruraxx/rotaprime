import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// Aplica o valor_padrao do entregador a todos os seus pacotes
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })

  try {
    // Buscar valor padrão do entregador
    const { data: entregador, error: errEnt } = await supabase
      .from('entregadores')
      .select('valor_padrao')
      .eq('id', id)
      .single()

    if (errEnt || !entregador) {
      return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
    }

    const valor = entregador.valor_padrao

    // Atualizar todos os pacotes do entregador
    const { count, error } = await supabase
      .from('pacotes')
      .update({ valor_pacote: valor })
      .eq('entregador_id', id)

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true, atualizados: count || 0, valor: valor })
  } catch {
    return NextResponse.json({ erro: 'Erro ao aplicar valor' }, { status: 500 })
  }
}
