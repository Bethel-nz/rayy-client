# rayy-client

Rayy web-socket client.

## Installation

```bash
bun install
```

## Quick Start

```typescript
import { RayyClient } from './index';

const client = new RayyClient({
  url: 'wss://your-server.com',
  clientId: 'user123',
  autoReconnect: true,
});

// Subscribe to a room
client.rooms.subscribe('room1', (message) => {
  console.log('Received:', message);
});

// Send a message
client.rooms.send('room1', 'Hello everyone!');

// Send an event
client.rooms.event('room1', 'typing', { status: true });
```

## Features

- Automatic reconnection handling
- Type-safe message validation using Zod
- Real-time messaging and events
- Room-based communication
- Event-based subscription system
- Presence tracking

## API Reference

### Configuration

```typescript
interface RayyConfig {
  url: string; // WebSocket server URL
  clientId: string; // Unique client identifier
  autoReconnect?: boolean; // Enable auto-reconnection (default: false)
}
```

### Room Methods

- `rooms.send(roomId: string, content: string)` - Send a message to a room
- `rooms.event(roomId: string, event: string, data?: Record<string, any>)` - Emit an event
- `rooms.subscribe(roomId: string, callback: (msg: MessagePayload) => void)` - Subscribe to room events
- `rooms.listen(event: string, callback: (msg: MessagePayload) => void)` - Listen for specific events
- `rooms.presence(roomId: string): Promise<string[]>` - Get list of users in a room

### Event Types

- `message` - Chat messages
- `event` - Custom events
- `any` - Any event

## Development

This project uses [Bun](https://bun.sh) as its JavaScript runtime. Make sure you have Bun v1.1.42 or higher installed.

To run the development environment:

```bash
bun run index.ts
```

## License

[Your license here]

---

Built with [Bun](https://bun.sh)
