/**
 * SCRIPT DE SEED AUTOMÁTICO
 * Executa o seed completo no Supabase usando SERVICE_ROLE_KEY
 * Uso: node scripts/seed.mjs
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carrega .env.local
config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes');
  process.exit(1);
}

const svc = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function seed() {
  console.log('🌱 Iniciando seed completo...\n');

  // 1. Limpar dados existentes
  console.log('🗑️ Limpando dados existentes...');
  const tables = ['whatsapp_log', 'pagamentos_entregador', 'finalizacao_dia_entregador', 
                  'finalizacao_dia', 'pacotes', 'entregadores', 'transportadoras', 
                  'configuracoes_sistema', 'usuarios'];
  
  for (const table of tables) {
    const { error } = await svc.from(table).delete().neq('id', 0);
    if (error && error.code !== 'PGRST116') {
      console.log(`   ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table} limpo`);
    }
  }

  // 2. Usuários (com bcrypt)
  console.log('\n👤 Inserindo usuários...');
  const hash1 = bcrypt.hashSync('123bruno', 10);
  const hash2 = bcrypt.hashSync('admin123', 10);
  
  const { error: errUsers } = await svc.from('usuarios').insert([
    { nome: 'Bruno', senha_hash: hash1 },
    { nome: 'Admin', senha_hash: hash2 }
  ]);
  if (errUsers) console.error('   ❌ usuarios:', errUsers.message);
  else console.log('   ✅ Bruno (senha: 123bruno), Admin (senha: admin123)');

  // 3. Transportadoras
  console.log('\n🚚 Inserindo transportadoras...');
  const transportadoras = [
    'Transportadora Rápido Triângulo', 'LogTrans Minas', 'Expresso Santa Juliana',
    'Rota Certa Transportes', 'Viação Araxá', 'TransBrasil Cargas',
    'JulianaLog', 'BR-262 Transportes'
  ];
  const { error: errTransp } = await svc.from('transportadoras').insert(
    transportadoras.map(n => ({ nome: n }))
  );
  if (errTransp) console.error('   ❌ transportadoras:', errTransp.message);
  else console.log(`   ✅ ${transportadoras.length} transportadoras`);

  // 4. Entregadores
  console.log('\n📦 Inserindo entregadores...');
  const entregadoresData = [
    { nome: 'Carlos Eduardo Silva', ativo: true, valor_padrao: 0.50, telefone: '34991234567', cpf: '123.456.789-00', chave_pix: 'carlos.silva@email.com', banco_pagamento: 'Nubank', carteira_motorista: 'MG12345678901', senha_hash: bcrypt.hashSync('123456', 10) },
    { nome: 'Maria Aparecida Oliveira', ativo: true, valor_padrao: 0.75, telefone: '34992345678', cpf: '987.654.321-00', chave_pix: '34992345678', banco_pagamento: 'Itaú', carteira_motorista: 'MG98765432101', senha_hash: bcrypt.hashSync('123456', 10) },
    { nome: 'João Pedro Santos', ativo: true, valor_padrao: 0.60, telefone: '34993456789', cpf: '456.789.123-00', chave_pix: 'joao.santos@pix.com', banco_pagamento: 'Bradesco', carteira_motorista: null, senha_hash: bcrypt.hashSync('123456', 10) },
    { nome: 'Ana Cristina Ferreira', ativo: false, valor_padrao: 0.55, telefone: '34994567890', cpf: '789.123.456-00', chave_pix: '78912345600', banco_pagamento: 'Caixa Econômica', carteira_motorista: 'MG45678912301', senha_hash: null }
  ];
  const { data: entregadores, error: errEnt } = await svc.from('entregadores')
    .insert(entregadoresData)
    .select();
  if (errEnt) {
    console.error('   ❌ entregadores:', errEnt.message);
    return;
  }
  console.log(`   ✅ ${entregadores.length} entregadores`);

  // Mapear IDs
  const c1 = entregadores.find(e => e.nome.startsWith('Carlos'));
  const c2 = entregadores.find(e => e.nome.startsWith('Maria'));
  const c3 = entregadores.find(e => e.nome.startsWith('João'));
  const c4 = entregadores.find(e => e.nome.startsWith('Ana'));
  if (!c1 || !c2 || !c3 || !c4) {
    console.error('❌ Não foi possível mapear IDs dos entregadores');
    process.exit(1);
  }

  // 5. Pacotes (40 pacotes)
  console.log('\n📋 Inserindo pacotes (40)...');
  const now = new Date();

  function dateAgo(days) {
    return new Date(now.getTime() - days * 86400000).toISOString();
  }
  function dateFuture(days) {
    return new Date(now.getTime() + days * 86400000).toISOString();
  }

  // Helper para pacotes
  const pacotesData = [
    // CARLOS (id=1) - 10 pacotes
    { codigo: 'SJ-001', data_chegada: dateAgo(10), nf_remessa: 'NF-2026-001', descricao: 'Eletrodomésticos diversos', quantidade: 3, endereco_entrega: 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(3), entregador_id: c1.id, valor_pacote: 25.50, pago: true, data_pagamento: dateAgo(8), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(10), data_retirada_central: dateAgo(9), data_entrega_real: dateAgo(8), destinatario: 'Arquidiocese de Uberaba', transportadora: 'Rápido Triângulo', observacoes: 'Entregue e validado sem problemas' },
    { codigo: 'SJ-002', data_chegada: dateAgo(8), nf_remessa: 'NF-2026-002', descricao: 'Material de escritório', quantidade: 5, endereco_entrega: 'Rua Professor Orestes, 314 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(2), entregador_id: c1.id, valor_pacote: 15.00, pago: false, data_pagamento: null, status: 'Entregue', data_repassado_entregador: dateAgo(8), data_retirada_central: dateAgo(7), data_entrega_real: dateAgo(6), destinatario: 'Prefeitura Municipal', transportadora: 'LogTrans Minas', observacoes: 'Documentos entregues na recepção' },
    { codigo: 'SJ-003', data_chegada: dateAgo(3), nf_remessa: 'NF-2026-003', descricao: 'Peças automotivas', quantidade: 8, endereco_entrega: 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', data_limite_entrega: dateFuture(2), entregador_id: c1.id, valor_pacote: 42.00, pago: false, data_pagamento: null, status: 'Em Rota', data_repassado_entregador: dateAgo(3), data_retirada_central: dateAgo(2), data_entrega_real: null, destinatario: 'Oficina Mecânica São Vicente', transportadora: 'Expresso Santa Juliana', observacoes: 'Cliente solicitou urgência' },
    { codigo: 'SJ-004', data_chegada: dateAgo(2), nf_remessa: 'NF-2026-004', descricao: 'Materiais de construção', quantidade: 20, endereco_entrega: 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(5), entregador_id: c1.id, valor_pacote: 120.00, pago: false, data_pagamento: null, status: 'Aguardando Retirada', data_repassado_entregador: dateAgo(1), data_retirada_central: null, data_entrega_real: null, destinatario: 'Construtora Santa Juliana Ltda', transportadora: 'Rota Certa Transportes', observacoes: 'Aguardando o entregador retirar na central' },
    { codigo: 'SJ-005', data_chegada: dateAgo(1), nf_remessa: 'NF-2026-005', descricao: 'Produtos alimentícios não perecíveis', quantidade: 12, endereco_entrega: 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateFuture(3), entregador_id: c1.id, valor_pacote: 35.00, pago: false, data_pagamento: null, status: 'Retirado pelo Entregador', data_repassado_entregador: dateAgo(1), data_retirada_central: now.toISOString(), data_entrega_real: null, destinatario: 'Mercado Céu Azul', transportadora: 'TransBrasil Cargas', observacoes: 'Produtos frágeis - manusear com cuidado' },
    { codigo: 'SJ-006', data_chegada: now.toISOString(), nf_remessa: 'NF-2026-006', descricao: 'Vestuário e uniformes', quantidade: 30, endereco_entrega: 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(7), entregador_id: c1.id, valor_pacote: 180.00, pago: false, data_pagamento: null, status: 'Recebido pela Central', data_repassado_entregador: null, data_retirada_central: null, data_entrega_real: null, destinatario: 'Loja Moda Center', transportadora: 'JulianaLog', observacoes: 'Aguardando repasse' },
    { codigo: 'SJ-007', data_chegada: dateAgo(15), nf_remessa: 'NF-2026-007', descricao: 'Equipamentos de informática', quantidade: 2, endereco_entrega: 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(8), entregador_id: c1.id, valor_pacote: 450.00, pago: false, data_pagamento: null, status: 'Retornado a Central', data_repassado_entregador: dateAgo(15), data_retirada_central: dateAgo(14), data_entrega_real: dateAgo(10), destinatario: 'InfoTech Santa Juliana', transportadora: 'BR-262 Transportes', observacoes: 'Destinatário recusou - produto veio errado. Devolução registrada.' },
    { codigo: 'SJ-008', data_chegada: dateAgo(20), nf_remessa: 'NF-2026-008', descricao: 'Móveis planejados', quantidade: 1, endereco_entrega: 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(10), entregador_id: c1.id, valor_pacote: 890.00, pago: true, data_pagamento: dateAgo(12), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(20), data_retirada_central: dateAgo(19), data_entrega_real: dateAgo(18), destinatario: 'Residência Família Rezende', transportadora: 'Rápido Triângulo', observacoes: 'Cliente muito satisfeito' },
    { codigo: 'SJ-009', data_chegada: dateAgo(5), nf_remessa: 'NF-2026-009', descricao: 'Livros e materiais didáticos', quantidade: 40, endereco_entrega: 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(1), entregador_id: c1.id, valor_pacote: 95.00, pago: false, data_pagamento: null, status: 'Entregue', data_repassado_entregador: dateAgo(5), data_retirada_central: dateAgo(4), data_entrega_real: dateAgo(3), destinatario: 'Escola Municipal Maria da Conceição', transportadora: 'LogTrans Minas', observacoes: 'Entregue na biblioteca da escola' },
    { codigo: 'SJ-010', data_chegada: dateAgo(1), nf_remessa: 'NF-2026-010', descricao: 'Medicamentos e insumos hospitalares', quantidade: 6, endereco_entrega: 'Rua José Joaquim da Silva, s/n - Centro, Santa Juliana - MG', data_limite_entrega: now.toISOString(), entregador_id: c1.id, valor_pacote: 320.00, pago: false, data_pagamento: null, status: 'Em Rota', data_repassado_entregador: dateAgo(1), data_retirada_central: now.toISOString(), data_entrega_real: null, destinatario: 'Farmácia Municipal', transportadora: 'Expresso Santa Juliana', observacoes: 'URGENTE - Medicamentos controlados' },

    // MARIA (id=2) - 10 pacotes
    { codigo: 'SJ-011', data_chegada: dateAgo(12), nf_remessa: 'NF-2026-011', descricao: 'Cosméticos e perfumaria', quantidade: 15, endereco_entrega: 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(4), entregador_id: c2.id, valor_pacote: 28.00, pago: true, data_pagamento: dateAgo(10), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(12), data_retirada_central: dateAgo(11), data_entrega_real: dateAgo(10), destinatario: 'Loja Beleza Pura', transportadora: 'Rota Certa Transportes', observacoes: 'Validado com foto' },
    { codigo: 'SJ-012', data_chegada: dateAgo(6), nf_remessa: 'NF-2026-012', descricao: 'Ferramentas elétricas', quantidade: 4, endereco_entrega: 'Rua Professor Orestes, 425 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(1), entregador_id: c2.id, valor_pacote: 175.00, pago: true, data_pagamento: dateAgo(4), status: 'Entregue', data_repassado_entregador: dateAgo(6), data_retirada_central: dateAgo(5), data_entrega_real: dateAgo(4), destinatario: 'Ferragem Santa Juliana', transportadora: 'TransBrasil Cargas', observacoes: 'Entregue no estoque' },
    { codigo: 'SJ-013', data_chegada: dateAgo(4), nf_remessa: 'NF-2026-013', descricao: 'Material esportivo', quantidade: 10, endereco_entrega: 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', data_limite_entrega: dateFuture(1), entregador_id: c2.id, valor_pacote: 210.00, pago: false, data_pagamento: null, status: 'Em Rota', data_repassado_entregador: dateAgo(4), data_retirada_central: dateAgo(3), data_entrega_real: null, destinatario: 'Academia Fit Center', transportadora: 'JulianaLog', observacoes: 'Atrasado - cliente reclamou' },
    { codigo: 'SJ-014', data_chegada: dateAgo(3), nf_remessa: 'NF-2026-014', descricao: 'Peças e acessórios agrícolas', quantidade: 25, endereco_entrega: 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateFuture(4), entregador_id: c2.id, valor_pacote: 560.00, pago: false, data_pagamento: null, status: 'Aguardando Retirada', data_repassado_entregador: dateAgo(2), data_retirada_central: null, data_entrega_real: null, destinatario: 'Sítio Boa Esperança', transportadora: 'BR-262 Transportes', observacoes: 'Entregador precisa retirar hoje' },
    { codigo: 'SJ-015', data_chegada: dateAgo(2), nf_remessa: 'NF-2026-015', descricao: 'Produtos de limpeza', quantidade: 48, endereco_entrega: 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(6), entregador_id: c2.id, valor_pacote: 85.00, pago: false, data_pagamento: null, status: 'Retirado pelo Entregador', data_repassado_entregador: dateAgo(2), data_retirada_central: now.toISOString(), data_entrega_real: null, destinatario: 'Mercado Centro', transportadora: 'Rápido Triângulo', observacoes: 'Volume grande - caixas pesadas' },
    { codigo: 'SJ-016', data_chegada: dateAgo(1), nf_remessa: 'NF-2026-016', descricao: 'Material elétrico', quantidade: 10, endereco_entrega: 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateFuture(5), entregador_id: c2.id, valor_pacote: 145.00, pago: false, data_pagamento: null, status: 'Recebido pela Central', data_repassado_entregador: null, data_retirada_central: null, data_entrega_real: null, destinatario: 'Elétrica Santa Juliana', transportadora: 'LogTrans Minas', observacoes: 'Aguardando separação' },
    { codigo: 'SJ-017', data_chegada: dateAgo(25), nf_remessa: 'NF-2026-017', descricao: 'Máquinas de costura', quantidade: 3, endereco_entrega: 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(15), entregador_id: c2.id, valor_pacote: 1200.00, pago: false, data_pagamento: null, status: 'Retornado a Central', data_repassado_entregador: dateAgo(25), data_retirada_central: dateAgo(24), data_entrega_real: dateAgo(20), destinatario: 'Ateliê Costura Fina', transportadora: 'Expresso Santa Juliana', observacoes: 'Cliente não estava em casa - 3 tentativas' },
    { codigo: 'SJ-018', data_chegada: dateAgo(18), nf_remessa: 'NF-2026-018', descricao: 'Brinquedos e jogos', quantidade: 22, endereco_entrega: 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(8), entregador_id: c2.id, valor_pacote: 135.00, pago: true, data_pagamento: dateAgo(10), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(18), data_retirada_central: dateAgo(17), data_entrega_real: dateAgo(16), destinatario: 'Papelaria Criativa', transportadora: 'Rota Certa Transportes', observacoes: 'Entregue com sucesso' },
    { codigo: 'SJ-019', data_chegada: dateAgo(7), nf_remessa: 'NF-2026-019', descricao: 'Bebidas variadas', quantidade: 60, endereco_entrega: 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(2), entregador_id: c2.id, valor_pacote: 420.00, pago: false, data_pagamento: null, status: 'Entregue', data_repassado_entregador: dateAgo(7), data_retirada_central: dateAgo(6), data_entrega_real: dateAgo(5), destinatario: 'Adega do Centro', transportadora: 'TransBrasil Cargas', observacoes: 'Produtos frágeis - vidro' },
    { codigo: 'SJ-020', data_chegada: now.toISOString(), nf_remessa: 'NF-2026-020', descricao: 'Equipamentos de segurança', quantidade: 15, endereco_entrega: 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(10), entregador_id: c2.id, valor_pacote: 280.00, pago: false, data_pagamento: null, status: 'Recebido pela Central', data_repassado_entregador: null, data_retirada_central: null, data_entrega_real: null, destinatario: 'Construtora Nova Era', transportadora: 'JulianaLog', observacoes: 'EPIs diversos' },

    // JOÃO PEDRO (id=3) - 10 pacotes
    { codigo: 'SJ-021', data_chegada: dateAgo(14), nf_remessa: 'NF-2026-021', descricao: 'Carnes congeladas', quantidade: 30, endereco_entrega: 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(7), entregador_id: c3.id, valor_pacote: 380.00, pago: true, data_pagamento: dateAgo(10), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(14), data_retirada_central: dateAgo(13), data_entrega_real: dateAgo(12), destinatario: 'Açougue do Zé', transportadora: 'Expresso Santa Juliana', observacoes: 'Produtos perecíveis - entrega rápida' },
    { codigo: 'SJ-022', data_chegada: dateAgo(9), nf_remessa: 'NF-2026-022', descricao: 'Papelaria e materiais', quantidade: 100, endereco_entrega: 'Rua Professor Orestes, 314 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(3), entregador_id: c3.id, valor_pacote: 75.00, pago: false, data_pagamento: null, status: 'Entregue', data_repassado_entregador: dateAgo(9), data_retirada_central: dateAgo(8), data_entrega_real: dateAgo(7), destinatario: 'Papelaria Central', transportadora: 'LogTrans Minas', observacoes: 'Entregue na papelaria' },
    { codigo: 'SJ-023', data_chegada: dateAgo(5), nf_remessa: 'NF-2026-023', descricao: 'Sementes e insumos agrícolas', quantidade: 40, endereco_entrega: 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', data_limite_entrega: dateAgo(1), entregador_id: c3.id, valor_pacote: 520.00, pago: false, data_pagamento: null, status: 'Em Rota', data_repassado_entregador: dateAgo(5), data_retirada_central: dateAgo(4), data_entrega_real: null, destinatario: 'Agro Santa Juliana', transportadora: 'BR-262 Transportes', observacoes: 'Produtos para plantio' },
    { codigo: 'SJ-024', data_chegada: dateAgo(4), nf_remessa: 'NF-2026-024', descricao: 'Vidros e espelhos', quantidade: 6, endereco_entrega: 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateFuture(3), entregador_id: c3.id, valor_pacote: 340.00, pago: false, data_pagamento: null, status: 'Retirado pelo Entregador', data_repassado_entregador: dateAgo(4), data_retirada_central: dateAgo(3), data_entrega_real: null, destinatario: 'Vidraçaria Céu Azul', transportadora: 'Rota Certa Transportes', observacoes: 'FRÁGIL - não empilhar' },
    { codigo: 'SJ-025', data_chegada: dateAgo(3), nf_remessa: 'NF-2026-025', descricao: 'Roupas íntimas e meias', quantidade: 200, endereco_entrega: 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(4), entregador_id: c3.id, valor_pacote: 45.00, pago: false, data_pagamento: null, status: 'Aguardando Retirada', data_repassado_entregador: dateAgo(2), data_retirada_central: null, data_entrega_real: null, destinatario: 'Lojão do Povo', transportadora: 'TransBrasil Cargas', observacoes: 'Repassado - aguardando retirada' },
    { codigo: 'SJ-026', data_chegada: dateAgo(1), nf_remessa: 'NF-2026-026', descricao: 'Tintas e solventes', quantidade: 8, endereco_entrega: 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(8), entregador_id: c3.id, valor_pacote: 195.00, pago: false, data_pagamento: null, status: 'Recebido pela Central', data_repassado_entregador: null, data_retirada_central: null, data_entrega_real: null, destinatario: 'Casa das Tintas', transportadora: 'Expresso Santa Juliana', observacoes: 'Produtos perigosos - classe 3' },
    { codigo: 'SJ-027', data_chegada: dateAgo(30), nf_remessa: 'NF-2026-027', descricao: 'Equipamentos de som', quantidade: 2, endereco_entrega: 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateAgo(20), entregador_id: c3.id, valor_pacote: 2800.00, pago: true, data_pagamento: dateAgo(22), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(30), data_retirada_central: dateAgo(29), data_entrega_real: dateAgo(28), destinatario: 'Casa de Festas Céu Azul', transportadora: 'JulianaLog', observacoes: 'Equipamentos de alto valor - conferir' },
    { codigo: 'SJ-028', data_chegada: dateAgo(22), nf_remessa: 'NF-2026-028', descricao: 'Cama, mesa e banho', quantidade: 15, endereco_entrega: 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(12), entregador_id: c3.id, valor_pacote: 160.00, pago: true, data_pagamento: dateAgo(15), status: 'Entregue', data_repassado_entregador: dateAgo(22), data_retirada_central: dateAgo(21), data_entrega_real: dateAgo(20), destinatario: 'Casa & Lar', transportadora: 'Rápido Triângulo', observacoes: 'Entregue no endereço' },
    { codigo: 'SJ-029', data_chegada: dateAgo(10), nf_remessa: 'NF-2026-029', descricao: 'Pneus e câmaras', quantidade: 4, endereco_entrega: 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(5), entregador_id: c3.id, valor_pacote: 680.00, pago: false, data_pagamento: null, status: 'Retornado a Central', data_repassado_entregador: dateAgo(10), data_retirada_central: dateAgo(9), data_entrega_real: dateAgo(6), destinatario: 'Borracheiro do Centro', transportadora: 'LogTrans Minas', observacoes: 'Cliente mudou de endereço - recusou entrega' },
    { codigo: 'SJ-030', data_chegada: now.toISOString(), nf_remessa: 'NF-2026-030', descricao: 'Material para panificação', quantidade: 10, endereco_entrega: 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', data_limite_entrega: dateFuture(6), entregador_id: c3.id, valor_pacote: 55.00, pago: false, data_pagamento: null, status: 'Recebido pela Central', data_repassado_entregador: null, data_retirada_central: null, data_entrega_real: null, destinatario: 'Padaria Pão Quente', transportadora: 'Rota Certa Transportes', observacoes: 'Entregar pela manhã' },

    // ANA (id=4) - 10 pacotes (entregadora inativa)
    { codigo: 'SJ-031', data_chegada: dateAgo(60), nf_remessa: 'NF-2026-031', descricao: 'Produtos de beleza', quantidade: 12, endereco_entrega: 'Rua Professor Orestes, 425 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(50), entregador_id: c4.id, valor_pacote: 35.00, pago: true, data_pagamento: dateAgo(55), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(60), data_retirada_central: dateAgo(59), data_entrega_real: dateAgo(58), destinatario: 'Salão Estilo Novo', transportadora: 'Rápido Triângulo', observacoes: 'Antes da inativação' },
    { codigo: 'SJ-032', data_chegada: dateAgo(55), nf_remessa: 'NF-2026-032', descricao: 'Utensílios domésticos', quantidade: 8, endereco_entrega: 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', data_limite_entrega: dateAgo(45), entregador_id: c4.id, valor_pacote: 90.00, pago: true, data_pagamento: dateAgo(50), status: 'Validado pelo Admin', data_repassado_entregador: dateAgo(55), data_retirada_central: dateAgo(54), data_entrega_real: dateAgo(53), destinatario: 'Casa Nova Utilidades', transportadora: 'Expresso Santa Juliana', observacoes: 'Antes da inativação' },
    { codigo: 'SJ-033', data_chegada: dateAgo(48), nf_remessa: 'NF-2026-033', descricao: 'Fios e cabos elétricos', quantidade: 5, endereco_entrega: 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateAgo(40), entregador_id: c4.id, valor_pacote: 220.00, pago: true, data_pagamento: dateAgo(42), status: 'Entregue', data_repassado_entregador: dateAgo(48), data_retirada_central: dateAgo(47), data_entrega_real: dateAgo(46), destinatario: 'Elétrica Center', transportadora: 'TransBrasil Cargas', observacoes: 'Último pacote antes de inativar' },
    { codigo: 'SJ-034', data_chegada: dateAgo(45), nf_remessa: 'NF-2026-034', descricao: 'Material para encanamento', quantidade: 15, endereco_entrega: 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(38), entregador_id: c4.id, valor_pacote: 310.00, pago: true, data_pagamento: dateAgo(40), status: 'Entregue', data_repassado_entregador: dateAgo(45), data_retirada_central: dateAgo(44), data_entrega_real: dateAgo(43), destinatario: 'Hidráulica Santa Juliana', transportadora: 'JulianaLog', observacoes: 'Repassado antes da inativação' },
    { codigo: 'SJ-035', data_chegada: dateAgo(40), nf_remessa: 'NF-2026-035', descricao: 'Colchões e travesseiros', quantidade: 4, endereco_entrega: 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', data_limite_entrega: dateAgo(33), entregador_id: c4.id, valor_pacote: 450.00, pago: true, data_pagamento: dateAgo(35), status: 'Entregue', data_repassado_entregador: dateAgo(40), data_retirada_central: dateAgo(39), data_entrega_real: dateAgo(38), destinatario: 'Colchões Sonho Bom', transportadora: 'Rota Certa Transportes', observacoes: 'Produtos volumosos' },
    { codigo: 'SJ-036', data_chegada: dateAgo(35), nf_remessa: 'NF-2026-036', descricao: 'Telefones e acessórios', quantidade: 10, endereco_entrega: 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(28), entregador_id: c4.id, valor_pacote: 450.00, pago: true, data_pagamento: dateAgo(30), status: 'Entregue', data_repassado_entregador: dateAgo(35), data_retirada_central: dateAgo(34), data_entrega_real: dateAgo(33), destinatario: 'InfoTech Celulares', transportadora: 'BR-262 Transportes', observacoes: 'Produtos pequenos e frágeis' },
    { codigo: 'SJ-037', data_chegada: dateAgo(30), nf_remessa: 'NF-2026-037', descricao: 'Verduras e legumes (orgânicos)', quantidade: 50, endereco_entrega: 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(25), entregador_id: c4.id, valor_pacote: 65.00, pago: false, data_pagamento: null, status: 'Retornado a Central', data_repassado_entregador: dateAgo(30), data_retirada_central: dateAgo(29), data_entrega_real: dateAgo(27), destinatario: 'Sacolão Popular', transportadora: 'LogTrans Minas', observacoes: 'Cliente rejeitou por qualidade' },
    { codigo: 'SJ-038', data_chegada: dateAgo(28), nf_remessa: 'NF-2026-038', descricao: 'Material de pintura', quantidade: 6, endereco_entrega: 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(22), entregador_id: c4.id, valor_pacote: 180.00, pago: false, data_pagamento: null, status: 'Entregue', data_repassado_entregador: dateAgo(28), data_retirada_central: dateAgo(27), data_entrega_real: dateAgo(26), destinatario: 'Loja de Tintas PintCenter', transportadora: 'Rápido Triângulo', observacoes: 'Entregue sem validação' },
    { codigo: 'SJ-039', data_chegada: dateAgo(25), nf_remessa: 'NF-2026-039', descricao: 'Artigos de festa', quantidade: 30, endereco_entrega: 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(18), entregador_id: c4.id, valor_pacote: 25.00, pago: false, data_pagamento: null, status: 'Em Rota', data_repassado_entregador: dateAgo(25), data_retirada_central: dateAgo(24), data_entrega_real: null, destinatario: 'Festa Show Ltda', transportadora: 'Expresso Santa Juliana', observacoes: 'Estava em andamento quando inativada' },
    { codigo: 'SJ-040', data_chegada: dateAgo(20), nf_remessa: 'NF-2026-040', descricao: 'Ferramentas manuais', quantidade: 8, endereco_entrega: 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', data_limite_entrega: dateAgo(15), entregador_id: c4.id, valor_pacote: 95.00, pago: false, data_pagamento: null, status: 'Aguardando Retirada', data_repassado_entregador: dateAgo(20), data_retirada_central: null, data_entrega_real: null, destinatario: 'Loja do Mecânico', transportadora: 'TransBrasil Cargas', observacoes: 'Parado desde a inativação' }
  ];

  // Inserir pacotes em lotes de 10
  for (let i = 0; i < pacotesData.length; i += 10) {
    const batch = pacotesData.slice(i, i + 10);
    const { error } = await svc.from('pacotes').insert(batch);
    if (error) {
      console.error(`   ❌ Lote ${i/10 + 1}: ${error.message}`);
    } else {
      console.log(`   ✅ Lote ${i/10 + 1} (${batch.length} pacotes)`);
    }
  }
  console.log(`   Total: ${pacotesData.length} pacotes`);

  // 6. Configuracoes
  console.log('\n⚙️ Inserindo configurações...');
  const configs = [
    { chave: 'dashboard', nome: 'Dashboard', descricao: 'Visão geral com indicadores e métricas', grupo: 'Geral', ativo: true },
    { chave: 'relatorio_diario', nome: 'Relatório Diário', descricao: 'Acompanhamento do movimento do dia', grupo: 'Geral', ativo: true },
    { chave: 'relatorio_consolidado', nome: 'Relatório Consolidado', descricao: 'Relatório mensal/semanal/quinzenal por entregador', grupo: 'Geral', ativo: true },
    { chave: 'financeiro', nome: 'Financeiro', descricao: 'Controle centralizado de pagamentos dos entregadores', grupo: 'Geral', ativo: true },
    { chave: 'ciclos_pagamento', nome: 'Ciclos de Pagamento', descricao: 'Pagamento por ciclo desde o último pagamento', grupo: 'Geral', ativo: true },
    { chave: 'finalizar_dia', nome: 'Finalizar Dia', descricao: 'Encerramento do movimento diário com snapshot', grupo: 'Geral', ativo: true },
    { chave: 'pacotes_lista', nome: 'Lista de Pacotes', descricao: 'Visualizar todos os pacotes cadastrados', grupo: 'Pacotes', ativo: true },
    { chave: 'pacotes_registrar', nome: 'Registrar Pacote', descricao: 'Cadastrar novos pacotes no sistema', grupo: 'Pacotes', ativo: true },
    { chave: 'pacotes_rastrear', nome: 'Rastrear Pacote', descricao: 'Buscar pacotes por código, endereço ou destinatário', grupo: 'Pacotes', ativo: true },
    { chave: 'pacotes_editar', nome: 'Editar Pacote', descricao: 'Editar dados e alterar status do pacote', grupo: 'Pacotes', ativo: true },
    { chave: 'pacotes_repassar_lote', nome: 'Repasse em Lote', descricao: 'Repassar múltiplos pacotes a um entregador', grupo: 'Pacotes', ativo: true },
    { chave: 'entregadores_crud', nome: 'Entregadores', descricao: 'Gerenciar cadastro de entregadores', grupo: 'Entregadores', ativo: true },
    { chave: 'entregador_detalhe', nome: 'Detalhe do Entregador', descricao: 'Perfil individual com resumo e pacotes', grupo: 'Entregadores', ativo: true },
    { chave: 'fotos_galeria', nome: 'Galeria de Fotos', descricao: 'Visualizar fotos das entregas', grupo: 'Entregas', ativo: true },
    { chave: 'fotos_validar', nome: 'Validar Entrega', descricao: 'Aprovar entrega diretamente na galeria', grupo: 'Entregas', ativo: true },
    { chave: 'transportadoras_crud', nome: 'Transportadoras', descricao: 'Gerenciar transportadoras cadastradas', grupo: 'Configurações', ativo: true },
    { chave: 'configuracoes_sistema', nome: 'Configurações do Sistema', descricao: 'Habilitar/desabilitar funcionalidades', grupo: 'Configurações', ativo: true },
    { chave: 'whatsapp_integracao', nome: 'WhatsApp', descricao: 'Integração com WhatsApp para contato com entregadores', grupo: 'Entregas', ativo: true },
    { chave: 'entregador_campos_adicionais', nome: 'Dados Adicionais', descricao: 'Campos extras do entregador (CPF, PIX, CNH, Banco)', grupo: 'Entregadores', ativo: true }
  ];
  const { error: errCfg } = await svc.from('configuracoes_sistema').insert(configs);
  if (errCfg) console.error('   ❌ configuracoes_sistema:', errCfg.message);
  else console.log(`   ✅ ${configs.length} configurações`);

  // 7. Pagamentos
  console.log('\n💰 Inserindo pagamentos...');
  const pagamentos = [
    { entregador_id: c1.id, data_inicio: '2026-05-01', data_fim: '2026-05-15', total_entregues: 3, total_valor: 1365.50, valor_pago: 1365.50, data_pagamento: dateAgo(15), forma_pagamento: 'PIX' },
    { entregador_id: c1.id, data_inicio: '2026-05-16', data_fim: '2026-05-31', total_entregues: 2, total_valor: 110.00, valor_pago: 110.00, data_pagamento: dateAgo(7), forma_pagamento: 'Dinheiro' },
    { entregador_id: c2.id, data_inicio: '2026-04-15', data_fim: '2026-04-30', total_entregues: 4, total_valor: 598.00, valor_pago: 598.00, data_pagamento: dateAgo(30), forma_pagamento: 'PIX' },
    { entregador_id: c2.id, data_inicio: '2026-05-01', data_fim: '2026-05-15', total_entregues: 3, total_valor: 665.00, valor_pago: 500.00, data_pagamento: dateAgo(20), forma_pagamento: 'Boleto' },
    { entregador_id: c3.id, data_inicio: '2026-05-10', data_fim: '2026-05-25', total_entregues: 3, total_valor: 585.00, valor_pago: 585.00, data_pagamento: dateAgo(7), forma_pagamento: 'PIX' },
    { entregador_id: c4.id, data_inicio: '2026-03-01', data_fim: '2026-04-15', total_entregues: 6, total_valor: 1610.00, valor_pago: 1610.00, data_pagamento: dateAgo(45), forma_pagamento: 'PIX' }
  ];
  const { error: errPag } = await svc.from('pagamentos_entregador').insert(pagamentos);
  if (errPag) console.error('   ❌ pagamentos_entregador:', errPag.message);
  else console.log(`   ✅ ${pagamentos.length} pagamentos`);

  // Resumo final
  console.log('\n=== 📊 RESUMO ===');
  for (const table of tables) {
    const { count, error } = await svc.from(table).select('*', { count: 'exact', head: true });
    if (error) console.log(`   ❌ ${table}: erro ao contar`);
    else console.log(`   ✅ ${table}: ${count} registros`);
  }

  console.log('\n🎉 Seed concluído com sucesso!');
  console.log('👤 Admin: Bruno / 123bruno');
  console.log('👤 Admin: Admin / admin123');
  console.log('👤 Entregadores: Carlos, Maria, João Pedro (todos senha: 123456)');
  console.log('👤 Ana Cristina: entregadora inativa');
}

seed().catch(e => {
  console.error('\n❌ Erro fatal:', e);
  process.exit(1);
});
