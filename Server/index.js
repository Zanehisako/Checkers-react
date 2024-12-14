const express = require("express"); // Import Express framework
const cors = require("cors"); // Import CORS middleware
const http = require("http"); // Import Node's HTTP module
const { Server } = require("socket.io"); // Import Socket.IO Server class

const PORT = 3001;

const app = express();

app.use(cors());

var pieces = [];

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://192.168.1.7:3000",
    methods: ["GET", "POST"],
  },
});
const board_size = 8;

const initboard = () => {
  const black_pieces_pos = [];
  const white_pieces_pos = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 5; j < 8; j++) {
      const index = i + j * board_size;
      if ((i + j) % 2 !== 0) {
        black_pieces_pos.push({
          index: index,
          value: index,
        });
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      const index = i + j * board_size;
      if ((i + j) % 2 == 0) {
        white_pieces_pos.push({
          index: index,
          value: index,
        });
      }
    }
  }
  return { black_pieces_pos, white_pieces_pos };
};

const boards = initboard();

const modifyPosition = (newPosition, type) => {
  switch (type) {
    case 0:
      SetBlack((prev) => {
        prev.map((mov) => {
          if (mov.index == newPosition.index) {
            mov.value = newPosition.value;
          }
        });
        return prev;
      });
      break;

    case 1:
      SetWhite((prev) => {
        prev.map((mov) => {
          if (mov.index == newPosition.index) {
            mov.value = newPosition.value;
          }
        });
        return prev;
      });
      break;
  }
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.emit("init", boards);
  socket.on("move", (msg) => {
    console.log(msg);
    socket.emit("Ok");
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
