-- Migração: Features Completas do Sistema Rota Prime
-- Atualiza/Acrescenta todas as funcionalidades na tabela configuracoes_sistema

-- Função auxiliar para inserir se não existir
CREATE OR REPLACE FUNCTION upsert_feature(
  p_chave VARCHAR,
  p_nome VARCHAR,
  p_descricao TEXT,
  p_grupo VARCHAR,
  p_ativo BOOLEAN DEFAULT true
) RETURNS void AS $$
BEGIN
  INSERT INTO configuracoes_sistema (chave, nome, descricao, grupo, ativo)
  VALUES (p_chave, p_nome, p_descricao, p_grupo, p_ativo)
  ON CONFLICT (chave) DO UPDATE SET
    nome = EXCLUDED.nome,
    descricao = EXCLUDED.descricao,
    grupo = EXCLUDED.grupo;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════
-- GRUPO: GERAL
-- ══════════════════════════════════════
SELECT upsert_feature('modulo_admin', 'Módulo Admin', 'Habilitar todo o módulo administrativo', 'Geral', true);
SELECT upsert_feature('modulo_entregador', 'Módulo Entregador', 'Habilitar acesso do entregador ao sistema', 'Geral', true);
SELECT upsert_feature('tema_escuro', 'Tema Escuro', 'Habilitar tema escuro no admin', 'Geral', true);
SELECT upsert_feature('sistema_auditoria', 'Sistema de Auditoria', 'Registrar todas as ações dos usuários', 'Geral', true);

-- ══════════════════════════════════════
-- GRUPO: PACOTES
-- ══════════════════════════════════════
SELECT upsert_feature('pacotes_crud', 'CRUD de Pacotes', 'Cadastro, edição e exclusão de pacotes', 'Pacotes', true);
SELECT upsert_feature('rastreamento_avancado', 'Rastreamento Avançado', 'Timeline e rastreamento completo dos pacotes', 'Pacotes', true);
SELECT upsert_feature('atribuicao_lote', 'Atribuição em Lote', 'Atribuir múltiplos pacotes a entregadores de uma vez', 'Pacotes', true);
SELECT upsert_feature('edicao_completa_pacote', 'Edição Completa', 'Permite editar todos os campos do pacote no admin', 'Pacotes', true);
SELECT upsert_feature('validacao_admin', 'Validação pelo Admin', 'Admin precisa validar a entrega para concluir o ciclo', 'Pacotes', true);
SELECT upsert_feature('mapa_pacotes', 'Mapa de Pacotes', 'Exibir mapa com localização das entregas', 'Pacotes', true);
SELECT upsert_feature('comprovante_pdf', 'Comprovante PDF', 'Gerar comprovante de entrega em PDF', 'Pacotes', true);

-- ══════════════════════════════════════
-- GRUPO: ENTREGADORES
-- ══════════════════════════════════════
SELECT upsert_feature('entregadores_crud', 'CRUD de Entregadores', 'Gerenciamento de entregadores', 'Entregadores', true);
SELECT upsert_feature('entregador_detalhe', 'Detalhe do Entregador', 'Página com detalhes do entregador e seus pacotes', 'Entregadores', true);
SELECT upsert_feature('entregador_campos_adicionais', 'Campos Adicionais', 'CPF, PIX, CNH, Banco nos entregadores', 'Entregadores', true);
SELECT upsert_feature('controle_senha', 'Controle de Senha', 'Definir/alterar senha do entregador', 'Entregadores', true);
SELECT upsert_feature('valor_padrao_entrega', 'Valor Padrão', 'Valor padrão de entrega por entregador', 'Entregadores', true);
SELECT upsert_feature('ciclos_pagamento', 'Ciclos de Pagamento', 'Gerenciar ciclos de pagamento dos entregadores', 'Entregadores', true);

-- ══════════════════════════════════════
-- GRUPO: ENTREGAS
-- ══════════════════════════════════════
SELECT upsert_feature('foto_entrega', 'Foto da Entrega', 'Capturar foto na entrega', 'Entregas', true);
SELECT upsert_feature('gps_entrega', 'GPS da Entrega', 'Capturar coordenadas GPS na entrega', 'Entregas', true);
SELECT upsert_feature('compressed_foto', 'Compressão de Fotos', 'Comprimir fotos para WebP (máx 200KB)', 'Entregas', true);
SELECT upsert_feature('gestao_fotos_admin', 'Gestão de Fotos', 'Admin pode ver/validar/limpar fotos de entrega', 'Entregas', true);
SELECT upsert_feature('agrupamento_rota', 'Agrupamento por Rota', 'Agrupar pacotes por endereço para otimizar rotas', 'Entregas', true);

-- ══════════════════════════════════════
-- GRUPO: RELATÓRIOS
-- ══════════════════════════════════════
SELECT upsert_feature('relatorio_diario', 'Relatório Diário', 'Relatório de entregas do dia', 'Relatórios', true);
SELECT upsert_feature('relatorio_consolidado', 'Relatório Consolidado', 'Relatório mensal/semanal/quinzenal', 'Relatórios', true);
SELECT upsert_feature('finalizar_dia', 'Finalizar Dia', 'Encerrar o dia de trabalho e gerar snapshot', 'Relatórios', true);
SELECT upsert_feature('exportar_relatorio', 'Exportar Relatórios', 'Exportar relatórios em PDF/CSV', 'Relatórios', true);

-- ══════════════════════════════════════
-- GRUPO: FINANCEIRO
-- ══════════════════════════════════════
SELECT upsert_feature('modulo_financeiro', 'Módulo Financeiro', 'Gestão financeira de entregas e pagamentos', 'Financeiro', true);
SELECT upsert_feature('controle_pagamentos', 'Controle de Pagamentos', 'Marcar/gerenciar pagamentos dos entregadores', 'Financeiro', true);
SELECT upsert_feature('dashboard_financeiro', 'Dashboard Financeiro', 'Visão financeira no dashboard do entregador', 'Financeiro', true);

-- ══════════════════════════════════════
-- GRUPO: COMUNICAÇÃO
-- ══════════════════════════════════════
SELECT upsert_feature('whatsapp_integracao', 'Integração WhatsApp', 'Botão WhatsApp para contatar destinatário', 'Comunicação', true);
SELECT upsert_feature('log_whatsapp', 'Log de WhatsApp', 'Registrar tentativas de contato via WhatsApp', 'Comunicação', true);

-- ══════════════════════════════════════
-- GRUPO: TRANSPORTADORAS
-- ══════════════════════════════════════
SELECT upsert_feature('transportadoras_crud', 'CRUD Transportadoras', 'Gerenciar transportadoras cadastradas', 'Transportadoras', true);

-- ══════════════════════════════════════
-- GRUPO: SEGURANÇA
-- ══════════════════════════════════════
SELECT upsert_feature('csrf_protecao', 'Proteção CSRF', 'Tokens CSRF para ações críticas do entregador', 'Segurança', true);
SELECT upsert_feature('rate_limit', 'Limite de Taxa', 'Rate limiting para login e ações do entregador', 'Segurança', true);
SELECT upsert_feature('mass_assignment_protection', 'Proteção Mass Assignment', 'Whitelist de colunas que o entregador pode alterar', 'Segurança', true);
SELECT upsert_feature('session_timeout', 'Timeout de Sessão', 'Sessão expira após 120 minutos de inatividade', 'Segurança', true);

-- ══════════════════════════════════════
-- GRUPO: DASHBOARD ENTREGADOR
-- ══════════════════════════════════════
SELECT upsert_feature('dashboard_entregador', 'Dashboard Entregador', 'Painel com indicadores para o entregador', 'Dashboard', true);
SELECT upsert_feature('meus_pacotes_avancado', 'Meus Pacotes Avançado', 'Abas de filtro, período e agrupamento por rota', 'Dashboard', true);
SELECT upsert_feature('detalhe_pacote_completo', 'Detalhe Completo', 'Página de detalhe do pacote com timeline e ações', 'Dashboard', true);

-- Remove função auxiliar
DROP FUNCTION IF EXISTS upsert_feature;
