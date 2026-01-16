import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

function isAuthenticated(): boolean {
  const cookieStore = cookies();
  return cookieStore.get("admin_session")?.value === "authenticated";
}

export async function POST(request: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { csvContent, isTest = false } = body;

    if (!csvContent || typeof csvContent !== "string") {
      return NextResponse.json(
        { error: "Contenido CSV requerido" },
        { status: 400 }
      );
    }

    const lines = csvContent
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "El archivo CSV está vacío" },
        { status: 400 }
      );
    }

    const credits: { link: string; code: string }[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(",");
      const link = parts[0]?.trim();

      if (!link) {
        errors.push(`Linha ${i + 1}: Link vazio`);
        continue;
      }

      const codeMatch = link.match(/[?&]code=([A-Za-z0-9]+)/);
      if (!codeMatch) {
        errors.push(`Linha ${i + 1}: Código não encontrado no link`);
        continue;
      }

      const code = codeMatch[1];

      const existing = await prisma.credit.findFirst({
        where: { OR: [{ code }, { link }] },
      });

      if (existing) {
        errors.push(`Linha ${i + 1}: Código ${code} já existe`);
        continue;
      }

      credits.push({ link, code });
    }

    let inserted = 0;
    for (const credit of credits) {
      try {
        await prisma.credit.create({
          data: {
            code: credit.code,
            link: credit.link,
            isUsed: false,
            isTest,
          },
        });
        inserted++;
      } catch (err) {
        errors.push(`Erro ao inserir código ${credit.code}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} créditos importados com sucesso`,
      inserted,
      total: lines.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Erro no upload de CSV:", error);
    return NextResponse.json(
      { error: "Erro ao processar CSV" },
      { status: 500 }
    );
  }
}
