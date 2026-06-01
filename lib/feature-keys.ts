// ═══════════════════════════════════════════════════════════════
// Chaves dos Feature Toggles — SEM DEPENDÊNCIA REACT
// Pode ser importado de server components e middleware
// ═══════════════════════════════════════════════════════════════

export const FEATURES = {
  // Geral
  MODULO_ADMIN: 'modulo_admin',
  MODULO_ENTREGADOR: 'modulo_entregador',
  TEMA_ESCURO: 'tema_escuro',
  SISTEMA_AUDITORIA: 'sistema_auditoria',

  // Pacotes
  PACOTES_CRUD: 'pacotes_crud',
  RASTREAMENTO_AVANCADO: 'rastreamento_avancado',
  ATRIBUICAO_LOTE: 'atribuicao_lote',
  EDICAO_COMPLETA_PACOTE: 'edicao_completa_pacote',
  VALIDACAO_ADMIN: 'validacao_admin',
  MAPA_PACOTES: 'mapa_pacotes',
  COMPROVANTE_PDF: 'comprovante_pdf',

  // Entregadores
  ENTREGADORES_CRUD: 'entregadores_crud',
  ENTREGADOR_DETALHE: 'entregador_detalhe',
  ENTREGADOR_CAMPOS_ADICIONAIS: 'entregador_campos_adicionais',
  CONTROLE_SENHA: 'controle_senha',
  VALOR_PADRAO_ENTREGA: 'valor_padrao_entrega',
  CICLOS_PAGAMENTO: 'ciclos_pagamento',

  // Entregas
  FOTO_ENTREGA: 'foto_entrega',
  GPS_ENTREGA: 'gps_entrega',
  COMPRESSED_FOTO: 'compressed_foto',
  GESTAO_FOTOS_ADMIN: 'gestao_fotos_admin',
  AGRUPAMENTO_ROTA: 'agrupamento_rota',
  ENDERECO_OBRIGATORIO: 'endereco_obrigatorio',

  // Relatórios
  RELATORIO_DIARIO: 'relatorio_diario',
  RELATORIO_CONSOLIDADO: 'relatorio_consolidado',
  FINALIZAR_DIA: 'finalizar_dia',
  EXPORTAR_RELATORIO: 'exportar_relatorio',

  // Financeiro
  MODULO_FINANCEIRO: 'modulo_financeiro',
  CONTROLE_PAGAMENTOS: 'controle_pagamentos',
  DASHBOARD_FINANCEIRO: 'dashboard_financeiro',

  // Comunicação
  WHATSAPP_INTEGRACAO: 'whatsapp_integracao',
  LOG_WHATSAPP: 'log_whatsapp',

  // Transportadoras
  TRANSPORTADORAS_CRUD: 'transportadoras_crud',

  // Segurança
  CSRF_PROTECAO: 'csrf_protecao',
  RATE_LIMIT: 'rate_limit',
  MASS_ASSIGNMENT_PROTECTION: 'mass_assignment_protection',
  SESSION_TIMEOUT: 'session_timeout',

  // Dashboard Entregador
  DASHBOARD_ENTREGADOR: 'dashboard_entregador',
  MEUS_PACOTES_AVANCADO: 'meus_pacotes_avancado',
  DETALHE_PACOTE_COMPLETO: 'detalhe_pacote_completo',
} as const
