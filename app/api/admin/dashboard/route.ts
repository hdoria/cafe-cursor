import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CREDIT_PAGE_SIZE = 25;

const creditSorts = {
  available: [{ isUsed: "asc" }, { createdAt: "desc" }, { id: "asc" }],
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  oldest: [{ createdAt: "asc" }, { id: "asc" }],
  assigned: [
    { assignedAt: { sort: "desc", nulls: "last" } },
    { createdAt: "desc" },
    { id: "asc" },
  ],
  code: [{ code: "asc" }, { id: "asc" }],
} satisfies Record<string, Prisma.CreditOrderByWithRelationInput[]>;

/**
 * GET /api/admin/dashboard - Obtener datos del dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

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
    const creditSearch = request.nextUrl.searchParams.get("creditSearch")?.trim() || "";
    const creditStatus = request.nextUrl.searchParams.get("creditStatus") || "all";
    const creditType = request.nextUrl.searchParams.get("creditType") || "all";
    const requestedCreditSort =
      request.nextUrl.searchParams.get("creditSort") || "available";
    const creditSort = (
      requestedCreditSort in creditSorts ? requestedCreditSort : "available"
    ) as keyof typeof creditSorts;
    const requestedCreditPage = Number.parseInt(
      request.nextUrl.searchParams.get("creditPage") || "1",
      10
    );
    const creditWhere: Prisma.CreditWhereInput = {};

    if (creditStatus === "available") {
      creditWhere.isUsed = false;
    } else if (creditStatus === "used") {
      creditWhere.isUsed = true;
    }

    if (creditType === "real") {
      creditWhere.isTest = false;
    } else if (creditType === "test") {
      creditWhere.isTest = true;
    }

    if (creditSearch) {
      creditWhere.OR = [
        { code: { contains: creditSearch, mode: "insensitive" } },
        { link: { contains: creditSearch, mode: "insensitive" } },
        {
          assignedTo: {
            is: {
              OR: [
                { email: { contains: creditSearch, mode: "insensitive" } },
                { name: { contains: creditSearch, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

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

    const matchingCredits = await prisma.credit.count({ where: creditWhere });
    const totalCreditPages = Math.max(
      1,
      Math.ceil(matchingCredits / CREDIT_PAGE_SIZE)
    );
    const creditPage = Math.min(
      Math.max(Number.isFinite(requestedCreditPage) ? requestedCreditPage : 1, 1),
      totalCreditPages
    );

    // Créditos com usuários asignados (global), consultados por página
    const credits = await prisma.credit.findMany({
      where: creditWhere,
      orderBy: creditSorts[creditSort],
      include: {
        assignedTo: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      skip: (creditPage - 1) * CREDIT_PAGE_SIZE,
      take: CREDIT_PAGE_SIZE,
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
      creditPagination: {
        page: creditPage,
        pageSize: CREDIT_PAGE_SIZE,
        total: matchingCredits,
        totalPages: matchingCredits === 0 ? 0 : totalCreditPages,
        from: matchingCredits === 0 ? 0 : (creditPage - 1) * CREDIT_PAGE_SIZE + 1,
        to: Math.min(creditPage * CREDIT_PAGE_SIZE, matchingCredits),
      },
      eligibleUsers,
      events,
      selectedEventId,
    });
  } catch (error) {
    console.error("❌ [ADMIN] Error obteniendo dashboard:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
