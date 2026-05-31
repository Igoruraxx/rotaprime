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

  if (!q || q.length < 2) {
    return NextResponse.json({ resultados: [] })
  }

  const { data } = await supabase
    .from('pacotes')
    .select('codigo, nf_remessa, endereco_entrega, status, entregadores(nome)')
    .or(`codigo.ilike.%${q}%,nf_remessa.ilike.%${q}%`)
    .limit(10)

  return NextResponse.json({ resultados: data || [] })
}
