import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'
import { camposParaTransicao, TRANSICOES } from '@/lib/maquina-estados'

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

    // Admin pode setar QUALQUER status (override total)
    if (body.status !== undefined) {
      const statusValido = Object.keys(TRANSICOES).includes(body.status)
      if (!statusValido) {
        return NextResponse.json({ erro: `Status inválido: "${body.status}"` }, { status: 400 })
      }

      // Buscar status atual para auto-preenchimento de timestamps
      const { data: pacoteAtual } = await supabase
        .from('pacotes')
        .select('status')
        .eq('codigo', params.codigo)
        .single()

      if (pacoteAtual && pacoteAtual.status !== body.status) {
        const camposEstado = camposParaTransicao(pacoteAtual.status, body.status)
        Object.assign(updates, camposEstado)
      } else {
        updates.status = body.status
      }
    }

    // TODOS os campos editáveis
    if (body.nf_remessa !== undefined) updates.nf_remessa = sanitizeText(body.nf_remessa)
    if (body.destinatario !== undefined) updates.destinatario = sanitizeText(body.destinatario)
    if (body.descricao !== undefined) updates.descricao = sanitizeText(body.descricao)
    if (body.quantidade !== undefined) updates.quantidade = parseInt(body.quantidade) || 1
    if (body.endereco_entrega !== undefined) updates.endereco_entrega = sanitizeText(body.endereco_entrega)
    if (body.data_limite_entrega !== undefined) updates.data_limite_entrega = body.data_limite_entrega || null
    if (body.entregador_id !== undefined) updates.entregador_id = body.entregador_id ? parseInt(body.entregador_id) : null
    if (body.valor_pacote !== undefined) updates.valor_pacote = sanitizeFloat(body.valor_pacote) || 0
    if (body.observacoes !== undefined) updates.observacoes = sanitizeText(body.observacoes)
    if (body.transportadora !== undefined) updates.transportadora = sanitizeText(body.transportadora)
    if (body.pago !== undefined) updates.pago = body.pago
    if (body.data_pagamento !== undefined) updates.data_pagamento = body.data_pagamento || null
    if (body.validacao_admin !== undefined) updates.validacao_admin = body.validacao_admin
    if (body.data_validacao_admin !== undefined) updates.data_validacao_admin = body.data_validacao_admin || null
    if (body.motivo_devolucao !== undefined) updates.motivo_devolucao = sanitizeText(body.motivo_devolucao)
    if (body.tentativa_atual !== undefined) updates.tentativa_atual = parseInt(body.tentativa_atual) || 0
    if (body.foto !== undefined) updates.foto = body.foto || null
    if (body.gps_foto !== undefined) updates.gps_foto = body.gps_foto || null
    if (body.data_repassado_entregador !== undefined) updates.data_repassado_entregador = body.data_repassado_entregador || null
    if (body.data_retirada_central !== undefined) updates.data_retirada_central = body.data_retirada_central || null
    if (body.data_entrega_real !== undefined) updates.data_entrega_real = body.data_entrega_real || null
    if (body.data_chegada !== undefined) updates.data_chegada = body.data_chegada

    const { data, error } = await supabase
      .from('pacotes')
      .update(updates)
      .eq('codigo', params.codigo)
      .select('*, entregadores(nome, telefone, valor_padrao)')
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ pacote: data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao atualizar pacote' }, { status: 500 })
  }
}
