import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'entregador') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const entregadorId = session.id

  try {
    // 1. Pacotes repassados pela central (aguardando retirada) - ainda não entregues
    const { data: previstoCentral } = await supabase
      .from('pacotes')
      .select('valor_pacote, codigo')
      .eq('entregador_id', entregadorId)
      .in('status', ['Aguardando Retirada', 'Recebido pela Central'])
    const totalPrevistoCentral = (previstoCentral || []).reduce(
      (s, p) => s + Number(p.valor_pacote || 0), 0
    )

    // 2. Pacotes já retirados mas ainda não entregues (em andamento)
    const { data: emAndamento } = await supabase
      .from('pacotes')
      .select('valor_pacote, codigo')
      .eq('entregador_id', entregadorId)
      .in('status', ['Retirado pelo Entregador', 'Em Rota'])
    const totalEmAndamento = (emAndamento || []).reduce(
      (s, p) => s + Number(p.valor_pacote || 0), 0
    )

    // 3. Pacotes entregues mas ainda não pagos
    const { data: entreguesNaoPagos } = await supabase
      .from('pacotes')
      .select('valor_pacote, codigo, data_entrega_real')
      .eq('entregador_id', entregadorId)
      .in('status', ['Entregue', 'Validado pelo Admin'])
      .eq('pago', false)
    const totalAReceber = (entreguesNaoPagos || []).reduce(
      (s, p) => s + Number(p.valor_pacote || 0), 0
    )

    // 4. Total já recebido (pagos)
    const { data: recebidos } = await supabase
      .from('pacotes')
      .select('valor_pacote, data_pagamento')
      .eq('entregador_id', entregadorId)
      .eq('pago', true)
    const totalRecebido = (recebidos || []).reduce(
      (s, p) => s + Number(p.valor_pacote || 0), 0
    )

    // 5. Último ciclo de pagamento
    const { data: ultimoCiclo } = await supabase
      .from('pagamentos_entregador')
      .select('*')
      .eq('entregador_id', entregadorId)
      .order('data_pagamento', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 6. Histórico de ciclos (últimos 6)
    const { data: historicoCiclos } = await supabase
      .from('pagamentos_entregador')
      .select('*')
      .eq('entregador_id', entregadorId)
      .order('data_pagamento', { ascending: false })
      .limit(6)

    // 7. Último pagamento_em do entregador
    const { data: entregador } = await supabase
      .from('entregadores')
      .select('ultimo_pagamento_em, valor_padrao')
      .eq('id', entregadorId)
      .single()

    // 8. Total de entregues hoje
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const { count: entreguesHoje } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)
      .eq('status', 'Entregue')
      .gte('data_entrega_real', hoje.toISOString())

    // 9. Total de pacotes (todos)
    const { count: totalPacotes } = await supabase
      .from('pacotes')
      .select('*', { count: 'exact', head: true })
      .eq('entregador_id', entregadorId)

    return NextResponse.json({
      previsoes: {
        repassados_central: {
          quantidade: previstoCentral?.length || 0,
          valor: Number(totalPrevistoCentral.toFixed(2)),
        },
        em_andamento: {
          quantidade: emAndamento?.length || 0,
          valor: Number(totalEmAndamento.toFixed(2)),
        },
        a_receber: {
          quantidade: entreguesNaoPagos?.length || 0,
          valor: Number(totalAReceber.toFixed(2)),
        },
      },
      recebido: {
        total: Number(totalRecebido.toFixed(2)),
        quantidade: recebidos?.length || 0,
      },
      ultimo_pagamento: ultimoCiclo ? {
        data: ultimoCiclo.data_pagamento,
        valor: Number(ultimoCiclo.valor_pago || 0),
        periodo: `${ultimoCiclo.data_inicio} a ${ultimoCiclo.data_fim}`,
        total_entregues: ultimoCiclo.total_entregues,
      } : {
        data: entregador?.ultimo_pagamento_em || null,
        valor: 0,
        periodo: null,
        total_entregues: 0,
      },
      historico_ciclos: (historicoCiclos || []).map(c => ({
        data: c.data_pagamento,
        valor: Number(c.valor_pago || 0),
        periodo: `${c.data_inicio} a ${c.data_fim}`,
        entregues: c.total_entregues,
      })),
      hoje: {
        entregues: entreguesHoje || 0,
      },
      total_pacotes: totalPacotes || 0,
      valor_padrao: Number(entregador?.valor_padrao || 0),
    })
  } catch (error) {
    console.error('Erro financeiro entregador:', error)
    return NextResponse.json({ erro: 'Erro ao carregar dados financeiros' }, { status: 500 })
  }
}
