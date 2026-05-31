'use client'

import { useEffect, useState } from 'react'

type Entregador = {
  id: number
  nome: string
  ativo: boolean
  valor_padrao: number
  telefone: string
  senha_hash: string | null
  criado_em: string
  ultimo_pagamento_em: string | null
  pacotes: { count: number }[]
}

export default function EntregadoresPage() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editModal, setEditModal] = useState<{ id: number; campo: string; valor: string } | null>(null)

  function carregar() {
    fetch('/api/entregadores')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }

  useEffect(carregar, [])

  async function criar(formData: FormData) {
    const body: Record<string, unknown> = {
      nome: formData.get('nome'),
      valor_padrao: formData.get('valor_padrao'),
      telefone: formData.get('telefone'),
    }
    const senha = formData.get('senha')
    if (senha) body.senha = senha

    const res = await fetch('/api/entregadores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (res.ok) { setShowModal(false); carregar() }
  }

  async function editar(id: number, campo: string, valor: unknown) {
    await fetch(`/api/entregadores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor })
    })
    setEditModal(null)
    carregar()
  }

  function contarPacotes(e: Entregador): number {
    return e.pacotes?.reduce((acc: number, p: { count: number }) => acc + (p.count || 0), 0) || 0
  }

  const ativos = entregadores.filter(e => e.ativo)
  const inativos = entregadores.filter(e => !e.ativo)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Entregadores</h2>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          + Novo Entregador
        </button>
      </div>

      {/* Ativos */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-3 border-b bg-gray-50 rounded-t-xl">
          <h3 className="font-semibold text-gray-700">Ativos ({ativos.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="p-3">Nome</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Senha</th>
                <th className="p-3">Valor Padrão</th>
                <th className="p-3">Status</th>
                <th className="p-3">Pacotes</th>
                <th className="p-3">Cadastro</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ativos.map(e => (
                <LinhaEntregador
                  key={e.id}
                  entregador={e}
                  editModal={editModal}
                  onEdit={(campo, valor) => setEditModal({ id: e.id, campo, valor })}
                  onSave={(campo, valor) => editar(e.id, campo, valor)}
                  onClose={() => setEditModal(null)}
                  onToggle={() => editar(e.id, 'ativo', false)}
                  isAtivo={true}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inativos */}
      {inativos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-3 border-b bg-gray-50 rounded-t-xl">
            <h3 className="font-semibold text-gray-400">Inativos ({inativos.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {inativos.map(e => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50 text-gray-400">
                    <td className="p-3">{e.nome}</td>
                    <td className="p-3">{e.telefone || '—'}</td>
                    <td className="p-3">R$ {e.valor_padrao.toFixed(2)}</td>
                    <td className="p-3">
                      <button onClick={() => editar(e.id, 'ativo', true)} className="text-green-600 hover:underline text-xs">Reativar</button>
                      {contarPacotes(e) === 0 && (
                        <button onClick={() => editar(e.id, '_delete', true)} className="text-red-600 hover:underline text-xs ml-3">Remover</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Novo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Novo Entregador</h3>
            <form action={criar} className="space-y-3">
              <input name="nome" required placeholder="Nome"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="grid grid-cols-2 gap-3">
                <input name="telefone" placeholder="Telefone"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <input name="valor_padrao" defaultValue="0,50" placeholder="Valor R$"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <input name="senha" type="password" placeholder="Senha (opcional)"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Criar</button>
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição Inline */}
      {editModal && (
        <EditModal
          campo={editModal.campo}
          valor={editModal.valor}
          onSave={v => { editar(editModal.id, editModal.campo, v); setEditModal(null) }}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  )
}

function LinhaEntregador({
  entregador, editModal, onEdit, onSave, onClose, onToggle, isAtivo
}: {
  entregador: Entregador; editModal: { id: number; campo: string; valor: string } | null
  onEdit: (campo: string, valor: string) => void
  onSave: (campo: string, valor: unknown) => void
  onClose: () => void
  onToggle: () => void
  isAtivo: boolean
}) {
  const editando = editModal?.id === entregador.id
  const totalPacotes = entregador.pacotes?.reduce((acc: number, p: { count: number }) => acc + (p.count || 0), 0) || 0

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="p-3">
        <a href={`/admin/entregador/${entregador.id}`} className="text-blue-600 hover:underline font-medium">{entregador.nome}</a>
        {editando && editModal?.campo === 'nome' && (
          <InlineEdit value={entregador.nome} onSave={v => onSave('nome', v)} onClose={onClose} />
        )}
        <button onClick={() => onEdit('nome', entregador.nome)} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">✏️</button>
      </td>
      <td className="p-3">
        {entregador.telefone || '—'}
        {editando && editModal?.campo === 'telefone' && (
          <InlineEdit value={entregador.telefone || ''} onSave={v => onSave('telefone', v)} onClose={onClose} />
        )}
        <button onClick={() => onEdit('telefone', entregador.telefone || '')} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">✏️</button>
      </td>
      <td className="p-3">
        {entregador.senha_hash ? '✅' : '❌'}
        <button onClick={() => onEdit('senha', '')} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">🔑</button>
      </td>
      <td className="p-3">
        R$ {entregador.valor_padrao.toFixed(2)}
        {editando && editModal?.campo === 'valor_padrao' && (
          <InlineEdit value={entregador.valor_padrao.toFixed(2)} onSave={v => onSave('valor_padrao', v.replace(',', '.'))} onClose={onClose} />
        )}
        <button onClick={() => onEdit('valor_padrao', entregador.valor_padrao.toFixed(2))} className="ml-2 text-gray-400 hover:text-gray-600 text-xs">✏️</button>
      </td>
      <td className="p-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAtivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isAtivo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="p-3 text-gray-600">
        <a href={`/admin/entregador/${entregador.id}`} className="hover:underline">{totalPacotes}</a>
      </td>
      <td className="p-3 text-gray-500 text-xs">{new Date(entregador.criado_em).toLocaleDateString('pt-BR')}</td>
      <td className="p-3">
        <button onClick={onToggle} className={`text-xs hover:underline ${isAtivo ? 'text-red-600' : 'text-green-600'}`}>
          {isAtivo ? 'Inativar' : 'Reativar'}
        </button>
      </td>
    </tr>
  )
}

function InlineEdit({ value, onSave, onClose }: { value: string; onSave: (v: string) => void; onClose: () => void }) {
  const [val, setVal] = useState(value)

  return (
    <div className="inline-flex gap-1 ml-2">
      <input value={val} onChange={e => setVal(e.target.value)} className="w-24 px-2 py-1 border rounded text-xs" autoFocus />
      <button onClick={() => onSave(val)} className="text-green-600 text-xs">💾</button>
      <button onClick={onClose} className="text-gray-400 text-xs">✕</button>
    </div>
  )
}

function EditModal({ campo, valor, onSave, onClose }: { campo: string; valor: string; onSave: (v: string) => void; onClose: () => void }) {
  const [val, setVal] = useState(campo === 'senha' ? '' : valor)
  const label = campo === 'valor_padrao' ? 'Valor Padrão' : campo === 'telefone' ? 'Telefone' : campo === 'senha' ? 'Nova Senha' : 'Nome'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-3">Editar {label}</h3>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          type={campo === 'senha' ? 'password' : 'text'}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={() => onSave(val)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Salvar</button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
