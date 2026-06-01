const fns = require('fs');
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

    if (acao === 'aplicar_valor_global') {
      const valorNumerico = Number(numero || 0)
      if (!valorNumerico || valorNumerico <= 0)
        return NextResponse.json({ erro: 'Valor inválido' }, { status: 400 })
      const { data: atualizados } = await supabase.from('pacotes').update({ valor_pacote: valorNumerico }).select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `✅ ${atualizados?.length || 0} pacotes atualizados para R$ ${valorNumerico.toFixed(2)}!`, quantidade: atualizados?.length || 0 })
    }

    if (acao === 'aplicar_valor_entregadores') {
      const valorNumerico = Number(numero || 0)
      if (!valorNumerico || valorNumerico <= 0)
        return NextResponse.json({ erro: 'Valor inválido' }, { status: 400 })
      const { error: errEnt } = await supabase.from('entregadores').update({ valor_padrao: valorNumerico }).eq('ativo', true)
      if (errEnt) return NextResponse.json({ erro: errEnt.message }, { status: 500 })
      const { data: entr } = await supabase.from('entregadores').select('id').eq('ativo', true)
      const ids = (entr || []).map(e => e.id)
      let total = 0
      for (const id of ids) {
        const { data: pac } = await supabase.from('pacotes').update({ valor_pacote: valorNumerico }).eq('entregador_id', id).select('codigo')
        total += (pac || []).length
      }
      return NextResponse.json({ sucesso: true, mensagem: `✅ Entregadores atualizados + ${total} pacotes para R$ ${valorNumerico.toFixed(2)}!`, quantidade: total })
    }

    if (acao === 'resetar_status_retornados') {
      const { data: retornados } = await supabase.from('pacotes').update({ status: 'Aguardando Retirada', motivo_devolucao: null, foto: null, gps_foto: null }).eq('status', 'Retornado a Central').select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `✅ ${retornados?.length || 0} pacotes retornados voltaram para "Aguardando Retirada"` })
    }

    if (acao === 'limpar_fotos_antigas') {
      const dias = Number(numero || 30)
      const corte = new Date(); corte.setDate(corte.getDate() - dias)
      const { data: fotos } = await supabase.from('pacotes').update({ foto: null }).not('foto', 'is', null).lt('data_entrega_real', corte.toISOString()).select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `✅ ${fotos?.length || 0} fotos com mais de ${dias} dias foram removidas` })
    }

    // NOVAS PREDEFINIÇÕES

    if (acao === 'marcar_atrasados') {
      const agora = new Date().toISOString()
      const statusAtivos = ['Recebido', 'Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota', 'Retornado a Central']
      const { data: pacotes } = await supabase.from('pacotes').update({ observacao: '[ATRASADO] Entrega vencida' }).in('status', statusAtivos).lt('data_limite_entrega', agora).select('codigo')
      try { await supabase.from('pacotes').update({ atrasado: true } as any).in('status', statusAtivos).lt('data_limite_entrega', agora) } catch {}
      return NextResponse.json({ sucesso: true, mensagem: `⚠️ ${pacotes?.length || 0} pacotes marcados como ATRASADOS (data limite vencida)`, quantidade: pacotes?.length || 0 })
    }

    if (acao === 'aplicar_multa_atraso') {
      const percentual = Number(numero || 0)
      if (!percentual || percentual <= 0) return NextResponse.json({ erro: 'Percentual inválido' }, { status: 400 })
      const agora = new Date().toISOString()
      const statusAtivos = ['Recebido', 'Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota']
      const fator = 1 + (percentual / 100)
      const { data: atrasados } = await supabase.from('pacotes').select('codigo, valor_pacote').in('status', statusAtivos).lt('data_limite_entrega', agora)
      let totalMulta = 0, count = 0
      for (const p of (atrasados || [])) {
        const valorOriginal = Number(p.valor_pacote || 0)
        const novoValor = valorOriginal * fator
        const multa = novoValor - valorOriginal
        if (multa > 0) {
          const { error } = await supabase.from('pacotes').update({ valor_pacote: Math.round(novoValor * 100) / 100 }).eq('codigo', p.codigo)
          if (!error) { totalMulta += multa; count++ }
        }
      }
      return NextResponse.json({ sucesso: true, mensagem: `💰 ${count} pacotes multados em ${percentual}% — R$ ${totalMulta.toFixed(2)} em multas aplicadas`, quantidade: count })
    }

    if (acao === 'reajuste_percentual') {
      const percentual = Number(numero || 0)
      if (!percentual) return NextResponse.json({ erro: 'Percentual inválido' }, { status: 400 })
      const fator = 1 + (percentual / 100)
      const { data: todos } = await supabase.from('pacotes').select('codigo, valor_pacote')
      let total = 0
      for (const p of (todos || [])) {
        const valorOriginal = Number(p.valor_pacote || 0)
        const novoValor = Math.round(valorOriginal * fator * 100) / 100
        if (novoValor >= 0) {
          const { error } = await supabase.from('pacotes').update({ valor_pacote: novoValor }).eq('codigo', p.codigo)
          if (!error) total++
        }
      }
      const sinal = percentual > 0 ? '📈 +' : '📉 '
      return NextResponse.json({ sucesso: true, mensagem: `${sinal}${percentual}% aplicado em ${total} pacotes`, quantidade: total })
    }

    if (acao === 'congelar_antigos') {
      const dias = Number(numero || 30)
      const corte = new Date(); corte.setDate(corte.getDate() - dias)
      const { data: congelados } = await supabase.from('pacotes').update({ observacao: `[CONGELADO] Parado há > ${dias} dias` }).in('status', ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota']).lt('data_limite_entrega', corte.toISOString()).select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `🧊 ${congelados?.length || 0} pacotes congelados (> ${dias} dias parados)`, quantidade: congelados?.length || 0 })
    }

    if (acao === 'descongelar') {
      const { data } = await supabase.from('pacotes').update({ observacao: null }).ilike('observacao', '%[CONGELADO]%').select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `🔥 ${data?.length || 0} pacotes descongelados`, quantidade: data?.length || 0 })
    }

    if (acao === 'limpar_marcas_atraso') {
      const { data } = await supabase.from('pacotes').update({ observacao: null }).ilike('observacao', '%[ATRASADO]%').select('codigo')
      return NextResponse.json({ sucesso: true, mensagem: `✅ ${data?.length || 0} marcas de atraso removidas`, quantidade: data?.length || 0 })
    }

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('Erro predefinições:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
