import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodo = searchParams.get('periodo') || '7d'
  const dataInicio = searchParams.get('data_inicio')
  const status = searchParams.get('status') || 'todos'

  let query = supabase
    .from('pacotes')
    .select('codigo, destinatario, endereco_entrega, status, foto, gps_foto, data_entrega_real, data_chegada, entregador_id, valor_pacote')

  // Filtrar apenas quem tem foto ou já está entregue
  if (status === 'com_foto') {
    query = query.not('foto', 'is', null)
  } else if (status === 'sem_foto') {
    query = query.is('foto', null)
  } else if (status === 'entregues') {
    query = query.in('status', ['Entregue', 'Validado pelo Admin'])
  } else if (status === 'validados') {
    query = query.eq('validacao_admin', true)
  } else if (status === 'pendentes_validacao') {
    query = query.in('status', ['Entregue', 'Validado pelo Admin']).not('foto', 'is', null).eq('validacao_admin', false)
  }

  // Filtro por período (data_entrega_real)
  if (periodo && periodo !== 'tudo') {
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)
    const inicio = new Date()
    inicio.setHours(0, 0, 0, 0)

    switch (periodo) {
      case 'hoje': break
      case '7d': inicio.setDate(inicio.getDate() - 7); break
      case '30d': inicio.setDate(inicio.getDate() - 30); break
      case '90d': inicio.setDate(inicio.getDate() - 90); break
    }

    query = query.gte('data_entrega_real', inicio.toISOString())
    query = query.lte('data_entrega_real', hoje.toISOString())
  }

  if (dataInicio) {
    query = query.gte('data_entrega_real', new Date(dataInicio).toISOString())
  }

  // Busca nomes dos entregadores
  const { data: pacotes } = await query.order('data_entrega_real', { ascending: false }).limit(100)

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
          case '30d': inicio.setDate(inicio.getDate() - 30); break
          case '90d': inicio.setDate(inicio.getDate() - 90); break
        }

        query = query.gte('data_entrega_real', inicio.toISOString()).lte('data_entrega_real', hoje.toISOString())
      }

      const { data, error } = await query.select('codigo')

      if (error) {
        return NextResponse.json({ erro: 'Erro ao limpar fotos', detalhe: error.message }, { status: 500 })
      }

      // Também limpa do storage (em background)
      if (data && data.length > 0) {
        // Tenta remover do storage (não blocking)
        for (const p of data) {
          if (p.codigo) {
            // Delete do storage bucket em lote
            const { data: pacote } = await supabase.from('pacotes').select('foto').eq('codigo', p.codigo).single()
            if (pacote?.foto) {
              const pathParts = pacote.foto.split('/')
              const filename = pathParts[pathParts.length - 1]
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

      const { data, error } = await supabase
        .from('pacotes')
        .update({ validacao_admin: true })
        .in('codigo', codigos)
        .select('codigo')

      if (error) {
        return NextResponse.json({ erro: 'Erro ao validar', detalhe: error.message }, { status: 500 })
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${data?.length || 0} pacote(s) validado(s)!`,
        quantidade: data?.length || 0,
      })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('Erro no gerenciamento de fotos:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
