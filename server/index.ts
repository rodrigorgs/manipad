import express from 'express';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { commandSchema, joinSchema } from '../src/shared/schemas.js';
import type { ClientToServerEvents, ServerToClientEvents } from '../src/shared/types.js';
import { RoomStore } from './room-store.js';

const app = express(); const server = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, { cors: { origin: true } });
const store = new RoomStore();
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, rooms: store.rooms.size }));
app.post('/api/rooms', (_req, res) => { const room = store.create(); res.status(201).json({ roomId: room.id, tutorToken: room.tutorToken }); });
app.get('/api/rooms/:id', (req, res) => res.json({ exists: Boolean(store.get(req.params.id)) }));

io.use((socket, next) => {
  const parsed = joinSchema.safeParse(socket.handshake.auth);
  if (!parsed.success) return next(new Error('Invalid room details'));
  const room = store.get(parsed.data.roomId); if (!room) return next(new Error('Room not found'));
  if (room.participants.size >= 8 && !room.participants.has(parsed.data.participantId)) return next(new Error('Room is full'));
  socket.data.join = parsed.data; next();
});

io.on('connection', (socket) => {
  const joinData = socket.data.join as ReturnType<typeof joinSchema.parse>;
  const room = store.get(joinData.roomId)!; const isTutor = store.isTutor(room, joinData.tutorToken);
  room.emptySince = undefined; room.participants.set(joinData.participantId, { id: joinData.participantId, name: joinData.name, color: joinData.color, isTutor, selection: [] });
  socket.join(room.id); io.to(room.id).emit('snapshot', store.snapshot(room));

  socket.on('command', (raw, ack) => {
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) return ack?.({ ok: false, message: 'Invalid board action' });
    const changed = store.command(room, parsed.data as Parameters<typeof store.command>[1], joinData.participantId, isTutor);
    if (!changed) return ack?.({ ok: false, message: room.locked && !isTutor ? 'The tutor locked the board' : 'Action unavailable' });
    io.to(room.id).emit('snapshot', store.snapshot(room)); ack?.({ ok: true });
  });
  socket.on('cursor', (payload) => {
    if (!Number.isFinite(payload?.cursor?.x) || !Number.isFinite(payload?.cursor?.y)) return;
    const participant = room.participants.get(joinData.participantId); if (!participant) return;
    participant.cursor = payload.cursor; participant.selection = payload.selection.slice(0, 50);
    socket.to(room.id).emit('cursor', { participantId: joinData.participantId, cursor: payload.cursor, selection: participant.selection });
  });
  socket.on('reaction', (emoji) => { if (['👍','🎉','💡','👏'].includes(emoji)) io.to(room.id).emit('reaction', { participantId: joinData.participantId, emoji, nonce: Date.now() }); });
  socket.on('control', (payload, ack) => {
    if (!isTutor) return ack?.({ ok: false });
    if (payload.action === 'lock') room.locked = true; else if (payload.action === 'unlock') room.locked = false;
    else if (payload.action === 'reset-view') io.to(room.id).emit('view:reset');
    io.to(room.id).emit('snapshot', store.snapshot(room)); ack?.({ ok: true });
  });
  socket.on('disconnect', () => {
    room.participants.delete(joinData.participantId); if (room.participants.size === 0) room.emptySince = Date.now();
    else io.to(room.id).emit('presence', [...room.participants.values()]);
  });
});

const here = dirname(fileURLToPath(import.meta.url)); const clientDir = join(here, '../../dist');
app.use(express.static(clientDir));
app.use((req, res, next) => req.method === 'GET' && !req.path.startsWith('/api/') ? res.sendFile(join(clientDir, 'index.html')) : next());
setInterval(() => store.cleanup(), 60_000).unref();
const port = Number(process.env.PORT || 3000); server.listen(port, () => console.log(`ManiPad listening on http://localhost:${port}`));

export { app, server, store };
