-- ============================================
-- ROTA PRIME - SEED COMPLETO
-- Limpa e recria todos os dados fictícios
-- Cidade: Santa Juliana, MG
-- ============================================

-- Garantir extensão pgcrypto (necessária para crypt())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garantir que todas as colunas existem (caso migrations não tenham rodado)
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS chave_pix VARCHAR(100);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS banco_pagamento VARCHAR(60);
ALTER TABLE entregadores ADD COLUMN IF NOT EXISTS carteira_motorista VARCHAR(20);
ALTER TABLE pagamentos_entregador ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(30) DEFAULT 'Dinheiro';

-- ============================================
-- 1. LIMPAR TODOS OS DADOS (desativando FK temporariamente)
-- ============================================
SET session_replication_role = 'replica';

TRUNCATE TABLE whatsapp_log;
TRUNCATE TABLE pagamentos_entregador;
TRUNCATE TABLE finalizacao_dia_entregador;
TRUNCATE TABLE finalizacao_dia;
TRUNCATE TABLE pacotes;
TRUNCATE TABLE entregadores;
TRUNCATE TABLE transportadoras;
TRUNCATE TABLE configuracoes_sistema;
TRUNCATE TABLE usuarios;

SET session_replication_role = 'origin';

-- ============================================
-- 2. USUARIOS (Admin + Entregadores login)
-- ============================================
INSERT INTO usuarios (nome, senha_hash) VALUES
  ('Igor', crypt('Senha123', gen_salt('bf'))),
  ('Admin', crypt('admin123', gen_salt('bf')));

-- ============================================
-- 3. TRANSPORTADORAS
-- ============================================
INSERT INTO transportadoras (nome) VALUES
  ('Transportadora Rápido Triângulo'),
  ('LogTrans Minas'),
  ('Expresso Santa Juliana'),
  ('Rota Certa Transportes'),
  ('Viação Araxá'),
  ('TransBrasil Cargas'),
  ('JulianaLog'),
  ('BR-262 Transportes');

-- ============================================
-- 4. ENTREGADORES (4 com dados variados)
-- ============================================
INSERT INTO entregadores (nome, ativo, valor_padrao, telefone, cpf, chave_pix, banco_pagamento, carteira_motorista, ultimo_pagamento_em, senha_hash) VALUES
  ('Carlos Eduardo Silva', TRUE, 0.50, '34991234567', '123.456.789-00', 'carlos.silva@email.com', 'Nubank', 'MG12345678901', NOW() - INTERVAL '15 days', crypt('Senha123', gen_salt('bf'))),
  ('Maria Aparecida Oliveira', TRUE, 0.75, '34992345678', '987.654.321-00', '34992345678', 'Itaú', 'MG98765432101', NOW() - INTERVAL '30 days', crypt('Senha123', gen_salt('bf'))),
  ('João Pedro Santos', TRUE, 0.60, '34993456789', '456.789.123-00', 'joao.santos@pix.com', 'Bradesco', NULL, NOW() - INTERVAL '7 days', crypt('Senha123', gen_salt('bf'))),
  ('Ana Cristina Ferreira', FALSE, 0.55, '34994567890', '789.123.456-00', '78912345600', 'Caixa Econômica', 'MG45678912301', NOW() - INTERVAL '45 days', NULL);

-- ============================================
-- 5. ENDEREÇOS REAIS DE SANTA JULIANA, MG
-- ============================================
-- Usando ruas reais da cidade pesquisadas na internet

-- ============================================
-- 6. PACOTES - CARLOS (10 pacotes)
-- Entregador ativo, variadas situações
-- ============================================
INSERT INTO pacotes (codigo, data_chegada, nf_remessa, descricao, quantidade, endereco_entrega, data_limite_entrega, entregador_id, valor_pacote, pago, data_pagamento, status, data_repassado_entregador, data_retirada_central, data_entrega_real, destinatario, transportadora, observacoes)
VALUES
  -- Pacote 1: Entregue e Validado
  ('SJ-001', NOW() - INTERVAL '10 days', 'NF-2026-001', 'Eletrodomésticos diversos', 3, 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', NOW() - INTERVAL '3 days', 1, 25.50, TRUE, NOW() - INTERVAL '8 days', 'Validado pelo Admin', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', 'Arquidiocese de Uberaba', 'Rápido Triângulo', 'Entregue e validado sem problemas'),

  -- Pacote 2: Entregue, não pago ainda
  ('SJ-002', NOW() - INTERVAL '8 days', 'NF-2026-002', 'Material de escritório', 5, 'Rua Professor Orestes, 314 - Centro, Santa Juliana - MG', NOW() - INTERVAL '2 days', 1, 15.00, FALSE, NULL, 'Entregue', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', 'Prefeitura Municipal', 'LogTrans Minas', 'Documentos entregues na recepção'),

  -- Pacote 3: Em Rota
  ('SJ-003', NOW() - INTERVAL '3 days', 'NF-2026-003', 'Peças automotivas', 8, 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', NOW() + INTERVAL '2 days', 1, 42.00, FALSE, NULL, 'Em Rota', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NULL, 'Oficina Mecânica São Vicente', 'Expresso Santa Juliana', 'Cliente solicitou urgência'),

  -- Pacote 4: Aguardando Retirada (repassado)
  ('SJ-004', NOW() - INTERVAL '2 days', 'NF-2026-004', 'Materiais de construção', 20, 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', NOW() + INTERVAL '5 days', 1, 120.00, FALSE, NULL, 'Aguardando Retirada', NOW() - INTERVAL '1 day', NULL, NULL, 'Construtora Santa Juliana Ltda', 'Rota Certa Transportes', 'Aguardando o entregador retirar na central'),

  -- Pacote 5: Retirado pelo Entregador
  ('SJ-005', NOW() - INTERVAL '1 day', 'NF-2026-005', 'Produtos alimentícios não perecíveis', 12, 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', NOW() + INTERVAL '3 days', 1, 35.00, FALSE, NULL, 'Retirado pelo Entregador', NOW() - INTERVAL '1 day', NOW(), NULL, 'Mercado Céu Azul', 'TransBrasil Cargas', 'Produtos frágeis - manusear com cuidado'),

  -- Pacote 6: Recebido pela Central (novato)
  ('SJ-006', NOW(), 'NF-2026-006', 'Vestuário e uniformes', 30, 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', NOW() + INTERVAL '7 days', 1, 180.00, FALSE, NULL, 'Recebido pela Central', NULL, NULL, NULL, 'Loja Moda Center', 'JulianaLog', 'Aguardando repasse'),

  -- Pacote 7: Retornado a Central (devolução)
  ('SJ-007', NOW() - INTERVAL '15 days', 'NF-2026-007', 'Equipamentos de informática', 2, 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', NOW() - INTERVAL '8 days', 1, 450.00, FALSE, NULL, 'Retornado a Central', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days', 'InfoTech Santa Juliana', 'BR-262 Transportes', 'Destinatário recusou - produto veio errado. Devolução registrada.'),

  -- Pacote 8: Entregue e Validado + Pago
  ('SJ-008', NOW() - INTERVAL '20 days', 'NF-2026-008', 'Móveis planejados', 1, 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', NOW() - INTERVAL '10 days', 1, 890.00, TRUE, NOW() - INTERVAL '12 days', 'Validado pelo Admin', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', 'Residência Família Rezende', 'Rápido Triângulo', 'Cliente muito satisfeito'),

  -- Pacote 9: Entregue (recente)
  ('SJ-009', NOW() - INTERVAL '5 days', 'NF-2026-009', 'Livros e materiais didáticos', 40, 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', NOW() - INTERVAL '1 day', 1, 95.00, FALSE, NULL, 'Entregue', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', 'Escola Municipal Maria da Conceição', 'LogTrans Minas', 'Entregue na biblioteca da escola'),

  -- Pacote 10: Em Rota (urgente)
  ('SJ-010', NOW() - INTERVAL '1 day', 'NF-2026-010', 'Medicamentos e insumos hospitalares', 6, 'Rua José Joaquim da Silva, s/n - Centro, Santa Juliana - MG', NOW(), 1, 320.00, FALSE, NULL, 'Em Rota', NOW() - INTERVAL '1 day', NOW(), NULL, 'Farmácia Municipal', 'Expresso Santa Juliana', 'URGENTE - Medicamentos controlados');

-- ============================================
-- 7. PACOTES - MARIA (10 pacotes)
-- Entregador ativo, 3 transportadoras diferentes
-- ============================================
INSERT INTO pacotes (codigo, data_chegada, nf_remessa, descricao, quantidade, endereco_entrega, data_limite_entrega, entregador_id, valor_pacote, pago, data_pagamento, status, data_repassado_entregador, data_retirada_central, data_entrega_real, destinatario, transportadora, observacoes)
VALUES
  ('SJ-011', NOW() - INTERVAL '12 days', 'NF-2026-011', 'Cosméticos e perfumaria', 15, 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', NOW() - INTERVAL '4 days', 2, 28.00, TRUE, NOW() - INTERVAL '10 days', 'Validado pelo Admin', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days', 'Loja Beleza Pura', 'Rota Certa Transportes', 'Validado com foto'),

  ('SJ-012', NOW() - INTERVAL '6 days', 'NF-2026-012', 'Ferramentas elétricas', 4, 'Rua Professor Orestes, 425 - Centro, Santa Juliana - MG', NOW() - INTERVAL '1 day', 2, 175.00, TRUE, NOW() - INTERVAL '4 days', 'Entregue', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 'Ferragem Santa Juliana', 'TransBrasil Cargas', 'Entregue no estoque'),

  ('SJ-013', NOW() - INTERVAL '4 days', 'NF-2026-013', 'Material esportivo', 10, 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', NOW() + INTERVAL '1 day', 2, 210.00, FALSE, NULL, 'Em Rota', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NULL, 'Academia Fit Center', 'JulianaLog', 'Atrasado - cliente reclamou'),

  ('SJ-014', NOW() - INTERVAL '3 days', 'NF-2026-014', 'Peças e acessórios agrícolas', 25, 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', NOW() + INTERVAL '4 days', 2, 560.00, FALSE, NULL, 'Aguardando Retirada', NOW() - INTERVAL '2 days', NULL, NULL, 'Sítio Boa Esperança', 'BR-262 Transportes', 'Entregador precisa retirar hoje'),

  ('SJ-015', NOW() - INTERVAL '2 days', 'NF-2026-015', 'Produtos de limpeza', 48, 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', NOW() + INTERVAL '6 days', 2, 85.00, FALSE, NULL, 'Retirado pelo Entregador', NOW() - INTERVAL '2 days', NOW(), NULL, 'Mercado Centro', 'Rápido Triângulo', 'Volume grande - caixas pesadas'),

  ('SJ-016', NOW() - INTERVAL '1 day', 'NF-2026-016', 'Material elétrico', 10, 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', NOW() + INTERVAL '5 days', 2, 145.00, FALSE, NULL, 'Recebido pela Central', NULL, NULL, NULL, 'Elétrica Santa Juliana', 'LogTrans Minas', 'Aguardando separação'),

  ('SJ-017', NOW() - INTERVAL '25 days', 'NF-2026-017', 'Máquinas de costura', 3, 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', NOW() - INTERVAL '15 days', 2, 1200.00, FALSE, NULL, 'Retornado a Central', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', NOW() - INTERVAL '20 days', 'Ateliê Costura Fina', 'Expresso Santa Juliana', 'Cliente não estava em casa - 3 tentativas'),

  ('SJ-018', NOW() - INTERVAL '18 days', 'NF-2026-018', 'Brinquedos e jogos', 22, 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', NOW() - INTERVAL '8 days', 2, 135.00, TRUE, NOW() - INTERVAL '10 days', 'Validado pelo Admin', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days', 'Papelaria Criativa', 'Rota Certa Transportes', 'Entregue com sucesso'),

  ('SJ-019', NOW() - INTERVAL '7 days', 'NF-2026-019', 'Bebidas variadas', 60, 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', NOW() - INTERVAL '2 days', 2, 420.00, FALSE, NULL, 'Entregue', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', 'Adega do Centro', 'TransBrasil Cargas', 'Produtos frágeis - vidro'),

  ('SJ-020', NOW(), 'NF-2026-020', 'Equipamentos de segurança', 15, 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', NOW() + INTERVAL '10 days', 2, 280.00, FALSE, NULL, 'Recebido pela Central', NULL, NULL, NULL, 'Construtora Nova Era', 'JulianaLog', 'EPIs diversos');

-- ============================================
-- 8. PACOTES - JOÃO PEDRO (10 pacotes)
-- Entregador ativo, sem CNH
-- ============================================
INSERT INTO pacotes (codigo, data_chegada, nf_remessa, descricao, quantidade, endereco_entrega, data_limite_entrega, entregador_id, valor_pacote, pago, data_pagamento, status, data_repassado_entregador, data_retirada_central, data_entrega_real, destinatario, transportadora, observacoes)
VALUES
  ('SJ-021', NOW() - INTERVAL '14 days', 'NF-2026-021', 'Carnes congeladas', 30, 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', NOW() - INTERVAL '7 days', 3, 380.00, TRUE, NOW() - INTERVAL '10 days', 'Validado pelo Admin', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', 'Açougue do Zé', 'Expresso Santa Juliana', 'Produtos perecíveis - entrega rápida'),

  ('SJ-022', NOW() - INTERVAL '9 days', 'NF-2026-022', 'Papelaria e materiais', 100, 'Rua Professor Orestes, 314 - Centro, Santa Juliana - MG', NOW() - INTERVAL '3 days', 3, 75.00, FALSE, NULL, 'Entregue', NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', 'Papelaria Central', 'LogTrans Minas', 'Entregue na papelaria'),

  ('SJ-023', NOW() - INTERVAL '5 days', 'NF-2026-023', 'Sementes e insumos agrícolas', 40, 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', NOW() - INTERVAL '1 day', 3, 520.00, FALSE, NULL, 'Em Rota', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NULL, 'Agro Santa Juliana', 'BR-262 Transportes', 'Produtos para plantio'),

  ('SJ-024', NOW() - INTERVAL '4 days', 'NF-2026-024', 'Vidros e espelhos', 6, 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', NOW() + INTERVAL '3 days', 3, 340.00, FALSE, NULL, 'Retirado pelo Entregador', NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NULL, 'Vidraçaria Céu Azul', 'Rota Certa Transportes', 'FRÁGIL - não empilhar'),

  ('SJ-025', NOW() - INTERVAL '3 days', 'NF-2026-025', 'Roupas íntimas e meias', 200, 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', NOW() + INTERVAL '4 days', 3, 45.00, FALSE, NULL, 'Aguardando Retirada', NOW() - INTERVAL '2 days', NULL, NULL, 'Lojão do Povo', 'TransBrasil Cargas', 'Repassado - aguardando retirada'),

  ('SJ-026', NOW() - INTERVAL '1 day', 'NF-2026-026', 'Tintas e solventes', 8, 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', NOW() + INTERVAL '8 days', 3, 195.00, FALSE, NULL, 'Recebido pela Central', NULL, NULL, NULL, 'Casa das Tintas', 'Expresso Santa Juliana', 'Produtos perigosos - classe 3'),

  ('SJ-027', NOW() - INTERVAL '30 days', 'NF-2026-027', 'Equipamentos de som', 2, 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', NOW() - INTERVAL '20 days', 3, 2800.00, TRUE, NOW() - INTERVAL '22 days', 'Validado pelo Admin', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '28 days', 'Casa de Festas Céu Azul', 'JulianaLog', 'Equipamentos de alto valor - conferir'),

  ('SJ-028', NOW() - INTERVAL '22 days', 'NF-2026-028', 'Cama, mesa e banho', 15, 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', NOW() - INTERVAL '12 days', 3, 160.00, TRUE, NOW() - INTERVAL '15 days', 'Entregue', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days', NOW() - INTERVAL '20 days', 'Casa & Lar', 'Rápido Triângulo', 'Entregue no endereço'),

  ('SJ-029', NOW() - INTERVAL '10 days', 'NF-2026-029', 'Pneus e câmaras', 4, 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', NOW() - INTERVAL '5 days', 3, 680.00, FALSE, NULL, 'Retornado a Central', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days', 'Borracheiro do Centro', 'LogTrans Minas', 'Cliente mudou de endereço - recusou entrega'),

  ('SJ-030', NOW(), 'NF-2026-030', 'Material para panificação', 10, 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', NOW() + INTERVAL '6 days', 3, 55.00, FALSE, NULL, 'Recebido pela Central', NULL, NULL, NULL, 'Padaria Pão Quente', 'Rota Certa Transportes', 'Entregar pela manhã');

-- ============================================
-- 9. PACOTES - ANA (10 pacotes, entregadora inativa)
-- ============================================
INSERT INTO pacotes (codigo, data_chegada, nf_remessa, descricao, quantidade, endereco_entrega, data_limite_entrega, entregador_id, valor_pacote, pago, data_pagamento, status, data_repassado_entregador, data_retirada_central, data_entrega_real, destinatario, transportadora, observacoes)
VALUES
  ('SJ-031', NOW() - INTERVAL '60 days', 'NF-2026-031', 'Produtos de beleza', 12, 'Rua Professor Orestes, 425 - Centro, Santa Juliana - MG', NOW() - INTERVAL '50 days', 4, 35.00, TRUE, NOW() - INTERVAL '55 days', 'Validado pelo Admin', NOW() - INTERVAL '60 days', NOW() - INTERVAL '59 days', NOW() - INTERVAL '58 days', 'Salão Estilo Novo', 'Rápido Triângulo', 'Antes da inativação'),

  ('SJ-032', NOW() - INTERVAL '55 days', 'NF-2026-032', 'Utensílios domésticos', 8, 'Rua São Vicente de Paulo, 942 - Novo Horizonte, Santa Juliana - MG', NOW() - INTERVAL '45 days', 4, 90.00, TRUE, NOW() - INTERVAL '50 days', 'Validado pelo Admin', NOW() - INTERVAL '55 days', NOW() - INTERVAL '54 days', NOW() - INTERVAL '53 days', 'Casa Nova Utilidades', 'Expresso Santa Juliana', 'Antes da inativação'),

  ('SJ-033', NOW() - INTERVAL '48 days', 'NF-2026-033', 'Fios e cabos elétricos', 5, 'Rua João Batista Faria, 12 - Céu Azul, Santa Juliana - MG', NOW() - INTERVAL '40 days', 4, 220.00, TRUE, NOW() - INTERVAL '42 days', 'Entregue', NOW() - INTERVAL '48 days', NOW() - INTERVAL '47 days', NOW() - INTERVAL '46 days', 'Elétrica Center', 'TransBrasil Cargas', 'Último pacote antes de inativar'),

  ('SJ-034', NOW() - INTERVAL '45 days', 'NF-2026-034', 'Material para encanamento', 15, 'Rua José Pedro Borges, 776 - Centro, Santa Juliana - MG', NOW() - INTERVAL '38 days', 4, 310.00, TRUE, NOW() - INTERVAL '40 days', 'Entregue', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days', NOW() - INTERVAL '43 days', 'Hidráulica Santa Juliana', 'JulianaLog', 'Repassado antes da inativação'),

  ('SJ-035', NOW() - INTERVAL '40 days', 'NF-2026-035', 'Colchões e travesseiros', 4, 'Rua José Binga, 58 - Céu Azul, Santa Juliana - MG', NOW() - INTERVAL '33 days', 4, 450.00, TRUE, NOW() - INTERVAL '35 days', 'Entregue', NOW() - INTERVAL '40 days', NOW() - INTERVAL '39 days', NOW() - INTERVAL '38 days', 'Colchões Sonho Bom', 'Rota Certa Transportes', 'Produtos volumosos'),

  ('SJ-036', NOW() - INTERVAL '35 days', 'NF-2026-036', 'Telefones e acessórios', 10, 'Rua Miguel Arabe, 240 - Centro, Santa Juliana - MG', NOW() - INTERVAL '28 days', 4, 450.00, TRUE, NOW() - INTERVAL '30 days', 'Entregue', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days', NOW() - INTERVAL '33 days', 'InfoTech Celulares', 'BR-262 Transportes', 'Produtos pequenos e frágeis'),

  ('SJ-037', NOW() - INTERVAL '30 days', 'NF-2026-037', 'Verduras e legumes (orgânicos)', 50, 'Rua José Goulart, 753 - Centro, Santa Juliana - MG', NOW() - INTERVAL '25 days', 4, 65.00, FALSE, NULL, 'Retornado a Central', NOW() - INTERVAL '30 days', NOW() - INTERVAL '29 days', NOW() - INTERVAL '27 days', 'Sacolão Popular', 'LogTrans Minas', 'Cliente rejeitou por qualidade'),

  ('SJ-038', NOW() - INTERVAL '28 days', 'NF-2026-038', 'Material de pintura', 6, 'Rua Antônio Rezende, 440 - Centro, Santa Juliana - MG', NOW() - INTERVAL '22 days', 4, 180.00, FALSE, NULL, 'Entregue', NOW() - INTERVAL '28 days', NOW() - INTERVAL '27 days', NOW() - INTERVAL '26 days', 'Loja de Tintas PintCenter', 'Rápido Triângulo', 'Entregue sem validação'),

  ('SJ-039', NOW() - INTERVAL '25 days', 'NF-2026-039', 'Artigos de festa', 30, 'Rua Ênio Gonçalves, 324 - Centro, Santa Juliana - MG', NOW() - INTERVAL '18 days', 4, 25.00, FALSE, NULL, 'Em Rota', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days', NULL, 'Festa Show Ltda', 'Expresso Santa Juliana', 'Estava em andamento quando inativada'),

  ('SJ-040', NOW() - INTERVAL '20 days', 'NF-2026-040', 'Ferramentas manuais', 8, 'Praça Floriano Peixoto, 22 - Centro, Santa Juliana - MG', NOW() - INTERVAL '15 days', 4, 95.00, FALSE, NULL, 'Aguardando Retirada', NOW() - INTERVAL '20 days', NULL, NULL, 'Loja do Mecânico', 'TransBrasil Cargas', 'Parado desde a inativação');

-- ============================================
-- 10. HISTÓRICO DE WHATSAPP (alguns logs)
-- ============================================
INSERT INTO whatsapp_log (entregador_id, pacote_codigo, data_envio, tipo) VALUES
  (1, 'SJ-001', NOW() - INTERVAL '9 days', 'consulta'),
  (1, 'SJ-003', NOW() - INTERVAL '2 days', 'consulta'),
  (1, 'SJ-007', NOW() - INTERVAL '12 days', 'consulta'),
  (2, 'SJ-013', NOW() - INTERVAL '3 days', 'consulta'),
  (2, 'SJ-017', NOW() - INTERVAL '22 days', 'consulta'),
  (3, 'SJ-023', NOW() - INTERVAL '4 days', 'consulta'),
  (3, 'SJ-029', NOW() - INTERVAL '8 days', 'consulta'),
  (4, 'SJ-039', NOW() - INTERVAL '24 days', 'consulta');

-- ============================================
-- 11. PAGAMENTOS (histórico de ciclos)
-- ============================================
INSERT INTO pagamentos_entregador (entregador_id, data_inicio, data_fim, total_entregues, total_valor, valor_pago, data_pagamento, forma_pagamento) VALUES
  (1, '2026-05-01', '2026-05-15', 3, 1365.50, 1365.50, NOW() - INTERVAL '15 days', 'PIX'),
  (1, '2026-05-16', '2026-05-31', 2, 110.00, 110.00, NOW() - INTERVAL '7 days', 'Dinheiro'),
  (2, '2026-04-15', '2026-04-30', 4, 598.00, 598.00, NOW() - INTERVAL '30 days', 'PIX'),
  (2, '2026-05-01', '2026-05-15', 3, 665.00, 500.00, NOW() - INTERVAL '20 days', 'Boleto'),
  (3, '2026-05-10', '2026-05-25', 3, 585.00, 585.00, NOW() - INTERVAL '7 days', 'PIX'),
  (4, '2026-03-01', '2026-04-15', 6, 1610.00, 1610.00, NOW() - INTERVAL '45 days', 'PIX');

-- ============================================
-- 12. FINALIZACAO_DIA (snapshots diários)
-- ============================================
INSERT INTO finalizacao_dia (data, total_pacotes, total_entregues, total_valor) VALUES
  (CURRENT_DATE - INTERVAL '1 day', 15, 8, 1250.00),
  (CURRENT_DATE - INTERVAL '2 days', 18, 10, 2150.00),
  (CURRENT_DATE - INTERVAL '7 days', 12, 7, 980.00);

INSERT INTO finalizacao_dia_entregador (entregador_id, data, total_pacotes, total_entregues, total_falhas, total_valor, total_pago) VALUES
  (1, CURRENT_DATE - INTERVAL '1 day', 5, 3, 0, 285.00, 150.00),
  (2, CURRENT_DATE - INTERVAL '1 day', 4, 2, 1, 320.00, 200.00),
  (3, CURRENT_DATE - INTERVAL '1 day', 6, 3, 1, 450.00, 300.00),
  (1, CURRENT_DATE - INTERVAL '2 days', 4, 3, 0, 520.00, 420.00),
  (2, CURRENT_DATE - INTERVAL '2 days', 5, 4, 0, 680.00, 680.00),
  (3, CURRENT_DATE - INTERVAL '2 days', 3, 2, 0, 380.00, 200.00);

-- ============================================
-- 13. CONFIGURAÇÕES (features - todas ativas)
-- ============================================
INSERT INTO configuracoes_sistema (chave, nome, descricao, grupo, ativo) VALUES
  ('dashboard', 'Dashboard', 'Visão geral com indicadores e métricas', 'Geral', TRUE),
  ('relatorio_diario', 'Relatório Diário', 'Acompanhamento do movimento do dia', 'Geral', TRUE),
  ('relatorio_consolidado', 'Relatório Consolidado', 'Relatório mensal/semanal/quinzenal por entregador', 'Geral', TRUE),
  ('financeiro', 'Financeiro', 'Controle centralizado de pagamentos dos entregadores', 'Geral', TRUE),
  ('ciclos_pagamento', 'Ciclos de Pagamento', 'Pagamento por ciclo desde o último pagamento', 'Geral', TRUE),
  ('finalizar_dia', 'Finalizar Dia', 'Encerramento do movimento diário com snapshot', 'Geral', TRUE),
  ('pacotes_lista', 'Lista de Pacotes', 'Visualizar todos os pacotes cadastrados', 'Pacotes', TRUE),
  ('pacotes_registrar', 'Registrar Pacote', 'Cadastrar novos pacotes no sistema', 'Pacotes', TRUE),
  ('pacotes_rastrear', 'Rastrear Pacote', 'Buscar pacotes por código, endereço ou destinatário', 'Pacotes', TRUE),
  ('pacotes_editar', 'Editar Pacote', 'Editar dados e alterar status do pacote', 'Pacotes', TRUE),
  ('pacotes_repassar_lote', 'Repasse em Lote', 'Repassar múltiplos pacotes a um entregador', 'Pacotes', TRUE),
  ('entregadores_crud', 'Entregadores', 'Gerenciar cadastro de entregadores', 'Entregadores', TRUE),
  ('entregador_detalhe', 'Detalhe do Entregador', 'Perfil individual com resumo e pacotes', 'Entregadores', TRUE),
  ('fotos_galeria', 'Galeria de Fotos', 'Visualizar fotos das entregas', 'Entregas', TRUE),
  ('fotos_validar', 'Validar Entrega', 'Aprovar entrega diretamente na galeria', 'Entregas', TRUE),
  ('transportadoras_crud', 'Transportadoras', 'Gerenciar transportadoras cadastradas', 'Configurações', TRUE),
  ('configuracoes_sistema', 'Configurações do Sistema', 'Habilitar/desabilitar funcionalidades', 'Configurações', TRUE),
  ('whatsapp_integracao', 'WhatsApp', 'Integração com WhatsApp para contato com entregadores', 'Entregas', TRUE),
  ('entregador_campos_adicionais', 'Dados Adicionais', 'Campos extras do entregador (CPF, PIX, CNH, Banco)', 'Entregadores', TRUE)
ON CONFLICT (chave) DO NOTHING;

-- ============================================
-- 14. VERIFICAÇÃO
-- ============================================
SELECT '✅ SEED COMPLETO!' as status;
SELECT '👤 Usuários' as tabela, COUNT(*) as total FROM usuarios
UNION ALL SELECT '🚚 Entregadores', COUNT(*) FROM entregadores
UNION ALL SELECT '📦 Pacotes', COUNT(*) FROM pacotes
UNION ALL SELECT '🏢 Transportadoras', COUNT(*) FROM transportadoras
UNION ALL SELECT '📱 WhatsApp Log', COUNT(*) FROM whatsapp_log
UNION ALL SELECT '💰 Pagamentos', COUNT(*) FROM pagamentos_entregador
UNION ALL SELECT '📊 Finalização Dia', COUNT(*) FROM finalizacao_dia
UNION ALL SELECT '📋 Finalização Entregador', COUNT(*) FROM finalizacao_dia_entregador
UNION ALL SELECT '⚙️ Configurações', COUNT(*) FROM configuracoes_sistema;
