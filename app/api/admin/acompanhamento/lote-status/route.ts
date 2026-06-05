import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { camposParaTransicao, STATUS_RESTRITOS_ADMIN, STATUS_EXIGE_ENTREGADOR } from '@/lib/maquina-estados'

export async function PUT(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { codigos, novoStatus, entregador_id } = body

    if (!codigos || !Array.isArray(codigos) || codigos.length === 0) {
      return NextResponse.json({ erro: 'Selecione pelo menos um pacote' }, { status: 400 })
    }
    if (!novoStatus) {
      return NextResponse.json({ erro: 'Informe o novo status' }, { status: 400 })
    }

    // ❌ Admin NUNCA pode definir "Em Rota" ou "Entregue"
    if (STATUS_RESTRITOS_ADMIN.has(novoStatus)) {
      return NextResponse.json({
        erro: `"${novoStatus}" só pode ser definido pelo entregador responsável pelo pacote, não pelo admin.`,
      }, { status: 403 })
    }

    // ❌ Status que exigem entregador selecionado
    if (STATUS_EXIGE_ENTREGADOR.has(novoStatus) && !entregador_id) {
      return NextResponse.json({
        erro: `Para alterar para "${novoStatus}" é obrigatório selecionar um entregador responsável.`,
        exigeEntregador: true,
      }, { status: 400 })
    }

    // Buscar status atual dos pacotes selecionados
    const { data: pacotesAtuais, error: erroBusca } = await supabase
      .from('pacotes')
      .select('codigo, status')
      .in('codigo', codigos)

    if (erroBusca) {
      return NextResponse.json({ erro: erroBusca.message }, { status: 500 })
    }

    if (!pacotesAtuais || pacotesAtuais.length === 0) {
      return NextResponse.json({ erro: 'Nenhum pacote encontrado' }, { status: 404 })
    }

    const atualizados: Record<string, unknown>[] = []
    const ignorados: string[] = []
    const erros: string[] = []

    for (const pacote of pacotesAtuais) {
      if (pacote.status === novoStatus) {
        ignorados.push(pacote.codigo)
        continue
      }

      const updates = camposParaTransicao(pacote.status, novoStatus)

      if (!updates.status) {
        erros.push(`${pacote.codigo}: transição inválida de "${pacote.status}" para "${novoStatus}"`)
        continue
      }

      // Se o status exige entregador, aplica o ID em todos os pacotes
      if (STATUS_EXIGE_ENTREGADOR.has(novoStatus) && entregador_id) {
        updates.entregador_id = parseInt(entregador_id)
        // Garante timeline completa
        const agora = new Date().toISOString()
        updates.data_repassado_entregador = agora
        if (novoStatus === 'Retirado pelo Entregador') {
          updates.data_retirada_central = agora
        }
      }

      atualizados.push({
        codigo: pacote.codigo,
        ...updates,
      })
    }

    if (atualizados.length === 0) {
      return NextResponse.json({
        ok: true,
        atualizados: 0,
        ignorados: ignorados.length,
        erros: erros.length > 0 ? erros : undefined,
        mensagem: erros.length > 0
          ? `${ignorados.length} ignorado(s) · ${erros.length} erro(s)`
          : `${ignorados.length} pacote(s) já estavam neste status`,
      })
    }

    let totalAtualizados = 0
    for (const pacote of atualizados) {
      const { codigo, ...updates } = pacote
      const { error } = await supabase
        .from('pacotes')
        .update(updates)
        .eq('codigo', codigo as string)

      if (!error) totalAtualizados++
    }

    return NextResponse.json({
      ok: true,
      atualizados: totalAtualizados,
      ignorados: ignorados.length,
      erros: erros.length > 0 ? erros : undefined,
      mensagem: `${totalAtualizados} pacote(s) atualizado(s) para "${novoStatus}"` +
        (ignorados.length > 0 ? ` · ${ignorados.length} já estavam neste status` : '') +
        (erros.length > 0 ? ` · ${erros.length} erro(s)` : ''),
    })
  } catch (err) {
    console.error('Erro lote-status:', err)
    return NextResponse.json({ erro: 'Erro ao processar lote' }, { status: 500 })
  }
}
