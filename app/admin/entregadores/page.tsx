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

// ============================================================
// MODAL TYPES
// ============================================================
type ModalState =
  | { tipo: 'novo' }
  | { tipo: 'editar'; id: number; campo: 'nome' | 'telefone' | 'valor_padrao'; valorAtual: string }
  | { tipo: 'senha'; id: number; temSenha: boolean }
  | { tipo: 'inativar'; id: number; nome: string }
  | { tipo: 'reativar'; id: number; nome: string }
  | { tipo: 'remover'; id: number; nome: string; totalPacotes: number }
  | null

export default function EntregadoresPage() {
  const [entregadores, setEntregadores] = useState<Entregador[]>([])
  const [modal, setModal] = useState<ModalState>(null)
  const [msg, setMsg] = useState('')

  function carregar() {
    fetch('/api/entregadores')
      .then(r => r.json())
      .then(data => setEntregadores(data.entregadores || []))
  }

  useEffect(carregar, [])

  function msgTemporaria(texto: string) {
    setMsg(texto)
    setTimeout(() => setMsg(''), 3000)
  }

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
    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Entregador criado com sucesso!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro ao criar'}`)
    }
  }

  async function editarCampo(id: number, campo: string, valor: unknown) {
    const res = await fetch(`/api/entregadores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor })
    })
    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Atualizado com sucesso!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro'}`)
    }
  }

  async function definirSenha(id: number, senha: string) {
    const res = await fetch(`/api/entregadores/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    })
    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Senha definida com sucesso!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro'}`)
    }
  }

  async function removerEntregador(id: number) {
    const res = await fetch(`/api/entregadores/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setModal(null)
      msgTemporaria('✅ Entregador removido permanentemente!')
      carregar()
    } else {
      const data = await res.json()
      msgTemporaria(`❌ ${data.erro || 'Erro ao remover'}`)
    }
  }

  function contarPacotes(e: Entregador): number {
    return e.pacotes?.reduce((acc: number, p: { count: number }) => acc + (p.count || 0), 0) || 0
  }

  const ativos = entregadores.filter(e => e.ativo)
  const inativos = entregadores.filter(e => !e.ativo)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Entregadores</h2>
          <p className="text-sm text-gray-500 mt-1">{entregadores.length} cadastrados · {ativos.length} ativos</p>
        </div>
        <button onClick={() => setModal({ tipo: 'novo' })}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition shadow-sm">
          + Novo Entregador
        </button>
      </div>

      {/* Mensagem flash */}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
          {msg}
        </div>
      )}

      {/* ============ ATIVOS ============ */}
      <div className="bg-white rounded-xl shadow-sm border mb-6 overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Ativos ({ativos.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                <th className="p-3 pl-5 font-medium">Nome</th>
                <th className="p-3 font-medium">Telefone</th>
                <th className="p-3 font-medium">Senha</th>
                <th className="p-3 font-medium">Valor Padrão</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Pacotes</th>
                <th className="p-3 font-medium">Cadastro</th>
                <th className="p-3 pr-5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {ativos.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Nenhum entregador ativo cadastrado</td></tr>
              ) : (
                ativos.map(e => (
                  <LinhaEntregador
                    key={e.id}
                    entregador={e}
                    totalPacotes={contarPacotes(e)}
                    onOpenModal={setModal}
                    isAtivo={true}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ INATIVOS ============ */}
      {inativos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Inativos ({inativos.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b bg-gray-50/50">
                  <th className="p-3 pl-5 font-medium">Nome</th>
                  <th className="p-3 font-medium">Telefone</th>
                  <th className="p-3 font-medium">Senha</th>
                  <th className="p-3 font-medium">Valor Padrão</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Pacotes</th>
                  <th className="p-3 font-medium">Cadastro</th>
                  <th className="p-3 pr-5 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {inativos.map(e => (
                  <LinhaEntregador
                    key={e.id}
                    entregador={e}
                    totalPacotes={contarPacotes(e)}
                    onOpenModal={setModal}
                    isAtivo={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ MODAIS ============ */}

      {/* Novo Entregador */}
      {modal?.tipo === 'novo' && (
        <ModalBase titulo="Novo Entregador" onClose={() => setModal(null)}>
          <form action={criar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
              <input name="nome" required placeholder="Nome completo"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                <input name="telefone" placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Valor Padrão (R$)</label>
                <input name="valor_padrao" defaultValue="0,50"
                  className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Senha de Acesso</label>
              <input name="senha" type="password" placeholder="Mínimo 3 caracteres"
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-400 mt-1">Se não definir agora, o entregador não poderá acessar o sistema</p>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Criar Entregador</button>
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">Cancelar</button>
            </div>
          </form>
        </ModalBase>
      )}

      {/* Editar Campo */}
      {modal?.tipo === 'editar' && (
        <ModalEditarCampo
          campo={modal.campo}
          valorAtual={modal.valorAtual}
          onSave={valor => editarCampo(modal.id, modal.campo, valor)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Definir/Alterar Senha */}
      {modal?.tipo === 'senha' && (
        <ModalSenha
          temSenha={modal.temSenha}
          onSave={senha => definirSenha(modal.id, senha)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmar Inativar */}
      {modal?.tipo === 'inativar' && (
        <ModalConfirmacao
          titulo="Inativar Entregador"
          mensagem={`Tem certeza que deseja inativar "${modal.nome}"? Ele não poderá receber novos pacotes, mas os dados serão preservados.`}
          corBotao="bg-red-600 hover:bg-red-700"
          labelBotao="Sim, Inativar"
          onConfirm={() => editarCampo(modal.id, 'ativo', false)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmar Reativar */}
      {modal?.tipo === 'reativar' && (
        <ModalConfirmacao
          titulo="Reativar Entregador"
          mensagem={`Tem certeza que deseja reativar "${modal.nome}"? Ele voltará a receber pacotes.`}
          corBotao="bg-green-600 hover:bg-green-700"
          labelBotao="Sim, Reativar"
          onConfirm={() => editarCampo(modal.id, 'ativo', true)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirmar Remover */}
      {modal?.tipo === 'remover' && (
        <ModalConfirmacao
          titulo="Remover Entregador"
          mensagem={
            modal.totalPacotes > 0
              ? `"${modal.nome}" possui ${modal.totalPacotes} pacote(s) vinculado(s). Não é possível removê-lo permanentemente. Inative-o em vez de remover.`
              : `Tem certeza que deseja remover permanentemente "${modal.nome}"? Esta ação não pode ser desfeita.`
          }
          corBotao="bg-red-700 hover:bg-red-800"
          labelBotao={modal.totalPacotes > 0 ? "Voltar" : "Sim, Remover Permanentemente"}
          onConfirm={() => modal.totalPacotes === 0 && removerEntregador(modal.id)}
          onClose={() => setModal(null)}
          desabilitado={modal.totalPacotes > 0}
        />
      )}
    </div>
  )
}

// ============================================================
// LINHA DA TABELA
// ============================================================
function LinhaEntregador({
  entregador, totalPacotes, onOpenModal, isAtivo
}: {
  entregador: Entregador
  totalPacotes: number
  onOpenModal: (m: ModalState) => void
  isAtivo: boolean
}) {
  return (
    <tr className={`border-b last:border-0 hover:bg-gray-50 transition ${!isAtivo ? 'text-gray-400' : ''}`}>
      {/* Nome */}
      <td className="p-3 pl-5">
        <div className="flex items-center gap-2">
          <a href={`/admin/entregador/${entregador.id}`}
            className={`font-medium hover:underline ${isAtivo ? 'text-blue-600' : 'text-gray-400'}`}>
            {entregador.nome}
          </a>
          <button
            onClick={() => onOpenModal({ tipo: 'editar', id: entregador.id, campo: 'nome', valorAtual: entregador.nome })}
            className="text-gray-300 hover:text-blue-500 transition text-xs"
            title="Editar nome">
            ✏️
          </button>
        </div>
      </td>

      {/* Telefone */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          {entregador.telefone ? (
            <a href={`https://wa.me/${entregador.telefone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-green-600 hover:underline flex items-center gap-1">
              <span>📱</span> {entregador.telefone}
            </a>
          ) : (
            <span className="text-gray-300">—</span>
          )}
          <button
            onClick={() => onOpenModal({ tipo: 'editar', id: entregador.id, campo: 'telefone', valorAtual: entregador.telefone || '' })}
            className="text-gray-300 hover:text-blue-500 transition text-xs"
            title="Editar telefone">
            ✏️
          </button>
        </div>
      </td>

      {/* Senha */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          {entregador.senha_hash ? (
            <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
              <span>🔐</span> Definida
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-xs font-medium">
              <span>⚠️</span> Sem senha
            </span>
          )}
          <button
            onClick={() => onOpenModal({ tipo: 'senha', id: entregador.id, temSenha: !!entregador.senha_hash })}
            className="text-gray-300 hover:text-yellow-500 transition text-xs"
            title={entregador.senha_hash ? 'Alterar senha' : 'Definir senha'}>
            🔑
          </button>
        </div>
      </td>

      {/* Valor Padrão */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">R$ {entregador.valor_padrao.toFixed(2)}</span>
          <button
            onClick={() => onOpenModal({ tipo: 'editar', id: entregador.id, campo: 'valor_padrao', valorAtual: entregador.valor_padrao.toFixed(2) })}
            className="text-gray-300 hover:text-blue-500 transition text-xs"
            title="Editar valor padrão">
            ✏️
          </button>
        </div>
      </td>

      {/* Status */}
      <td className="p-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
          isAtivo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-green-500' : 'bg-gray-400'}`} />
          {isAtivo ? 'Ativo' : 'Inativo'}
        </span>
      </td>

      {/* Pacotes */}
      <td className="p-3">
        <a href={`/admin/entregador/${entregador.id}`}
          className={`font-medium hover:underline ${isAtivo ? 'text-gray-700' : 'text-gray-400'}`}>
          {totalPacotes} {totalPacotes === 1 ? 'pacote' : 'pacotes'}
        </a>
      </td>

      {/* Cadastro */}
      <td className="p-3 text-xs">
        {new Date(entregador.criado_em).toLocaleDateString('pt-BR')}
      </td>

      {/* Ações */}
      <td className="p-3 pr-5">
        <div className="flex items-center gap-2">
          {isAtivo ? (
            <button
              onClick={() => onOpenModal({ tipo: 'inativar', id: entregador.id, nome: entregador.nome })}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition">
              Inativar
            </button>
          ) : (
            <>
              <button
                onClick={() => onOpenModal({ tipo: 'reativar', id: entregador.id, nome: entregador.nome })}
                className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition">
                Reativar
              </button>
              <button
                onClick={() => onOpenModal({ tipo: 'remover', id: entregador.id, nome: entregador.nome, totalPacotes })}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition">
                Remover
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  )
}

// ============================================================
// MODAL EDIÇÃO DE CAMPO
// ============================================================
function ModalEditarCampo({
  campo, valorAtual, onSave, onClose
}: {
  campo: string
  valorAtual: string
  onSave: (v: string) => void
  onClose: () => void
}) {
  const [val, setVal] = useState(valorAtual)

  const labels: Record<string, string> = {
    nome: 'Nome do Entregador',
    telefone: 'Telefone para WhatsApp',
    valor_padrao: 'Valor Padrão por Pacote (R$)',
  }

  const placeholders: Record<string, string> = {
    nome: 'Nome completo',
    telefone: '(11) 99999-9999',
    valor_padrao: '0,50',
  }

  const inputType = campo === 'valor_padrao' ? 'text' : 'text'

  return (
    <ModalBase titulo={`Editar ${campo === 'valor_padrao' ? 'Valor Padrão' : campo === 'telefone' ? 'Telefone' : 'Nome'}`} onClose={onClose}>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{labels[campo] || campo}</label>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          type={inputType}
          placeholder={placeholders[campo] || ''}
          className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-4"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => onSave(campo === 'valor_padrao' ? val.replace(',', '.') : val)}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            Salvar
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
            Cancelar
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

// ============================================================
// MODAL SENHA
// ============================================================
function ModalSenha({
  temSenha, onSave, onClose
}: {
  temSenha: boolean
  onSave: (senha: string) => void
  onClose: () => void
}) {
  const [senha, setSenha] = useState('')
  const [confirm, setConfirm] = useState('')
  const [erro, setErro] = useState('')

  function salvar() {
    if (senha.length < 3) {
      setErro('A senha deve ter no mínimo 3 caracteres')
      return
    }
    if (senha !== confirm) {
      setErro('As senhas não conferem')
      return
    }
    onSave(senha)
  }

  return (
    <ModalBase titulo={temSenha ? 'Alterar Senha' : 'Definir Senha'} onClose={onClose}>
      <div>
        {erro && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-3 text-sm">{erro}</div>}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {temSenha ? 'Nova Senha' : 'Senha de Acesso'} *
            </label>
            <input
              value={senha}
              onChange={e => setSenha(e.target.value)}
              type="password"
              placeholder="Mínimo 3 caracteres"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Confirmar Senha *</label>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              type="password"
              placeholder="Repita a senha"
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={salvar}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            {temSenha ? 'Alterar Senha' : 'Definir Senha'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
            Cancelar
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

// ============================================================
// MODAL CONFIRMAÇÃO
// ============================================================
function ModalConfirmacao({
  titulo, mensagem, corBotao, labelBotao, onConfirm, onClose, desabilitado
}: {
  titulo: string
  mensagem: string
  corBotao: string
  labelBotao: string
  onConfirm: () => void
  onClose: () => void
  desabilitado?: boolean
}) {
  return (
    <ModalBase titulo={titulo} onClose={onClose}>
      <div>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">{mensagem}</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={desabilitado}
            className={`flex-1 py-2.5 text-white rounded-lg text-sm font-medium transition ${corBotao} disabled:opacity-50 disabled:cursor-not-allowed`}>
            {labelBotao}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition">
            Cancelar
          </button>
        </div>
      </div>
    </ModalBase>
  )
}

// ============================================================
// MODAL BASE (wrapper)
// ============================================================
function ModalBase({ titulo, children, onClose }: { titulo: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  )
}
