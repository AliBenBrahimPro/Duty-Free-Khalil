import prisma from "../config/prisma.js";

export class AuditService {
  static async log(data: {
    action: string;
    entity: string;
    entityId?: string;
    userId?: string;
    userName?: string;
    details?: string;
  }) {
    return prisma.auditLog.create({ data });
  }

  static async getLogs(limit = 100, offset = 0) {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, total };
  }
}
