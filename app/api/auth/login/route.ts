import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/db'
import { setSession, clearSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { tipo, nome, senha } = await request.json()

    if (!tipo || !nome) {
      return NextResponse.json({ erro: 'Nome e tipo são obrigatórios' }, { status: 400 })
    }

    if (tipo === 'admin') {
      const { data: user } = await supabase
        .from('usuarios')
        .select('*')
        .eq('nome', nome)
        .single()

      if (!user) {
        return NextResponse.json({ erro: 'Usuário ou senha inválidos' }, { status: 401 })
      }

      // O hash do pgcrypto vem no formato $2a$... (bcrypt)
      const senhaValida = bcrypt.compareSync(senha || '', user.senha_hash)
      if (!senhaValida) {
        return NextResponse.json({ erro: 'Usuário ou senha inválidos' }, { status: 401 })
      }

      const response = NextResponse.json({ 
        ok: true, 
        tipo: 'admin',
        usuario: { id: user.id, nome: user.nome }
      })

      await setSession(response, { tipo: 'admin', id: user.id, nome: user.nome })
      return response

    } else if (tipo === 'entregador') {
      const { data: entregador } = await supabase
        .from('entregadores')
        .select('*')
        .eq('nome', nome)
        .eq('ativo', true)
        .single()

      if (!entregador) {
        return NextResponse.json({ erro: 'Entregador não encontrado ou inativo' }, { status: 401 })
      }

      // Se tem senha, valida; senão permite login sem senha
      if (entregador.senha_hash) {
        const senhaValida = bcrypt.compareSync(senha || '', entregador.senha_hash)
        if (!senhaValida) {
          return NextResponse.json({ erro: 'Senha inválida' }, { status: 401 })
        }
      }

      const response = NextResponse.json({ 
        ok: true, 
        tipo: 'entregador',
        usuario: { id: entregador.id, nome: entregador.nome }
      })

      await setSession(response, { 
        tipo: 'entregador', 
        id: entregador.id, 
        nome: entregador.nome,
        entregador_id: entregador.id 
      })
      return response
    }

    return NextResponse.json({ erro: 'Tipo inválido' }, { status: 400 })

  } catch (err) {
    console.error('Erro no login:', err)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
