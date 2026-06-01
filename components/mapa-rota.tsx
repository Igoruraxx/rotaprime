'use client'

import { useEffect, useRef, useState } from 'react'

// Leaflet CSS será importado via link no layout ou via CSS
// Usamos tipagem dinâmica para evitar erros de build com SSR

interface PontoMapa {
  lat: number
  lng: number
  codigo?: string
  endereco?: string
  status?: string
  destinatario?: string
  cor?: string
}

interface MapaRotaProps {
  pontos: PontoMapa[]
  centro?: [number, number]
  zoom?: number
  altura?: string
  single?: boolean // true = mostra popup detalhado (para pacote único)
}

const CORES_STATUS: Record<string, string> = {
  'Aguardando Retirada': '#f59e0b',
  'Retirado pelo Entregador': '#3b82f6',
  'Em Rota': '#8b5cf6',
  'Entregue': '#10b981',
  'Validado pelo Admin': '#059669',
  'Retornado a Central': '#f97316',
}

export default function MapaRota({
  pontos,
  centro,
  zoom = 13,
  altura = '300px',
  single = false,
}: MapaRotaProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapaInstance = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [carregado, setCarregado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapaInstance.current) return

    let isMounted = true

    async function initMapa() {
      try {
        const L = (await import('leaflet')).default

        // Corrige caminho dos ícones do Leaflet
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        if (!isMounted || !mapRef.current) return

        // Calcula centro se não fornecido
        let center: [number, number] = centro || [-19.5333, -47.4333] // Santa Juliana, MG (padrão)

        if (!centro && pontos.length > 0) {
          const avgLat = pontos.reduce((s, p) => s + p.lat, 0) / pontos.length
          const avgLng = pontos.reduce((s, p) => s + p.lng, 0) / pontos.length
          center = [avgLat, avgLng]
        }

        const map = L.map(mapRef.current, {
          center,
          zoom,
          scrollWheelZoom: true,
          zoomControl: true,
        })

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map)

        mapaInstance.current = map

        // Adiciona marcadores
        pontos.forEach((ponto) => {
          const cor = ponto.cor || CORES_STATUS[ponto.status || ''] || '#6366f1'
          const iconHtml = `<div style="
            width: 24px; height: 24px;
            background: ${cor};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; color: white; font-weight: bold;
          ">${ponto.codigo ? ponto.codigo.slice(0, 2) : '•'}</div>`

          const markerIcon = L.divIcon({
            html: iconHtml,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -16],
          })

          const marker = L.marker([ponto.lat, ponto.lng], { icon: markerIcon }).addTo(map)

          const popupContent = single
            ? `
              <div style="font-family: system-ui; min-width: 200px;">
                ${ponto.destinatario ? `<p style="margin:0 0 4px;font-weight:700;font-size:14px;">${ponto.destinatario}</p>` : ''}
                ${ponto.endereco ? `<p style="margin:0 0 4px;font-size:12px;color:#666;">📍 ${ponto.endereco}</p>` : ''}
                ${ponto.status ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${cor}20;color:${cor};">${ponto.status}</span>` : ''}
                ${ponto.codigo ? `<p style="margin:4px 0 0;font-size:11px;color:#999;">Código: ${ponto.codigo}</p>` : ''}
              </div>
            `
            : `
              <div style="font-family: system-ui; min-width: 180px;">
                <p style="margin:0 0 2px;font-weight:700;font-size:13px;">#${ponto.codigo || '—'}</p>
                ${ponto.endereco ? `<p style="margin:0 0 2px;font-size:11px;color:#666;">${ponto.endereco.substring(0, 50)}${ponto.endereco.length > 50 ? '...' : ''}</p>` : ''}
                ${ponto.status ? `<span style="display:inline-block;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:600;background:${cor}20;color:${cor};">${ponto.status}</span>` : ''}
              </div>
            `

          marker.bindPopup(popupContent)
          markersRef.current.push(marker)
        })

        // Ajusta zoom para caber todos os marcadores
        if (pontos.length > 0 && !single) {
          const group = L.featureGroup(markersRef.current)
          map.fitBounds(group.getBounds().pad(0.1))
        }

        // Força recálculo do tamanho após render
        setTimeout(() => map.invalidateSize(), 200)
        setCarregado(true)
      } catch (err) {
        console.error('Erro ao carregar mapa:', err)
        setErro('Não foi possível carregar o mapa')
      }
    }

    initMapa()

    return () => {
      isMounted = false
      if (mapaInstance.current) {
        mapaInstance.current.remove()
        mapaInstance.current = null
      }
    }
  }, [pontos, centro, zoom, single])

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Loader */}
      {!carregado && !erro && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 animate-pulse"
          style={{ height: altura }}
        >
          <div className="text-center">
            <svg
              className="mx-auto h-8 w-8 text-gray-300 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="mt-2 text-xs text-gray-400">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div
          className="flex items-center justify-center bg-red-50 text-red-600 text-sm"
          style={{ height: altura }}
        >
          <span>⚠️ {erro}</span>
        </div>
      )}

      {/* Mapa */}
      <div ref={mapRef} style={{ height: altura, width: '100%' }} />

      {/* CSS do Leaflet (inline via style tag para evitar import CSS) */}
      <style jsx global>{`
        .leaflet-container {
          font-family: system-ui, sans-serif;
          border-radius: 0.75rem;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }
        .leaflet-popup-content {
          margin: 10px 14px;
        }
        .leaflet-popup-close-button {
          padding: 4px !important;
          font-size: 18px !important;
        }
      `}</style>
    </div>
  )
}
