import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { env } from '../config/env';
import { User } from '../models/User';
import { OrderModel } from '../models/Order';

type SocketUser = {
  id: string;
  email: string;
  role: 'admin' | 'customer';
};

type AuthMessage = {
  type: 'auth';
  token: string;
};

type SubscribeMessage = {
  type: 'subscribe';
  channel: 'order';
  orderId: string;
};

type ClientMessage = AuthMessage | SubscribeMessage;

type ClientState = {
  user?: SocketUser;
  orderId?: string;
  authenticated: boolean;
};

const clients = new Map<WebSocket, ClientState>();

function send(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function close(socket: WebSocket, code: number, reason: string): void {
  try {
    socket.close(code, reason);
  } catch {
    socket.terminate();
  }
}

async function authenticate(token: string): Promise<SocketUser | null> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id?: string;
      email?: string;
      role?: 'admin' | 'customer';
    };

    if (!decoded?.id) return null;

    const user = await User.findById(decoded.id).select('email role');
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

async function canAccessOrder(user: SocketUser, orderId: string): Promise<boolean> {
  const order = await OrderModel.findById(orderId).select('user_id');
  if (!order) return false;
  return user.role === 'admin' || order.user_id === user.id;
}

function parseMessage(raw: Buffer | ArrayBuffer | Buffer[]): ClientMessage | null {
  try {
    const text = Buffer.isBuffer(raw)
      ? raw.toString('utf8')
      : Buffer.from(raw as any).toString('utf8');

    if (text.length > 8_192) return null;

    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed.type !== 'string') return null;

    return parsed as ClientMessage;
  } catch {
    return null;
  }
}

export function setupOrderWebSocket(server: import('http').Server): void {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 8 * 1024,
  });

  server.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');

    if (!url.pathname.startsWith('/ws/orders/')) {
      socket.destroy();
      return;
    }

    const orderId = url.pathname.slice('/ws/orders/'.length);

    if (!orderId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, orderId);
    });
  });

  wss.on('connection', (socket: WebSocket, _request: IncomingMessage, orderId: string) => {
    const state: ClientState = {
      authenticated: false,
      orderId,
    };

    clients.set(socket, state);

    send(socket, {
      type: 'connected',
      channel: 'order',
      orderId,
      requiresAuth: true,
    });

    socket.on('message', async (raw) => {
      const message = parseMessage(raw);
      if (!message) {
        close(socket, 1003, 'Invalid message');
        return;
      }

      if (message.type === 'auth') {
        if (!message.token || typeof message.token !== 'string') {
          close(socket, 1008, 'Authentication required');
          return;
        }

        const user = await authenticate(message.token);
        if (!user) {
          close(socket, 1008, 'Invalid or expired token');
          return;
        }

        state.user = user;
        state.authenticated = true;

        if (!(await canAccessOrder(user, orderId))) {
          close(socket, 1008, 'Order access denied');
          return;
        }

        const order = await OrderModel.findById(orderId);
        if (!order) {
          close(socket, 1008, 'Order not found');
          return;
        }

        send(socket, {
          type: 'authenticated',
          channel: 'order',
          orderId,
          data: order,
        });
        return;
      }

      if (message.type === 'subscribe') {
        if (!state.authenticated || !state.user) {
          close(socket, 1008, 'Authenticate before subscribing');
          return;
        }

        if (message.channel !== 'order' || message.orderId !== orderId) {
          close(socket, 1008, 'Invalid subscription');
          return;
        }

        if (!(await canAccessOrder(state.user, orderId))) {
          close(socket, 1008, 'Order access denied');
          return;
        }

        state.orderId = orderId;

        send(socket, {
          type: 'subscribed',
          channel: 'order',
          orderId,
        });
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  });

  const heartbeat = setInterval(() => {
    for (const socket of clients.keys()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.ping();
      }
    }
  }, 30_000);

  heartbeat.unref();
}

export function broadcastOrderUpdate(order: any): void {
  const orderId = String(order?._id || order?.id || '');

  if (!orderId) return;

  const payload = {
    type: 'order.updated',
    channel: 'order',
    orderId,
    data: order,
  };

  for (const [socket, state] of clients.entries()) {
    if (
      socket.readyState === WebSocket.OPEN &&
      state.authenticated &&
      state.orderId === orderId
    ) {
      send(socket, payload);
    }
  }
}
