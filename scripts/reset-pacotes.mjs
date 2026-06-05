import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: pacotes, error } = await svc.from('pacotes').select('codigo');
  if (error) { console.error('❌ Erro:', error.message); return; }
  console.log(`📦 ${pacotes.length} pacotes encontrados`);

  let count = 0;
  for (const p of pacotes) {
    const { error: e } = await svc.from('pacotes')
      .update({
        status: 'Recebido pela Central',
        entregador_id: null,
        data_repassado_entregador: null,
        data_retirada_central: null,
        data_entrega_real: null,
        pago: false,
        data_pagamento: null
      })
      .eq('codigo', p.codigo);
    if (!e) count++;
  }
  console.log(`✅ ${count} pacotes resetados para "Recebido pela Central"`);
}

main().catch(console.error);
