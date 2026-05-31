'use client'

import { useEffect, useState } from 'react'

type Transportadora = {
  id: number
  nome: string
  criado_em: string
}

export default function TransportadorasPage() {
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([])
  const [modal, setModal] = useState<{ tipo: 'novo' } | { tipo: 'editar'; id: number; nome: string } | { tipo: 'remover'; id: number; nome: string } | null>(null)
  const [msg, setMsg] = useState('')

  function carregar() {
    fetch('/api/transportadoras')
      .then(r => r.json())
      .then(data => setTransportadoras(data.transportadoras || []))
  }

  useEffect(carregar, [])

  function msgTemporaria(texto: string) {
    setMsg(texto)
    setTimeout(() => setMsg(''), 3000)
  }

  async function criar(formData: FormData) {
    const nome = formData.get('nome') as string
    if (!nome || nome.trim().length < 2) {
      msgTemporaria('❌ Nome deve ter no mínimo 2 caracteres')
      return
    }

    const res = await fetch('/api/transportadoras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() })
    })

    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Transportadora cadastrada com sucesso!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro ao cadastrar'}`)
    }
  }

  async function editar(id: number, nome: string) {
    const res = await fetch(`/api/transportadoras/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nome.trim() })
    })

    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Transportadora atualizada com sucesso!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro ao atualizar'}`)
    }
  }

  async function remover(id: number) {
    const res = await fetch(`/api/transportadoras/${id}`, { method: 'DELETE' })

    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Transportadora removida!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro ao remover'}`)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">🚚 Transportadoras</h2>
          <p className="text-sm text-white/40 mt-1">
            {transportadoras.length} transportadora(s) cadastrada(s)
          </p>
        </div>
        <button
          onClick={() => setModal({ tipo: 'novo' })}
          className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium transition shadow-sm"
        >
          + Nova Transportadora
        </button>
      </div>

      {/* Mensagem flash */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20">
          {msg}
        </div>
      )}

      {/* Lista */}
      <div className="content-card overflow-hidden">
        {transportadoras.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">🚚</p>
            <p className="text-white/30 text-sm">Nenhuma transportadora cadastrada</p>
            <p className="text-xs text-white/20 mt-1">Clique em "+ Nova Transportadora" para começar</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.08]">
            {transportadoras.map(t => (
              <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.06] transition">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚚</span>
                  <div>
                    <p className="font-medium text-white">{t.nome}</p>
                    <p className="text-xs text-white/30">
                      Cadastrada em {new Date(t.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModal({ tipo: 'editar', id: t.id, nome: t.nome })}
                    className="px-3 py-1.5 bg-violet-500/10 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-500/15 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => setModal({ tipo: 'remover', id: t.id, nome: t.nome })}
                    className="px-3 py-1.5 bg-red-500/10 text-red-300 rounded-lg text-xs font-medium hover:bg-red-500/15 transition"
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Novo */}
      {modal?.tipo === 'novo' && (
        <ModalBase titulo="Nova Transportadora" onClose={() => setModal(null)}>
          <form action={criar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1">Nome da Transportadora *</label>
              <input
                name="nome"
                required
                placeholder="Ex: Jadlog, Correios, Transportadora ABC..."
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-medium transition">
                Cadastrar
              </button>
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 bg-white/[0.10] text-white/60 rounded-lg text-sm hover:bg-white/[0.18] transition">
                Cancelar
              </button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Modal Editar */}
      {modal?.tipo === 'editar' && (
        <ModalEditar
          nome={modal.nome}
          onSave={nome => editar(modal.id, nome)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Modal Remover */}
      {modal?.tipo === 'remover' && (
        <ModalBase titulo="Remover Transportadora" onClose={() => setModal(null)}>
          <p className="text-sm text-white/60 mb-5">
            Tem certeza que deseja remover <strong>{modal.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => remover(modal.id)}
              className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition"
            >
              Sim, Remover
            </button>
            <button onClick={() => setModal(null)} className="px-5 py-2.5 bg-white/[0.10] text-white/60 rounded-lg text-sm hover:bg-white/[0.18] transition">
              Cancelar
            </button>
          </div>
        </ModalBase>
      )}
    </div>
  )
}

// ============================================================
// MODAL EDITAR
// ============================================================
function ModalEditar({ nome, onSave, onClose }: { nome: string; onSave: (nome: string) => void; onClose: () => void }) {
  const [val, setVal] = useState(nome)

  return (
    <ModalBase titulo="Editar Transportadora" onClose={onClose}>
      <div>
        <label className="block text-xs font-medium text-white/40 mb-1">Nome</label>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => val.trim().length >= 2 ? onSave(val.trim()) : null}
            className="btn-primary flex-1 py-2.5 rounded-lg text-sm font-medium transition"
          >
            Salvar
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-white/[0.10] text-white/60 rounded-lg text-sm hover:bg-white/[0.18] transition">
            Cancelar
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

// ============================================================
// MODAL BASE
// ============================================================
function ModalBase({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1240] border border-white/[0.1] rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{titulo}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
