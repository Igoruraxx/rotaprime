import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('transportadoras')
    .select('*')
    .order('nome', { ascending: true })

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ transportadoras: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body.nome || body.nome.trim().length < 2) {
      return NextResponse.json({ erro: 'Nome deve ter no mínimo 2 caracteres' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transportadoras')
      .insert({ nome: body.nome.trim() })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ erro: 'Transportadora já cadastrada' }, { status: 409 })
      }
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({ transportadora: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao criar transportadora' }, { status: 500 })
  }
}
