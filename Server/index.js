const express = require("express"); // Import Express framework
const cors = require("cors"); // Import CORS middleware
const http = require("http"); // Import Node's HTTP module
const { Server } = require("socket.io"); // Import Socket.IO Server class
const { log } = require("console");

const PORT = 3001;

const app = express();

app.use(cors());

var pieces = [];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://192.168.1.7:3001",
    methods: ["GET", "POST"],
  },
});
const board_size = 8;

const initboard = () => {
  const black_pieces_pos = [];
  const white_pieces_pos = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 5; j < 8; j++) {
      if ((i + j) % 2 !== 0) {
        const index = i + j * board_size;
        black_pieces_pos.push({
          index: index,
          x: i,
          y: j,
        });
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 !== 0) {
        const index = i + j * board_size;
        white_pieces_pos.push({
          index: index,
          x: i,
          y: j,
        });
      }
    }
  }
  return [black_pieces_pos, white_pieces_pos];
};

var boards = initboard();

const modifyPosition = (newPosition) => {
  console.log('newPosition:', newPosition)
  console.log('newPosition.index:', newPosition.position.index)
  switch (newPosition.type) {
    case 0:
      console.log('boards[0] before', boards[0]);
      const index = boards[0].findIndex((item) => item.index === newPosition.position.index);
      boards[0][index] = newPosition.position


      console.log('boards[0] after', boards[0]);
      return boards;

    case 1:

      boards[1].at(
        boards[1].findIndex((item) => item.index === newPosition.index),
      ) = newPosition;
      return boards;
  }
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  console.log(boards);
  socket.emit("init", boards);
  socket.on("move", (position) => {
    socket.emit("update", modifyPosition(position));
  });

  socket.on("move piece", (position) => {

    socket.emit("update piece", position);
    socket.broadcast.emit("update piece", position);
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
