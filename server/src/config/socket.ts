import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import config from './env.js';

let io: Server;

export const initializeSocket = (server: HttpServer): Server => {
    io = new Server(server, {
        cors: {
            origin: config.frontendUrl,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket: Socket) => {
        console.log(`🔌 User connected: ${socket.id}`);

        // Video call room management
        socket.on('create-room', (roomId: string) => {
            socket.join(roomId);
            console.log(`📹 Room created: ${roomId}`);
            socket.emit('room-created', roomId);
        });

        socket.on('join-room', (roomId: string) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (room && room.size < 10) {
                socket.join(roomId);
                socket.to(roomId).emit('user-joined', socket.id);
                console.log(`👤 User ${socket.id} joined room: ${roomId}`);
            } else if (!room) {
                socket.emit('error', 'Room does not exist');
            } else {
                socket.emit('error', 'Room is full');
            }
        });

        socket.on('leave-room', (roomId: string) => {
            socket.leave(roomId);
            socket.to(roomId).emit('user-left', socket.id);
            console.log(`👋 User ${socket.id} left room: ${roomId}`);
        });

        // WebRTC signaling - use unknown type since we just pass through
        socket.on('offer', ({ offer, to }: { offer: unknown; to: string }) => {
            socket.to(to).emit('offer', { offer, from: socket.id });
        });

        socket.on('answer', ({ answer, to }: { answer: unknown; to: string }) => {
            socket.to(to).emit('answer', { answer, from: socket.id });
        });

        socket.on('ice-candidate', ({ candidate, to }: { candidate: unknown; to: string }) => {
            socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
        });

        // Media controls
        socket.on('toggle-audio', ({ roomId, enabled }: { roomId: string; enabled: boolean }) => {
            socket.to(roomId).emit('user-toggle-audio', { oderId: socket.id, enabled });
        });

        socket.on('toggle-video', ({ roomId, enabled }: { roomId: string; enabled: boolean }) => {
            socket.to(roomId).emit('user-toggle-video', { oderId: socket.id, enabled });
        });

        // Meeting notifications
        socket.on('join-user-room', (userId: string) => {
            socket.join(`user-${userId}`);
            console.log(`👤 User ${socket.id} joined personal room: user-${userId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
    io.to(`user-${userId}`).emit(event, data);
};
