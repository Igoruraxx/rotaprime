# Envelope de Segurança para Desenvolvimento (ESD) — Referência Rápida

## Fluxo Obrigatório

```
PRD (docs/specs/prd/)
  ↓ Decomposição Técnica
TDD (docs/specs/tdd/)
  ↓ Decomposição em Tarefas Atômicas
Build Spec (docs/specs/build-specs/BS-XXX.md) ← ORIENTA 100% DO DESENVOLVIMENTO
  ↓ Implementação + Validação
Desenvolvimento (Branch → Commits → PR → Review → Merge)
```

## Regras de Ouro
1. **Nenhum código é escrito** sem uma Build Spec aprovada
2. Toda Build Spec referencia PRD + TDD
3. Mudanças de escopo → atualizar PRD → TDD → Build Spec (nunca direto no código)
4. TypeScript strict mode mandatório (`strict: true` no tsconfig)

## Comandos Rápidos
| Comando | Descrição |
|---------|-----------|
| `node scripts/init-esd.mjs check` | Verificar conformidade ESD |
| `node scripts/init-esd.mjs init` | Info do ESD no projeto |
| `node scripts/init-esd.mjs bs BS-XXX` | Criar Build Spec |
| `node scripts/init-esd.mjs prd "Título"` | Criar PRD |
| `node scripts/init-esd.mjs tdd "Título"` | Criar TDD |

## Convenções
- **Branch**: `feature/BS-XXX-nome-da-tarefa`
- **Commit**: `feat(BS-XXX): descrição`
- **PR Template**: Preencher checklist ESD obrigatório

## DeepSeek V4 Flash (Geração Rápida de Specs)
Use os prompts em `docs/prompts/`:
- `deepseek-optimize-prd-to-tdd.md` → PRD → TDD
- `deepseek-generate-build-specs-from-tdd.md` → TDD → Build Specs

> ⚠ Toda spec gerada por IA deve passar por revisão humana antes de ser aprovada.

## CI/CD Gates
- ✅ `tsc --noEmit` (TypeScript check)
- ✅ `next lint`
- ✅ `npm run build`
- (Futuro) Testes automatizados
