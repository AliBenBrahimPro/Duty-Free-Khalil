import prisma from "../config/prisma.js";

const sellerSelect = { id: true, firstName: true, lastName: true, username: true, profileImage: true };

export class ProductService {
  // Seller adds a product
  static async createProduct(sellerId: string, data: {
    name: string;
    image?: string;
    description?: string;
    price: number;
    stock: number;
    currency?: string;
  }) {
    return prisma.product.create({
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
  }

  // Seller updates a product
  static async updateProduct(productId: string, sellerId: string, data: {
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

    return prisma.product.update({
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
  }

  // Browse all available products (any user)
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

  // Get seller's own products
  static async getSellerProducts(sellerId: string) {
    return prisma.product.findMany({
      where: { sellerId },
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Get single product
  static async getProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: { select: sellerSelect },
        purchases: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });
    if (!product) throw new Error("Product not found");
    return product;
  }

  // Buyer requests to buy a product
  static async requestPurchase(productId: string, buyerId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (!product.isActive) throw new Error("Product is no longer available");

    const remaining = product.stock - product.sold;
    if (remaining <= 0) throw new Error("Product is sold out");

    // Check if buyer already has a pending purchase for this product
    const existing = await prisma.purchase.findFirst({
      where: {
        productId,
        buyerId,
        status: "PENDING",
      },
    });
    if (existing) throw new Error("You already have a pending request for this product");

    return prisma.purchase.create({
      data: {
        productId,
        buyerId,
        sellerId: product.sellerId,
      },
    });
  }

  // Seller confirms a purchase (decrements stock)
  static async confirmPurchase(purchaseId: string, sellerId: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: true },
    });
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.sellerId !== sellerId) throw new Error("Not your purchase");
    if (purchase.status !== "PENDING") throw new Error("Purchase already handled");

    const remaining = purchase.product.stock - purchase.product.sold;
    if (remaining <= 0) {
      // Sold out — cancel this purchase
      await prisma.purchase.update({
        where: { id: purchaseId },
        data: { status: "SOLD_OUT" },
      });
      throw new Error("Product is sold out");
    }

    // Confirm purchase and increment sold count
    const [updatedPurchase] = await prisma.$transaction([
      prisma.purchase.update({
        where: { id: purchaseId },
        data: { status: "CONFIRMED" },
      }),
      prisma.product.update({
        where: { id: purchase.productId },
        data: { sold: { increment: 1 } },
      }),
    ]);

    return updatedPurchase;
  }

  // Seller cancels a purchase
  static async cancelPurchase(purchaseId: string, sellerId: string) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new Error("Purchase not found");
    if (purchase.sellerId !== sellerId) throw new Error("Not your purchase");
    if (purchase.status !== "PENDING") throw new Error("Purchase already handled");

    return prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: "CANCELLED" },
    });
  }

  // Get purchases for a product (seller view)
  static async getProductPurchases(productId: string, sellerId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");
    if (product.sellerId !== sellerId) throw new Error("Not your product");

    const purchases = await prisma.purchase.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    // Get buyer info for each purchase
    const buyerIds = [...new Set(purchases.map(p => p.buyerId))];
    const buyers = await prisma.user.findMany({
      where: { id: { in: buyerIds } },
      select: sellerSelect,
    });
    const buyerMap = Object.fromEntries(buyers.map(b => [b.id, b]));

    return purchases.map(p => ({
      ...p,
      buyer: buyerMap[p.buyerId] || null,
    }));
  }

  // Get buyer's purchases
  static async getBuyerPurchases(buyerId: string) {
    return prisma.purchase.findMany({
      where: { buyerId },
      include: {
        product: {
          include: { seller: { select: sellerSelect } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
