'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MapaRota from '@/components/mapa-rota';
import {
  Icons,
  statusBadgeClass,
  statusLabel,
  formatCurrency,
  formatDateBR,
  isAtrasado,
} from '@/lib/shared-helpers';
import { useFeature, FEATURES } from '@/lib/features';

/* ============================================================
   TIPOS
   ============================================================ */
type StatusPacote =
  | 'Aguardando Retirada'
  | 'Retirado pelo Entregador'
  | 'Em Rota'
  | 'Entregue'
  | 'Validado pelo Admin'
  | 'Retornado a Central';

type TabId = 'ativos' | 'entregues' | 'retornadas' | 'todos';
type PeriodoKey = 'hoje' | '7dias' | '30dias' | 'personalizado';

interface Pacote {
  codigo: string;
  status: StatusPacote;
  endereco_entrega: string;
  destinatario: string;
  data_limite_entrega: string;
  valor_pacote: number;
  foto?: string | null;
  observacoes?: string | null;
}

interface GrupoRota {
  endereco: string;
  pacotes: Pacote[];
  valorTotal: number;
}

/* ============================================================
   CONSTANTES
   ============================================================ */
const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'ativos', label: 'Ativos', icon: '\u{1F504}' },
  { id: 'entregues', label: 'Entregues', icon: '\u{2705}' },
  { id: 'retornadas', label: 'Retornadas', icon: '\u{1F4E6}' },
  { id: 'todos', label: 'Todos', icon: '\u{1F4CB}' },
];

const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'personalizado', label: 'Personalizado' },
];

const STATUS_FILTER_MAP: Record<TabId, StatusPacote[]> = {
  ativos: ['Aguardando Retirada', 'Retirado pelo Entregador', 'Em Rota'],
  entregues: ['Entregue', 'Validado pelo Admin'],
  retornadas: ['Retornado a Central'],
  todos: [
    'Aguardando Retirada',
    'Retirado pelo Entregador',
    'Em Rota',
    'Entregue',
    'Validado pelo Admin',
    'Retornado a Central',
  ],
};

/* ============================================================
   HELPERS LOCAIS (somente lógica de período — específica da pagina)
   ============================================================ */
function getPeriodParams(
  key: PeriodoKey,
  dataInicio?: string,
  dataFim?: string,
): Record<string, string> {
  const hoje = new Date();
  const fim = hoje.toISOString().split('T')[0];

  switch (key) {
    case 'hoje':
      return { data_inicio: fim, data_fim: fim };
    case '7dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 7);
      return { data_inicio: inicio.toISOString().split('T')[0], data_fim: fim };
    }
    case '30dias': {
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 30);
      return { data_inicio: inicio.toISOString().split('T')[0], data_fim: fim };
    }
    case 'personalizado':
      return {
        data_inicio: dataInicio ?? fim,
        data_fim: dataFim ?? fim,
      };
    default:
      return {};
  }
}

/* ============================================================
   SUB-COMPONENTES
   ============================================================ */

/* --- Skeleton --- */
function SkeletonCard() {
  return (
    <div className="animate-pulse content-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded-md bg-gray-200" />
        <div className="h-6 w-24 rounded-full bg-gray-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-3/4 rounded bg-gray-100" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-9 w-24 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

function SkeletonScreen() {
  return (
    <div className="space-y-4 px-4 pb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* --- EmptyState --- */
function EmptyState({ mensagem }: { mensagem?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-4 opacity-60">
        <Icons.Package width={80} height={80} stroke="#cbd5e1" strokeWidth={1.2} />
      </div>
      <h3 className="text-lg font-semibold text-gray-700">
        Nenhum pacote encontrado
      </h3>
      <p className="mt-1 text-sm text-gray-400 max-w-xs">
        {mensagem ?? 'Tente alterar os filtros ou periodo selecionado.'}
      </p>
    </div>
  );
}

/* --- ErrorState --- */
function ErrorState({
  mensagem,
  onRetry,
}: {
  mensagem?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-4">
        <Icons.Alert width={60} height={60} stroke="#f87171" strokeWidth={1.2} />
      </div>
      <h3 className="text-lg font-semibold text-gray-700">Algo deu errado</h3>
      <p className="mt-1 text-sm text-gray-400 max-w-xs">
        {mensagem ?? 'Nao foi possivel carregar seus pacotes.'}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-xl btn-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md active:scale-[0.97] transition-all"
      >
        Tentar novamente
      </button>
    </div>
  );
}

/* --- PackageCard --- */
function PackageCard({
  pacote,
  onRetirar,
  onIniciarRota,
  onEntregar,
  onDevolver,
  onVerFoto,
}: {
  pacote: Pacote;
  onRetirar: (p: Pacote) => void;
  onIniciarRota: (p: Pacote) => void;
  onEntregar: (p: Pacote) => void;
  onDevolver: (p: Pacote) => void;
  onVerFoto: (p: Pacote) => void;
}) {
  const atrasado = isAtrasado(pacote.data_limite_entrega);

  return (
    <div className="content-card p-4 space-y-3">
      {/* Codigo + Status */}
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm text-gray-900 tracking-tight">
          #{pacote.codigo}
        </span>
        <span className={`badge-status ${statusBadgeClass(pacote.status)}`}>
          {statusLabel(pacote.status)}
        </span>
      </div>

      {/* Endereco */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-gray-400">
          <Icons.MapPin width={16} height={16} />
        </span>
        <p className="text-sm text-gray-600 leading-snug">
          {pacote.endereco_entrega}
        </p>
      </div>

      {/* Destinatario */}
      <p className="text-sm text-gray-500">
        <span className="font-medium text-gray-700">Destinatario:</span>{' '}
        {pacote.destinatario}
      </p>

      {/* Data + Valor */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-gray-400">
          <Icons.Calendar width={16} height={16} />
          <span className="text-gray-500">
            {formatDateBR(pacote.data_limite_entrega)}
          </span>
          {atrasado &&
            pacote.status !== 'Entregue' &&
            pacote.status !== 'Validado pelo Admin' && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                {'\u26A0\uFE0F'} ATRASADO
              </span>
            )}
        </div>
        <span className="font-semibold text-gray-800">
          {formatCurrency(pacote.valor_pacote)}
        </span>
      </div>

      {/* Acoes */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {pacote.status === 'Aguardando Retirada' && (
          <button
            onClick={() => onRetirar(pacote)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 active:scale-[0.97] transition-all shadow-sm"
          >
            {/* Download icon (sem equivalente em Icons shared) */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Retirar
          </button>
        )}

        {pacote.status === 'Retirado pelo Entregador' && (
          <button
            onClick={() => onIniciarRota(pacote)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm"
          >
            <Icons.Truck width={18} height={18} />
            Iniciar Rota
          </button>
        )}

        {pacote.status === 'Em Rota' && (
          <>
            <button
              onClick={() => onEntregar(pacote)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 active:scale-[0.97] transition-all shadow-sm"
            >
              <Icons.Check width={18} height={18} />
              Entregar
            </button>
            <button
              onClick={() => onDevolver(pacote)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 active:scale-[0.97] transition-all shadow-sm"
            >
              <Icons.Undo width={18} height={18} />
              Devolver
            </button>
          </>
        )}

        {pacote.status === 'Entregue' && (
          <button
            onClick={() => onVerFoto(pacote)}
            disabled={!pacote.foto}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all shadow-sm ${
              pacote.foto
                ? 'bg-gray-700 text-white hover:bg-gray-800 active:scale-[0.97]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Icons.Camera width={20} height={20} />
            Ver Foto
          </button>
        )}

        {pacote.status === 'Validado pelo Admin' && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Icons.Check width={18} height={18} />
            Validado
          </span>
        )}

        {pacote.status === 'Retornado a Central' && (
          <button
            onClick={() => onRetirar(pacote)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 active:scale-[0.97] transition-all shadow-sm"
          >
            {'\u{1F504}'} Tentar Novamente
          </button>
        )}
      </div>
    </div>
  );
}

/* --- GrupoRotaCard --- */
function GrupoRotaCard({
  grupo,
  onRetirar,
  onIniciarRota,
  onEntregar,
  onDevolver,
  onVerFoto,
}: {
  grupo: GrupoRota;
  onRetirar: (p: Pacote) => void;
  onIniciarRota: (p: Pacote) => void;
  onEntregar: (p: Pacote) => void;
  onDevolver: (p: Pacote) => void;
  onVerFoto: (p: Pacote) => void;
}) {
  return (
    <div className="content-card p-4 space-y-3 border border-indigo-100 bg-indigo-50/40">
      {/* Cabecalho do grupo */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="mt-0.5 shrink-0 text-indigo-500">
            <Icons.MapPin width={16} height={16} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-indigo-900 truncate">
              {grupo.endereco}
            </p>
            <p className="text-xs text-indigo-600 mt-0.5">
              {grupo.pacotes.length} pacote
              {grupo.pacotes.length !== 1 ? 's' : ''} &middot; Total:{' '}
              {formatCurrency(grupo.valorTotal)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center justify-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700 shrink-0 ml-2">
          {grupo.pacotes.length}
        </span>
      </div>

      {/* Cards dos pacotes */}
      <div className="space-y-2 pl-1">
        {grupo.pacotes.map((p) => (
          <PackageCard
            key={p.codigo}
            pacote={p}
            onRetirar={onRetirar}
            onIniciarRota={onIniciarRota}
            onEntregar={onEntregar}
            onDevolver={onDevolver}
            onVerFoto={onVerFoto}
          />
        ))}
      </div>
    </div>
  );
}

/* --- EntregaModal --- */
function EntregaModal({
  pacote,
  onClose,
  onConfirm,
}: {
  pacote: Pacote | null;
  onClose: () => void;
  onConfirm: (
    codigo: string,
    fotoBase64: string,
    gps: string,
    observacao: string,
  ) => void;
}) {
  const [foto, setFoto] = useState<string | null>(null);
  const [gps, setGps] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [capturando, setCapturando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFoto(null);
    setGps('');
    setObservacao('');
  }, [pacote]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCapturarGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocalizacao nao disponivel neste navegador.');
      return;
    }
    setCapturando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps(`${pos.coords.latitude},${pos.coords.longitude}`);
        setCapturando(false);
      },
      () => {
        alert(
          'Nao foi possivel obter a localizacao. Verifique as permissoes.',
        );
        setCapturando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleConfirm = () => {
    if (!pacote) return;
    onConfirm(pacote.codigo, foto ?? '', gps, observacao);
  };

  if (!pacote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl mx-auto animate-slide-up">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 sm:hidden" />

        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Confirmar Entrega
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Pacote{' '}
          <span className="font-mono font-semibold">#{pacote.codigo}</span>
        </p>

        {/* Foto */}
        <label className="block mb-4">
          <span className="text-sm font-semibold text-gray-700 mb-1.5 block">
            {'\u{1F4F8}'} Foto da entrega{' '}
            <span className="text-red-500">*</span>
            {!foto && (
              <span className="text-red-400 text-xs ml-2 font-normal">
                (obrigatoria)
              </span>
            )}
            {foto && (
              <span className="text-emerald-500 text-xs ml-2 font-normal">
                {'\u2713'} Capturada
              </span>
            )}
          </span>
          <div className="relative">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
          {!foto && (
            <p className="text-[10px] text-red-400 mt-1">
              Tire uma foto do pacote entregue ou do local da entrega
            </p>
          )}
          {foto && (
            <div className="mt-2 relative">
              <img
                src={foto}
                alt="Preview da foto"
                className="rounded-xl w-full h-40 object-cover border border-gray-200"
              />
              <button
                onClick={() => setFoto(null)}
                className="absolute top-2 right-2 rounded-full bg-black/50 text-white w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70"
              >
                {'\u2715'}
              </button>
            </div>
          )}
        </label>

        {/* GPS */}
        <div className="mb-4">
          <span className="text-sm font-semibold text-gray-700 mb-1.5 block">
            {'\u{1F4CD}'} Localizacao (GPS){' '}
            <span className="text-red-500">*</span>
            {!gps && (
              <span className="text-red-400 text-xs ml-2 font-normal">
                (obrigatorio)
              </span>
            )}
            {gps && (
              <span className="text-emerald-500 text-xs ml-2 font-normal">
                {'\u2713'} Capturado
              </span>
            )}
          </span>
          <button
            onClick={handleCapturarGps}
            disabled={capturando}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
              gps
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
            } active:scale-[0.98]`}
          >
            <span
              className={
                capturando
                  ? 'animate-pulse text-indigo-500'
                  : gps
                    ? 'text-emerald-500'
                    : 'text-indigo-500'
              }
            >
              <Icons.GPS width={20} height={20} />
            </span>
            {capturando
              ? 'Capturando...'
              : gps
                ? `GPS: ${gps}`
                : '\u{1F4CC} Capturar GPS (recomendado ao ar livre)'}
          </button>
          {!gps && (
            <p className="text-[10px] text-red-400 mt-1">
              Ative a localizacao e capture as coordenadas
            </p>
          )}
        </div>

        {/* Observacao */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Observacao{' '}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder="Observacoes sobre a entrega..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
          />
        </div>

        {/* Botoes */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!foto || !gps}
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 active:scale-[0.97] transition-all shadow-lg shadow-green-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {!foto || !gps
              ? '\u{1F4F8} Capture foto + GPS primeiro'
              : '\u2705 Confirmar Entrega'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @media (min-width: 640px) {
          @keyframes slide-up {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        }
      `}</style>
    </div>
  );
}

/* --- DevolucaoModal --- */
function DevolucaoModal({
  pacote,
  onClose,
  onConfirm,
}: {
  pacote: Pacote | null;
  onClose: () => void;
  onConfirm: (codigo: string, motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [motivoCustom, setMotivoCustom] = useState('');

  const opcoes = [
    'Nao tinha ninguem em casa',
    'Nao aceito pelo cliente',
    'Endereco incorreto',
    'Outro',
  ];

  useEffect(() => {
    setMotivo('');
    setMotivoCustom('');
  }, [pacote]);

  const handleSelect = (opt: string) => {
    setMotivo(opt === 'Outro' ? '' : opt);
    if (opt !== 'Outro') setMotivoCustom('');
  };

  const handleConfirm = () => {
    if (!pacote) return;
    const motivoFinal = motivo === 'Outro' ? motivoCustom : motivo;
    if (!motivoFinal.trim()) return;
    onConfirm(pacote.codigo, motivoFinal);
  };

  if (!pacote) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl mx-auto animate-slide-up">
        {/* Handle */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 sm:hidden" />

        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Devolver a Central
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Pacote{' '}
          <span className="font-mono font-semibold">#{pacote.codigo}</span>
        </p>

        {/* Selecao rapida */}
        <p className="text-sm font-semibold text-gray-700 mb-2">
          Motivo da devolucao
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {opcoes.map((opt) => (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                motivo === opt || (opt === 'Outro' && motivo === '')
                  ? 'bg-orange-100 border-orange-300 text-orange-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Textarea para "Outro" ou complemento */}
        {(motivo === 'Outro' || !motivo) && (
          <textarea
            value={motivoCustom}
            onChange={(e) => setMotivoCustom(e.target.value)}
            rows={3}
            placeholder={
              motivo === 'Outro'
                ? 'Descreva o motivo...'
                : 'Selecione uma opcao acima ou descreva o motivo...'
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none transition-all mb-5"
          />
        )}

        {/* Botoes */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!motivo.trim() && !motivoCustom.trim()}
            className="flex-1 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 active:scale-[0.97] transition-all shadow-lg shadow-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Devolver a Central
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        @media (min-width: 640px) {
          @keyframes slide-up {
            from {
              transform: translateY(20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   HEADER
   ============================================================ */
function HeaderSkeleton() {
  return (
    <div className="section-header sticky top-0 z-30 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-36 rounded bg-gray-200 animate-pulse" />
          <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function HeaderCompleto({
  total,
  onVoltar,
}: {
  total: number;
  onVoltar: () => void;
}) {
  return (
    <header className="section-header sticky top-0 z-30 px-4 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onVoltar}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-90 transition-all"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft width={20} height={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Meus Pacotes</h1>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-indigo-600">{total}</span>{' '}
            {total === 1 ? 'pacote' : 'pacotes'}
          </p>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   FEATURE TOGGLE WRAPPERS
   ============================================================ */
function FeatureLoadingSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto">
        <HeaderSkeleton />
        <div className="px-4 mb-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 flex-1 rounded-full bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="px-4 mb-4">
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 rounded-lg bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
        <SkeletonScreen />
      </div>
    </div>
  );
}

function FeatureDisabledMessage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-6">
        <div className="mb-4">
          <Icons.Alert width={60} height={60} stroke="#f59e0b" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-gray-700">
          Funcionalidade desativada
        </h3>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">
          O modulo Meus Pacotes Avancado esta temporariamente indisponivel.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PAGINA PRINCIPAL
   ============================================================ */
export default function MeusPacotesPage() {
  const router = useRouter();

  /* Feature toggle */
  const avancadoAtivo = useFeature(FEATURES.MEUS_PACOTES_AVANCADO);

  /* Estados */
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tabAtiva, setTabAtiva] = useState<TabId>('ativos');
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [agruparRota, setAgruparRota] = useState(false);
  const [mostrarMapa, setMostrarMapa] = useState(false);

  const [entregaModalPacote, setEntregaModalPacote] =
    useState<Pacote | null>(null);
  const [devolucaoModalPacote, setDevolucaoModalPacote] =
    useState<Pacote | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  /* ========== Buscar CSRF ========== */
  const fetchCsrf = useCallback(async () => {
    try {
      const res = await fetch('/api/entregador/csrf');
      const data = await res.json();
      if (data.csrf_token) setCsrfToken(data.csrf_token);
    } catch {
      // falha silenciosa — a pagina tenta novamente antes de acoes criticas
    }
  }, []);

  /* ========== Buscar Pacotes ========== */
  const fetchPacotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const statusParam = STATUS_FILTER_MAP[tabAtiva].join(',');
      const periodoParams = getPeriodParams(periodoKey, dataInicio, dataFim);

      const params = new URLSearchParams({
        status: statusParam,
        ...periodoParams,
      });
      const res = await fetch(`/api/entregador/pacotes?${params}`);

      if (!res.ok) throw new Error(`Erro ${res.status}: ${res.statusText}`);

      const data = await res.json();
      setPacotes(Array.isArray(data) ? data : data.pacotes ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro inesperado ao carregar pacotes.',
      );
    } finally {
      setLoading(false);
    }
  }, [tabAtiva, periodoKey, dataInicio, dataFim]);

  useEffect(() => {
    fetchPacotes();
  }, [fetchPacotes]);

  /* ========== Acoes ========== */
  const executarAcao = useCallback(
    async (
      codigo: string,
      acao: string,
      extras?: {
        foto?: string;
        gps_foto?: string;
        motivo_devolucao?: string;
      },
    ) => {
      let token = csrfToken;
      if (!token) {
        try {
          const res = await fetch('/api/entregador/csrf');
          const data = await res.json();
          token = data.csrf_token;
          setCsrfToken(token);
        } catch {
          alert('Erro de seguranca. Recarregue a pagina.');
          return;
        }
      }

      try {
        const res = await fetch(`/api/entregador/pacotes/${codigo}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao,
            csrf_token: token,
            ...extras,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message ?? `Erro ${res.status}`);
        }

        // Recarrega lista
        await fetchPacotes();
        return true;
      } catch (err) {
        alert(
          err instanceof Error ? err.message : 'Erro ao executar acao.',
        );
        return false;
      }
    },
    [csrfToken, fetchPacotes],
  );

  /* Handlers */
  const handleRetirar = useCallback(
    async (p: Pacote) => {
      const acao =
        p.status === 'Retornado a Central' ? 'tentar_novamente' : 'retirar';
      const ok = await executarAcao(p.codigo, acao);
      if (ok) setEntregaModalPacote(null);
    },
    [executarAcao],
  );

  const handleIniciarRota = useCallback(
    async (p: Pacote) => {
      await executarAcao(p.codigo, 'rota');
    },
    [executarAcao],
  );

  const handleEntregar = useCallback(
    async (
      codigo: string,
      fotoBase64: string,
      gps: string,
      observacao: string,
    ) => {
      let fotoUrl: string | undefined;

      // Upload da foto via API (compressao WebP/sharp)
      if (fotoBase64) {
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ foto: fotoBase64, pasta: 'entregas' }),
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            fotoUrl = uploadData.url;
          }
        } catch {
          console.warn('Falha no upload da foto, enviando base64 diretamente');
          fotoUrl = fotoBase64;
        }
      }

      const ok = await executarAcao(codigo, 'entregar', {
        foto: fotoUrl || undefined,
        gps_foto: gps || undefined,
      });
      if (ok) setEntregaModalPacote(null);
    },
    [executarAcao],
  );

  const handleDevolver = useCallback(
    async (codigo: string, motivo: string) => {
      const ok = await executarAcao(codigo, 'devolver', {
        motivo_devolucao: motivo,
      });
      if (ok) setDevolucaoModalPacote(null);
    },
    [executarAcao],
  );

  const handleVerFoto = useCallback((p: Pacote) => {
    if (p.foto) {
      window.open(p.foto, '_blank');
    }
  }, []);

  /* Agrupamento */
  const grupos: GrupoRota[] = agruparRota
    ? Object.values(
        pacotes.reduce(
          (acc, p) => {
            const key = p.endereco_entrega;
            if (!acc[key])
              acc[key] = { endereco: key, pacotes: [], valorTotal: 0 };
            acc[key].pacotes.push(p);
            acc[key].valorTotal += p.valor_pacote;
            return acc;
          },
          {} as Record<string, GrupoRota>,
        ),
      )
    : [];

  /* ========== Feature toggle check ========== */
  if (avancadoAtivo === null) {
    return <FeatureLoadingSkeleton />;
  }

  if (!avancadoAtivo) {
    return <FeatureDisabledMessage />;
  }

  /* ========== Estado de carregamento inicial ========== */
  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto">
          <HeaderSkeleton />
          <div className="px-4 mb-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 flex-1 rounded-full bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="px-4 mb-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-20 rounded-lg bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          </div>
          <SkeletonScreen />
        </div>
      </div>
    );
  }

  /* ========== Estado de erro ========== */
  if (error) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto">
          <HeaderCompleto
            total={0}
            onVoltar={() => router.push('/entregador')}
          />
          <ErrorState mensagem={error} onRetry={fetchPacotes} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto pb-24">
        {/* Header */}
        <HeaderCompleto
          total={pacotes.length}
          onVoltar={() => router.push('/entregador')}
        />

        {/* Abas */}
        <div className="px-4 mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabAtiva(tab.id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  tabAtiva === tab.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtro por periodo */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodoKey(p.key)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  periodoKey === p.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
            {/* Toggle agrupar */}
            <button
              onClick={() => setAgruparRota((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                agruparRota
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span
                className={agruparRota ? 'text-indigo-600' : 'text-gray-400'}
              >
                <Icons.Layered width={18} height={18} />
              </span>
              Rotas
            </button>
            {/* Toggle mapa */}
            <button
              onClick={() => setMostrarMapa((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                mostrarMapa
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span>{'\u{1F5FA}\uFE0F'}</span>
              Mapa
            </button>
          </div>

          {/* Inputs de data para Personalizado */}
          {periodoKey === 'personalizado' && (
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Inicio
                </label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                  Fim
                </label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Mapa */}
        {mostrarMapa && pacotes.length > 0 && (
          <div className="px-4 mb-4">
            <MapaRota
              pontos={pacotes.map((p) => ({
                lat: 0,
                lng: 0,
                codigo: p.codigo,
                endereco: p.endereco_entrega,
                destinatario: p.destinatario,
                status: p.status,
              }))}
              altura="350px"
            />
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              {'\u{1F5FA}\uFE0F'} Mapa com {pacotes.length} pacote(s) — Os
              pontos sao aproximados por endereco
            </p>
          </div>
        )}

        {/* Lista de Pacotes */}
        {pacotes.length === 0 ? (
          <EmptyState />
        ) : agruparRota ? (
          /* Agrupado por rota */
          <div className="px-4 space-y-4">
            {grupos.map((g) => (
              <GrupoRotaCard
                key={g.endereco}
                grupo={g}
                onRetirar={(p) => handleRetirar(p)}
                onIniciarRota={handleIniciarRota}
                onEntregar={(p) => setEntregaModalPacote(p)}
                onDevolver={(p) => setDevolucaoModalPacote(p)}
                onVerFoto={handleVerFoto}
              />
            ))}
          </div>
        ) : (
          /* Lista simples */
          <div className="px-4 space-y-3">
            {pacotes.map((p) => (
              <PackageCard
                key={p.codigo}
                pacote={p}
                onRetirar={(pkg) => handleRetirar(pkg)}
                onIniciarRota={handleIniciarRota}
                onEntregar={(pkg) => setEntregaModalPacote(pkg)}
                onDevolver={(pkg) => setDevolucaoModalPacote(pkg)}
                onVerFoto={handleVerFoto}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modais */}
      <EntregaModal
        pacote={entregaModalPacote}
        onClose={() => setEntregaModalPacote(null)}
        onConfirm={handleEntregar}
      />
      <DevolucaoModal
        pacote={devolucaoModalPacote}
        onClose={() => setDevolucaoModalPacote(null)}
        onConfirm={handleDevolver}
      />
    </div>
  );
}
