# Suporte Multi-Evento — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Associar participantes a eventos: só quem está na lista do evento ativo pode resgatar cupom; repetentes ganham cupom novo por evento; pool de cupons continua global.

**Architecture:** Novo model `Event` no Prisma; `EligibleUser` vira participação por evento (unique composto `email+eventId`). `/api/register` valida contra o evento ativo. Admin ganha gestão mínima de eventos, import do Luma associado ao evento ativo e filtro por evento no dashboard. Migração de produção via script SQL único (o projeto usa `prisma db push`, sem migrations).

**Tech Stack:** Next.js 14 App Router, Prisma 5.22 + PostgreSQL (Supabase em prod), TypeScript, Tailwind. **Sem framework de testes** — verificação via `npm run build`, `npx tsc --noEmit` e chamadas `curl` contra `npm run dev` com banco Postgres local.

**Spec:** `docs/superpowers/specs/2026-07-11-events-design.md`

## Global Constraints

- **NUNCA** rodar `prisma db push`, `--force-reset`, seed ou SQL destrutivo sem confirmar que `DATABASE_URL` no `.env` aponta para `localhost`. Produção (Supabase) é migrada manualmente pelo usuário via SQL editor.
- `.env` local não é commitado (não versionar segredos).
- Commits seguem Conventional Commits (`feat:`, `fix:`, `docs:`), assunto em minúsculas, imperativo, ≤72 chars.
- Nomes do unique composto no Prisma client: `email_eventId` (padrão Prisma para `@@unique([email, eventId])`).
- Código existente mistura comentários em espanhol/português e usa `console.log` com emojis — manter o estilo dos arquivos tocados.
- Máximo um `Event` com `isActive = true` — garantido por transação na aplicação (updateMany desativa todos antes de ativar um).
- Erros de API não expõem stack traces nem SQL.

---

### Task 1: Banco local de desenvolvimento + schema + seed

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Create: `.env` (local, não commitado)

**Interfaces:**
- Produces: model `Event { id, name, date?, isActive, createdAt }`; `EligibleUser.eventId: String` (obrigatório) + relação `event`; unique composto acessível como `prisma.eligibleUser.findUnique({ where: { email_eventId: { email, eventId } } })`. Seed cria evento ativo `"Evento Seed (local)"`.

- [ ] **Step 1: Subir Postgres local e criar o banco**

```bash
pg_isready -h localhost || brew services start postgresql@16
sleep 2 && pg_isready -h localhost
createdb cafe_cursor_dev 2>/dev/null || echo "db já existe"
```

Expected: `localhost:5432 - accepting connections`

- [ ] **Step 2: Criar `.env` local (SOMENTE se não existir)**

```bash
test -f .env && echo "JÁ EXISTE — NÃO SOBRESCREVER, PARE E REVISE" || cat > .env << 'EOF'
DATABASE_URL="postgresql://localhost:5432/cafe_cursor_dev"
RESEND_API_KEY="re_dummy_local"
FROM_EMAIL="Cafe Cursor <noreply@localhost>"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin-local-123"
EOF
grep -c localhost .env
```

Expected: `1` (ou mais). Confirme que `DATABASE_URL` contém `localhost` antes de qualquer comando de banco.

- [ ] **Step 3: Editar `prisma/schema.prisma`**

Adicionar o model `Event` após o comentário do header e alterar `EligibleUser`. O arquivo passa a ter (trecho relevante — `Credit`, `DocCategory`, `DocArticle` ficam intactos):

```prisma
// Eventos (edições) do Cafe Cursor
model Event {
  id        String         @id @default(cuid())
  name      String
  date      DateTime?
  isActive  Boolean        @default(false)
  createdAt DateTime       @default(now())

  users     EligibleUser[]
}

// Tabla de usuarios elegibles (pre-aprobados del evento)
model EligibleUser {
  id             String   @id @default(cuid())
  email          String
  name           String
  company        String?
  role           String?
  approvalStatus String   @default("approved")
  createdAt      DateTime @default(now())

  // Evento ao qual esta participação pertence
  event          Event    @relation(fields: [eventId], references: [id])
  eventId        String

  // Check-in no evento
  hasCheckedIn   Boolean  @default(false)
  checkedInAt    DateTime?

  // Si ya reclamó su crédito
  hasClaimed     Boolean  @default(false)
  claimedAt      DateTime?

  // Relación con el crédito asignado
  credit         Credit?  @relation(fields: [creditId], references: [id])
  creditId       String?  @unique

  @@unique([email, eventId])
}
```

Atenção: `email` **perde** o `@unique`; o unique passa a ser o composto `@@unique([email, eventId])`.

- [ ] **Step 4: Validar e gerar o client**

```bash
npx prisma validate && npx prisma generate
```

Expected: `The schema at prisma/schema.prisma is valid` e `Generated Prisma Client`.

- [ ] **Step 5: Atualizar `prisma/seed.ts`**

Três mudanças:

(a) Na limpeza (linhas ~80-82), apagar usuários antes e incluir eventos:

```ts
  // Clean existing data
  console.log("🗑️  Cleaning existing data...");
  await prisma.eligibleUser.deleteMany();
  await prisma.event.deleteMany();
  await prisma.credit.deleteMany();
```

(b) Logo após a limpeza, criar o evento ativo:

```ts
  // ============================================
  // 0. CREATE ACTIVE EVENT
  // ============================================
  console.log("\n🗓  Creating seed event...");
  const seedEvent = await prisma.event.create({
    data: { name: "Evento Seed (local)", isActive: true },
  });
  console.log(`   ✅ Event created: ${seedEvent.name}`);
```

(c) Nos dois `prisma.eligibleUser.create` (CSV ~linha 156 e test users ~linha 180), adicionar `eventId: seedEvent.id` ao `data`:

```ts
      await prisma.eligibleUser.create({
        data: {
          email,
          name,
          company: row.company || null,
          role: row.role || null,
          approvalStatus: "approved",
          hasClaimed: false,
          eventId: seedEvent.id,
        },
      });
```

```ts
    await prisma.eligibleUser.create({
      data: {
        email: user.email.toLowerCase(),
        name: user.name,
        company: "Test Company",
        role: "Tester",
        approvalStatus: "approved",
        hasClaimed: false,
        eventId: seedEvent.id,
      },
    });
```

- [ ] **Step 6: Push + seed no banco LOCAL e verificar**

```bash
grep -q "localhost" .env && npm run db:push && npm run db:seed
psql cafe_cursor_dev -c 'SELECT name, "isActive" FROM "Event";' -c 'SELECT count(*) AS users_com_evento FROM "EligibleUser" WHERE "eventId" IS NOT NULL;'
```

Expected: seed completa sem erro; `Evento Seed (local) | t`; contagem de usuários > 0.

- [ ] **Step 7: Verificar typecheck (vai FALHAR — esperado)**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: erros em `app/api/register/route.ts`, `app/api/admin/upload-guests/route.ts` e `app/api/admin/actions/route.ts` porque `findUnique({ where: { email } })` deixou de ser válido. Isso confirma que o compilador está pegando todos os call sites — as Tasks 3-5 corrigem cada um. **Não commitar seed/schema quebrando o build sozinho? O build de deploy só acontece no push para a Vercel; commits locais intermediários são aceitáveis, mas NÃO fazer `git push` até a Task 7 passar.**

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts
git commit -m "feat(db): add Event model and per-event participation"
```

---

### Task 2: Script SQL de migração de produção

**Files:**
- Create: `scripts/migrate-events.sql`

**Interfaces:**
- Produces: script idempotente-com-transação que cria `Event`, insere o evento legado `id='evt-legacy-cafe-cursor-1'` (inativo), faz backfill de `EligibleUser.eventId` e troca o unique de `email` pelo composto. Nomes de tabelas/colunas/constraints idênticos aos que `prisma db push` geraria.

- [ ] **Step 1: Criar `scripts/migrate-events.sql`**

```sql
-- Migração: suporte multi-evento (executar UMA vez no Supabase SQL editor)
-- Spec: docs/superpowers/specs/2026-07-11-events-design.md
-- Tudo em uma transação: ou aplica inteiro, ou nada.

BEGIN;

-- 1. Tabela Event (nomes idênticos aos que o Prisma espera)
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- 2. Evento legado (inativo) para os participantes já existentes
INSERT INTO "Event" ("id", "name", "isActive")
VALUES ('evt-legacy-cafe-cursor-1', 'Café Cursor — 1ª edição', false);

-- 3. Coluna eventId com backfill para o evento legado
ALTER TABLE "EligibleUser" ADD COLUMN "eventId" TEXT;
UPDATE "EligibleUser" SET "eventId" = 'evt-legacy-cafe-cursor-1';
ALTER TABLE "EligibleUser" ALTER COLUMN "eventId" SET NOT NULL;

-- 4. FK (mesmos defaults do Prisma para relação obrigatória)
ALTER TABLE "EligibleUser"
    ADD CONSTRAINT "EligibleUser_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Unique composto substitui o unique global de email
DROP INDEX "EligibleUser_email_key";
CREATE UNIQUE INDEX "EligibleUser_email_eventId_key"
    ON "EligibleUser"("email", "eventId");

COMMIT;
```

- [ ] **Step 2: Testar o script contra um banco com o schema LEGADO**

Simula produção: cria banco descartável com o schema antigo + dados, roda o script, e confirma que `prisma db push` não quer mudar nada (schema em sincronia).

```bash
dropdb cafe_cursor_migtest 2>/dev/null; createdb cafe_cursor_migtest
git stash push prisma/schema.prisma
DATABASE_URL="postgresql://localhost:5432/cafe_cursor_migtest" npx prisma db push --skip-generate
git stash pop
psql cafe_cursor_migtest -c "INSERT INTO \"EligibleUser\" (\"id\",\"email\",\"name\") VALUES ('u1','antigo@ex.com','Antigo'), ('u2','repetente@ex.com','Repetente');"
psql cafe_cursor_migtest -f scripts/migrate-events.sql
DATABASE_URL="postgresql://localhost:5432/cafe_cursor_migtest" npx prisma db push --skip-generate 2>&1 | tail -3
```

Expected: script roda com `COMMIT`; o último `db push` reporta **"The database is already in sync with the Prisma schema."** — prova que o SQL produz exatamente o schema novo. Se ele quiser alterar algo, corrija o SQL até sincronizar.

- [ ] **Step 3: Verificar backfill no banco de teste**

```bash
psql cafe_cursor_migtest -c 'SELECT email, "eventId" FROM "EligibleUser";' -c 'SELECT id, name, "isActive" FROM "Event";'
dropdb cafe_cursor_migtest
```

Expected: os 2 usuários com `eventId = evt-legacy-cafe-cursor-1`; evento legado com `isActive = f`.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-events.sql
git commit -m "feat(db): add production migration script for events"
```

---

### Task 3: `/api/register` valida contra o evento ativo

**Files:**
- Modify: `app/api/register/route.ts`

**Interfaces:**
- Consumes: model `Event` e unique `email_eventId` (Task 1).
- Produces: POST bloqueia quem não está no evento ativo (`NOT_ELIGIBLE`); sem evento ativo → HTTP 503 `NO_ACTIVE_EVENT`. GET conta usuários só do evento ativo.

- [ ] **Step 1: Alterar o lookup no POST**

Substituir o bloco da busca (linhas 26-30) por:

```ts
    // 0. Buscar o evento ativo
    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });

    if (!activeEvent) {
      console.log(`❌ [REGISTER] Nenhum evento ativo configurado`);
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum evento ativo no momento. Por favor contacta al organizador.",
          code: "NO_ACTIVE_EVENT",
        },
        { status: 503 }
      );
    }

    // 1. Verificar si el email está en la lista del evento activo
    const eligibleUser = await prisma.eligibleUser.findUnique({
      where: {
        email_eventId: { email: normalizedEmail, eventId: activeEvent.id },
      },
      include: { credit: true },
    });
```

O restante do POST (aprovação, check-in, claim idempotente, transação, email) fica **inalterado** — `eligibleUser` já é a participação do evento ativo, então repetente resgata cupom novo naturalmente e quem só estava no evento antigo cai no `NOT_ELIGIBLE` existente.

- [ ] **Step 2: Escopar o GET (stats públicas) ao evento ativo**

Substituir o corpo do `GET` (linhas 199-224) por:

```ts
export async function GET() {
  try {
    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });

    if (!activeEvent) {
      return NextResponse.json({
        available: false,
        remaining: 0,
        stats: { totalEligible: 0, claimed: 0, pending: 0 },
      });
    }

    const [availableReal, totalEligible, claimed] = await Promise.all([
      prisma.credit.count({ where: { isUsed: false, isTest: false } }),
      prisma.eligibleUser.count({
        where: { approvalStatus: "approved", eventId: activeEvent.id },
      }),
      prisma.eligibleUser.count({
        where: { hasClaimed: true, eventId: activeEvent.id },
      }),
    ]);

    return NextResponse.json({
      available: availableReal > 0,
      remaining: availableReal,
      stats: {
        totalEligible,
        claimed,
        pending: totalEligible - claimed,
      },
    });
  } catch (error) {
    console.error(`❌ [STATS] Error:`, error);
    return NextResponse.json(
      { available: false, remaining: 0 },
      { status: 500 }
    );
  }
}
```

(A variável `availableTest` do código antigo não era usada na resposta — não recriar.)

- [ ] **Step 3: Verificar com o servidor local**

```bash
grep -q localhost .env && npm run dev &
sleep 8
# Test user do seed (evento ativo, mas SEM check-in) → NO_CHECKIN prova lookup por evento ok
curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User 1","email":"test@example.com"}'
# Email inexistente → NOT_ELIGIBLE
curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"X","email":"naoexiste@ex.com"}'
# Stats
curl -s localhost:5000/api/register
```

Expected: 1º retorna `"code":"NO_CHECKIN"`; 2º `"code":"NOT_ELIGIBLE"`; 3º stats com `totalEligible` > 0. (Porta: o README usa 5000; se `npm run dev` subir em 3000, ajustar as URLs.)

- [ ] **Step 4: Commit**

```bash
git add app/api/register/route.ts
git commit -m "feat(register): validate eligibility against active event"
```

---

### Task 4: Import do Luma associado ao evento ativo

**Files:**
- Modify: `app/api/admin/upload-guests/route.ts`

**Interfaces:**
- Consumes: `Event`, `email_eventId` (Task 1).
- Produces: guests importados com `eventId` do evento ativo; erro 400 `Nenhum evento ativo...` se não houver; duplicado checado por (email, evento).

- [ ] **Step 1: Buscar evento ativo no início do handler**

Após a validação do `csvContent` (linha ~40), inserir:

```ts
    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });

    if (!activeEvent) {
      return NextResponse.json(
        { error: "Nenhum evento ativo. Crie e ative um evento antes de importar guests." },
        { status: 400 }
      );
    }
```

- [ ] **Step 2: Trocar o check de duplicado (linhas 100-108)**

```ts
      // Check if user already exists in the active event
      const existing = await prisma.eligibleUser.findUnique({
        where: {
          email_eventId: { email, eventId: activeEvent.id },
        },
      });

      if (existing) {
        errors.push(`Linha ${i + 1}: ${email} já existe neste evento`);
        continue;
      }
```

- [ ] **Step 3: Incluir eventId no create (linhas 116-121)**

```ts
        await prisma.eligibleUser.create({
          data: {
            email: guest.email,
            name: guest.name,
            eventId: activeEvent.id,
          },
        });
```

E na mensagem de sucesso (linha 130), citar o evento:

```ts
      message: `${inserted} guests importados para "${activeEvent.name}"`,
```

- [ ] **Step 4: Verificar com curl (com sessão admin)**

```bash
# Login admin salva cookie
curl -s -c /tmp/admin.jar -X POST localhost:5000/api/admin/auth \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin-local-123"}'
# Import: 1 novo + 1 duplicado (test@example.com já está no evento seed)
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/upload-guests \
  -H 'Content-Type: application/json' \
  -d '{"csvContent":"email,name,approval_status\nnovo@ex.com,Novo Guest,approved\ntest@example.com,Dup,approved"}'
```

Expected: `inserted: 1`, erro de duplicado para `test@example.com` com "já existe neste evento". (Se a rota de auth divergir, inspecionar `app/api/admin/auth/route.ts` e ajustar o login.)

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/upload-guests/route.ts
git commit -m "feat(admin): associate imported luma guests to active event"
```

---

### Task 5: Actions admin — eventos + correções de lookup

**Files:**
- Modify: `app/api/admin/actions/route.ts`

**Interfaces:**
- Consumes: `Event`, `email_eventId` (Task 1).
- Produces: actions `ADD_EVENT { name, date?, setActive? }` e `SET_ACTIVE_EVENT { eventId }`; `ASSIGN_CREDIT` e `ADD_ELIGIBLE_USER` passam a operar no evento ativo.

- [ ] **Step 1: Adicionar as duas novas actions antes do `default:`**

```ts
      case "ADD_EVENT": {
        // Criar evento; opcionalmente já ativar (desativando os demais)
        const { name, date, setActive } = data;

        if (!name || typeof name !== "string" || !name.trim()) {
          return NextResponse.json(
            { error: "Nome do evento é obrigatório" },
            { status: 400 }
          );
        }

        const newEvent = await prisma.$transaction(async (tx) => {
          if (setActive) {
            await tx.event.updateMany({ data: { isActive: false } });
          }
          return tx.event.create({
            data: {
              name: name.trim(),
              date: date ? new Date(date) : null,
              isActive: Boolean(setActive),
            },
          });
        });

        console.log(`🗓 [ADMIN] Evento criado: ${newEvent.name} (ativo: ${newEvent.isActive})`);

        return NextResponse.json({
          success: true,
          message: `Evento "${newEvent.name}" criado${newEvent.isActive ? " e ativado" : ""}`,
          event: newEvent,
        });
      }

      case "SET_ACTIVE_EVENT": {
        // Ativar um evento (desativa todos os outros na mesma transação)
        const { eventId } = data;

        const event = await prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
          return NextResponse.json(
            { error: "Evento não encontrado" },
            { status: 404 }
          );
        }

        await prisma.$transaction([
          prisma.event.updateMany({ data: { isActive: false } }),
          prisma.event.update({
            where: { id: eventId },
            data: { isActive: true },
          }),
        ]);

        console.log(`🗓 [ADMIN] Evento ativado: ${event.name}`);

        return NextResponse.json({
          success: true,
          message: `Evento "${event.name}" agora é o evento ativo`,
        });
      }
```

- [ ] **Step 2: Corrigir `ASSIGN_CREDIT` (linhas 26-39)**

O `findUnique({ where: { email } })` não compila mais. Substituir por:

```ts
      case "ASSIGN_CREDIT": {
        // Asignar crédito manualmente a un usuario (del evento activo)
        const { email, useTestCredit } = data;

        const activeEvent = await prisma.event.findFirst({
          where: { isActive: true },
        });

        if (!activeEvent) {
          return NextResponse.json(
            { error: "Nenhum evento ativo" },
            { status: 400 }
          );
        }

        const eligibleUser = await prisma.eligibleUser.findUnique({
          where: { email_eventId: { email, eventId: activeEvent.id } },
        });
```

(o restante do case fica igual)

- [ ] **Step 3: Corrigir `ADD_ELIGIBLE_USER` (linhas 142-173)**

```ts
      case "ADD_ELIGIBLE_USER": {
        // Agregar usuario elegible manualmente (al evento activo)
        const { email, name, company, approvalStatus } = data;

        const activeEvent = await prisma.event.findFirst({
          where: { isActive: true },
        });

        if (!activeEvent) {
          return NextResponse.json(
            { error: "Nenhum evento ativo. Crie e ative um evento primeiro." },
            { status: 400 }
          );
        }

        const existing = await prisma.eligibleUser.findUnique({
          where: { email_eventId: { email, eventId: activeEvent.id } },
        });

        if (existing) {
          return NextResponse.json(
            { error: "El usuario ya existe en este evento" },
            { status: 400 }
          );
        }

        const newUser = await prisma.eligibleUser.create({
          data: {
            email,
            name,
            company: company || null,
            approvalStatus: approvalStatus || "approved",
            eventId: activeEvent.id,
          },
        });

        console.log(`➕ [ADMIN] Usuario elegible agregado: ${email} (evento: ${activeEvent.name})`);

        return NextResponse.json({
          success: true,
          message: `Usuario ${email} agregado`,
          user: newUser,
        });
      }
```

- [ ] **Step 4: Typecheck completo**

```bash
npx tsc --noEmit
```

Expected: **zero erros** (todos os call sites de `findUnique({ email })` foram corrigidos nas Tasks 3-5).

- [ ] **Step 5: Verificar actions com curl**

```bash
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/actions \
  -H 'Content-Type: application/json' \
  -d '{"action":"ADD_EVENT","data":{"name":"Evento Teste 2","setActive":true}}'
psql cafe_cursor_dev -c 'SELECT name, "isActive" FROM "Event" ORDER BY "createdAt";'
```

Expected: sucesso; no psql, `Evento Seed (local) | f` e `Evento Teste 2 | t` (um único ativo).

- [ ] **Step 6: Reativar o evento seed (deixar o banco local consistente para a Task 7)**

```bash
EVENT_ID=$(psql cafe_cursor_dev -tA -c "SELECT id FROM \"Event\" WHERE name = 'Evento Seed (local)';")
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/actions \
  -H 'Content-Type: application/json' \
  -d "{\"action\":\"SET_ACTIVE_EVENT\",\"data\":{\"eventId\":\"$EVENT_ID\"}}"
```

Expected: `"Evento \"Evento Seed (local)\" agora é o evento ativo"`.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/actions/route.ts
git commit -m "feat(admin): add event management actions and per-event lookups"
```

---

### Task 6: Dashboard admin — API com filtro por evento + UI de eventos

**Files:**
- Modify: `app/api/admin/dashboard/route.ts`
- Modify: `app/admin/dashboard/page.tsx`

**Interfaces:**
- Consumes: actions `ADD_EVENT` / `SET_ACTIVE_EVENT` (Task 5).
- Produces: `GET /api/admin/dashboard?eventId=<id>` retorna `{ stats, credits, eligibleUsers, events, selectedEventId }`; stats de usuários escopadas ao evento selecionado (default: ativo); stats de créditos globais.

- [ ] **Step 1: Reescrever a lógica de queries em `app/api/admin/dashboard/route.ts`**

Substituir o corpo entre a autenticação e o `return` (linhas 19-81) por:

```ts
    // Eventos + evento selecionado (query param ou o ativo)
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
    });
    const activeEvent = events.find((e) => e.isActive) || null;
    const requestedEventId = request.nextUrl.searchParams.get("eventId");
    const selectedEventId =
      (requestedEventId && events.some((e) => e.id === requestedEventId)
        ? requestedEventId
        : activeEvent?.id) ?? null;

    const userWhere = selectedEventId ? { eventId: selectedEventId } : {};

    // Estatísticas (créditos globais; usuários do evento selecionado)
    const [
      totalCredits,
      usedCredits,
      testCredits,
      totalEligible,
      claimedUsers,
      approvedUsers,
    ] = await Promise.all([
      prisma.credit.count(),
      prisma.credit.count({ where: { isUsed: true } }),
      prisma.credit.count({ where: { isTest: true } }),
      prisma.eligibleUser.count({ where: userWhere }),
      prisma.eligibleUser.count({ where: { ...userWhere, hasClaimed: true } }),
      prisma.eligibleUser.count({
        where: { ...userWhere, approvalStatus: "approved" },
      }),
    ]);

    // Créditos com usuários asignados (global)
    const credits = await prisma.credit.findMany({
      orderBy: [
        { isUsed: "desc" },
        { assignedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        assignedTo: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      take: 100,
    });

    // Usuarios elegibles do evento selecionado
    const eligibleUsers = await prisma.eligibleUser.findMany({
      where: userWhere,
      orderBy: [
        { hasClaimed: "desc" },
        { claimedAt: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        credit: true,
      },
      take: 200,
    });

    return NextResponse.json({
      stats: {
        totalCredits,
        usedCredits,
        availableCredits: totalCredits - usedCredits,
        testCredits,
        realCredits: totalCredits - testCredits,
        totalEligible,
        claimedUsers,
        approvedUsers,
        pendingUsers: approvedUsers - claimedUsers,
      },
      credits,
      eligibleUsers,
      events,
      selectedEventId,
    });
```

- [ ] **Step 2: `page.tsx` — interfaces e estado**

Adicionar após a interface `Stats` (linha ~43):

```ts
interface EventInfo {
  id: string;
  name: string;
  date: string | null;
  isActive: boolean;
  createdAt: string;
}
```

Atualizar `DashboardData`:

```ts
interface DashboardData {
  stats: Stats;
  credits: Credit[];
  eligibleUsers: EligibleUser[];
  events: EventInfo[];
  selectedEventId: string | null;
}
```

Adicionar estado junto aos outros `useState` (linha ~67):

```ts
  const [showEventsModal, setShowEventsModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
```

- [ ] **Step 3: `page.tsx` — fetch com eventId**

Substituir `fetchDashboard` (linhas 74-92) por:

```ts
  const fetchDashboard = async (eventId?: string | null) => {
    try {
      const targetEventId = eventId !== undefined ? eventId : selectedEventId;
      const url = targetEventId
        ? `/api/admin/dashboard?eventId=${encodeURIComponent(targetEventId)}`
        : "/api/admin/dashboard";
      const res = await fetch(url);
      if (res.status === 401) {
        router.push("/admin");
        return;
      }
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setSelectedEventId(json.selectedEventId);
      }
    } catch (err) {
      setError("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };
```

(As chamadas existentes `fetchDashboard()` continuam válidas — sem argumento, usa o evento selecionado.)

- [ ] **Step 4: `page.tsx` — seletor de evento + botão Eventos**

No bloco "Busca e ações" (linha ~278), antes do input de busca, adicionar o seletor; e um botão "🗓 Eventos" após o botão "+ Crédito" (linha ~297):

```tsx
            <select
              value={selectedEventId ?? ""}
              onChange={(e) => {
                setLoading(true);
                fetchDashboard(e.target.value || null);
              }}
              className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:border-white focus:outline-none"
            >
              {data?.events.length === 0 && <option value="">Sem eventos</option>}
              {data?.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.isActive ? "🟢 " : ""}{ev.name}
                </option>
              ))}
            </select>
```

```tsx
            <button
              onClick={() => setShowEventsModal(true)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-700"
            >
              🗓 Eventos
            </button>
```

- [ ] **Step 5: `page.tsx` — modal de eventos**

Renderizar junto aos outros modais (após o bloco do `showUploadGuestsModal`, linha ~552):

```tsx
      {/* Modal Eventos */}
      {showEventsModal && data && (
        <EventsModal
          events={data.events}
          onClose={() => setShowEventsModal(false)}
          onCreate={async (name, setActive) => {
            await executeAction("ADD_EVENT", { name, setActive });
            setShowEventsModal(false);
          }}
          onActivate={async (eventId) => {
            await executeAction("SET_ACTIVE_EVENT", { eventId });
            setShowEventsModal(false);
          }}
        />
      )}
```

E o componente, junto aos outros modais no fim do arquivo (após `UploadGuestsModal`):

```tsx
function EventsModal({
  events,
  onClose,
  onCreate,
  onActivate,
}: {
  events: EventInfo[];
  onClose: () => void;
  onCreate: (name: string, setActive: boolean) => void;
  onActivate: (eventId: string) => void;
}) {
  const [name, setName] = useState("");
  const [setActive, setSetActive] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-[#0a0a0a] p-6">
        <h2 className="mb-4 text-lg font-bold">Eventos</h2>

        <div className="mb-6 max-h-48 space-y-2 overflow-y-auto">
          {events.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum evento criado ainda.</p>
          )}
          {events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 px-3 py-2"
            >
              <span className="text-sm">
                {ev.isActive ? "🟢 " : "⚪ "}{ev.name}
              </span>
              {!ev.isActive && (
                <button
                  onClick={() => {
                    if (confirm(`Ativar "${ev.name}"? O evento ativo atual será desativado.`)) {
                      onActivate(ev.id);
                    }
                  }}
                  className="rounded border border-gray-700 px-2 py-1 text-xs hover:bg-gray-800"
                >
                  Ativar
                </button>
              )}
            </div>
          ))}
        </div>

        <h3 className="mb-2 text-sm font-medium text-gray-400">Criar novo evento</h3>
        <input
          type="text"
          placeholder="Nome do evento (ex: Café Cursor — 2ª edição)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-white focus:outline-none"
        />
        <label className="mb-4 flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={setActive}
            onChange={(e) => setSetActive(e.target.checked)}
          />
          Ativar imediatamente (desativa o evento ativo atual)
        </label>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-700 py-3 hover:bg-gray-800"
          >
            Fechar
          </button>
          <button
            onClick={() => name.trim() && onCreate(name.trim(), setActive)}
            className="flex-1 rounded-lg bg-white py-3 font-medium text-black hover:opacity-90"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build + verificação visual**

```bash
npx tsc --noEmit && npm run build
```

Expected: build sem erros. Com `npm run dev` rodando, abrir `http://localhost:5000/admin/dashboard`, logar, e confirmar: seletor mostra os eventos, modal cria/ativa evento, lista de usuários muda ao trocar o evento no seletor.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/dashboard/route.ts app/admin/dashboard/page.tsx
git commit -m "feat(admin): event selector, management modal and per-event dashboard"
```

---

### Task 7: Validação end-to-end (cenários do spec §6)

**Files:** nenhum (verificação). Requer `npm run dev` rodando com o banco local seedado e cookie admin em `/tmp/admin.jar` (Task 4 Step 4).

- [ ] **Step 1: Montar o cenário multi-evento**

```bash
# Evento "antigo" = Evento Seed (local), ativo neste momento.
# 1. check-in + claim do repetente no evento antigo:
UID=$(psql cafe_cursor_dev -tA -c "SELECT id FROM \"EligibleUser\" WHERE email='test@example.com';")
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/actions \
  -H 'Content-Type: application/json' -d "{\"action\":\"CHECK_IN_USER\",\"data\":{\"userId\":\"$UID\"}}"
curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User 1","email":"test@example.com"}' | grep -o '"credit":"[^"]*"'
# guardar o link retornado (CLAIM ANTIGO)
```

Expected: claim retorna um link `TEST-CREDIT-...`.

- [ ] **Step 2: Criar e ativar o evento de hoje, importar lista com o repetente**

```bash
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/actions \
  -H 'Content-Type: application/json' \
  -d '{"action":"ADD_EVENT","data":{"name":"Evento Hoje","setActive":true}}'
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/upload-guests \
  -H 'Content-Type: application/json' \
  -d '{"csvContent":"email,name,approval_status\ntest@example.com,Test User 1,approved\nsonovo@ex.com,So Novo,approved"}'
```

Expected: `inserted: 2` (repetente entra de novo porque o unique é por evento).

- [ ] **Step 3: Cenário 1 do spec — só evento antigo → bloqueado**

```bash
curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"Test User 2","email":"test2@example.com"}'
```

Expected: `"code":"NOT_ELIGIBLE"` (test2 está só no evento seed, agora inativo).

- [ ] **Step 4: Cenários 2 e 3 — novo participante e repetente resgatam no evento de hoje**

```bash
for EMAIL in sonovo@ex.com test@example.com; do
  UID=$(psql cafe_cursor_dev -tA -c "SELECT id FROM \"EligibleUser\" e JOIN \"Event\" ev ON e.\"eventId\"=ev.id WHERE e.email='$EMAIL' AND ev.name='Evento Hoje';")
  curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/actions \
    -H 'Content-Type: application/json' -d "{\"action\":\"CHECK_IN_USER\",\"data\":{\"userId\":\"$UID\"}}" > /dev/null
  curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
    -d "{\"name\":\"X\",\"email\":\"$EMAIL\"}" | grep -o '"credit":"[^"]*"'
done
psql cafe_cursor_dev -c "SELECT e.email, ev.name, e.\"hasClaimed\", c.code FROM \"EligibleUser\" e JOIN \"Event\" ev ON e.\"eventId\"=ev.id LEFT JOIN \"Credit\" c ON e.\"creditId\"=c.id WHERE e.email IN ('test@example.com','sonovo@ex.com') ORDER BY e.email, ev.name;"
```

Expected: ambos recebem link; o repetente `test@example.com` tem **dois** registros — o claim antigo intacto no "Evento Seed (local)" e um credit **diferente** no "Evento Hoje". `sonovo@ex.com` recebeu credit real (não-test), pois company é null.

- [ ] **Step 5: Cenário 5 — sem evento ativo**

```bash
psql cafe_cursor_dev -c 'UPDATE "Event" SET "isActive" = false;'
curl -s -X POST localhost:5000/api/register -H 'Content-Type: application/json' \
  -d '{"name":"X","email":"sonovo@ex.com"}'
curl -s -b /tmp/admin.jar -X POST localhost:5000/api/admin/upload-guests \
  -H 'Content-Type: application/json' -d '{"csvContent":"email,name\na@b.com,AB"}'
```

Expected: register → `"code":"NO_ACTIVE_EVENT"` (503); upload → erro "Nenhum evento ativo".

- [ ] **Step 6: Build final e push**

```bash
npm run build && git log --oneline master -8
git push
```

Expected: build limpo. Push dispara deploy na Vercel — **combinar com o usuário a janela**: o SQL de migração (`scripts/migrate-events.sql`) precisa rodar no Supabase **antes** do deploy novo ir ao ar (o código novo exige a coluna `eventId`). Sequência recomendada: rodar SQL no Supabase → push/deploy → criar+ativar evento de hoje no admin → importar Luma → subir cupons.

---

## Self-Review (executado na escrita do plano)

- **Cobertura do spec:** §1 schema → Task 1; §2 migração → Task 2; §3 register → Task 3; §4 admin (eventos, import, add manual, dashboard) → Tasks 4-6; §6 validação → Task 7. Fora de escopo respeitado (credits/upload-credits intocados).
- **Consistência de tipos:** `email_eventId` usado em Tasks 3, 4 e 5; `ADD_EVENT`/`SET_ACTIVE_EVENT` definidos na Task 5 e consumidos na Task 6; `events`/`selectedEventId` produzidos no Step 1 da Task 6 e consumidos nos steps seguintes.
- **Riscos conhecidos:** entre a Task 1 e a Task 5 o typecheck falha (call sites antigos) — intencional e documentado; push só na Task 7. Migração de prod exige ordem SQL→deploy (Task 7 Step 6).
