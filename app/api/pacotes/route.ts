import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { gerarCodigoPacote, sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const busca = searchParams.get('busca')
  const status = searchParams.get('status')

  let query = supabase
    .from('pacotes')
    .select('*, entregadores(nome, telefone)')
    .order('data_chegada', { ascending: false })
    .limit(500)

  if (busca) {
    // Busca por código (últimos dígitos) ou NF
    query = query.or(
      `codigo.ilike.%${busca},nf_remessa.ilike.%${busca}%,destinatario.ilike.%${busca}%`
    )
  }
  if (status) {
    query = query.eq('status', status)
  }

  if (session.tipo === 'entregador') {
    query = query.eq('entregador_id', session.id)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  return NextResponse.json({ pacotes: data || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Suporta: array de códigos OU código único
    const codigosInput: string[] = body.codigos || [body.nf_remessa]
    const codigosFinais: string[] = []

    // Se tem códigos custom, usa eles; senão gera automático
    const codigosCustom = Array.isArray(body.codigos)
      ? (body.codigos as string[]).filter((c: string) => c.trim())
      : []

    // Suporta array de NF por pacote (biper) ou NF única (legado)
    const nfsRemessa: string[] = Array.isArray(body.nfs_remessa)
      ? (body.nfs_remessa as string[])
      : []

    const pacotesACriar: any[] = []

    const agora = new Date()
    const agoraISO = agora.toISOString()

    // Tem entregador? Se sim, auto-advance status
    const temEntregador = body.entregador_id && parseInt(body.entregador_id) > 0

    const quantidade = Math.max(1, codigosCustom.length || (parseInt(body.quantidade) || 1))

    for (let i = 0; i < quantidade; i++) {
      const codigo = codigosCustom[i] || gerarCodigoPacote()
      codigosFinais.push(codigo)

      // NF por índice (biper) ou NF única (legado)
      const nf = nfsRemessa[i] || sanitizeText(body.nf_remessa || '')

      const pacote: Record<string, any> = {
        codigo,
        nf_remessa: nf,
        destinatario: sanitizeText(body.destinatario || ''),
        descricao: sanitizeText(body.descricao || ''),
        quantidade: parseInt(body.quantidade) || 1,
        endereco_entrega: sanitizeText(body.endereco_entrega || ''),
        data_limite_entrega: body.data_limite_entrega || null,
        valor_pacote: sanitizeFloat(body.valor_pacote) || 0.50,
        observacoes: sanitizeText(body.observacoes || ''),
        transportadora: sanitizeText(body.transportadora || ''),
      }

      if (temEntregador) {
        // Fica como "Recebido pela Central" — entregador precisa aceitar no Acompanhamento
        pacote.status = 'Recebido pela Central'
        pacote.entregador_id = parseInt(body.entregador_id)
        pacote.data_chegada = agoraISO
        pacote.data_repassado_entregador = agoraISO
      } else {
        pacote.status = 'Recebido pela Central'
        pacote.data_chegada = agoraISO
      }

      pacotesACriar.push(pacote)
    }

    const { data, error } = await supabase
      .from('pacotes')
      .insert(pacotesACriar)
      .select()

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 })
    }

    return NextResponse.json({
      pacotes: data,
      codigos: codigosFinais,
      quantidade: data?.length || 0,
      fluxo_automatico: temEntregador,
      mensagem: temEntregador
        ? `${data?.length || 0} pacotes registrados e vinculados ao entregador. Ele precisa aceitar no Acompanhamento.`
        : `${data?.length || 0} pacotes registrados com sucesso`,
    })
  } catch (err) {
    console.error('Erro registrar:', err)
    return NextResponse.json({ erro: 'Erro ao registrar pacote' }, { status: 500 })
  }
}
