/**
 * GERA 20 PACOTES COM CÓDIGOS ALEATÓRIOS
 * Limpa pacotes antigos e cria novos para testar o fluxo
 * Uso: node scripts/seed-pacotes.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Envs ausentes');
  process.exit(1);
}

const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

function gerarCodigo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  return `PACK-${y}${m}${d}-${rand}`;
}

function randomDateAgo(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * maxDays));
  return d.toISOString();
}

function randomFutureDate(maxDays) {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * maxDays) + 1);
  return d.toISOString();
}

async function run() {
  console.log('🧹 Limpando dados existentes...');
  
  // Limpar tabelas que dependem de pacotes
  // pacotes usa codigo como PK, as demais usam id
  for (const table of ['whatsapp_log', 'finalizacao_dia_entregador', 'finalizacao_dia', 'pagamentos_entregador']) {
    const { error } = await svc.from(table).delete().neq('id', 0);
    if (error && error.code !== 'PGRST116') {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} limpo`);
    }
  }
  // Pacotes usa codigo como PK
  const { error: errPac } = await svc.rpc('exec_sql', { sql: 'DELETE FROM pacotes' });
  if (errPac) {
    // Fallback: deletar um por um
    const { data: existing } = await svc.from('pacotes').select('codigo');
    if (existing?.length) {
      for (const p of existing) {
        await svc.from('pacotes').delete().eq('codigo', p.codigo);
      }
      console.log(`   ✅ pacotes: ${existing.length} removidos (um por um)`);
    } else {
      console.log(`   ✅ pacotes: já vazio`);
    }
  } else {
    console.log(`   ✅ pacotes limpo via RPC`);
  }

  // Buscar entregadores ativos
  const { data: entregadores, error: errEnt } = await svc
    .from('entregadores')
    .select('id, nome')
    .eq('ativo', true);

  if (errEnt || !entregadores?.length) {
    console.error('❌ Erro ao buscar entregadores:', errEnt?.message || 'Nenhum entregador ativo');
    process.exit(1);
  }

  console.log(`\n👥 ${entregadores.length} entregadores ativos encontrados`);
  entregadores.forEach(e => console.log(`   - #${e.id} ${e.nome}`));

  const STATUS_POSSIVEIS = [
    'Recebido pela Central',
    'Aguardando Retirada', 
    'Retirado pelo Entregador',
    'Em Rota',
    'Entregue',
    'Retornado a Central',
  ];

  const TRANSPORTADORAS = [
    'Transportadora Rápido Triângulo',
    'LogTrans Minas',
    'Expresso Santa Juliana',
    'Rota Certa Transportes',
    'TransBrasil Cargas',
    'JulianaLog',
    'BR-262 Transportes'
  ];

  const DESTINATARIOS = [
    'Mercado Central', 'Farmácia Santa Juliana', 'Padaria Pão Quente',
    'Açougue do Zé', 'Loja do Mecânico', 'Papelaria Criativa',
    'Academia Fit Center', 'Construtora Nova Era', 'Casa & Lar',
    'InfoTech Center', 'Salão Estilo Novo', 'Elétrica Center',
    'Vidraçaria Céu Azul', 'Agro Santa Juliana', 'Casa das Tintas',
    'Adega do Centro', 'Mercado Céu Azul', 'Ferragem Santa Juliana',
    'Lojão do Povo', 'Oficina Mecânica São Vicente'
  ];

  const ENDERECOS = [
    'Rua Professor Orestes, 314 - Centro',
    'Praça Floriano Peixoto, 22 - Centro',
    'Rua São Vicente de Paulo, 942 - Novo Horizonte',
    'Rua José Pedro Borges, 776 - Centro',
    'Rua João Batista Faria, 12 - Céu Azul',
    'Rua Miguel Arabe, 240 - Centro',
    'Rua José Binga, 58 - Céu Azul',
    'Rua Antônio Rezende, 440 - Centro',
    'Rua José Goulart, 753 - Centro',
    'Rua Ênio Gonçalves, 324 - Centro'
  ];

  const DESCRICOES = [
    'Produtos alimentícios diversos', 'Material de construção',
    'Eletrodomésticos', 'Vestuário e uniformes', 'Ferramentas',
    'Material de escritório', 'Peças automotivas',
    'Produtos de limpeza', 'Material elétrico',
    'Equipamentos de segurança', 'Bebidas variadas',
    'Cosméticos e perfumaria', 'Sementes e insumos',
    'Móveis planejados', 'Tintas e solventes',
    'Brinquedos e jogos', 'Carnes congeladas',
    'Medicamentos', 'Material esportivo', 'Utensílios domésticos'
  ];

  // Gerar 20 pacotes
  const PACOTES_QTD = 20;
  const agora = new Date();
  const pacotes = [];

  for (let i = 0; i < PACOTES_QTD; i++) {
    const entregador = entregadores[i % entregadores.length];
    const statusIndex = i % STATUS_POSSIVEIS.length;
    const status = STATUS_POSSIVEIS[statusIndex];
    const codigo = gerarCodigo();
    
    // Lógica de datas conforme status
    const dataChegada = randomDateAgo(30);
    const dataRepasse = status !== 'Recebido pela Central' ? dataChegada : null;
    const dataRetirada = ['Retirado pelo Entregador', 'Em Rota', 'Entregue', 'Retornado a Central'].includes(status) ? new Date(new Date(dataChegada).getTime() + 86400000).toISOString() : null;
    const dataEntrega = ['Entregue', 'Retornado a Central'].includes(status) ? new Date(new Date(dataRetirada).getTime() + 86400000 * 2).toISOString() : null;
    const dataLimite = randomFutureDate(15);
    const valorPacote = parseFloat((Math.random() * 500 + 10).toFixed(2));
    const pago = status === 'Entregue' ? Math.random() > 0.5 : false;
    const dataPagamento = pago ? randomDateAgo(5) : null;
    const quantidade = Math.floor(Math.random() * 50) + 1;
    const destinatario = DESTINATARIOS[i % DESTINATARIOS.length];
    const endereco = ENDERECOS[i % ENDERECOS.length] + ', Santa Juliana - MG';
    const transportadora = TRANSPORTADORAS[i % TRANSPORTADORAS.length];
    const descricao = DESCRICOES[i % DESCRICOES.length];
    const observacoes = i % 3 === 0 ? 'Observação automática gerada no seed' : '';

    pacotes.push({
      codigo,
      data_chegada: dataChegada,
      nf_remessa: `NF-${String(i + 1).padStart(3, '0')}`,
      descricao,
      quantidade,
      endereco_entrega: endereco,
      data_limite_entrega: dataLimite,
      entregador_id: entregador.id,
      valor_pacote: valorPacote,
      pago,
      data_pagamento: dataPagamento,
      status,
      data_repassado_entregador: dataRepasse,
      data_retirada_central: dataRetirada,
      data_entrega_real: dataEntrega,
      destinatario,
      transportadora,
      observacoes,
    });
  }

  console.log(`\n📦 Inserindo ${pacotes.length} pacotes...`);
  
  // Inserir em lotes de 10
  for (let i = 0; i < pacotes.length; i += 10) {
    const batch = pacotes.slice(i, i + 10);
    const { error } = await svc.from('pacotes').insert(batch);
    if (error) {
      console.error(`   ❌ Lote ${i/10 + 1}: ${error.message}`);
    } else {
      console.log(`   ✅ Lote ${i/10 + 1} (${batch.length} pacotes)`);
    }
  }

  // Resumo
  console.log('\n=== 📊 RESUMO ===');
  const { data: todosPacotes, error: errList } = await svc
    .from('pacotes')
    .select('codigo, status, entregador_id, valor_pacote')
    .order('data_chegada', { ascending: false });

  if (errList) {
    console.error('❌ Erro ao listar:', errList.message);
    return;
  }

  console.log(`\n✅ ${todosPacotes.length} pacotes no total\n`);

  // Agrupar por status
  const porStatus = {};
  for (const p of todosPacotes) {
    porStatus[p.status] = (porStatus[p.status] || 0) + 1;
  }
  console.log('📌 Distribuição por status:');
  for (const [s, qtd] of Object.entries(porStatus)) {
    console.log(`   ${s}: ${qtd}`);
  }

  // Agrupar por entregador
  const porEntregador = {};
  for (const p of todosPacotes) {
    const nome = entregadores.find(e => e.id === p.entregador_id)?.nome || `#${p.entregador_id}`;
    porEntregador[nome] = (porEntregador[nome] || 0) + 1;
  }
  console.log('\n👤 Distribuição por entregador:');
  for (const [e, qtd] of Object.entries(porEntregador)) {
    console.log(`   ${e}: ${qtd} pacotes`);
  }

  console.log('\n🎯 Primeiros 5 códigos gerados:');
  todosPacotes.slice(0, 5).forEach(p => console.log(`   ${p.codigo} → ${p.status}`));

  console.log('\n🎉 Seed concluído!');
}

run().catch(e => {
  console.error('\n❌ Erro:', e);
  process.exit(1);
});
