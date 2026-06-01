import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const entregadorId = session.id
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const hojeStr = hoje.toISOString()

  try {
    // 1. Total de pacotes do entregador
    const { count: totalPacotes } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)

    // 2. Entregues hoje
    const { count: entreguesHoje } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)
      .eq('status', 'Entregue')
      .gte('data_entrega_real', hojeStr)

    // 3. Em andamento (Retirado + Em Rota)
    const { count: emAndamento } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)
      .in('status', ['Retirado pelo Entregador', 'Em Rota'])

    // 4. Na Central (Aguardando Retirada)
    const { count: naCentral } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)
      .in('status', ['Aguardando Retirada', 'Recebido pela Central'])

    // 5. Financeiro - Previsto (todos não-pagos)
    const { data: previstoData } = await supabase
      .from('pacotes')
      .select('valor_pacote')
      .eq('entregador_id', entregadorId)
      .eq('pago', false)
      .neq('status', 'Retornado a Central')
    const totalPrevisto = (previstoData || []).reduce(
      (sum, p) => sum + Number(p.valor_pacote || 0),
      0
    )

    // 6. Financeiro - Recebido (pagos)
    const { data: recebidoData } = await supabase
      .from('pacotes')
      .select('valor_pacote')
      .eq('entregador_id', entregadorId)
      .eq('pago', true)
    const totalRecebido = (recebidoData || []).reduce(
      (sum, p) => sum + Number(p.valor_pacote || 0),
      0
    )

    // 7. Último pagamento
    const { data: ultimoPagamento } = await supabase
      .from('entregadores')
      .select('ultimo_pagamento_em')
      .eq('id', entregadorId)
      .single()

    // 8. Último pagamento detalhado
    const { data: ultimoCiclo } = await supabase
      .from('pagamentos_entregador')
      .select('*')
      .eq('entregador_id', entregadorId)
      .order('data_pagamento', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 9. Últimos 8 pacotes
    const { data: ultimosPacotes } = await supabase
      .from('pacotes')
      .select(
        'codigo, status, endereco_entrega, destinatario, data_limite_entrega, valor_pacote, data_entrega_real'
      )
      .eq('entregador_id', entregadorId)
      .order('data_chegada', { ascending: false })
      .limit(8)

    return NextResponse.json({
      total_pacotes: totalPacotes || 0,
      entregues_hoje: entreguesHoje || 0,
      em_andamento: emAndamento || 0,
      na_central: naCentral || 0,
      financeiro: {
        previsto: Number(totalPrevisto.toFixed(2)),
        recebido: Number(totalRecebido.toFixed(2)),
      },
      ultimo_pagamento: ultimoCiclo
        ? {
            data: ultimoCiclo.data_pagamento,
            valor: Number(ultimoCiclo.valor_pago || 0),
            periodo: `${ultimoCiclo.data_inicio} a ${ultimoCiclo.data_fim}`,
            total_entregues: ultimoCiclo.total_entregues,
          }
        : null,
      ultimo_pagamento_em: ultimoPagamento?.ultimo_pagamento_em || null,
      ultimos_pacotes: ultimosPacotes || [],
    })
  } catch (error) {
    console.error('Erro no dashboard:', error)
    return NextResponse.json({ erro: 'Erro ao carregar dashboard' }, { status: 500 })
  }
}
