import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { data: entregador, error } = await supabase
    .from('entregadores')
    .select('id, nome, telefone, cpf, chave_pix, banco_pagamento, carteira_motorista, valor_padrao, ativo, ultimo_pagamento_em, criado_em')
    .eq('id', session.id)
    .single()

  if (error || !entregador) {
    return NextResponse.json({ erro: 'Entregador não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ entregador })
}

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { telefone, chave_pix } = body

    // Apenas telefone e chave_pix podem ser alterados pelo entregador
    const atualizacao: Record<string, unknown> = {}

    if (telefone !== undefined) {
      const telLimpo = telefone.replace(/\D/g, '')
      if (telLimpo && telLimpo.length < 10) {
        return NextResponse.json({ erro: 'Telefone inválido' }, { status: 400 })
      }
      atualizacao.telefone = telLimpo
    }

    if (chave_pix !== undefined) {
      if (chave_pix && chave_pix.length > 100) {
        return NextResponse.json({ erro: 'Chave PIX muito longa (máx 100 caracteres)' }, { status: 400 })
      }
      atualizacao.chave_pix = chave_pix || null
    }

    if (Object.keys(atualizacao).length === 0) {
      return NextResponse.json({ erro: 'Nenhum campo para atualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('entregadores')
      .update(atualizacao)
      .eq('id', session.id)

    if (error) {
      return NextResponse.json({ erro: 'Erro ao atualizar dados' }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true, mensagem: '✅ Dados atualizados com sucesso!' })
  } catch {
    return NextResponse.json({ erro: 'Erro ao processar requisição' }, { status: 500 })
  }
}
