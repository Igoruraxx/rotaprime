import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { transicaoValida, camposParaTransicao, statusAcoes } from '@/lib/maquina-estados'
import { sanitizeText } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const entregadorId = session.id

  // Buscar pacote e verificar se pertence ao entregador
  const { data: pacote, error: errBusca } = await supabase
    .from('pacotes')
    .select('*')
    .eq('codigo', params.codigo)
    .eq('entregador_id', entregadorId)
    .single()

  if (errBusca || !pacote) {
    return NextResponse.json({ erro: 'Pacote não encontrado ou não pertence a você' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { acao } = body

    if (!acao) {
      return NextResponse.json({ erro: 'Ação é obrigatória' }, { status: 400 })
    }

    // Mapear ações para transições
    const mapaAcoes: Record<string, string> = {
      'retirar': 'Retirado pelo Entregador',
      'rota': 'Em Rota',
      'entregar': 'Entregue',
      'devolver': 'Retornado a Central',
    }

    const novoStatus = mapaAcoes[acao]
    if (!novoStatus) {
      return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
    }

    // Validar transição
    const validacao = transicaoValida(pacote.status, novoStatus, 'entregador')
    if (!validacao.valida) {
      return NextResponse.json({ erro: validacao.erro }, { status: 400 })
    }

    // Preparar campos
    const updates = camposParaTransicao(pacote.status, novoStatus)

    // Se for entregar, aceitar foto e GPS
    if (acao === 'entregar') {
      if (body.foto) updates.foto = body.foto
      if (body.gps_foto) updates.gps_foto = body.gps_foto
      if (body.motivo_devolucao) updates.motivo_devolucao = sanitizeText(body.motivo_devolucao)
    }

    if (acao === 'devolver') {
      if (body.motivo_devolucao) updates.motivo_devolucao = sanitizeText(body.motivo_devolucao)
      updates.tentativa_atual = (pacote.tentativa_atual || 0) + 1
    }

    const { data, error } = await supabase
      .from('pacotes')
      .update(updates)
      .eq('codigo', params.codigo)
      .select()
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ pacote: data })

  } catch {
    return NextResponse.json({ erro: 'Erro ao processar ação' }, { status: 500 })
  }
}
