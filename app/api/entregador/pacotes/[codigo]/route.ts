import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'
import {
  transicaoValida,
  camposParaTransicao,
} from '@/lib/maquina-estados'
import { validarTokenCSRF } from '@/lib/csrf'
import { sanitizeText } from '@/lib/utils'

// Whitelist de colunas que o entregador pode alterar
const COLUNAS_PERMITIDAS_ENTREGADOR = [
  'foto',
  'gps_foto',
  'motivo_devolucao',
  'observacoes',
  'status',
  'data_retirada_central',
  'data_entrega_real',
  'tentativa_atual',
] as const

function sanitizarAtualizacao(body: Record<string, unknown>) {
  const limpo: Record<string, unknown> = {}
  for (const chave of Object.keys(body)) {
    if ((COLUNAS_PERMITIDAS_ENTREGADOR as readonly string[]).includes(chave)) {
      const valor = body[chave]
      if (typeof valor === 'string') {
        limpo[chave] = sanitizeText(valor)
      } else {
        limpo[chave] = valor
      }
    }
  }
  return limpo
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { codigo } = await params

  // Busca o pacote e verifica se pertence ao entregador
  const { data: pacote, error: errBusca } = await supabase
    .from('pacotes')
    .select('*')
    .eq('codigo', codigo)
    .eq('entregador_id', session.id)
    .single()

  if (errBusca || !pacote) {
    return NextResponse.json({ erro: 'Pacote não encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const { acao, csrf_token, ...dados } = body

  if (!acao) {
    return NextResponse.json({ erro: 'Ação não informada' }, { status: 400 })
  }

  // Valida CSRF para ações críticas (entregar, devolver)
  if (['entregar', 'devolver'].includes(acao)) {
    if (!csrf_token) {
      return NextResponse.json(
        { erro: 'Token CSRF não fornecido' },
        { status: 403 }
      )
    }
    const csrfValido = await validarTokenCSRF(csrf_token, session.id)
    if (!csrfValido) {
      return NextResponse.json(
        { erro: 'Token CSRF inválido. Recarregue a página e tente novamente.' },
        { status: 403 }
      )
    }
  }

  // Mapeia ação para novo status
  const mapaAcoes: Record<string, string> = {
    retirar: 'Retirado pelo Entregador',
    rota: 'Em Rota',
    entregar: 'Entregue',
    devolver: 'Retornado a Central',
    tentar_novamente: 'Aguardando Retirada',
  }

  const novoStatus = mapaAcoes[acao]
  if (!novoStatus) {
    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  }

  // Valida transição na máquina de estados
  const validacao = transicaoValida(pacote.status, novoStatus, 'entregador')
  if (!validacao.valida) {
    return NextResponse.json(
      { erro: validacao.erro || 'Transição não permitida' },
      { status: 400 }
    )
  }

  // Prepara campos da transição + sanitização
  const camposTransicao = camposParaTransicao(pacote.status, novoStatus)
  const camposSolicitados = sanitizarAtualizacao(dados)

  // Validações específicas
  if (acao === 'entregar') {
      const { foto, gps_foto } = body

      // ❌ Foto OBRIGATÓRIA para finalizar entrega
      if (!foto) {
        return NextResponse.json(
          { erro: 'Foto comprobatória da entrega é obrigatória. Capture a foto antes de finalizar.' },
          { status: 400 }
        )
      }

      // ❌ GPS OBRIGATÓRIO para finalizar entrega
      if (!gps_foto) {
        return NextResponse.json(
          { erro: 'Localização GPS é obrigatória. Capture a localização antes de finalizar.' },
          { status: 400 }
        )
      }
  }

  if (acao === 'devolver' && !camposSolicitados.motivo_devolucao) {
    return NextResponse.json(
      { erro: 'Motivo da devolução é obrigatório' },
      { status: 400 }
    )
  }

  // Incrementa tentativa se for devolução
  if (acao === 'devolver') {
    camposSolicitados.tentativa_atual = (pacote.tentativa_atual || 0) + 1
  }

  // Monta atualização final
  const atualizacao = {
    ...camposTransicao,
    ...camposSolicitados,
    status: novoStatus,
  }

  const { error: errUpdate } = await supabase
    .from('pacotes')
    .update(atualizacao)
    .eq('codigo', codigo)
    .eq('entregador_id', session.id)

  if (errUpdate) {
    console.error('Erro ao atualizar pacote:', errUpdate)
    return NextResponse.json({ erro: 'Erro ao atualizar pacote' }, { status: 500 })
  }

  return NextResponse.json({
    sucesso: true,
    status: novoStatus,
    mensagem:
      acao === 'entregar'
        ? '✅ Entrega registrada com sucesso!'
        : acao === 'devolver'
          ? '📦 Pacote devolvido à central'
          : `✅ Status atualizado para "${novoStatus}"`,
  })
}
