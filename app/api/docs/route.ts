import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.docCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        articles: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            order: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching docs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar documentação" },
      { status: 500 }
    );
  }
}
