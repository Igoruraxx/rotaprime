import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function GET() {
  try {
    const { data } = await supabase.from('configuracoes_sistema')
      .select('chave, valor_colecao')
      .eq('tipo', 'predefinicao')

    return NextResponse.json({ sucesso: true, data })
  } catch {
    return NextResponse.json({ erro: 'Erro ao carregar' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { acao, numero } = await request.json()
    console.log('Predefinições:', acao, numero)

    // ─────────────────────────────────────────────────
    // VALOR GLOBAL em TODOS os pacotes
    // ─────────────────────────────────────────────────
    if (acao === 'aplicar_valor_global') {
      const valorNumerico = Number(numero || 0)
      if (!valorNumerico || valorNumerico <= 0) {
        return NextResponse.json({ erro: 'Valor inválido' }, { status: 400 })
      }

      const { data: atualizados } = await supabase
        .from('pacotes')
        .update({ valor_pacote: valorNumerico })
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${atualizados?.length || 0} pacotes atualizados para R$ ${valorNumerico.toFixed(2)}!`,
        quantidade: atualizados?.length || 0,
      })
    }

    // ─────────────────────────────────────────────────
    // VALOR GLOBAL em Entregadores + Pacotes
    // ─────────────────────────────────────────────────
    if (acao === 'aplicar_valor_entregadores') {
      const valorNumerico = Number(numero || 0)
      if (!valorNumerico || valorNumerico <= 0) {
        return NextResponse.json({ erro: 'Valor inválido' }, { status: 400 })
      }

      const { error: errEnt } = await supabase
        .from('entregadores')
        .update({ valor_padrao: valorNumerico })
        .eq('ativo', true)

      if (errEnt) {
        return NextResponse.json({ erro: errEnt.message }, { status: 500 })
      }

      const { data: entr } = await supabase
        .from('entregadores')
        .select('id')
        .eq('ativo', true)

      const ids = (entr || []).map(e => e.id)
      let total = 0

      for (const id of ids) {
        const { data: pac } = await supabase
          .from('pacotes')
          .update({ valor_pacote: valorNumerico })
          .eq('entregador_id', id)
          .select('codigo')
        total += (pac || []).length
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ Entregadores atualizados + ${total} pacotes para R$ ${valorNumerico.toFixed(2)}!`,
        quantidade: total,
      })
    }

    // ─────────────────────────────────────────────────
    // RESETAR RETORNADOS → Aguardando Retirada
    // ─────────────────────────────────────────────────
    if (acao === 'resetar_status_retornados') {
      const { data: retornados } = await supabase
        .from('pacotes')
        .update({
          status: 'Aguardando Retirada',
          motivo_devolucao: null,
          foto: null,
          gps_foto: null,
        })
        .eq('status', 'Retornado a Central')
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${retornados?.length || 0} pacotes retornados voltaram para "Aguardando Retirada"`,
      })
    }

    // ─────────────────────────────────────────────────
    // LIMPAR FOTOS ANTIGAS
    // ─────────────────────────────────────────────────
    if (acao === 'limpar_fotos_antigas') {
      const dias = Number(numero || 30)
      const corte = new Date()
      corte.setDate(corte.getDate() - dias)

      const { data: fotos } = await supabase
        .from('pacotes')
        .update({ foto: null })
        .not('foto', 'is', null)
        .lt('data_entrega_real', corte.toISOString())
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${fotos?.length || 0} fotos com mais de ${dias} dias foram removidas`,
      })
    }

    // ═════════════════════════════════════════════════
    // NOVAS PREDEFINIÇÕES
    // ═════════════════════════════════════════════════

    // ─────────────────────────────────────────────────
    // MARCAR TODOS COMO ATRASADO
    // Marca pacotes com data_limite_entrega já passada
    // e status ainda ativo (não entregue/finalizado)
    // ─────────────────────────────────────────────────
    if (acao === 'marcar_atrasados') {
      const agora = new Date().toISOString()

      const statusAtivos = [
        'Recebido',
        'Aguardando Retirada',
        'Retirado pelo Entregador',
        'Em Rota',
        'Retornado a Central',
      ]

      // Atualiza apenas a observacao para marcar como atrasado
      // (coluna `atrasado` será usada após migration 00008)
      const { data: pacotes } = await supabase
        .from('pacotes')
        .update({ observacao: '[ATRASADO] Entrega vencida' })
        .in('status', statusAtivos)
        .lt('data_limite_entrega', agora)
        .select('codigo')

      // Se conseguiu (coluna atrasado nao existe, ok),
      // tenta também setar a coluna atrasado se existir
      try {
        await supabase
          .from('pacotes')
          .update({ atrasado: true } as any)
          .in('status', statusAtivos)
          .lt('data_limite_entrega', agora)
      } catch {}

      return NextResponse.json({
        sucesso: true,
        mensagem: `⚠️ ${pacotes?.length || 0} pacotes marcados como ATRASADOS (data limite vencida)`,
        quantidade: pacotes?.length || 0,
      })
    }

    // ─────────────────────────────────────────────────
    // APLICAR MULTA POR ATRASO
    // Aplica R$ 1,00 por dia de atraso no valor do pacote
    // Reduz o valor do pacote e registra na tabela multas
    // ─────────────────────────────────────────────────
    if (acao === 'aplicar_multa_atraso') {
      const agora = new Date()
      const statusAtivos = [
        'Recebido', 'Aguardando Retirada',
        'Retirado pelo Entregador', 'Em Rota',
      ]

      // Busca pacotes atrasados com entregador
      const { data: atrasados } = await supabase
        .from('pacotes')
        .select('codigo, valor_pacote, entregador_id, data_limite_entrega')
        .in('status', statusAtivos)
        .lt('data_limite_entrega', agora.toISOString())
        .not('entregador_id', 'is', null)

      if (!atrasados || atrasados.length === 0) {
        return NextResponse.json({ erro: 'Nenhum pacote atrasado com entregador encontrado' }, { status: 400 })
      }

      let totalMulta = 0
      let count = 0
      const multasInserir: any[] = []

      for (const p of atrasados) {
        const dataLimite = new Date(p.data_limite_entrega)
        const diffMs = agora.getTime() - dataLimite.getTime()
        const diasAtraso = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
        const valorMulta = Math.min(diasAtraso * 1, Number(p.valor_pacote || 0)) // max = valor do pacote
        const novoValor = Math.max(0, Number(p.valor_pacote || 0) - valorMulta)

        if (valorMulta <= 0) continue

        // Atualiza valor do pacote (reduz)
        const { error } = await supabase
          .from('pacotes')
          .update({ valor_pacote: Math.round(novoValor * 100) / 100 })
          .eq('codigo', p.codigo)

        if (!error) {
          multasInserir.push({
            pacote_codigo: p.codigo,
            entregador_id: p.entregador_id,
            dias_atraso: diasAtraso,
            valor_multa: Math.round(valorMulta * 100) / 100,
          })
          totalMulta += valorMulta
          count++
        }
      }

      // Insere registros na tabela multas
      if (multasInserir.length > 0) {
        await supabase.from('multas').insert(multasInserir)
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `💰 ${count} pacote(s) multado(s) — R$ ${totalMulta.toFixed(2)} em descontos (R$ 1/dia de atraso)`,
        quantidade: count,
        valor_total: Math.round(totalMulta * 100) / 100,
      })
    }

    // ─────────────────────────────────────────────────
    // REAJUSTE PERCENTUAL (positivo ou negativo)
    // Aplica % em TODOS os pacotes independente de status
    // ─────────────────────────────────────────────────
    if (acao === 'reajuste_percentual') {
      const percentual = Number(numero || 0)
      if (!percentual) {
        return NextResponse.json({ erro: 'Percentual inválido' }, { status: 400 })
      }

      const fator = 1 + (percentual / 100)

      const { data: todos } = await supabase
        .from('pacotes')
        .select('codigo, valor_pacote')

      let total = 0
      for (const p of (todos || [])) {
        const valorOriginal = Number(p.valor_pacote || 0)
        const novoValor = Math.round(valorOriginal * fator * 100) / 100
        if (novoValor >= 0) {
          const { error } = await supabase
            .from('pacotes')
            .update({ valor_pacote: novoValor })
            .eq('codigo', p.codigo)
          if (!error) total++
        }
      }

      const sinal = percentual > 0 ? '📈 +' : '📉 '
      return NextResponse.json({
        sucesso: true,
        mensagem: `${sinal}${percentual}% aplicado em ${total} pacotes`,
        quantidade: total,
      })
    }

    // ─────────────────────────────────────────────────
    // CONGELAR PACOTES ANTIGOS
    // ─────────────────────────────────────────────────
    if (acao === 'congelar_antigos') {
      const dias = Number(numero || 30)
      const corte = new Date()
      corte.setDate(corte.getDate() - dias)

      const { data: congelados } = await supabase
        .from('pacotes')
        .update({ observacao: `[CONGELADO] Parado há > ${dias} dias` })
        .in('status', ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota'])
        .lt('data_limite_entrega', corte.toISOString())
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `🧊 ${congelados?.length || 0} pacotes congelados (> ${dias} dias parados)`,
        quantidade: congelados?.length || 0,
      })
    }

    // ─────────────────────────────────────────────────
    // DESCONGELAR TUDO
    // ─────────────────────────────────────────────────
    if (acao === 'descongelar') {
      const { data } = await supabase
        .from('pacotes')
        .update({ observacao: null })
        .ilike('observacao', '%[CONGELADO]%')
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `🔥 ${data?.length || 0} pacotes descongelados`,
        quantidade: data?.length || 0,
      })
    }

    // ─────────────────────────────────────────────────
    // LIMPAR MARCAS DE ATRASO
    // ─────────────────────────────────────────────────
    if (acao === 'limpar_marcas_atraso') {
      const { data } = await supabase
        .from('pacotes')
        .update({ observacao: null })
        .ilike('observacao', '%[ATRASADO]%')
        .select('codigo')

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${data?.length || 0} marcas de atraso removidas`,
        quantidade: data?.length || 0,
      })
    }

    // ═════════════════════════════════════════════════
    // NOVAS: GESTÃO DE PAGAMENTOS PENDENTES
    // ═════════════════════════════════════════════════

    // ─────────────────────────────────────────────────
    // MARCAR PENDENTES DE PAGAMENTO
    // Marca pacotes ENTREGUES/FINALIZADOS que ainda
    // não foram pagos (pago = FALSE)
    // ─────────────────────────────────────────────────
    if (acao === 'marcar_pendentes_pagamento') {
      const statusParaPendente = [
        'Validado pelo Admin',
      ]

      // Marca observacao e tenta setar pendente_pagamento = true
      const { data: pendentes, error } = await supabase
        .from('pacotes')
        .update({
          observacao: '[PENDENTE] Pagamento nao realizado',
          data_previsao_pagamento: null,
        } as any)
        .in('status', statusParaPendente)
        .eq('pago', false)
        .select('codigo, valor_pacote, entregador_id')

      // Tenta também setar pendente_pagamento = true (se coluna existir)
      try {
        await supabase
          .from('pacotes')
          .update({ pendente_pagamento: true } as any)
          .in('status', statusParaPendente)
          .eq('pago', false)
      } catch {}

      if (error) {
        return NextResponse.json({ erro: error.message }, { status: 500 })
      }

      const totalValor = (pendentes || []).reduce(
        (acc, p) => acc + Number(p.valor_pacote || 0), 0
      )

      return NextResponse.json({
        sucesso: true,
        mensagem: `💳 ${pendentes?.length || 0} pacotes marcados como PENDENTES DE PAGAMENTO — R$ ${totalValor.toFixed(2)} a pagar`,
        quantidade: pendentes?.length || 0,
        valor_total: totalValor,
      })
    }

    // ─────────────────────────────────────────────────
    // LIMPAR PENDÊNCIAS DE PAGAMENTO
    // ─────────────────────────────────────────────────
    if (acao === 'limpar_pendencias_pagamento') {
      const { data } = await supabase
        .from('pacotes')
        .update({ observacao: null })
        .ilike('observacao', '%[PENDENTE]%')
        .select('codigo')

      try {
        await supabase
          .from('pacotes')
          .update({ pendente_pagamento: false } as any)
          .eq('pendente_pagamento', true)
      } catch {}

      return NextResponse.json({
        sucesso: true,
        mensagem: `✅ ${data?.length || 0} marcas de pendência de pagamento removidas`,
        quantidade: data?.length || 0,
      })
    }

    // ─────────────────────────────────────────────────
    // RELATÓRIO / PRÉVIA DE PAGAMENTOS PENDENTES
    // Retorna um resumo de tudo que está pendente de
    // pagamento, agrupado por entregador
    // ─────────────────────────────────────────────────
    if (acao === 'previsao_pagamentos') {
      // Tenta usar a função SQL se existir
      try {
        const { data: funcao } = await supabase
          .rpc('previsao_pagamentos_futuros' as any)

        if (funcao && Array.isArray(funcao) && funcao.length > 0) {
          const totalGeral = funcao.reduce((acc: number, r: any) => acc + Number(r.valor_total || 0), 0)
          const totalPacotes = funcao.reduce((acc: number, r: any) => acc + Number(r.total_pacotes || 0), 0)

          return NextResponse.json({
            sucesso: true,
            mensagem: `📊 ${totalPacotes} pacotes pendentes — R$ ${totalGeral.toFixed(2)} no total`,
            entregadores: funcao,
            total_pacotes: totalPacotes,
            valor_total: totalGeral,
          })
        }
      } catch {}

      // Fallback: busca manual
      const { data: entregadores } = await supabase
        .from('entregadores')
        .select('id, nome')
        .eq('ativo', true)

      const resultado: any[] = []
      let totalGeralValor = 0
      let totalGeralPacotes = 0

      for (const ent of (entregadores || [])) {
        const { data: pacotesEnt } = await supabase
          .from('pacotes')
          .select('codigo, valor_pacote, status')
          .eq('entregador_id', ent.id)
          .eq('pago', false)

        if (pacotesEnt && pacotesEnt.length > 0) {
          const total = pacotesEnt.reduce((acc, p) => acc + Number(p.valor_pacote || 0), 0)
          const entregues = pacotesEnt.filter(p => p.status === 'Entregue' || p.status === 'Finalizado').length
          const emRota = pacotesEnt.filter(p => ['Retirado pelo Entregador', 'Em Rota'].includes(p.status || '')).length

          resultado.push({
            entregador_id: ent.id,
            entregador_nome: ent.nome,
            total_pacotes: pacotesEnt.length,
            valor_total: total,
            qtd_entregues: entregues,
            qtd_em_rota: emRota,
          })
          totalGeralValor += total
          totalGeralPacotes += pacotesEnt.length
        }
      }

      return NextResponse.json({
        sucesso: true,
        mensagem: `📊 ${totalGeralPacotes} pacotes pendentes — R$ ${totalGeralValor.toFixed(2)} no total (${resultado.length} entregadores)`,
        entregadores: resultado,
        total_pacotes: totalGeralPacotes,
        valor_total: totalGeralValor,
      })
    }

    // ─────────────────────────────────────────────────
    // MARCAR ATRASADOS + PENDÊNCIAS (Combo)
    // Executa marcar_atrasados + marcar_pendentes_pagamento
    // em sequência
    // ─────────────────────────────────────────────────
    if (acao === 'marcar_atrasados_completo') {
      const agora = new Date().toISOString()
      const statusAtivos = [
        'Recebido', 'Aguardando Retirada',
        'Retirado pelo Entregador', 'Em Rota',
        'Retornado a Central',
      ]

      // Passo 1: Marca ATRASADOS (data limite vencida)
      const { data: atrasados } = await supabase
        .from('pacotes')
        .update({ observacao: '[ATRASADO] Entrega vencida' })
        .in('status', statusAtivos)
        .lt('data_limite_entrega', agora)
        .select('codigo')

      const qtdAtrasados = atrasados?.length || 0

      // Passo 2: Marca PENDENTES DE PAGAMENTO
      const statusPendente = ['Validado pelo Admin']
      const { data: pendentes } = await supabase
        .from('pacotes')
        .update({ observacao: '[PENDENTE] Pagamento nao realizado' })
        .in('status', statusPendente)
        .eq('pago', false)
        .select('codigo, valor_pacote')

      const qtdPendentes = pendentes?.length || 0
      const valorPendente = (pendentes || []).reduce((acc, p) => acc + Number(p.valor_pacote || 0), 0)

      // Tenta colunas novas se existirem
      try {
        await supabase
          .from('pacotes')
          .update({ atrasado: true } as any)
          .in('status', statusAtivos)
          .lt('data_limite_entrega', agora)
      } catch {}
      try {
        await supabase
          .from('pacotes')
          .update({ pendente_pagamento: true } as any)
          .in('status', statusPendente)
          .eq('pago', false)
      } catch {}

      return NextResponse.json({
        sucesso: true,
        mensagem: `⚠️ ${qtdAtrasados} atrasados + 💳 ${qtdPendentes} pendentes de pagamento (R$ ${valorPendente.toFixed(2)})`,
        qtd_atrasados: qtdAtrasados,
        qtd_pendentes: qtdPendentes,
        valor_pendente: valorPendente,
      })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('Erro predefinições:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
