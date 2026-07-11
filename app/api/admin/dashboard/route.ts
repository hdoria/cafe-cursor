import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";

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
  } catch (error) {
    console.error("❌ [ADMIN] Error obteniendo dashboard:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
