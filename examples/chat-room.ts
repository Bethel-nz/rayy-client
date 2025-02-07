import { RayyClient } from '../index';

async function createChatRoom() {
  console.log('Starting chat room example...');

  // Create two clients
  const alice = new RayyClient({
    url: 'ws://localhost:8080',
    clientId: 'alice',
    autoReconnect: true,
  });

  const bob = new RayyClient({
    url: 'ws://localhost:8080',
    clientId: 'bob',
    autoReconnect: true,
  });

  const roomId = 'example_room';

  // Set up message handlers for Alice
  alice.rooms.subscribe(roomId, (msg) => {
    switch (msg.action) {
      case 'message':
        console.log(
          `[Alice] Received message from ${msg.from}: ${msg.content}`
        );
        break;
      case 'event':
        switch (msg.event) {
          case 'join':
            console.log(`[Alice] ${msg.from} joined the room`);
            break;
          case 'leave':
            console.log(`[Alice] ${msg.from} left the room`);
            break;
          case 'typing':
            console.log(`[Alice] ${msg.from} is typing...`);
            break;
        }
        break;
    }
  });

  // Set up message handlers for Bob
  bob.rooms.subscribe(roomId, (msg) => {
    switch (msg.action) {
      case 'message':
        console.log(`[Bob] Received message from ${msg.from}: ${msg.content}`);
        break;
      case 'event':
        switch (msg.event) {
          case 'join':
            console.log(`[Bob] ${msg.from} joined the room`);
            break;
          case 'leave':
            console.log(`[Bob] ${msg.from} left the room`);
            break;
          case 'typing':
            console.log(`[Bob] ${msg.from} is typing...`);
            break;
        }
        break;
    }
  });

  // Wait for both clients to connect
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check room presence
  const users = await alice.rooms.presence(roomId);
  console.log('Users in room:', users);

  // Simulate typing and messaging
  console.log('\nStarting chat simulation...');

  // Bob starts typing
  bob.rooms.event(roomId, 'typing', { isTyping: true });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Bob sends a message
  bob.rooms.send(roomId, 'Hello Alice!');
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Bob stops typing
  bob.rooms.event(roomId, 'typing', { isTyping: false });
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Alice responds
  alice.rooms.event(roomId, 'typing', { isTyping: true });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  alice.rooms.send(roomId, 'Hi Bob! How are you?');
  alice.rooms.event(roomId, 'typing', { isTyping: false });

  // Wait for messages to be processed
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('\nChat simulation complete!');
}

// Run the example
createChatRoom().catch(console.error);
