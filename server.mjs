import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

const clients = {};
const rooms = {};

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connect", (socket) => {
    clients[socket.id] = socket;

    console.log('Server: connect socket', socket.id);

    socket.on('disconnect', (reason) => {
      console.log('Server: disconnect socket', socket.id);
    });

    socket.on('setNickName', (data) => {
      console.log('Server: received command setNickName', data);
      socket.data.nickName = data.nickName;
      socket.emit('setNickNameResult', { success: true });
    });

    socket.on('createRoom', (data) => {
      console.log('Server: received command createRoom', data);

      if (rooms[data.roomName]) {
        console.error('Server: room already exists', data);
        socket.emit('createRoomResult', { success: false, errorCode: 'ROOM_ALREADY_EXISTS' });
        return;
      }

      socket.join(data.roomName);
      rooms[data.roomName] = { name: data.roomName, ownerClient: socket.id };
      socket.emit('createRoomResult', { success: true });
    });

    socket.on('getRoomList', () => {
      console.log('Server: received command getRoomList');
      socket.emit('roomListResult', { success: true, list: Object.keys(rooms) });
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