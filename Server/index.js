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
    origin: "http://localhost:3000",
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

const logique = (pos, type) => {
  switch (type) {
    case 0:
      if (
        boards[1].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        if (
          boards[1].some(
            (position) => position.x == pos.x + 2 && position.y == pos.y - 2,
          )
        ) {
          return 2;
        } else {
          return 0;
        }
      } else {
        return 1;
      }
    case 1:
      if (
        boards[0].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        return 0;
      } else {
        return 1; //true ==1
      }
  }
};

const modifyPosition = (newPosition, type) => {
  console.log("newPosition:", newPosition);
  console.log("newPosition.index:", newPosition.index);
  console.log("type", type);
  switch (type) {
    case 0:
      const index_black = boards[0].findIndex(
        (item) => item.index === newPosition.index,
      );
      boards[0][index_black] = newPosition;
      console.log("new position", boards[0][index_black]);

      break;

    case 1:
      const index_white = boards[1].findIndex(
        (item) => item.index === newPosition.index,
      );

      boards[1][index_white] = newPosition;
      break;
  }
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.emit("init", boards);
  socket.on("move", (position) => {
    console.log("boards before ", boards);

    console.log("boards after", boards);
    socket.emit("update", boards);
  });

  socket.on("move piece", (position, type) => {
    console.log("before boards", boards);
    if (logique(position, type) == 1) {
      modifyPosition(position, type);
      socket.emit("update piece", position);
      socket.broadcast.emit("update piece", position);
    } else if (logique(position, type) == 2) {
      const pos = {
        index: position.index,
        x: position.x + 1,
        y: position.y - 1,
      };
      console.log("logique pos", pos);
      modifyPosition(pos, type);
      socket.emit("update piece", pos);

      socket.emit("remove piece", pos);

      socket.broadcast.emit("remove piece", pos);
      console.log("emiting boradcast");
      console.log("pos", pos);

      socket.broadcast.emit("update piece", pos);
    }
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
