import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || 'hoje'
  const status = searchParams.get('status') || 'pendentes_validacao'

  let query = supabase
    .from('pacotes')
    .select('codigo, destinatario, endereco_entrega, status, foto, gps_foto, data_entrega_real, data_chegada, entregador_id, valor_pacote, validacao_admin')

  // Status filter
  if (status === 'pendentes_validacao') {
    query = query.in('status', ['Entregue', 'Validado pelo Admin'])
      .not('foto', 'is', null)
      .eq('validacao_admin', false)
  } else if (status === 'validados') {
    query = query.eq('validacao_admin', true)
  }

  // Period filter
  if (periodo && periodo !== 'tudo') {
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)

    switch (periodo) {
      case 'hoje': break
      case '7d': inicio.setDate(inicio.getDate() - 7); break
      case '15d': inicio.setDate(inicio.getDate() - 15); break
      case '60d': inicio.setDate(inicio.getDate() - 60); break
    }

    query = query.gte('data_entrega_real', inicio.toISOString())
    query = query.lte('data_entrega_real', hoje.toISOString())
  }

  const { data: pacotes } = await query.order('data_entrega_real', { ascending: false }).limit(200)

  if (!pacotes) {
    return NextResponse.json({ fotos: [] })
  }

  // Busca nomes dos entregadores
  const entregadorIds = Array.from(new Set(pacotes.map(p => p.entregador_id)))
  const { data: entregadores } = await supabase
    .from('entregadores')
    .select('id, nome')
    .in('id', entregadorIds)

  const entregadorMap = new Map((entregadores || []).map(e => [e.id, e.nome]))

  const fotos = pacotes.map(p => ({
    ...p,
    entregador_nome: entregadorMap.get(p.entregador_id) || '—',
    tem_foto: !!p.foto,
    tem_gps: !!p.gps_foto,
  }))

  return NextResponse.json({ fotos })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { acao, codigos, periodo, manter_gps } = body

    if (acao === 'limpar_fotos') {
      let query = supabase.from('pacotes').update({ foto: null })

      if (codigos && codigos.length > 0) {
        query = query.in('codigo', codigos)
      } else if (periodo) {
        const hoje = new Date()
        hoje.setHours(23, 59, 59, 999)
        const inicio = new Date()
        inicio.setHours(0, 0, 0, 0)

        switch (periodo) {
          case 'hoje': break
          case '7d': inicio.setDate(inicio.getDate() - 7); break
          case '15d': inicio.setDate(inicio.getDate() - 15); break
          case '60d': inicio.setDate(inicio.getDate() - 60); break
        }

        query = query.gte('data_entrega_real', inicio.toISOString()).lte('data_entrega_real', hoje.toISOString())
      }

      const { data, error } = await query.select('codigo')

      if (error) {
        return NextResponse.json({ erro: 'Erro ao limpar fotos', detalhe: error.message }, { status: 500 })
      }

      // Limpa storage em background
      if (data && data.length > 0) {
        for (const p of data) {
          if (p.codigo) {
            const { data: pacote } = await supabase.from('pacotes').select('foto').eq('codigo', p.codigo).single()
            if (pacote?.foto) {
              const filename = pacote.foto.split('/').pop()
              if (filename) {
                supabase.storage.from('fotos').remove([`entregas/${filename}`]).catch(() => {})
              }
            }
          }
        }
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${data?.length || 0} foto(s) removida(s) com sucesso!`,
        quantidade: data?.length || 0,
      })
    }

    if (acao === 'validar') {
      if (!codigos || codigos.length === 0) {
        return NextResponse.json({ erro: 'Nenhum pacote selecionado' }, { status: 400 })
      }

      const agora = new Date().toISOString()

      const { data, error } = await supabase
        .from('pacotes')
        .update({ validacao_admin: true, data_validacao_admin: agora, status: 'Validado pelo Admin' })
        .in('codigo', codigos)
        .select('codigo')

      if (error) {
        return NextResponse.json({ erro: 'Erro ao validar', detalhe: error.message }, { status: 500 })
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${data?.length || 0} pacote(s) validado(s)! Status alterado para "Validado pelo Admin".`,
        quantidade: data?.length || 0,
      })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('Erro no gerenciamento de fotos:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
