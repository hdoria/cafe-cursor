-- Migração: suporte multi-evento (executar UMA vez no Supabase SQL editor)
-- Spec: docs/superpowers/specs/2026-07-11-events-design.md
-- Tudo em uma transação: ou aplica inteiro, ou nada.
--
-- ORDEM DE DEPLOY (obrigatória):
--   1. Rodar este script no Supabase (ANTES do deploy do código novo).
--   2. Deploy do código novo.
-- Durante a janela entre 1 e 2: resgates continuam funcionando, mas NÃO usar
-- import de guests nem "adicionar usuário" no admin (o código antigo não
-- preenche eventId e o INSERT falharia).

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
