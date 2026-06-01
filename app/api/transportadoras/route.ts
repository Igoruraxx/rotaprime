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

  const body = await request.json()

  // Valida nome
  const nome = body.nome?.trim()
  if (!nome) {
    return NextResponse.json({ erro: 'Nome da transportadora é obrigatório' }, { status: 400 })
  }

  // prazo_entrega_dias é OBRIGATÓRIO
  const prazoDias = parseInt(body.prazo_entrega_dias, 10)
  if (isNaN(prazoDias) || prazoDias <= 0) {
    return NextResponse.json({ erro: 'Prazo de entrega (dias) é obrigatório e deve ser maior que zero' }, { status: 400 })
  }

  const transportadora = {
    nome,
    prazo_entrega_dias: prazoDias,
  }

  const { data, error } = await supabase
    .from('transportadoras')
    .insert(transportadora)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ erro: 'Já existe uma transportadora com este nome' }, { status: 409 })
    }
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ transportadora: data })
}
