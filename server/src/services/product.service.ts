import prisma from "../config/prisma.js";
import { AuditService } from "./audit.service.js";
import { NotificationService } from "./notification.service.js";

const sellerSelect = { id: true, firstName: true, lastName: true, username: true, profileImage: true };

export class ProductService {
  static async createProduct(sellerId: string, sellerName: string, data: {
    name: string;
    image?: string;
    description?: string;
    price: number;
    stock: number;
    currency?: string;
  }) {
    const product = await prisma.product.create({
      data: {
        name: data.name,
        image: data.image,
        description: data.description,
        price: data.price,
        stock: data.stock,
        currency: data.currency || "DT",
        sellerId,
      },
      include: { seller: { select: sellerSelect } },
    });

    await AuditService.log({
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      userId: sellerId,
      userName: sellerName,
      details: `${data.name} — ${data.price} DT, stock: ${data.stock}`,
    });

    return product;
  }

  static async updateProduct(productId: string, sellerId: string, sellerName: string, data: {
    name?: string;
    image?: string;
    description?: string;
    price?: number;
    stock?: number;
    isActive?: boolean;
  }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId) throw new Error("Not your product");

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { seller: { select: sellerSelect } },
    });

    const changes = Object.entries(data).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`).join(", ");
    await AuditService.log({
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: productId,
      userId: sellerId,
      userName: sellerName,
      details: `${updated.name} — ${changes}`,
    });

    return updated;
  }

  static async deleteProduct(productId: string, sellerId: string, sellerName: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId) throw new Error("Not your product");

    // Delete related purchases first
    await prisma.purchase.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });

    await AuditService.log({
      action: "PRODUCT_DELETED",
      entity: "Product",
      entityId: productId,
      userId: sellerId,
      userName: sellerName,
      details: `${product.name}`,
    });
  }

  static async getProducts() {
    return prisma.product.findMany({
      where: { isActive: true },
      include: {
        seller: { select: sellerSelect },
        _count: { select: { purchases: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getSellerProducts(sellerId: string) {
    return prisma.product.findMany({
      where: { sellerId },
      include: { _count: { select: { purchases: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: { select: sellerSelect },
        purchases: { orderBy: { createdAt: "desc" }, take: 20 },
        comments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!product) throw new Error("Product not found");
    return product;
  }

  static async requestPurchase(productId: string, buyerId: string, buyerName: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (!product.isActive) throw new Error("Product is no longer available");
    const remaining = product.stock - product.sold;
    if (remaining <= 0) throw new Error("Product is sold out");

    const existing = await prisma.purchase.findFirst({
      where: { productId, buyerId, status: "PENDING" },
    });
    if (existing) throw new Error("You already have a pending request for this product");

    const purchase = await prisma.purchase.create({
      data: { productId, buyerId, sellerId: product.sellerId },
    });

    await AuditService.log({
      action: "PURCHASE_REQUESTED",
      entity: "Purchase",
      entityId: purchase.id,
      userId: buyerId,
      userName: buyerName,
      details: `${product.name}`,
    });

    NotificationService.onProductPurchase(purchase, product, buyerName).catch(() => {});
    return purchase;
  }

  static async confirmPurchase(purchaseId: string, sellerId: string, sellerName: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.sellerId !== sellerId) throw new Error("Not your purchase");
    if (purchase.status !== "PENDING") throw new Error("Purchase already handled");

    const remaining = purchase.product.stock - purchase.product.sold;
    if (remaining <= 0) {
      await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "SOLD_OUT" } });
      throw new Error("Product is sold out");
    }

    const [updatedPurchase] = await prisma.$transaction([
      prisma.purchase.update({ where: { id: purchaseId }, data: { status: "CONFIRMED" } }),
      prisma.product.update({ where: { id: purchase.productId }, data: { sold: { increment: 1 } } }),
    ]);

    await AuditService.log({
      action: "PURCHASE_CONFIRMED",
      entity: "Purchase",
      entityId: purchaseId,
      userId: sellerId,
      userName: sellerName,
      details: `${purchase.product.name} — buyer: ${purchase.buyerId}`,
    });

    NotificationService.onPurchaseConfirmed(purchase, purchase.product, purchase.buyerId).catch(() => {});
    return updatedPurchase;
  }

  static async cancelPurchase(purchaseId: string, sellerId: string, sellerName: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.sellerId !== sellerId) throw new Error("Not your purchase");
    if (purchase.status !== "PENDING") throw new Error("Purchase already handled");

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "CANCELLED" },
    });

    await AuditService.log({
      action: "PURCHASE_CANCELLED",
      entity: "Purchase",
      entityId: purchaseId,
      userId: sellerId,
      userName: sellerName,
      details: `${purchase.product.name}`,
    });

    NotificationService.onPurchaseCancelled(purchase, purchase.product, purchase.buyerId).catch(() => {});
    return updated;
  }

  static async getProductPurchases(productId: string, sellerId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId) throw new Error("Not your product");

    const purchases = await prisma.purchase.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });
    const buyerIds = [...new Set(purchases.map(p => p.buyerId))];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: sellerSelect,
    });
    const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));
    return purchases.map(p => ({ ...p, buyer: buyerMap[p.buyerId] || null }));
  }

  static async getBuyerPurchases(buyerId: string) {
    return prisma.purchase.findMany({
      where: { buyerId },
      include: { product: { include: { seller: { select: sellerSelect } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getSellerAllPurchases(sellerId: string) {
    const purchases = await prisma.purchase.findMany({
      where: { sellerId },
      include: {
        product: { select: { id: true, name: true, image: true, price: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const buyerIds = [...new Set(purchases.map(p => p.buyerId))];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: sellerSelect,
    });
    const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));
    return purchases.map(p => ({ ...p, buyer: buyerMap[p.buyerId] || null }));
  }

  static async addComment(productId: string, userId: string, userName: string, userRole: string, text: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");

    const comment = await prisma.comment.create({
      data: { text, productId, userId, userName, userRole },
    });

    NotificationService.onProductComment(productId, product, userId, userName).catch(() => {});
    return comment;
  }

  static async getComments(productId: string) {
    return prisma.comment.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });
  }
}
