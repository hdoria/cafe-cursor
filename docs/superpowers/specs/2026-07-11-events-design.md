# Design: Suporte a eventos (multi-edição) no Cafe Cursor

**Data:** 2026-07-11
**Status:** Aprovado

## Contexto e problema

O app distribui créditos do Cursor para participantes de eventos. Hoje o modelo é
single-event: `EligibleUser` é uma lista global com email único e `Credit` é um pool
global. Não existe conceito de evento, então qualquer pessoa importada em edições
anteriores continua elegível para sempre.

Hoje (2026-07-11) acontece uma nova edição. Requisitos confirmados com o usuário:

1. Só participantes do **evento ativo** (lista nova do Luma) podem resgatar cupom.
2. Participantes de eventos antigos **não** têm direito — nem a rever o link antigo
   (bloquear como não elegível).
3. Quem participou do evento antigo E do de hoje (repetente) **ganha cupom novo** hoje.
4. O pool de cupons é **compartilhado** entre eventos: cupom antigo não usado pode ser
   entregue a participante de hoje. Novos cupons são só adicionados ao pool.
5. Toda pessoa deve estar **associada a um evento**.

## Decisão

Modelo multi-evento (abordagem A): tabela `Event` + participação por evento em
`EligibleUser`. Alternativas descartadas: reset operacional sem código (não cria
associação a evento, perde histórico) e coluna string `eventTag` (conflita com email
único global no caso do repetente).

## 1. Schema (`prisma/schema.prisma`)

```prisma
model Event {
  id        String         @id @default(cuid())
  name      String
  date      DateTime?
  isActive  Boolean        @default(false)
  createdAt DateTime       @default(now())
  users     EligibleUser[]
}
```

`EligibleUser`:
- Remove `@unique` de `email`.
- Adiciona `eventId String` (obrigatório) + relação `event Event @relation(...)`.
- Adiciona `@@unique([email, eventId])`.
- Demais campos inalterados (check-in, claim, relação 1-1 com `Credit`). Cada
  participação tem seu próprio `hasClaimed`/`creditId`, o que atende o requisito 3.

`Credit`: **inalterado** (pool global compartilhado, requisito 4).

Invariante: no máximo um `Event` com `isActive = true` (garantido pela aplicação ao
ativar; não por constraint de banco).

## 2. Migração de dados

O projeto usa `prisma db push` (sem pasta de migrations), e adicionar coluna NOT NULL
em tabela populada não funciona via push. Migração via script SQL único,
`scripts/migrate-events.sql`, executado manualmente no Supabase SQL editor:

1. Cria a tabela `Event` (nomes de tabela/coluna idênticos aos que o Prisma espera).
2. Insere evento legado "Café Cursor — 1ª edição" com `isActive = false`.
3. Adiciona `eventId` em `EligibleUser`, faz backfill apontando para o evento legado.
4. Aplica NOT NULL, FK e unique composto `(email, eventId)`; remove o unique antigo de
   `email`.

Depois do script, `prisma db push` deve reportar schema em sincronia (verificação).
Histórico preservado integralmente.

## 3. Registro público (`app/api/register/route.ts`)

- Busca `event.findFirst({ where: { isActive: true } })`. Se nenhum evento ativo:
  retorna erro de configuração (HTTP 503, código `NO_ACTIVE_EVENT`) — não expõe
  detalhes internos.
- Lookup do usuário passa de `findUnique({ email })` para
  `findUnique({ email_eventId: { email, eventId } })` com o evento ativo.
- Quem não está na lista do evento ativo cai no fluxo `NOT_ELIGIBLE` existente
  (requisito 2 — inclui quem só estava em eventos antigos).
- Idempotência mantida por participação: se a participação do evento ativo já tem
  claim, devolve o mesmo link.
- Restante do fluxo (aprovação, check-in, escolha de credit test/real, transação,
  email) inalterado.

## 4. Admin

- **Gestão de eventos (mínima):** criar evento (nome + data opcional) e marcar como
  ativo. Ativar um evento desativa os demais na mesma transação. Novas actions em
  `app/api/admin/actions/route.ts` (`ADD_EVENT`, `SET_ACTIVE_EVENT`) + UI simples no
  dashboard.
- **Import Luma (`app/api/admin/upload-guests/route.ts`):** guests importados são
  associados ao evento ativo; erro claro se não houver evento ativo. Duplicidade
  checada por `(email, eventId)`.
- **`ADD_ELIGIBLE_USER` manual:** associa ao evento ativo.
- **Dashboard/lista de usuários (`app/api/admin/dashboard/route.ts` + páginas):**
  filtro por evento, default no evento ativo. Estatísticas de usuários (total,
  check-ins, claims) contadas no evento filtrado; estatísticas de créditos continuam
  globais.

## 5. Fora de escopo

- Cupons (`upload-credits`, actions de credit), docs, emails, i18n: sem mudança.
- Integração com API do Luma (import continua via CSV).
- Constraint de banco para "único evento ativo".
- Atualização de `supabase-complete-setup.sql` (referência histórica de setup; a fonte
  da verdade é `schema.prisma`).

## 6. Validação

Rodar local com dados de teste e confirmar:

1. Email presente só no evento antigo → bloqueado (`NOT_ELIGIBLE`).
2. Email do evento ativo (aprovado + check-in) → resgata cupom.
3. Repetente (nas duas listas) → resgata cupom **novo** hoje; claim antigo intacto no
   registro do evento legado.
4. Import CSV do Luma associa ao evento ativo e ignora duplicados do mesmo evento.
5. Sem evento ativo → registro retorna `NO_ACTIVE_EVENT`; import de guests falha com
   mensagem clara.

## Fluxo operacional no dia (pós-deploy)

1. Rodar `scripts/migrate-events.sql` no Supabase SQL editor.
2. `prisma db push` para confirmar sincronia.
3. Admin: criar evento de hoje e marcar como ativo.
4. Admin: importar CSV de guests do Luma.
5. Admin: subir CSV de cupons novos (fluxo existente, sem mudança).
6. Check-ins no admin como sempre.
