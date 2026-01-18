import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
            categoryId: true,
          },
        },
      },
    });

    const response = NextResponse.json({ categories });
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return response;
  } catch (error) {
    console.error("Error fetching docs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar documentação" },
      { status: 500 }
    );
  }
}
