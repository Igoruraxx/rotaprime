import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

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
    if (!body.nome || body.nome.trim().length < 2) {
      return NextResponse.json({ erro: 'Nome deve ter no mínimo 2 caracteres' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('transportadoras')
      .update({ nome: body.nome.trim() })
      .eq('id', id)
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

  const { error } = await supabase
    .from('transportadoras')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
