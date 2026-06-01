<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Rota%20Prime-v2.0-orange?style=for-the-badge&logo=vercel&logoColor=white">
  <img alt="Rota Prime" src="https://img.shields.io/badge/Rota%20Prime-v2.0-orange?style=for-the-badge&logo=vercel&logoColor=white">
</picture>

# 🚛 Rota Prime — Gestão de Entregas Premium

Sistema completo de gestão de entregas com **painel admin** e **portal do entregador**, desenvolvido com Next.js 14 + Supabase + Tailwind CSS.

🔗 **Live demo:** [rotaprime.vercel.app](https://rotaprime.vercel.app)

---

## ✨ Funcionalidades

### 👑 Painel Admin
| Funcionalidade | Descrição |
|---|---|
| 📊 Dashboard | Visão geral com métricas em tempo real |
| 📦 Registrar Pacotes | Cadastro com campos toggleáveis |
| 📋 Relatório Diário | Abas: Repassado / Aceitar / Pendências, lazy load 50 em 50 |
| 📊 Métricas de Desempenho | Relatório consolidado mensal |
| 💰 Financeiro | Dashboard financeiro completo |
| 🔄 Ciclos de Pagamento | Gestão de pagamentos por ciclo |
| 👥 Entregadores | CRUD completo + valor padrão por entregador |
| 📸 Fotos | Validação e limpeza de fotos de entrega |
| 🚚 Transportadoras | CRUD de transportadoras |
| 🎛️ Predefinições | Valor padrão global, reset retornados, limpeza de fotos |
| ⚙️ Controle | Feature toggles (39 funcionalidades on/off) |
| 🔒 Finalizar Dia | Contagem regressiva, finalização por entregador ou lote |
| 📤 Repasse em Lote | Repassar múltiplos pacotes de uma vez |

### 🚚 Portal do Entregador
| Funcionalidade | Descrição |
|---|---|
| 📊 Dashboard | Métricas pessoais, último recebimento |
| 📦 Meus Pacotes | Abas (Ativos/Entregues/Retornados), mapa, agrupamento por rota |
| 👤 Meus Dados | Editar telefone e chave Pix |
| 💰 Financeiro | Previsões de recebimento, histórico de ciclos |
| 📄 Comprovante PDF | Geração automática com foto e GPS |

### 🛡️ Segurança
- ✅ Autenticação por sessão (admin + entregador)
- ✅ CSRF protection via JWT
- ✅ Rate limiting
- ✅ Proteção contra mass assignment
- ✅ Timeout de sessão

---

## 🚀 Deploy Rápido (para terceiros)

Você pode fazer deploy da sua própria instância do Rota Prime em **menos de 5 minutos** sem precisar de conta na Vercel da gente — use sua própria conta.

### Passo 1: Fork do repositório

1. Acesse [github.com/Igoruraxx/rotaprime](https://github.com/Igoruraxx/rotaprime)
2. Clique em **Fork** (canto superior direito)
3. Escolha sua conta pessoal

### Passo 2: Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta grátis
2. Crie um **novo projeto** (New project)
3. Escolha um nome (ex: `rotaprime`) e uma senha forte para o banco
4. Aguarde a criação do projeto (~2 minutos)

### Passo 3: Configurar banco de dados

No dashboard do Supabase, vá em **SQL Editor** e execute os scripts de migração na seguinte ordem:

```bash
# No SQL Editor do Supabase, cole e execute CADA arquivo na ordem:
supabase/migrations/00001_schema.sql
supabase/migrations/00002_add_destinatario.sql
supabase/migrations/00003_transportadoras.sql
supabase/migrations/00004_configuracoes_sistema.sql
supabase/migrations/00005_forma_pagamento.sql
supabase/migrations/00006_entregador_campos.sql
supabase/migrations/00007_features_completas.sql
```

> **💡 Dica:** Você pode criar um usuário admin direto pelo SQL:
> ```sql
> INSERT INTO admins (nome, usuario, senha) VALUES ('Admin', 'admin', 'sua-senha-aqui');
> ```

### Passo 4: Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (conta grátis)
2. Clique em **Add New → Project**
3. Importe o repositório do **seu fork**
4. Em **Environment Variables**, adicione:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key do Supabase |
| `JWT_SECRET` | `openssl rand -hex 32` (gere uma) |

5. Clique em **Deploy** ✅

> **⏱️ O deploy leva ~1 minuto.** Após finalizar, sua instância estará no ar!

### Passo 5 (opcional): Domínio personalizado

Nas configurações do projeto na Vercel:
- Vá em **Settings → Domains**
- Adicione seu domínio (ex: `entregas.minhaempresa.com.br`)
- Siga as instruções de DNS

---

## 🛠️ Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/rotaprime.git
cd rotaprime

# Instale as dependências
npm install

# Crie o arquivo .env.local (copie de .env.example)
cp .env.example .env.local
# Preencha com suas credenciais do Supabase

# Execute as migrations no SQL Editor do Supabase
# (arquivos em supabase/migrations/)

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Estrutura do Projeto

```
├── app/
│   ├── admin/           # Painel administrativo
│   │   ├── configuracoes/  # Feature toggles
│   │   ├── entregadores/   # CRUD entregadores
│   │   ├── fotos/          # Gestão de fotos
│   │   ├── predefinicoes/  # Valor padrão, etc
│   │   ├── relatorio/      # Relatório diário
│   │   └── ...
│   ├── entregador/      # Portal do entregador
│   │   ├── meus-pacotes/   # Lista de pacotes
│   │   ├── meus-dados/     # Perfil
│   │   ├── financeiro/     # Financeiro
│   │   └── ...
│   └── api/             # API routes (admin + entregador)
├── components/          # Componentes compartilhados
├── lib/                 # Utilitários, auth, features
├── supabase/
│   └── migrations/      # Scripts SQL (00001 → 00007)
└── public/              # Assets estáticos
```

---

## 🧩 Feature Toggles

O sistema possui **39 funcionalidades** controladas por toggles no painel Admin → Controle. Quando desligadas, a funcionalidade **some completamente** — sidebar oculta o link e a página não renderiza.

**Grupos disponíveis:**
- Geral • Pacotes • Entregadores • Entregas • Relatórios
- Financeiro • Comunicação • Transportadoras • Segurança • Dashboard

---

## 🤝 Contribuindo

1. Faça um fork do repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Commit: `git commit -m "feat: minha feature"`
4. Push: `git push origin minha-feature`
5. Abra um Pull Request (PR)

> Ao abrir um PR, a Vercel gera automaticamente uma **preview URL** para testar antes de mergear.

---

## 📄 Licença

Este projeto é privado — uso interno.

---

<p align="center">
  🚛 <strong>Rota Prime v2.0</strong> · Feito com Next.js 14 + Supabase + Tailwind CSS · ☕
</p>
