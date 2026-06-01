'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MapaRota from '@/components/mapa-rota';
import BotaoComprovante from '@/components/comprovante-pdf';

/* ============================================================
   HELPERS COMPARTILHADOS (ZERO duplicação)
   ============================================================ */
import {
  Icons,
  type StatusPacote,
  statusBadgeClass,
  statusLabel,
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  isAtrasado,
  gpsLink,
  gerarWhatsAppLink,
} from '@/lib/shared-helpers';

import { useFeature, FEATURES } from '@/lib/features';
import FeatureGuard from '@/components/feature-guard';

/* ============================================================
   TIPOS
   ============================================================ */
interface PacoteDetalhado {
  codigo: string;
  status: StatusPacote;
  destinatario: string;
  endereco_entrega: string;
  data_limite_entrega: string;
  data_chegada?: string | null;
  descricao?: string | null;
  quantidade: number;
  transportadora?: string | null;
  nf_remessa?: string | null;
  valor_pacote: number;
  observacoes?: string | null;
  foto?: string | null;
  gps_foto?: string | null;
  telefone_destinatario?: string | null;
}

type TimelineStep = {
  label: string;
  icone: string;
  ativo: boolean;
  concluido: boolean;
  data?: string | null;
};

/* ============================================================
   CONSTANTES
   ============================================================ */
const STEPS_FIXOS: { label: string; icone: string }[] = [
  { label: 'Recebido pela Central', icone: '📦' },
  { label: 'Aguardando Retirada', icone: '⏳' },
  { label: 'Retirado pelo Entregador', icone: '✋' },
  { label: 'Em Rota', icone: '🚚' },
  { label: 'Entregue', icone: '✅' },
];

/* ============================================================
   HELPERS LOCAIS (apenas lógica específica desta página)
   ============================================================ */
function construirTimeline(pacote: PacoteDetalhado): TimelineStep[] {
  const indexAtual = STEPS_FIXOS.findIndex(
    (s) => s.label === pacote.status,
  );

  if (pacote.status === 'Retornado a Central') {
    return [
      { label: 'Recebido pela Central', icone: '📦', ativo: false, concluido: true },
      { label: 'Aguardando Retirada', icone: '⏳', ativo: false, concluido: true },
      { label: 'Retirado pelo Entregador', icone: '✋', ativo: false, concluido: true },
      { label: 'Em Rota', icone: '🚚', ativo: false, concluido: true },
      { label: 'Devolvido à Central', icone: '🔙', ativo: true, concluido: false, data: null },
    ];
  }

  if (pacote.status === 'Validado pelo Admin') {
    return STEPS_FIXOS.map((s) => ({
      ...s,
      ativo: false,
      concluido: true,
      data: null,
    }));
  }

  return STEPS_FIXOS.map((s, i) => ({
    ...s,
    ativo: i === indexAtual,
    concluido: i < indexAtual,
    data: null,
  }));
}

/* ============================================================
   SKELETON (Loading)
   ============================================================ */
function SkeletonScreen() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200" />
        <div className="h-6 w-28 rounded-md bg-gray-200" />
        <div className="h-7 w-24 rounded-full bg-gray-200 ml-auto" />
      </div>
      {/* Card skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="content-card p-5 space-y-3">
          <div className="h-5 w-36 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
          </div>
          <div className="h-4 w-24 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   LOADING INICIAL
   ============================================================ */
function LoadingFull() {
  return (
    <div className="admin-content min-h-screen">
      <div className="max-w-lg mx-auto pt-6 px-4 pb-8">
        <SkeletonScreen />
      </div>
    </div>
  );
}

/* ============================================================
   ERROR STATE
   ============================================================ */
function ErrorState({
  mensagem,
  onRetry,
}: {
  mensagem: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        <div className="mb-4 flex justify-center">
          <Icons.Alert width={60} height={60} stroke="#f87171" strokeWidth={1.2} />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-1">Algo deu errado</h3>
        <p className="text-sm text-gray-400 mb-6">{mensagem}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-[0.97] transition-all"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SUB-COMPONENTES DA PÁGINA
   ============================================================ */

/* --- Seção: Informações do Pacote --- */
function InfoSection({ pacote }: { pacote: PacoteDetalhado }) {
  const atrasado = isAtrasado(pacote.data_limite_entrega) &&
    pacote.status !== 'Entregue' &&
    pacote.status !== 'Validado pelo Admin';

  const rows: { icon: React.ReactNode; label: string; value: string | React.ReactNode }[] = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      label: 'Destinatário',
      value: pacote.destinatario || '—',
    },
    {
      icon: <Icons.MapPin width={18} height={18} />,
      label: 'Endereço',
      value: pacote.endereco_entrega || '—',
    },
    {
      icon: <Icons.Calendar width={16} height={16} />,
      label: 'Data Limite',
      value: (
        <span className="inline-flex items-center gap-1.5">
          <span>{formatDateBR(pacote.data_limite_entrega)}</span>
          {atrasado && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
              ATRASADO
            </span>
          )}
        </span>
      ),
    },
    {
      icon: <Icons.Calendar width={16} height={16} />,
      label: 'Data de Chegada',
      value: formatDateTimeBR(pacote.data_chegada),
    },
    {
      icon: <Icons.Box width={18} height={18} />,
      label: 'Descrição',
      value: pacote.descricao || '—',
    },
    {
      icon: <Icons.Package width={18} height={18} />,
      label: 'Quantidade',
      value: String(pacote.quantidade ?? '—'),
    },
    {
      icon: <Icons.Truck width={18} height={18} />,
      label: 'Transportadora',
      value: pacote.transportadora || '—',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
      label: 'NF / Remessa',
      value: pacote.nf_remessa || '—',
    },
    {
      icon: <Icons.Cash width={18} height={18} />,
      label: 'Valor',
      value: <span className="font-semibold text-gray-900">{formatCurrency(pacote.valor_pacote)}</span>,
    },
  ];

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        📋 Informações do Pacote
      </h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-gray-400">{row.icon}</span>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                {row.label}
              </span>
              <span className="block text-sm text-gray-700 mt-0.5">{row.value}</span>
            </div>
          </div>
        ))}

        {/* Observações (se houver) */}
        {pacote.observacoes && (
          <div className="flex items-start gap-3 pt-2 border-t border-gray-100 mt-2">
            <span className="mt-0.5 shrink-0 text-gray-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Observações
              </span>
              <span className="block text-sm text-gray-700 mt-0.5 italic">
                {pacote.observacoes}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Seção: Rastreamento (Timeline) --- */
function TimelineSection({ pacote }: { pacote: PacoteDetalhado }) {
  const steps = construirTimeline(pacote);

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-5 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        📍 Rastreamento
      </h3>

      <div className="relative">
        {/* Linha vertical conectora */}
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-gray-200" />

        <div className="space-y-0">
          {steps.map((step) => {
            let corBolinha = 'bg-gray-200 border-gray-300';
            let corTexto = 'text-gray-400';
            let corLabel = 'text-gray-400';
            let fontWeight = 'font-medium';

            if (step.concluido) {
              corBolinha = 'bg-green-500 border-green-500';
              corTexto = 'text-green-600';
              corLabel = 'text-gray-900';
            }

            if (step.ativo) {
              corBolinha = 'bg-blue-500 border-blue-500 ring-4 ring-blue-100';
              corTexto = 'text-blue-600';
              corLabel = 'text-gray-900';
              fontWeight = 'font-bold';
            }

            return (
              <div key={step.label} className="relative flex items-start gap-4 pb-6 last:pb-0">
                {/* Bolinha indicadora */}
                <div
                  className={`relative z-10 mt-0.5 w-[34px] h-[34px] rounded-full flex items-center justify-center text-xs border-2 shrink-0 transition-all duration-300 ${corBolinha} ${
                    step.concluido ? 'shadow-sm' : ''
                  } ${step.ativo ? 'shadow-md shadow-blue-200' : ''}`}
                >
                  {step.concluido ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className={step.ativo ? 'text-white' : 'text-gray-400'}>
                      {step.icone}
                    </span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className={`text-sm leading-snug ${corLabel} ${fontWeight}`}>
                    {step.label}
                  </p>
                  {step.data && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDateTimeBR(step.data)}
                    </p>
                  )}
                  {step.ativo && (
                    <span className="inline-flex items-center gap-1 mt-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-600 border border-blue-200">
                      Status atual
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --- Seção: Foto e GPS --- */
function FotoSection({ pacote }: { pacote: PacoteDetalhado }) {
  const temFoto = !!pacote.foto;
  const temGps = !!pacote.gps_foto;
  const gpsUrl = gpsLink(pacote.gps_foto);

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        📸 Foto da Entrega
      </h3>

      {temFoto ? (
        <div className="space-y-3">
          <a
            href={pacote.foto!}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
          >
            <img
              src={pacote.foto!}
              alt="Foto da entrega"
              className="w-full max-h-72 object-cover"
            />
          </a>
          <a
            href={pacote.foto!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Abrir foto em nova aba
          </a>

          {temGps && gpsUrl && (
            <div className="pt-2 border-t border-gray-100">
              <a
                href={gpsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Icons.GPS width={14} height={14} />
                Ver localização no Google Maps
              </a>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                GPS: {pacote.gps_foto}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 opacity-40">
            <Icons.Camera width={20} height={20} />
          </div>
          <p className="text-sm text-gray-400">Nenhuma foto registrada</p>
        </div>
      )}
    </div>
  );
}

/* --- Seção: Mapa da Localização --- */
function MapaSection({ pacote }: { pacote: PacoteDetalhado }) {
  if (!pacote.gps_foto) return null;

  const [lat, lng] = pacote.gps_foto.split(',').map(Number);
  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        🗺️ Localização da Entrega
      </h3>
      <MapaRota
        pontos={[{ lat, lng, codigo: pacote.codigo, endereco: pacote.endereco_entrega, destinatario: pacote.destinatario, status: pacote.status }]}
        single={true}
        altura="220px"
      />
      <p className="text-[10px] text-gray-400 mt-2 font-mono text-center">
        GPS: {pacote.gps_foto}
      </p>
    </div>
  );
}

/* --- Seção: Ações Rápidas --- */
function AcoesSection({
  pacote,
  onAcao,
  acaoLoading,
}: {
  pacote: PacoteDetalhado;
  onAcao: (acao: string) => void;
  acaoLoading: boolean;
}) {
  const status = pacote.status;

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        ⚡ Ações Rápidas
      </h3>

      {status === 'Aguardando Retirada' && (
        <button
          onClick={() => onAcao('retirar')}
          disabled={acaoLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-amber-600 active:scale-[0.97] transition-all shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {acaoLoading ? (
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Retirar Pacote
            </>
          )}
        </button>
      )}

      {status === 'Retirado pelo Entregador' && (
        <button
          onClick={() => onAcao('iniciar_rota')}
          disabled={acaoLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.97] transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {acaoLoading ? (
            <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <>
              <Icons.Truck width={18} height={18} />
              Iniciar Rota
            </>
          )}
        </button>
      )}

      {status === 'Em Rota' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAcao('entregar')}
            disabled={acaoLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-green-700 active:scale-[0.97] transition-all shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {acaoLoading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Icons.Check width={20} height={20} />
                Entregar
              </>
            )}
          </button>
          <button
            onClick={() => onAcao('devolver')}
            disabled={acaoLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white hover:bg-orange-600 active:scale-[0.97] transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {acaoLoading ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Icons.Undo width={20} height={20} />
                Devolver
              </>
            )}
          </button>
        </div>
      )}

      {(status === 'Entregue' || status === 'Validado pelo Admin') && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 border border-green-200 px-5 py-4">
          <Icons.Check width={20} height={20} />
          <span className="text-sm font-bold text-green-700">Entrega Concluída</span>
        </div>
      )}

      {status === 'Retornado a Central' && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-orange-50 border border-orange-200 px-5 py-4">
          <span className="text-lg">📦</span>
          <span className="text-sm font-bold text-orange-700">Devolvido à Central</span>
        </div>
      )}
    </div>
  );
}

/* --- Seção: WhatsApp --- */
function WhatsAppSection({ pacote }: { pacote: PacoteDetalhado }) {
  const temDestinatario = !!pacote.destinatario;

  const mensagem = temDestinatario
    ? `Olá ${pacote.destinatario.split(' ')[0]}! Aqui é do Rota Prime. Tenho uma entrega para você do pacote *${pacote.codigo}*. Podemos confirmar o endereço?`
    : '';

  const waLink = gerarWhatsAppLink(pacote.telefone_destinatario, mensagem);

  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        📱 WhatsApp
      </h3>

      {waLink ? (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.97] transition-all shadow-md shadow-green-200"
        >
          <Icons.WhatsApp width={20} height={20} />
          Contatar Destinatário
        </a>
      ) : (
        <button
          disabled
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-400 cursor-not-allowed border border-gray-200"
        >
          <Icons.WhatsApp width={20} height={20} />
          WhatsApp — Indisponível
        </button>
      )}
    </div>
  );
}

/* --- Seção: Comprovante PDF --- */
function ComprovanteSection({ pacote, entregadorNome }: { pacote: PacoteDetalhado; entregadorNome?: string }) {
  return (
    <div className="content-card p-5">
      <h3 className="section-header text-sm font-bold text-gray-900 mb-4 flex items-center gap-2 px-3 py-2 -mx-5 -mt-5 rounded-t-xl">
        📄 Comprovante
      </h3>
      <BotaoComprovante
        dados={{
          codigo: pacote.codigo,
          status: pacote.status,
          destinatario: pacote.destinatario,
          endereco_entrega: pacote.endereco_entrega,
          data_entrega: null,
          data_chegada: pacote.data_chegada || '',
          data_limite_entrega: pacote.data_limite_entrega,
          descricao: pacote.descricao,
          quantidade: pacote.quantidade,
          valor_pacote: pacote.valor_pacote,
          transportadora: pacote.transportadora,
          nf_remessa: pacote.nf_remessa,
          foto: pacote.foto,
          gps_foto: pacote.gps_foto,
          entregador_nome: entregadorNome,
          observacoes: pacote.observacoes,
        }}
        className="w-full justify-center bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200"
      />
    </div>
  );
}

/* ============================================================
   PÁGINA PRINCIPAL — DETALHE DO PACOTE
   ============================================================ */
export default function PacoteDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const codigo = params.codigo as string;

  /* Feature toggle */
  const detalheAtivo = useFeature(FEATURES.DETALHE_PACOTE_COMPLETO);

  /* Estados */
  const [pacote, setPacote] = useState<PacoteDetalhado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  /* ========== Buscar CSRF ========== */
  const fetchCsrf = useCallback(async () => {
    try {
      const res = await fetch('/api/entregador/csrf');
      const data = await res.json();
      if (data.csrf_token) setCsrfToken(data.csrf_token);
    } catch {
      // falha silenciosa — tenta novamente antes de ações críticas
    }
  }, []);

  /* ========== Buscar Pacote ========== */
  const fetchPacote = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/entregador/pacotes?status=todos');

      if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);

      const data = await res.json();
      const lista: PacoteDetalhado[] = Array.isArray(data) ? data : data.pacotes ?? [];
      const encontrado = lista.find((p) => p.codigo === codigo);

      if (!encontrado) throw new Error('Pacote não encontrado');

      setPacote(encontrado);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro inesperado ao carregar pacote.',
      );
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    fetchCsrf();
    fetchPacote();
  }, [fetchCsrf, fetchPacote]);

  /* ========== Executar Ação ========== */
  const executarAcao = useCallback(
    async (acao: string) => {
      if (!pacote) return;

      let token = csrfToken;
      if (!token) {
        try {
          const res = await fetch('/api/entregador/csrf');
          const data = await res.json();
          token = data.csrf_token;
          setCsrfToken(token);
        } catch {
          alert('Erro de segurança. Recarregue a página.');
          return;
        }
      }

      setAcaoLoading(true);

      try {
        const res = await fetch(`/api/entregador/pacotes/${codigo}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao, csrf_token: token }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message ?? `Erro ${res.status}`);
        }

        // Recarrega os dados após ação bem-sucedida
        await fetchPacote();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : 'Erro ao executar ação.',
        );
      } finally {
        setAcaoLoading(false);
      }
    },
    [pacote, codigo, csrfToken, fetchPacote],
  );

  /* ========== Loading: feature toggle ========== */
  if (detalheAtivo === null) {
    return <LoadingFull />;
  }

  /* ========== Feature desabilitada ========== */
  if (!detalheAtivo) {
    return (
      <div className="admin-content min-h-screen flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center">
          <div className="mb-4 flex justify-center">
            <Icons.Alert width={60} height={60} stroke="#f87171" strokeWidth={1.2} />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Recurso Indisponível</h3>
          <p className="text-sm text-gray-400 mb-6">
            O detalhamento completo do pacote não está disponível no momento.
          </p>
          <button
            onClick={() => router.push('/entregador/meus-pacotes')}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 active:scale-[0.97] transition-all"
          >
            <Icons.ChevronLeft width={20} height={20} />
            Voltar para Meus Pacotes
          </button>
        </div>
      </div>
    );
  }

  /* ========== Loading inicial dos dados ========== */
  if (loading && !pacote) {
    return <LoadingFull />;
  }

  /* ========== Erro ========== */
  if (error) {
    return (
      <div className="admin-content min-h-screen">
        <div className="max-w-lg mx-auto">
          {/* Header mínimo no erro */}
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100/60 px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/entregador/meus-pacotes')}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90 transition-all"
                aria-label="Voltar"
              >
                <Icons.ChevronLeft width={20} height={20} />
              </button>
            </div>
          </header>
          <ErrorState mensagem={error} onRetry={fetchPacote} />
        </div>
      </div>
    );
  }

  if (!pacote) return null;

  /* ========== Render ========== */
  return (
    <FeatureGuard feature={FEATURES.MEUS_PACOTES_AVANCADO}>
      <div className="admin-content min-h-screen">
        <div className="max-w-lg mx-auto pb-24">
          {/* ══════════ HEADER ══════════ */}
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100/60 px-4 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/entregador/meus-pacotes')}
                className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90 transition-all"
                aria-label="Voltar"
              >
                <Icons.ChevronLeft width={20} height={20} />
              </button>

              <div className="flex-1 min-w-0">
                <h1 className="font-mono font-bold text-base text-gray-900 truncate">
                  #{pacote.codigo}
                </h1>
              </div>

              <span
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold shrink-0 ${statusBadgeClass(
                  pacote.status,
                )}`}
              >
                {statusLabel(pacote.status)}
              </span>
            </div>
          </header>

          {/* ══════════ CONTEÚDO ══════════ */}
          <div className="px-4 pt-5 space-y-4">
            {/* 1. Informações do Pacote */}
            <InfoSection pacote={pacote} />

            {/* 2. Rastreamento (Timeline) */}
            <TimelineSection pacote={pacote} />

            {/* 3. Foto e GPS (se existir) */}
            <FotoSection pacote={pacote} />

            {/* 3.1. Mapa da Localização (se tiver GPS) */}
            <MapaSection pacote={pacote} />

            {/* 4. Ações Rápidas (se aplicável) */}
            <AcoesSection
              pacote={pacote}
              onAcao={executarAcao}
              acaoLoading={acaoLoading}
            />

            {/* 5. Comprovante PDF */}
            <ComprovanteSection pacote={pacote} />

            {/* 6. WhatsApp */}
            <WhatsAppSection pacote={pacote} />
          </div>
        </div>
      </div>
    </FeatureGuard>
  );
}
