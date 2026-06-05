# Build Spec BS-XXX: [Título Curto e Descritivo]

**Status**: Draft | Approved | In Progress | Done | Verified
**Prioridade**: P0 | P1 | P2
**Estimativa**: X horas
**Responsável**: @dev
**Branch**: `feature/BS-XXX-nome-da-tarefa`
**Referências**:
- PRD: Seção [X.Y]
- TDD: Seção [A.B]
- Dependências: BS-[YYY], BS-[ZZZ]

---

## 1. Descrição da Tarefa
[Descrição clara, sem ambiguidade, do que precisa ser implementado]

## 2. Acceptance Criteria (Critérios de Aceitação)
Given/When/Then ou lista verificável:
- [ ] Dado que..., Quando..., Então...
- [ ] Dado que..., Quando..., Então...

## 3. Especificação Técnica Detalhada (TypeScript First)

### Interfaces / Types
```typescript
// Types exatos que devem ser criados/modificados
export interface Exemplo {
  campo: string;
  valor: number;
}
```

### Estrutura de Pastas Esperada
```
app/
  admin/
    nova-rota/
      page.tsx
  api/
    admin/
      nova-rota/
        route.ts
lib/
  services/
    rota.service.ts
components/
  admin/
    NovaRotaForm.tsx
```

### Regras de Negócio (Validações com Zod)
```typescript
import { z } from 'zod';

export const novaRotaSchema = z.object({
  nome: z.string().min(3).max(100),
  entregador_id: z.string().uuid(),
  pacotes: z.array(z.string()).min(1).max(50),
});
```

### Integração com Módulos Existentes
- [ ] Usar `lib/supabase/client.ts` para chamadas ao banco
- [ ] Usar `middleware.ts` para proteção de rota
- [ ] Componente `Button` de `shadcn/ui`

## 4. Testes Exigidos
### Unit Tests (Vitest)
- [ ] Testar validação do schema Zod
- [ ] Testar service com mock do Supabase
- [ ] Testar comportamento de erro

### Integration / E2E (Playwright)
- [ ] Fluxo feliz: criar → listar → editar
- [ ] Fluxo de erro: validação falha → mensagem de erro

## 5. Definition of Done
- [ ] Código implementado seguindo a spec técnica
- [ ] Todos os Acceptance Criteria atendidos
- [ ] Testes passando localmente (`npm run test`)
- [ ] TypeScript strict mode sem erros (`npm run typecheck`)
- [ ] Lint limpo (`npm run lint`)
- [ ] Build bem-sucedido (`npm run build`)
- [ ] Code Review aprovado com checklist ESD
- [ ] Deploy em staging/testado

## 6. Notas e Riscos
- Edge case conhecido: [descrição]
- Dependência externa: [descrição]
- Decisão de design: [descrição]

---

**Checklist de Code Review ESD**
- [ ] Código implementa **exatamente** a Especificação Técnica?
- [ ] Todos os Acceptance Criteria foram validados?
- [ ] TypeScript strict mode respeitado (sem `any`)?
- [ ] Não há código "extra" fora do escopo da spec?
- [ ] Testes cobrem os critérios da spec?
