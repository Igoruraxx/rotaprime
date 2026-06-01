import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const tipo = searchParams.get('tipo') || 'codigo'

  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  let query = supabase
    .from('pacotes')
    .select('codigo, nf_remessa, endereco_entrega, destinatario, status, entregadores(nome)')
    .limit(10)

  if (tipo === 'endereco') {
    query = query.ilike('endereco_entrega', `%${q}%`)
  } else if (tipo === 'destinatario') {
    query = query.ilike('destinatario', `%${q}%`)
  } else {
    // Busca por código: usa os ÚLTIMOS DÍGITOS
    query = query.or(
      `codigo.ilike.%${q},nf_remessa.ilike.%${q}%`
    )
  }

  const { data } = await query

  return NextResponse.json({ resultados: data || [] })
}
