import { Response } from "express";

type Client = {
  userId: string;
  res: Response;
};

const clients: Client[] = [];
const MAX_CONNECTIONS_PER_USER = 3;

// Periodic dead connection cleanup every 60s
setInterval(() => {
  for (let i = clients.length - 1; i >= 0; i--) {
    try {
      clients[i].res.write(":ping\n\n");
    } catch {
      clients.splice(i, 1);
    }
  }
}, 60_000);

export class SSEService {
  static addClient(userId: string, res: Response) {
    // Enforce max connections per user: close oldest
    const userClients = clients.filter(c => c.userId === userId);
    while (userClients.length >= MAX_CONNECTIONS_PER_USER) {
      const oldest = userClients.shift()!;
      try { oldest.res.end(); } catch { /* already closed */ }
      const idx = clients.indexOf(oldest);
      if (idx !== -1) clients.splice(idx, 1);
    }

    const client: Client = { userId, res };
    clients.push(client);

    res.on("close", () => {
      const idx = clients.indexOf(client);
      if (idx !== -1) clients.splice(idx, 1);
    });
  }

  static sendToUser(userId: string, event: string, data: any) {
    for (const client of clients) {
      if (client.userId === userId) {
        try {
          client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          // client disconnected
        }
      }
    }
  }

  static sendToUsers(userIds: string[], event: string, data: any) {
    for (const uid of userIds) {
      this.sendToUser(uid, event, data);
    }
  }
}
