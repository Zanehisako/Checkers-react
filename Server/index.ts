import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import http from "http"; // Import Node's HTTP module
import { Server } from "socket.io"; // Import Socket.IO Server class

interface Position {
  index: number;
  x: number;
  y: number;
}

enum Moves {
  None,
  MoveToEmptySpot,
  EatRight,
  EatLeft,
  Upgrade,
}

const PORT = 3001;

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const board_size = 8;

const initboard = () => {
  const black_pieces_pos: Position[] = [];
  const white_pieces_pos: Position[] = [];
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

const logique = (pos: Position, type: number) => {
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
          return Moves.EatRight;
        }
        if (
          boards[1].some(
            (position) => position.x == pos.x - 2 && position.y == pos.y - 2,
          )
        ) {
          return Moves.EatLeft;
        }
      } else {
        return Moves.MoveToEmptySpot;
      }
    case 1:
      //this checks the spot is empty
      if (
        boards[0].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        return Moves.None;
      } else {
        return Moves.MoveToEmptySpot;
      }
  }
};

const modifyPosition = (newPosition: Position, type: number) => {
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
  socket.on("move piece", (position: Position, type: number) => {
    console.log("before boards", boards);
    if (logique(position, type) == Moves.MoveToEmptySpot) {
      socket.emit("remove piece", position, type);
      socket.broadcast.emit("remove piece", position, type);
      modifyPosition(position, type);
      socket.emit("update piece", position);
      socket.broadcast.emit("update piece", position);
    } else if (logique(position, type) == Moves.EatRight) {
      socket.emit("remove piece", position, type);
      modifyPosition(position, type);
      socket.emit("update piece", {
        index: position.index,
        x: position.x + 1,
        y: position.y - 1,
      });
      socket.broadcast.emit("update piece", {
        index: position.index,
        x: position.x + 1,
        y: position.y - 1,
      });
    }
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
