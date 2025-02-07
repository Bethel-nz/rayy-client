import { z } from 'zod';

export interface RayyConfig {
  url: string;
  clientId: string;
  autoReconnect?: boolean;
}

// Aligned with backend Message struct
const MessageSchema = z.object({
  action: z.enum(['message', 'event']),
  room: z.string(),
  content: z.string().optional(),
  from: z.string().optional(),
  timestamp: z.string().optional(),
  event: z.string().optional(),
  data: z.record(z.any()).optional(),
});

export type MessagePayload = z.infer<typeof MessageSchema>;
export type EventType = 'message' | 'list_users' | string;

export class RayyClient {
  private ws: WebSocket | null = null;
  private eventListeners = new Map<EventType, Function[]>();
  private reconnectAttempts = 0;
  private clientId: string;

  public rooms!: {
    // Send a chat message
    send: (roomId: string, content: string) => void;

    event: <T>(
      roomId: string,
      event: z.infer<typeof MessageSchema>['event'],
      data?: Record<string, T>
    ) => void;

    subscribe: (
      roomId: string,
      callback: (msg: MessagePayload) => void
    ) => void;

    listen: (event: EventType, callback: (msg: MessagePayload) => void) => void;

    presence: (roomId: string) => Promise<string[]>;
  };

  constructor(private config: RayyConfig) {
    this.clientId = config.clientId;
    this.setupRoomMethods();
  }

  private setupRoomMethods() {
    this.rooms = {
      send: (roomId: string, content: string) => {
        this.send(roomId, {
          action: 'message',
          content,
          timestamp: new Date().toISOString(),
        });
      },

      event: <T>(
        roomId: string,
        event: z.infer<typeof MessageSchema>['event'],
        data?: Record<string, T>
      ) => {
        this.send(roomId, {
          action: 'event',
          event,
          data,
          timestamp: new Date().toISOString(),
        });
      },

      subscribe: (roomId: string, callback: (msg: MessagePayload) => void) => {
        this.connect(roomId);
        this.rooms.listen('message', callback);
        this.rooms.listen('event', callback);
      },

      listen: (event: EventType, callback: (msg: MessagePayload) => void) => {
        const listeners = this.eventListeners.get(event) || [];
        this.eventListeners.set(event, [...listeners, callback]);
      },

      presence: async (roomId: string): Promise<string[]> => {
        return new Promise((resolve, reject) => {
          const tempHandler = (msg: MessagePayload) => {
            if (msg.event === 'list_users' && msg.data?.users) {
              this.off('list_users', tempHandler);
              resolve(msg.data.users as string[]);
            }
          };

          this.rooms.listen('list_users', tempHandler);
          this.rooms.event(roomId, 'list_users');

          setTimeout(() => {
            this.off('list_users', tempHandler);
            reject(new Error('Users list request timed out'));
          }, 5000);
        });
      },
    };
  }

  private connect(roomId: string) {
    const params = new URLSearchParams({
      room: roomId,
      client_id: this.clientId,
    });

    this.ws = new WebSocket(`${this.config.url}/ws?${params.toString()}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;

      this.rooms.event(roomId, 'join');
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = MessageSchema.safeParse(JSON.parse(event.data));
        if (!parsed.success) {
          console.error('Invalid message format:', parsed.error);
          return;
        }

        const msg = parsed.data;

        switch (msg.action) {
          case 'message': {
            const handlers = this.eventListeners.get('message') || [];
            handlers.forEach((handler) => handler(msg));
            break;
          }
          case 'event': {
            if (msg.event) {
              const handlers =
                this.eventListeners.get(msg.event as EventType) || [];
              handlers.forEach((handler) => handler(msg));

              const eventHandlers = this.eventListeners.get('event') || [];
              eventHandlers.forEach((handler) => handler(msg));
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      if (error instanceof ErrorEvent && error.error?.code === 429) {
        const retryAfter = parseInt(
          error.error?.headers?.['retry-after'] || '60'
        );
        console.log(`Rate limited. Retrying in ${retryAfter} seconds`);
        setTimeout(() => {
          this.connect(roomId);
        }, retryAfter * 1000);
      }
    };

    this.ws.onclose = () => {
      this.rooms.event(roomId, 'leave');

      if (this.config.autoReconnect && this.reconnectAttempts < 5) {
        setTimeout(() => {
          this.reconnectAttempts++;
          console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
          this.connect(roomId);
        }, 3000 * this.reconnectAttempts);
      }
    };
  }

  public on(event: EventType, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    this.eventListeners.set(event, [...listeners, callback]);
  }

  public off(event: EventType, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    this.eventListeners.set(
      event,
      listeners.filter((fn) => fn !== callback)
    );
  }

  private send(roomId: string, payload: Partial<MessagePayload>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: MessagePayload = {
        action: payload.action ?? 'message',
        room: roomId,
        from: this.clientId,
        timestamp: new Date().toISOString(),
        ...payload,
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Unable to send message.');
    }
  }
}
