import prisma from "../config/prisma.js";
import { AuditService } from "./audit.service.js";
import { NotificationService } from "./notification.service.js";

const userSelect = { id: true, firstName: true, lastName: true, username: true, profileImage: true };

export class RequestService {
  static async createRequest(
    buyerId: string,
    sellerId: string,
    data: { productName?: string; productImage?: string; description?: string }
  ) {
    if (!data.productName && !data.productImage) {
      throw new Error("Product name or image is required");
    }

    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller || seller.role !== "SELLER") {
      throw new Error("Invalid seller");
    }

    const created = await prisma.request.create({
      data: {
        productName: data.productName,
        productImage: data.productImage,
        description: data.description,
        buyerId,
        sellerId,
        deadline: new Date(process.env.DEADLINE_DATE || "2026-07-08T23:59:59.000Z"),
      },
      include: {
        buyer: { select: userSelect },
        seller: { select: userSelect },
      },
    });

    NotificationService.onRequestCreated(created).catch(() => {});
    return created;
  }

  static async setPriceValue(requestId: string, userId: string, role: string, price: number) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (role !== "SUPERADMIN" && request.sellerId !== userId) throw new Error("Not your request");
    if (request.status !== "PENDING_PRICE") throw new Error("Request already handled");
    if (new Date() > request.deadline) {
      await prisma.request.update({ where: { id: requestId }, data: { status: "EXPIRED" } });
      throw new Error("Request has expired");
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { price, status: "PRICED" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });

    await AuditService.log({ action: "REQUEST_PRICED", entity: "Request", entityId: requestId, userId, details: `${updated.productName} — ${price} DT` });
    NotificationService.onRequestPriced(updated).catch(() => {});
    return updated;
  }

  static async markUnavailable(requestId: string, userId: string, role: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (role !== "SUPERADMIN" && request.sellerId !== userId) throw new Error("Not your request");
    if (request.status !== "PENDING_PRICE") throw new Error("Request already handled");

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { status: "UNAVAILABLE" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });

    await AuditService.log({ action: "REQUEST_UNAVAILABLE", entity: "Request", entityId: requestId, userId, details: updated.productName || "" });
    NotificationService.onRequestUnavailable(updated).catch(() => {});
    return updated;
  }

  static async acceptPrice(requestId: string, userId: string, role: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (role !== "SUPERADMIN" && request.buyerId !== userId) throw new Error("Not your request");
    if (request.status !== "PRICED") throw new Error("No price to accept");
    if (new Date() > request.deadline) {
      await prisma.request.update({ where: { id: requestId }, data: { status: "EXPIRED" } });
      throw new Error("Request has expired");
    }

    const [updatedRequest, order] = await prisma.$transaction([
      prisma.request.update({ where: { id: requestId }, data: { status: "CONFIRMED" } }),
      prisma.order.create({
        data: {
          price: request.price!,
          currency: request.currency,
          requestId: request.id,
          buyerId: request.buyerId,
          sellerId: request.sellerId,
        },
      }),
    ]);

    await AuditService.log({ action: "REQUEST_CONFIRMED", entity: "Request", entityId: requestId, userId, details: `${request.productName} — ${request.price} DT` });
    NotificationService.onRequestAccepted(request).catch(() => {});
    return { request: updatedRequest, order };
  }

  static async rejectPrice(requestId: string, userId: string, role: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (role !== "SUPERADMIN" && request.buyerId !== userId) throw new Error("Not your request");
    if (request.status !== "PRICED") throw new Error("No price to reject");

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });

    await AuditService.log({ action: "REQUEST_REJECTED", entity: "Request", entityId: requestId, userId, details: updated.productName || "" });
    NotificationService.onRequestRejected(updated).catch(() => {});
    return updated;
  }

  static async deleteRequest(requestId: string, userId: string, role: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (role !== "SUPERADMIN" && request.buyerId !== userId && request.sellerId !== userId) {
      throw new Error("Access denied");
    }

    // Delete related records
    await prisma.requestComment.deleteMany({ where: { requestId } });
    await prisma.order.deleteMany({ where: { requestId } });
    await prisma.request.delete({ where: { id: requestId } });

    await AuditService.log({ action: "REQUEST_DELETED", entity: "Request", entityId: requestId, userId, details: request.productName || "" });
  }

  static async getUserRequests(userId: string, role: string) {
    // SUPERADMIN sees all requests
    const where =
      role === "SUPERADMIN"
        ? {}
        : role === "SELLER"
          ? { sellerId: userId }
          : { buyerId: userId };

    return prisma.request.findMany({
      where,
      include: {
        buyer: { select: userSelect },
        seller: { select: userSelect },
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getRequest(requestId: string, userId: string, role: string = "BUYER") {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        buyer: { select: userSelect },
        seller: { select: userSelect },
        order: true,
        comments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!request) throw new Error("Request not found");
    // SUPERADMIN can see any request
    if (role !== "SUPERADMIN" && request.buyerId !== userId && request.sellerId !== userId) {
      throw new Error("Access denied");
    }
    return request;
  }

  static async getSellers() {
    return prisma.user.findMany({
      where: { role: "SELLER" },
      select: userSelect,
    });
  }

  static async addComment(requestId: string, userId: string, userName: string, userRole: string, text: string, media?: { type: string; image?: string; audio?: string }) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");

    const comment = await prisma.requestComment.create({
      data: {
        text,
        type: media?.type || "text",
        image: media?.image,
        audio: media?.audio,
        requestId, userId, userName, userRole,
      },
    });

    NotificationService.onRequestComment(requestId, request, userId, userName).catch(() => {});
    return comment;
  }

  static async getComments(requestId: string) {
    return prisma.requestComment.findMany({
      where: { requestId },
      orderBy: { createdAt: "asc" },
    });
  }

  static async expireOverdueRequests() {
    const now = new Date();
    return prisma.request.updateMany({
      where: {
        deadline: { lt: now },
        status: { in: ["PENDING_PRICE", "PRICED"] },
      },
      data: { status: "EXPIRED" },
    });
  }
}
