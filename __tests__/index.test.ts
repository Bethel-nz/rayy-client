import { describe, expect, test } from 'bun:test';
import { RayyClient } from '../index';

describe('RayyClient', () => {
  test('should handle room presence', async () => {
    const client1 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'user1',
    });

    const client2 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'user2',
    });

    const roomId = 'test_room_' + Date.now();

    // Wait for both clients to connect
    await new Promise<void>((resolve) => {
      client1.rooms.subscribe(roomId, async (msg) => {
        if (msg.action === 'event' && msg.from === 'user2') {
          // Check presence after both are connected
          const users = await client1.rooms.presence(roomId);
          expect(users).toContain('user1');
          expect(users).toContain('user2');
          resolve();
        }
      });

      setTimeout(() => {
        client2.rooms.subscribe(roomId, () => {});
      }, 100);
    });
  }, 10000);

  test('should handle typing events', async () => {
    const client1 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'typing_user1',
    });

    const client2 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'typing_user2',
    });

    const roomId = 'typing_test_' + Date.now();
    let typingEvent: any;

    // First wait for both clients to connect
    await new Promise<void>((resolve) => {
      let connectedClients = 0;

      const onJoin = (msg: any) => {
        if (msg.action === 'event' && msg.event === 'join') {
          connectedClients++;
          if (connectedClients === 2) {
            resolve();
          }
        }
      };

      client1.rooms.subscribe(roomId, onJoin);
      client2.rooms.subscribe(roomId, onJoin);
    });

    // Now test typing events
    await new Promise<void>((resolve) => {
      // Listen for typing events on client1
      client1.rooms.listen('typing', (msg) => {
        console.log('Received typing event:', msg); // Debug log
        if (msg.from === 'typing_user2') {
          typingEvent = msg;
          resolve();
        }
      });

      // Send typing event from client2
      client2.rooms.event(roomId, 'typing', { isTyping: true });
    });

    expect(typingEvent).toBeDefined();
    expect(typingEvent.from).toBe('typing_user2');
    expect(typingEvent.data.isTyping).toBe(true);
  }, 10000);

  test('should handle custom events', async () => {
    const client1 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'custom_user1',
    });

    const client2 = new RayyClient({
      url: 'ws://localhost:8080',
      clientId: 'custom_user2',
    });

    const roomId = 'custom_test_' + Date.now();
    let customEvent: any;

    // First wait for both clients to connect
    await new Promise<void>((resolve) => {
      let connectedClients = 0;

      const onJoin = (msg: any) => {
        if (msg.action === 'event' && msg.event === 'join') {
          connectedClients++;
          if (connectedClients === 2) {
            resolve();
          }
        }
      };

      client1.rooms.subscribe(roomId, onJoin);
      client2.rooms.subscribe(roomId, onJoin);
    });

    // Now test custom events
    await new Promise<void>((resolve) => {
      // Listen for custom event on client1
      client1.rooms.listen('game_move', (msg) => {
        console.log('Received custom event:', msg);
        if (msg.from === 'custom_user2') {
          customEvent = msg;
          resolve();
        }
      });

      // Send custom event from client2
      client2.rooms.event(roomId, 'game_move', {
        x: 100,
        y: 200,
        action: 'jump',
      });
    });

    expect(customEvent).toBeDefined();
    expect(customEvent.from).toBe('custom_user2');
    expect(customEvent.event).toBe('game_move');
    expect(customEvent.data).toEqual({
      x: 100,
      y: 200,
      action: 'jump',
    });
  }, 10000);
});
