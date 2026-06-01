import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 })
  }

  const hoje = new Date()
  const dataStr = hoje.toISOString().split('T')[0]
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()

  const [
    { data: pacotesHoje },
    { data: entregadores },
    { data: finalizacoesHoje },
  ] = await Promise.all([
    supabase
      .from('pacotes')
      .select('codigo, status, entregador_id, valor_pacote')
      .gte('data_chegada', inicioHoje)
      .lte('data_chegada', fimHoje),

    supabase
      .from('entregadores')
      .select('id, nome, valor_padrao, telefone')
      .eq('ativo', true)
      .order('nome'),

    supabase
      .from('finalizacao_dia_entregador')
      .select('id, entregador_id, data, total_pacotes, total_entregues, total_falhas, total_valor, total_pago')
      .gte('data', inicioHoje)
      .lte('data', fimHoje),
  ])

  const lista = pacotesHoje || []
  const finalsMap = new Map<number, { total_pacotes: number; total_entregues: number; total_falhas: number; total_valor: number; data: string }>()
  for (const f of (finalizacoesHoje || [])) {
    finalsMap.set(f.entregador_id, {
      total_pacotes: f.total_pacotes,
      total_entregues: f.total_entregues,
      total_falhas: f.total_falhas,
      total_valor: Number(f.total_valor || 0),
      data: f.data,
    })
  }

  const resumoEntregadores = (entregadores || []).map(e => {
    const pEntregador = lista.filter(p => p.entregador_id === e.id)
    const entregues = pEntregador.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
    const retornados = pEntregador.filter(p => p.status === 'Retornado a Central')
    const valorTotal = entregues.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)
    const jaFinalizado = finalsMap.has(e.id)
    const finalData = finalsMap.get(e.id)

    return {
      id: e.id,
      nome: e.nome,
      telefone: e.telefone || null,
      valor_padrao: e.valor_padrao || 0,
      total: pEntregador.length,
      entregues: entregues.length,
      retornados: retornados.length,
      valor_total: valorTotal,
      finalizado: jaFinalizado,
      finalizado_em: finalData?.data || null,
      finalizado_total_pacotes: finalData?.total_pacotes || 0,
      finalizado_total_entregues: finalData?.total_entregues || 0,
      finalizado_total_falhas: finalData?.total_falhas || 0,
      finalizado_valor_total: finalData?.total_valor || 0,
    }
  })

  const totalPacotes = lista.length
  const totalEntregues = lista.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
  const totalPendentes = lista.filter(p => p.status !== 'Entregue' && p.status !== 'Validado pelo Admin').length
  const todosFinalizados = resumoEntregadores.length > 0 && resumoEntregadores.every(e => e.total === 0 || e.finalizado)

  return NextResponse.json({
    data: dataStr,
    dia_aberto: !todosFinalizados,
    abre_as: '00:01',
    fecha_as: '23:59',
    stats: {
      total_pacotes: totalPacotes,
      total_entregues: totalEntregues,
      total_pendentes: totalPendentes,
    },
    entregadores: resumoEntregadores,
    todos_finalizados: todosFinalizados,
  })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Nao autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const entregadorId = body.entregador_id ? parseInt(body.entregador_id) : null
    const entregadorIds: number[] | undefined = body.entregador_ids

    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString()
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString()
    const dataStr = hoje.toISOString().split('T')[0]
    const horarioFinalizacao = hoje.toISOString()

    // Buscar pacotes do dia
    const { data: pacotes } = await supabase
      .from('pacotes')
      .select('codigo, status, entregador_id, valor_pacote')
      .gte('data_chegada', inicioHoje)
      .lte('data_chegada', fimHoje)

    const lista = pacotes || []

    // Determinar quais entregadores finalizar
    let idsFinalizar: number[] = []
    if (entregadorId) {
      idsFinalizar = [entregadorId]
    } else if (entregadorIds && entregadorIds.length > 0) {
      idsFinalizar = entregadorIds
    } else {
      // Todos os entregadores com pacotes no dia que ainda nao foram finalizados
      const { data: jaFinalizados } = await supabase
        .from('finalizacao_dia_entregador')
        .select('entregador_id')
        .gte('data', inicioHoje)
        .lte('data', fimHoje)

      const idsJaFeitos = new Set((jaFinalizados || []).map(f => f.entregador_id))
      const idsComPacotes = new Set(lista.map(p => p.entregador_id).filter(Boolean))
      idsFinalizar = Array.from(idsComPacotes).filter(id => !idsJaFeitos.has(id))
    }

    const resultados: { entregador_id: number; nome: string; total: number; entregues: number; falhas: number; valor: number }[] = []

    for (const eid of idsFinalizar) {
      const pEntregador = lista.filter(p => p.entregador_id === eid)
      if (pEntregador.length === 0) continue

      const entregues = pEntregador.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
      const falhas = pEntregador.filter(p => p.status === 'Retornado a Central')
      const valorTotal = entregues.reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

      // Verificar se ja foi finalizado hoje
      const { data: existente } = await supabase
        .from('finalizacao_dia_entregador')
        .select('id')
        .eq('entregador_id', eid)
        .gte('data', inicioHoje)
        .lte('data', fimHoje)
        .limit(1)

      if (existente && existente.length > 0) {
        resultados.push({ entregador_id: eid, nome: `Entregador #${eid}`, total: pEntregador.length, entregues: entregues.length, falhas: falhas.length, valor: valorTotal })
        continue
      }

      const { error: errInsert } = await supabase
        .from('finalizacao_dia_entregador')
        .insert({
          entregador_id: eid,
          data: dataStr,
          total_pacotes: pEntregador.length,
          total_entregues: entregues.length,
          total_falhas: falhas.length,
          total_valor: valorTotal.toFixed(2),
          total_pago: 0,
        })

      if (errInsert) {
        console.error('Erro ao finalizar entregador', eid, errInsert.message)
        continue
      }

      // Buscar nome
      const { data: entData } = await supabase
        .from('entregadores')
        .select('nome')
        .eq('id', eid)
        .single()

      resultados.push({
        entregador_id: eid,
        nome: entData?.nome || `Entregador #${eid}`,
        total: pEntregador.length,
        entregues: entregues.length,
        falhas: falhas.length,
        valor: valorTotal,
      })
    }

    // Tambem tentar inserir finalizacao geral se nao existir
    if (idsFinalizar.length > 0) {
      const { data: geralExistente } = await supabase
        .from('finalizacao_dia')
        .select('id')
        .eq('data', dataStr)
        .limit(1)

      if (!geralExistente || geralExistente.length === 0) {
        const totalRegistrados = lista.length
        const totalEntreguesGeral = lista.filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin').length
        const totalFalhasGeral = lista.filter(p => p.status === 'Retornado a Central').length
        const valorGeral = lista
          .filter(p => p.status === 'Entregue' || p.status === 'Validado pelo Admin')
          .reduce((acc, p) => acc + parseFloat(p.valor_pacote || '0'), 0)

        await supabase
          .from('finalizacao_dia')
          .insert({
            data: dataStr,
            total_pacotes: totalRegistrados,
            total_entregues: totalEntreguesGeral,
            total_falhas: totalFalhasGeral,
            total_valor: valorGeral.toFixed(2),
          })
      }
    }

    const totalFinalizados = resultados.length
    const jaEstava = resultados.filter(r => true).length // all

    return NextResponse.json({
      ok: true,
      mensagem: `${totalFinalizados} entregador(es) finalizado(s) com sucesso!`,
      finalizados: resultados,
      horario_finalizacao: horarioFinalizacao,
    })
  } catch (err) {
    console.error('Erro ao finalizar dia:', err)
    return NextResponse.json({ erro: 'Erro ao finalizar dia' }, { status: 500 })
  }
}
