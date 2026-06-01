import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const pacote_codigo = searchParams.get('pacote_codigo')

    if (!pacote_codigo) {
      return NextResponse.json({ erro: 'pacote_codigo obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('whatsapp_log')
      .select('id, data_envio, entregador_id')
      .eq('pacote_codigo', pacote_codigo)
      .order('data_envio', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: data || [] })
  } catch {
    return NextResponse.json({ erro: 'Erro ao buscar histórico' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { entregador_id, pacote_codigo, tipo } = body

    if (!entregador_id || !pacote_codigo) {
      return NextResponse.json({ erro: 'entregador_id e pacote_codigo obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('whatsapp_log')
      .insert({
        entregador_id: parseInt(entregador_id),
        pacote_codigo,
        tipo: tipo || 'consulta',
      })

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ erro: 'Erro ao registrar' }, { status: 500 })
  }
}
