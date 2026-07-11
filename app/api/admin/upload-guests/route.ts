import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { csvContent } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "Conteúdo CSV requerido" },
        { status: 400 }
      );
    }

    const activeEvent = await prisma.event.findFirst({
      where: { isActive: true },
    });

    if (!activeEvent) {
      return NextResponse.json(
        { error: "Nenhum evento ativo. Crie e ative um evento antes de importar guests." },
        { status: 400 }
      );
    }

    const lines = csvContent
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV deve ter cabeçalho e pelo menos uma linha de dados" },
        { status: 400 }
      );
    }

    // Parse header to find column indices
    const header = parseCSVLine(lines[0]);
    const emailIdx = header.findIndex((h) => h.toLowerCase() === "email");
    const nameIdx = header.findIndex((h) => h.toLowerCase() === "name");
    const firstNameIdx = header.findIndex((h) => h.toLowerCase() === "first_name");
    const lastNameIdx = header.findIndex((h) => h.toLowerCase() === "last_name");
    const statusIdx = header.findIndex((h) => h.toLowerCase() === "approval_status");

    if (emailIdx === -1) {
      return NextResponse.json(
        { error: "Coluna 'email' não encontrada no CSV" },
        { status: 400 }
      );
    }

    const guests: { email: string; name: string }[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const email = cols[emailIdx]?.toLowerCase().trim();

      if (!email || !email.includes("@")) {
        errors.push(`Linha ${i + 1}: Email inválido`);
        continue;
      }

      // Check approval status - only import approved guests
      const status = statusIdx !== -1 ? cols[statusIdx]?.toLowerCase() : "approved";
      if (status && status !== "approved") {
        errors.push(`Linha ${i + 1}: ${email} não está aprovado (${status})`);
        continue;
      }

      // Get name from name column or combine first/last name
      let name = nameIdx !== -1 ? cols[nameIdx] : "";
      if (!name && firstNameIdx !== -1) {
        const firstName = cols[firstNameIdx] || "";
        const lastName = lastNameIdx !== -1 ? cols[lastNameIdx] || "" : "";
        name = `${firstName} ${lastName}`.trim();
      }

      if (!name) {
        name = email.split("@")[0];
      }

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

      guests.push({ email, name });
    }

    let inserted = 0;
    for (const guest of guests) {
      try {
        await prisma.eligibleUser.create({
          data: {
            email: guest.email,
            name: guest.name,
            eventId: activeEvent.id,
          },
        });
        inserted++;
      } catch (err) {
        errors.push(`Erro ao inserir ${guest.email}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} guests importados para "${activeEvent.name}"`,
      inserted,
      total: lines.length - 1,
      skipped: lines.length - 1 - inserted,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Erro no upload de guests:", error);
    return NextResponse.json(
      { error: "Erro ao processar CSV" },
      { status: 500 }
    );
  }
}
