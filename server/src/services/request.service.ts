import prisma from "../config/prisma.js";

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

    return prisma.request.create({
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
  }

  static async setPrice(requestId: string, sellerId: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.sellerId !== sellerId) throw new Error("Not your request");
    if (request.status !== "PENDING_PRICE") throw new Error("Request already handled");
    if (new Date() > request.deadline) {
      await prisma.request.update({ where: { id: requestId }, data: { status: "EXPIRED" } });
      throw new Error("Request has expired");
    }
    return request;
  }

  static async setPriceValue(requestId: string, sellerId: string, price: number) {
    await this.setPrice(requestId, sellerId);
    return prisma.request.update({
      where: { id: requestId },
      data: { price, status: "PRICED" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });
  }

  static async markUnavailable(requestId: string, sellerId: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.sellerId !== sellerId) throw new Error("Not your request");
    if (request.status !== "PENDING_PRICE") throw new Error("Request already handled");

    return prisma.request.update({
      where: { id: requestId },
      data: { status: "UNAVAILABLE" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });
  }

  static async acceptPrice(requestId: string, buyerId: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.buyerId !== buyerId) throw new Error("Not your request");
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

    return { request: updatedRequest, order };
  }

  static async rejectPrice(requestId: string, buyerId: string) {
    const request = await prisma.request.findUnique({ where: { id: requestId } });
    if (!request) throw new Error("Request not found");
    if (request.buyerId !== buyerId) throw new Error("Not your request");
    if (request.status !== "PRICED") throw new Error("No price to reject");

    return prisma.request.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
      include: { buyer: { select: userSelect }, seller: { select: userSelect } },
    });
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
