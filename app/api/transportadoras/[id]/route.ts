import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const nome = body.nome?.trim()

  if (!nome) {
    return NextResponse.json({ erro: 'Nome da transportadora é obrigatório' }, { status: 400 })
  }

  // prazo_entrega_dias é OBRIGATÓRIO
  const prazoDias = parseInt(body.prazo_entrega_dias, 10)
  if (isNaN(prazoDias) || prazoDias <= 0) {
    return NextResponse.json({ erro: 'Prazo de entrega (dias) é obrigatório e deve ser maior que zero' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transportadoras')
    .update({
      nome,
      prazo_entrega_dias: prazoDias,
    })
    .eq('id', id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('transportadoras')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ sucesso: true })
}
