import { Response } from "express";

type Client = {
  userId: string;
  res: Response;
};

const clients: Client[] = [];

export class SSEService {
  static addClient(userId: string, res: Response) {
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
