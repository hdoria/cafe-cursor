import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const checkinSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
});

/**
 * POST /api/checkin
 * Self check-in: o convidado escaneia o QR na tela e confirma presença com o email da inscrição.
 * Só funciona para quem está na lista aprovada do evento ativo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Email inválido", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }
    const email = parsed.data.email;

    const activeEvent = await prisma.event.findFirst({ where: { isActive: true } });
    if (!activeEvent) {
      return NextResponse.json(
        { success: false, error: "Nenhum evento ativo no momento.", code: "NO_ACTIVE_EVENT" },
        { status: 503 }
      );
    }

    const user = await prisma.eligibleUser.findUnique({
      where: { email_eventId: { email, eventId: activeEvent.id } },
    });

    if (!user) {
      console.log(`❌ [CHECKIN] Email não elegível: ${email}`);
      return NextResponse.json(
        { success: false, error: "Este email não está na lista do evento.", code: "NOT_ELIGIBLE" },
        { status: 403 }
      );
    }

    if (user.approvalStatus !== "approved") {
      return NextResponse.json(
        { success: false, error: "Inscrição ainda não aprovada.", code: "NOT_APPROVED" },
        { status: 403 }
      );
    }

    if (!user.hasCheckedIn) {
      await prisma.eligibleUser.update({
        where: { id: user.id },
        data: { hasCheckedIn: true, checkedInAt: new Date() },
      });
      console.log(`✅ [CHECKIN] Self check-in: ${email} (${activeEvent.name})`);
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: user.hasCheckedIn,
      user: { name: user.name, email: user.email },
      event: { name: activeEvent.name },
    });
  } catch (error) {
    console.error("❌ [CHECKIN] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
