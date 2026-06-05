import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { transicaoValida, camposParaTransicao } from '@/lib/maquina-estados'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request)
    if (!session || session.tipo !== 'entregador') {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
    }

    const entregadorId = session.entregador_id || session.id
    const body = await request.json()
    const { codigos } = body

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({ erro: 'Selecione pelo menos um pacote' }, { status: 400 })
    }

    // Buscar pacotes selecionados que pertencem a este entregador
    const { data: pacotes, error: erroBusca } = await supabase
      .from('pacotes')
      .select('codigo, status')
      .eq('entregador_id', entregadorId)
      .in('codigo', codigos)

    if (erroBusca) {
      return NextResponse.json({ erro: erroBusca.message }, { status: 500 })
    }

    if (!pacotes || pacotes.length === 0) {
      return NextResponse.json({ erro: 'Nenhum pacote encontrado' }, { status: 404 })
    }

    const atualizados: Record<string, unknown>[] = []
    const ignorados: string[] = []
    const erros: string[] = []

    for (const pacote of pacotes) {
      // Pular pacotes que já estão "Em Rota"
      if (pacote.status === 'Em Rota') {
        ignorados.push(pacote.codigo)
        continue
      }

      // Validar transição na máquina de estados
      const validacao = transicaoValida(pacote.status, 'Em Rota', 'entregador')
      if (!validacao.valida) {
        erros.push(`${pacote.codigo}: ${validacao.erro}`)
        continue
      }

      const updates = camposParaTransicao(pacote.status, 'Em Rota')
      atualizados.push({ codigo: pacote.codigo, ...updates })
    }

    // Se não há nada para atualizar
    if (atualizados.length === 0) {
      return NextResponse.json({
        ok: true,
        atualizados: 0,
        ignorados: ignorados.length,
        erros: erros.length > 0 ? erros : undefined,
        mensagem: erros.length > 0
          ? `${ignorados.length} ignorado(s) · ${erros.length} erro(s)`
          : `${ignorados.length} pacote(s) já estavam em rota`,
      })
    }

    // Atualizar cada pacote individualmente
    let totalAtualizados = 0
    for (const pacote of atualizados) {
      const { codigo, ...updates } = pacote
      const { error } = await supabase
        .from('pacotes')
        .update(updates)
        .eq('codigo', codigo as string)
        .eq('entregador_id', entregadorId)

      if (!error) totalAtualizados++
    }

    return NextResponse.json({
      ok: true,
      atualizados: totalAtualizados,
      ignorados: ignorados.length,
      erros: erros.length > 0 ? erros : undefined,
      mensagem: `${totalAtualizados} pacote(s) em rota!` +
        (ignorados.length > 0 ? ` · ${ignorados.length} ignorado(s)` : '') +
        (erros.length > 0 ? ` · ${erros.length} erro(s)` : ''),
    })
  } catch (err) {
    console.error('Erro ao iniciar rota em lote:', err)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
