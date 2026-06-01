import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('predefinicoes_sistema')
      .select('*')
      .order('grupo', { ascending: true })

    if (error) {
      // Tabela pode não existir ainda
      return NextResponse.json({ predefinicoes: [] })
    }

    return NextResponse.json({ predefinicoes: data || [] })
  } catch {
    return NextResponse.json({ predefinicoes: [] })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session || session.tipo !== 'admin') {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { acao, chave, valor, numero, texto } = body

    if (acao === 'criar_tabela') {
      try {
        await supabase.rpc('exec_sql', {
          sql_string: `
            CREATE TABLE IF NOT EXISTS predefinicoes_sistema (
              id SERIAL PRIMARY KEY,
              chave VARCHAR(100) UNIQUE NOT NULL,
              nome VARCHAR(200) NOT NULL,
              descricao TEXT,
              valor TEXT,
              tipo VARCHAR(20) DEFAULT 'texto',
              grupo VARCHAR(50) DEFAULT 'Geral',
              ativo BOOLEAN DEFAULT true,
              criado_em TIMESTAMP DEFAULT NOW(),
              atualizado_em TIMESTAMP DEFAULT NOW()
            );
          `
        })
      } catch {
        // Tabela pode já existir, ignorar
      }

      return NextResponse.json({ sucesso: true, mensagem: 'Tabela verificada' })
    }

    if (acao === 'salvar') {
      const { error } = await supabase
        .from('predefinicoes_sistema')
        .upsert(
          {
            chave,
            nome: body.nome || chave,
            descricao: body.descricao || '',
            valor: valor || '',
            tipo: body.tipo || 'texto',
            grupo: body.grupo || 'Geral',
            ativo: body.ativo !== false,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'chave' }
        )

      if (error) {
        return NextResponse.json({ erro: error.message }, { status: 500 })
      }

      return NextResponse.json({ sucesso: true, mensagem: '✅ Salvo!' })
    }

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

    return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    console.error('Erro predefinições:', err)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}
