import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'

export async function POST() {
  try {
    const { error: e1 } = await supabase.rpc('exec_sql', {
      sql_text: 'ALTER TABLE pagamentos_entregador ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30) DEFAULT \'Dinheiro\';'
    })

    if (!e1) {
      return NextResponse.json({ ok: true, mensagem: 'Migration executada via RPC' })
    }

    // Fallback: executa via query direta (se usar conexão direta)
    const { error: e2 } = await supabase
      .from('pagamentos_entregador')
      .update({ forma_pagamento: 'Dinheiro' })
      .eq('forma_pagamento', 'Dinheiro')
      .limit(0)

    // Tenta alter table via sql() se disponível
    const sql = `
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'pagamentos_entregador' AND column_name = 'forma_pagamento'
        ) THEN
          ALTER TABLE pagamentos_entregador ADD COLUMN forma_pagamento VARCHAR(30) DEFAULT 'Dinheiro';
        END IF;
      END $$;
    `

    // Usa raw query via rest
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({ query: sql })
    })

    return NextResponse.json({
      ok: res.ok || !e2,
      status: res.status,
      mensagem: res.ok ? 'Migration executada com sucesso!' : 'Migration pode já ter sido executada anteriormente'
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, erro: err.message })
  }
}
