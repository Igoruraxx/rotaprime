-- Sistema de Controle de Funcionalidades (Features Toggles)
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(80) UNIQUE NOT NULL,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT DEFAULT '',
  grupo VARCHAR(60) DEFAULT 'Geral',
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Inserir todas as features existentes do sistema
INSERT INTO configuracoes_sistema (chave, nome, descricao, grupo, ativo) VALUES
  ('dashboard', 'Dashboard', 'Visão geral com indicadores e métricas', 'Geral', TRUE),
  ('relatorio_diario', 'Relatório Diário', 'Acompanhamento do movimento do dia', 'Geral', TRUE),
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
  ('configuracoes_sistema', 'Configurações do Sistema', 'Habilitar/desabilitar funcionalidades', 'Configurações', TRUE)
ON CONFLICT (chave) DO NOTHING;
