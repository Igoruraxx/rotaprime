import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })

  const { data, error } = await supabase
    .from('entregadores')
    .select('*, pacotes(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ entregador: data })
}

export async function PUT(
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
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.nome !== undefined) updates.nome = sanitizeText(body.nome)
    if (body.telefone !== undefined) updates.telefone = sanitizeText(body.telefone)
    if (body.valor_padrao !== undefined) updates.valor_padrao = sanitizeFloat(body.valor_padrao)
    if (body.ativo !== undefined) updates.ativo = body.ativo
    if (body.senha) updates.senha_hash = bcrypt.hashSync(body.senha, 10)
    if (body.ultimo_pagamento_em !== undefined) updates.ultimo_pagamento_em = body.ultimo_pagamento_em

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ erro: 'Nada para atualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('entregadores')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ entregador: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ erro: 'ID inválido' }, { status: 400 })

  // Verificar se tem pacotes vinculados
  const { count } = await supabase
    .from('pacotes')
    .select('*', { count: 'exact', head: true })
    .eq('entregador_id', id)

  if (count && count > 0) {
    return NextResponse.json({ erro: 'Entregador possui pacotes vinculados. Inative-o em vez de remover.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('entregadores')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
