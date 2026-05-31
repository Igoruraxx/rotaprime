import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('pacotes')
    .select('*, entregadores(nome, telefone, valor_padrao)')
    .eq('codigo', params.codigo)
    .single()

  if (error || !data) {
    return NextResponse.json({ erro: 'Pacote não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ pacote: data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.nf_remessa !== undefined) updates.nf_remessa = sanitizeText(body.nf_remessa)
    if (body.descricao !== undefined) updates.descricao = sanitizeText(body.descricao)
    if (body.quantidade !== undefined) updates.quantidade = parseInt(body.quantidade)
    if (body.endereco_entrega !== undefined) updates.endereco_entrega = sanitizeText(body.endereco_entrega)
    if (body.data_limite_entrega !== undefined) updates.data_limite_entrega = body.data_limite_entrega
    if (body.entregador_id !== undefined) updates.entregador_id = body.entregador_id ? parseInt(body.entregador_id) : null
    if (body.valor_pacote !== undefined) updates.valor_pacote = sanitizeFloat(body.valor_pacote)
    if (body.observacoes !== undefined) updates.observacoes = sanitizeText(body.observacoes)
    if (body.transportadora !== undefined) updates.transportadora = sanitizeText(body.transportadora)
    if (body.status !== undefined) updates.status = body.status
    if (body.pago !== undefined) updates.pago = body.pago
    if (body.data_pagamento !== undefined) updates.data_pagamento = body.data_pagamento
    if (body.validacao_admin !== undefined) updates.validacao_admin = body.validacao_admin
    if (body.data_validacao_admin !== undefined) updates.data_validacao_admin = body.data_validacao_admin
    if (body.motivo_devolucao !== undefined) updates.motivo_devolucao = sanitizeText(body.motivo_devolucao)
    if (body.tentativa_atual !== undefined) updates.tentativa_atual = parseInt(body.tentativa_atual)
    if (body.foto !== undefined) updates.foto = body.foto
    if (body.gps_foto !== undefined) updates.gps_foto = body.gps_foto
    if (body.data_repassado_entregador !== undefined) updates.data_repassado_entregador = body.data_repassado_entregador
    if (body.data_retirada_central !== undefined) updates.data_retirada_central = body.data_retirada_central
    if (body.data_entrega_real !== undefined) updates.data_entrega_real = body.data_entrega_real

    const { data, error } = await supabase
      .from('pacotes')
      .update(updates)
      .eq('codigo', params.codigo)
      .select()
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ pacote: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar pacote' }, { status: 500 })
  }
}
