import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const clients = {};
const rooms = {};

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer);

  function getJoinedRoom(socket) {
    return Array.from(socket.rooms).find(r => r !== socket.id);
  }
  
  async function handleEmptyRoom(room) {
    const isEmptyRoom = (await io.in(room).fetchSockets()).length <= 1;
  
    if (isEmptyRoom) {
      delete rooms[room];
    }
  }

  function* genTeam() {
    while (true) {
      yield 'red';
      yield 'blue';
    }
  }

  io.on("connect", (socket) => {
    clients[socket.id] = socket;

    console.log('Server: connect socket', socket.id);

    socket.on('disconnecting', async (reason) => {
      console.log('Server: disconnecting socket', socket.id, reason);
      const joinedRoom = getJoinedRoom(socket);

      if (joinedRoom) {
        try {
          io.to(joinedRoom).emit('disconnectingClient', { clientId: socket.id });
          await handleEmptyRoom(joinedRoom);
        } catch (error) {
          // TODO: Handle the error
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Server: disconnect socket', socket.id, reason);
      delete clients[socket.id];
    });

    socket.on('setNickName', (data) => {
      console.log('Server: received command setNickName', data);
      socket.data.nickName = data.nickName;
      socket.emit('setNickNameResult', { success: true });
    });

    socket.on('createRoom', (data) => {
      console.log('Server: received command createRoom', data);

      if (rooms[data.roomName]) {
        console.error('Server:Error: room already exists', data);
        socket.emit('createRoomResult', { success: false, errorCode: 'ROOM_ALREADY_EXISTS' });
        return;
      }

      socket.join(data.roomName);
      rooms[data.roomName] = { roomName: data.roomName, teamGenerator: genTeam() };
      socket.emit('createRoomResult', { success: true });
    });

    socket.on('getRoomList', () => {
      console.log('Server: received command getRoomList');
      socket.emit('roomListResult', { success: true, list: Object.keys(rooms) });
    });

    socket.on('joinRoom', ({ roomName }) => {
      console.log('Server: received command joinRoom');

      if (!rooms[roomName]) {
        console.error('Server:Error: room not found', roomName);
        socket.emit('joinRoomResult', { success: false, roomName: roomName, errorCode: 'ROOM_NOT_FOUND' });
        return;
      }

      if (socket.rooms.has(roomName)) {
        console.error('Server:Error: client already joined to room', roomName);
        socket.emit('joinRoomResult', { success: false, roomName: roomName, errorCode: 'ALREADY_JOINED_TO_ROOM' });
        return;
      }

      socket.join(roomName);
      socket.emit('joinRoomResult', { success: true, roomName: roomName });
    });

    socket.on('leaveRoom', () => {
      const joinedRoom = getJoinedRoom(socket);

      if (!rooms[joinedRoom]) {
        console.error('Server:Error: room not found', joinedRoom);
        socket.emit('leaveRoomResult', { success: false, roomName: joinedRoom, errorCode: 'ROOM_NOT_FOUND' });
        return;
      }

      handleEmptyRoom(joinedRoom);
      socket.leave(joinedRoom);
      socket.emit('leaveRoomResult', { success: true, roomName: joinedRoom });
      io.to(joinedRoom).emit('leavingClient', { clientId: socket.id });
    });

    socket.on('joinTeam', () => {
      console.log('Server: received command joinTeam');
      const joinedRoom = Array.from(socket.rooms).find(r => r !== socket.id);

      if (!joinedRoom || !rooms[joinedRoom]) {
        socket.emit('joinTeamResult', { success: false, errorCode: 'NOT_JOINED_ANY_ROOM' });
        return;
      }

      const team = rooms[joinedRoom].teamGenerator.next().value;
      socket.data.team = team;
      socket.emit('joinTeamResult', { success: true, team });
    });

    socket.on('getClientsInRoom', async ({ roomName }) => {
      console.log('Server: received command getClientsInRoom');

      try {
        const clientsInRoom = (await io.in(roomName).fetchSockets())
          .filter(s => s.id !== socket.id).map(s => ({ id: s.id, data: s.data }));
        socket.emit('getClientsInRoomResult', clientsInRoom);
      } catch (error) { }
    });

    socket.on('offer', ({ clientId, offer }) => {
      console.log('Server: received command offer');
      socket.to(clientId).emit('offer', { clientId: socket.id, data: socket.data, offer });
    });

    socket.on('answer', ({ clientId, answer }) => {
      console.log('Server: received command answer');
      socket.to(clientId).emit('answer', { clientId: socket.id, answer });
    });

    socket.on('iceCandidate', ({ clientId, candidate }) => {
      console.log('Server: received command iceCandidate');
      socket.to(clientId).emit('iceCandidate', { clientId: socket.id, candidate });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});