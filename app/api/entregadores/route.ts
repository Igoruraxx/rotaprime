import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('entregadores')
    .select('*, pacotes(count)', { count: 'exact' })
    .order('nome')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ entregadores: data })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const nome = sanitizeText(body.nome || '')
    if (!nome) return NextResponse.json({ erro: 'Nome é obrigatório' }, { status: 400 })

    const entregador: Record<string, unknown> = {
      nome,
      valor_padrao: sanitizeFloat(body.valor_padrao) || 0.50,
      telefone: sanitizeText(body.telefone || ''),
      ativo: true
    }

    if (body.senha) {
      entregador.senha_hash = bcrypt.hashSync(body.senha, 10)
    }

    const { data, error } = await supabase
      .from('entregadores')
      .insert(entregador)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ erro: 'Já existe um entregador com este nome' }, { status: 409 })
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }
    return NextResponse.json({ entregador: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao criar entregador' }, { status: 500 })
  }
}
