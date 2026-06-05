#!/usr/bin/env node

/**
 * init-esd.mjs — Inicializador do Envelope de Segurança para Desenvolvimento
 *
 * Uso:
 *   node scripts/init-esd.mjs init            # Cria estrutura ESD completa
 *   node scripts/init-esd.mjs bs BS-001       # Cria arquivo de Build Spec
 *   node scripts/init-esd.mjs prd "Titulo"    # Cria arquivo de PRD
 *   node scripts/init-esd.mjs tdd "Titulo"    # Cria arquivo de TDD
 *   node scripts/init-esd.mjs check           # Verifica conformidade ESD
 *
 * Requisitos: Node.js 18+, TypeScript no projeto
 */

import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const TEMPLATES_DIR = join(ROOT, 'docs', 'specs');
const PROMPTS_DIR = join(ROOT, 'docs', 'prompts');
const GITHUB_DIR = join(ROOT, '.github');
const BUILD_SPECS_DIR = join(TEMPLATES_DIR, 'build-specs');
const PRD_DIR = join(TEMPLATES_DIR, 'prd');
const TDD_DIR = join(TEMPLATES_DIR, 'tdd');

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`  ✔ Criado: ${dir.replace(ROOT, '.')}`);
  }
}

function init() {
  console.log('\n🚀 Inicializando Envelope de Segurança para Desenvolvimento (ESD)\n');

  // Estrutura de pastas
  const dirs = [
    TEMPLATES_DIR,
    PROMPTS_DIR,
    GITHUB_DIR,
    join(GITHUB_DIR, 'workflows'),
    BUILD_SPECS_DIR,
    PRD_DIR,
    TDD_DIR,
  ];
  dirs.forEach(ensureDir);

  // Verificar templates existentes
  const requiredTemplates = ['prd-template.md', 'tdd-template.md', 'build-spec-template.md'];
  let allTemplatesOk = true;
  requiredTemplates.forEach((tmpl) => {
    const path = join(TEMPLATES_DIR, tmpl);
    if (!existsSync(path)) {
      console.log(`  ✖ Template faltando: ${tmpl}`);
      allTemplatesOk = false;
    } else {
      console.log(`  ✔ Template encontrado: ${tmpl}`);
    }
  });

  // Verificar prompts
  const requiredPrompts = ['deepseek-optimize-prd-to-tdd.md', 'deepseek-generate-build-specs-from-tdd.md'];
  requiredPrompts.forEach((prompt) => {
    const path = join(PROMPTS_DIR, prompt);
    if (existsSync(path)) {
      console.log(`  ✔ Prompt encontrado: ${prompt}`);
    }
  });

  // Verificar PR template
  const prTemplate = join(GITHUB_DIR, 'pull_request_template.md');
  if (existsSync(prTemplate)) {
    console.log('  ✔ PR Template encontrado');
  }

  // Verificar CI
  const ciFile = join(GITHUB_DIR, 'workflows', 'esd-ci.yml');
  if (existsSync(ciFile)) {
    console.log('  ✔ CI Workflow encontrado');
  }

  // Verificar tsconfig strict
  const tsconfigPath = join(ROOT, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    if (tsconfig.compilerOptions?.strict) {
      console.log('  ✔ TypeScript strict mode: ATIVADO');
    } else {
      console.log('  ⚠ TypeScript strict mode: DESATIVADO (configure strict: true)');
    }
  }

  if (allTemplatesOk) {
    console.log('\n✅ ESD pronto para uso!\n');
  } else {
    console.log('\n⚠  Alguns templates estão faltando. Execute os prompts DeepSeek para gerá-los.\n');
  }
}

function createBuildSpec(id) {
  ensureDir(BUILD_SPECS_DIR);
  const filePath = join(BUILD_SPECS_DIR, `BS-${id}.md`);
  if (existsSync(filePath)) {
    console.log(`✖ Build Spec BS-${id} já existe: ${filePath}`);
    process.exit(1);
  }
  const content = `# Build Spec BS-${id}: [Título]

**Status**: Draft
**Prioridade**: P1
**Estimativa**: X horas
**Responsável**: @dev
**Branch**: \`feature/BS-${id}-nome-da-tarefa\`
**Referências**:
- PRD: Seção
- TDD: Seção

---

## 1. Descrição da Tarefa


## 2. Acceptance Criteria
- [ ] Dado que..., Quando..., Então...

## 3. Especificação Técnica Detalhada (TypeScript First)

### Interfaces / Types
\`\`\`typescript

\`\`\`

### Estrutura de Pastas


### Regras de Negócio (Zod)
\`\`\`typescript

\`\`\`

## 4. Testes Exigidos
- [ ]

## 5. Definition of Done
- [ ] Código implementado
- [ ] Acceptance Criteria atendidos
- [ ] Testes passando
- [ ] TypeScript sem erros
- [ ] Lint limpo
- [ ] Build ok

## 6. Notas e Riscos

---
`;
  writeFileSync(filePath, content, 'utf-8');
  console.log(`✔ Build Spec BS-${id} criada: ${filePath.replace(ROOT, '.')}`);
}

function createPRD(title) {
  ensureDir(PRD_DIR);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filePath = join(PRD_DIR, `PRD-${slug}.md`);
  writeFileSync(filePath, `# PRD: ${title}\n\n**Status**: Draft\n**Data**: ${new Date().toISOString().split('T')[0]}\n\n---\n\n## 1. Visão do Produto\n\n## 2. Objetivos de Negócio\n\n## 3. Requisitos Funcionais\n\n## 4. Requisitos Não-Funcionais\n`, 'utf-8');
  console.log(`✔ PRD criado: ${filePath.replace(ROOT, '.')}`);
}

function createTDD(title) {
  ensureDir(TDD_DIR);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const filePath = join(TDD_DIR, `TDD-${slug}.md`);
  writeFileSync(filePath, `# TDD: ${title}\n\n**Status**: Draft\n**Data**: ${new Date().toISOString().split('T')[0]}\n\n---\n\n## 1. Arquitetura\n\n## 2. Stack Tecnológica\n\n## 3. Modelos de Dados\n\n## 4. API Contracts\n\n## 5. Decomposição em Domínios\n`, 'utf-8');
  console.log(`✔ TDD criada: ${filePath.replace(ROOT, '.')}`);
}

function check() {
  console.log('\n🔍 Verificando conformidade com o ESD...\n');
  init();
}

// --- CLI ---
const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
  case 'init':
    init();
    break;
  case 'bs':
    if (!args[0]) { console.error('Uso: node scripts/init-esd.mjs bs BS-XXX'); process.exit(1); }
    createBuildSpec(args[0]);
    break;
  case 'prd':
    if (!args[0]) { console.error('Uso: node scripts/init-esd.mjs prd "Título do PRD"'); process.exit(1); }
    createPRD(args.join(' '));
    break;
  case 'tdd':
    if (!args[0]) { console.error('Uso: node scripts/init-esd.mjs tdd "Título da TDD"'); process.exit(1); }
    createTDD(args.join(' '));
    break;
  case 'check':
    check();
    break;
  default:
    console.log(`
Uso: node scripts/init-esd.mjs <comando>

Comandos:
  init              Inicializa/info do ESD no projeto
  bs BS-XXX         Cria uma nova Build Spec
  prd "Título"      Cria um novo PRD
  tdd "Título"      Cria uma nova TDD
  check             Verifica conformidade com o ESD
`);
}
