import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { gerarCodigoPacote, sanitizeText, sanitizeFloat } from '@/lib/utils'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const entregador = searchParams.get('entregador_id')
  const dataIni = searchParams.get('data_ini')
  const dataFim = searchParams.get('data_fim')

  let query = supabase
    .from('pacotes')
    .select('*, entregadores(nome, telefone)', { count: 'exact' })
    .order('data_chegada', { ascending: false })

  if (status) query = query.eq('status', status)
  if (entregador) query = query.eq('entregador_id', parseInt(entregador))
  if (dataIni) query = query.gte('data_chegada', dataIni)
  if (dataFim) query = query.lte('data_chegada', dataFim)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
  return NextResponse.json({ pacotes: data, total: count })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const codigo = gerarCodigoPacote()

    const pacote = {
      codigo,
      nf_remessa: sanitizeText(body.nf_remessa || ''),
      destinatario: sanitizeText(body.destinatario || ''),
      descricao: sanitizeText(body.descricao || ''),
      quantidade: parseInt(body.quantidade) || 1,
      endereco_entrega: sanitizeText(body.endereco_entrega || ''),
      data_limite_entrega: body.data_limite_entrega || null,
      entregador_id: body.entregador_id ? parseInt(body.entregador_id) : null,
      valor_pacote: sanitizeFloat(body.valor_pacote) || 0.50,
      observacoes: sanitizeText(body.observacoes || ''),
      transportadora: sanitizeText(body.transportadora || ''),
      status: 'Recebido pela Central'
    }

    const { data, error } = await supabase
      .from('pacotes')
      .insert(pacote)
      .select()
      .single()

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 })
    return NextResponse.json({ pacote: data })
  } catch (err) {
    return NextResponse.json({ erro: 'Erro ao registrar pacote' }, { status: 500 })
  }
}
