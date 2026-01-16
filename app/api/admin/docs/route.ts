import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const categories = await prisma.docCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        articles: {
          orderBy: { order: "asc" },
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

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, data } = body;

    if (action === "createCategory") {
      const { name, slug } = data;
      const maxOrder = await prisma.docCategory.aggregate({
        _max: { order: true },
      });
      const category = await prisma.docCategory.create({
        data: {
          name,
          slug,
          order: (maxOrder._max.order || 0) + 1,
        },
      });
      return NextResponse.json({ category });
    }

    if (action === "updateCategory") {
      const { id, name, slug, order } = data;
      const category = await prisma.docCategory.update({
        where: { id },
        data: { name, slug, order },
      });
      return NextResponse.json({ category });
    }

    if (action === "deleteCategory") {
      const { id } = data;
      await prisma.docCategory.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (action === "createArticle") {
      const { title, slug, content, categoryId, isPublished } = data;
      const maxOrder = await prisma.docArticle.aggregate({
        where: { categoryId },
        _max: { order: true },
      });
      const article = await prisma.docArticle.create({
        data: {
          title,
          slug,
          content,
          categoryId,
          isPublished: isPublished ?? true,
          order: (maxOrder._max.order || 0) + 1,
        },
      });
      return NextResponse.json({ article });
    }

    if (action === "updateArticle") {
      const { id, title, slug, content, categoryId, isPublished, order } = data;
      const article = await prisma.docArticle.update({
        where: { id },
        data: { title, slug, content, categoryId, isPublished, order },
      });
      return NextResponse.json({ article });
    }

    if (action === "deleteArticle") {
      const { id } = data;
      await prisma.docArticle.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Error managing docs:", error);
    return NextResponse.json(
      { error: "Erro ao gerenciar documentação" },
      { status: 500 }
    );
  }
}
