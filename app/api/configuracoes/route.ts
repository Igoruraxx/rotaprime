import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select('*')
    .order('grupo', { ascending: true })
    .order('nome', { ascending: true })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ features: data || [] })
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { chave, ativo } = body

    if (!chave || typeof ativo !== 'boolean') {
      return NextResponse.json({ erro: 'Parâmetros inválidos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('configuracoes_sistema')
      .update({ ativo })
      .eq('chave', chave)
      .select()
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

    return NextResponse.json({ feature: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 })
  }
}
