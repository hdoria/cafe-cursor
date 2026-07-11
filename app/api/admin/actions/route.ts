import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth";
import { sendCreditEmail } from "@/lib/email";

/**
 * POST /api/admin/actions - Ejecutar acciones administrativas
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, data } = body;

    console.log(`⚡ [ADMIN] Acción: ${action}`);

    switch (action) {
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

        if (!eligibleUser) {
          return NextResponse.json(
            { error: "Usuario no encontrado" },
            { status: 404 }
          );
        }

        if (eligibleUser.hasClaimed) {
          return NextResponse.json(
            { error: "El usuario ya tiene un crédito asignado" },
            { status: 400 }
          );
        }

        // Buscar crédito disponible
        const credit = await prisma.credit.findFirst({
          where: {
            isUsed: false,
            isTest: useTestCredit || false,
          },
          orderBy: { createdAt: "asc" },
        });

        if (!credit) {
          return NextResponse.json(
            { error: "No hay créditos disponibles" },
            { status: 400 }
          );
        }

        // Asignar crédito
        await prisma.$transaction([
          prisma.eligibleUser.update({
            where: { id: eligibleUser.id },
            data: {
              hasClaimed: true,
              claimedAt: new Date(),
              creditId: credit.id,
            },
          }),
          prisma.credit.update({
            where: { id: credit.id },
            data: {
              isUsed: true,
              assignedAt: new Date(),
            },
          }),
        ]);

        console.log(`✅ [ADMIN] Crédito asignado manualmente: ${email} -> ${credit.code}`);

        return NextResponse.json({
          success: true,
          message: `Crédito ${credit.code} asignado a ${email}`,
          credit: credit.link,
        });
      }

      case "REVOKE_CREDIT": {
        // Revocar crédito de un usuario
        const { userId } = data;

        const user = await prisma.eligibleUser.findUnique({
          where: { id: userId },
          include: { credit: true },
        });

        if (!user) {
          return NextResponse.json(
            { error: "Usuario no encontrado" },
            { status: 404 }
          );
        }

        if (!user.hasClaimed || !user.creditId) {
          return NextResponse.json(
            { error: "El usuario no tiene crédito asignado" },
            { status: 400 }
          );
        }

        // Revocar crédito
        await prisma.$transaction([
          prisma.eligibleUser.update({
            where: { id: userId },
            data: {
              hasClaimed: false,
              claimedAt: null,
              creditId: null,
            },
          }),
          prisma.credit.update({
            where: { id: user.creditId },
            data: {
              isUsed: false,
              assignedAt: null,
            },
          }),
        ]);

        console.log(`🔄 [ADMIN] Crédito revocado: ${user.email}`);

        return NextResponse.json({
          success: true,
          message: `Crédito revocado de ${user.email}`,
        });
      }

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

      case "UPDATE_USER_STATUS": {
        // Actualizar estado de aprobación de usuario
        const { userId, approvalStatus } = data;

        await prisma.eligibleUser.update({
          where: { id: userId },
          data: { approvalStatus },
        });

        console.log(`📝 [ADMIN] Estado de usuario actualizado: ${userId} -> ${approvalStatus}`);

        return NextResponse.json({
          success: true,
          message: `Estado actualizado a ${approvalStatus}`,
        });
      }

      case "ADD_CREDIT": {
        // Agregar crédito manualmente
        const { code, link, isTest } = data;

        const existing = await prisma.credit.findFirst({
          where: { code },
        });

        if (existing) {
          return NextResponse.json(
            { error: "El código de crédito ya existe" },
            { status: 400 }
          );
        }

        const newCredit = await prisma.credit.create({
          data: {
            code,
            link,
            isTest: isTest || false,
          },
        });

        console.log(`➕ [ADMIN] Crédito agregado: ${code}`);

        return NextResponse.json({
          success: true,
          message: `Crédito ${code} agregado`,
          credit: newCredit,
        });
      }

      case "DELETE_CREDIT": {
        // Eliminar crédito (solo si no está asignado)
        const { creditId } = data;

        const credit = await prisma.credit.findUnique({
          where: { id: creditId },
        });

        if (!credit) {
          return NextResponse.json(
            { error: "Crédito no encontrado" },
            { status: 404 }
          );
        }

        if (credit.isUsed) {
          return NextResponse.json(
            { error: "No se puede eliminar un crédito asignado" },
            { status: 400 }
          );
        }

        await prisma.credit.delete({
          where: { id: creditId },
        });

        console.log(`🗑️ [ADMIN] Crédito eliminado: ${credit.code}`);

        return NextResponse.json({
          success: true,
          message: `Crédito ${credit.code} eliminado`,
        });
      }

      case "CHECK_IN_USER": {
        // Fazer check-in de um usuário no evento
        const { userId } = data;

        const user = await prisma.eligibleUser.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return NextResponse.json(
            { error: "Usuário não encontrado" },
            { status: 404 }
          );
        }

        if (user.hasCheckedIn) {
          return NextResponse.json(
            { error: "Usuário já fez check-in" },
            { status: 400 }
          );
        }

        await prisma.eligibleUser.update({
          where: { id: userId },
          data: {
            hasCheckedIn: true,
            checkedInAt: new Date(),
          },
        });

        console.log(`✅ [ADMIN] Check-in realizado: ${user.email}`);

        return NextResponse.json({
          success: true,
          message: `Check-in realizado para ${user.email}`,
        });
      }

      case "UNDO_CHECK_IN": {
        // Desfazer check-in de um usuário
        const { userId } = data;

        const user = await prisma.eligibleUser.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return NextResponse.json(
            { error: "Usuário não encontrado" },
            { status: 404 }
          );
        }

        if (!user.hasCheckedIn) {
          return NextResponse.json(
            { error: "Usuário não fez check-in" },
            { status: 400 }
          );
        }

        await prisma.eligibleUser.update({
          where: { id: userId },
          data: {
            hasCheckedIn: false,
            checkedInAt: null,
          },
        });

        console.log(`↩️ [ADMIN] Check-in desfeito: ${user.email}`);

        return NextResponse.json({
          success: true,
          message: `Check-in desfeito para ${user.email}`,
        });
      }

      case "TOGGLE_CREDIT_USED": {
        const { creditId } = data;

        const credit = await prisma.credit.findUnique({
          where: { id: creditId },
          include: { assignedTo: true },
        });

        if (!credit) {
          return NextResponse.json(
            { error: "Crédito não encontrado" },
            { status: 404 }
          );
        }

        const newState = !credit.isUsed;
        const newLabel = newState ? "usado" : "disponível";

        if (credit.isUsed && credit.assignedTo) {
          await prisma.$transaction([
            prisma.eligibleUser.update({
              where: { id: credit.assignedTo.id },
              data: {
                hasClaimed: false,
                claimedAt: null,
                creditId: null,
              },
            }),
            prisma.credit.update({
              where: { id: creditId },
              data: {
                isUsed: false,
                assignedAt: null,
              },
            }),
          ]);
        } else if (credit.isUsed) {
          await prisma.credit.update({
            where: { id: creditId },
            data: {
              isUsed: false,
              assignedAt: null,
            },
          });
        } else {
          await prisma.credit.update({
            where: { id: creditId },
            data: {
              isUsed: true,
              assignedAt: new Date(),
            },
          });
        }

        console.log(`🔄 [ADMIN] Crédito ${credit.code} marcado como ${newLabel}`);

        return NextResponse.json({
          success: true,
          message: `Crédito ${credit.code} marcado como ${newLabel}`,
        });
      }

      case "SEND_CREDIT_EMAIL": {
        // Enviar/reenviar email con el link del crédito
        const { userId, locale } = data;

        const user = await prisma.eligibleUser.findUnique({
          where: { id: userId },
          include: { credit: true },
        });

        if (!user) {
          return NextResponse.json(
            { error: "Usuario no encontrado" },
            { status: 404 }
          );
        }

        if (!user.hasClaimed || !user.credit) {
          return NextResponse.json(
            { error: "El usuario no tiene crédito asignado" },
            { status: 400 }
          );
        }

        // Enviar email
        const emailResult = await sendCreditEmail({
          to: user.email,
          name: user.name,
          creditLink: user.credit.link,
          creditCode: user.credit.code,
          company: user.company || undefined,
          isTest: user.credit.isTest,
          locale: locale || "pt-BR",
        });

        if (!emailResult.success) {
          console.error(`❌ [ADMIN] Error enviando email a ${user.email}:`, emailResult.error);
          return NextResponse.json(
            { error: `Error enviando email: ${emailResult.error}` },
            { status: 500 }
          );
        }

        console.log(`📧 [ADMIN] Email enviado manualmente a: ${user.email}`);

        return NextResponse.json({
          success: true,
          message: `Email enviado a ${user.email}`,
        });
      }

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

      default:
        return NextResponse.json(
          { error: "Acción no válida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ [ADMIN] Error ejecutando acción:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
