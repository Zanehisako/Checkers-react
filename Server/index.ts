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
    origin: "*",
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
  console.log("position ", pos);
  switch (type) {
    case 0:
      console.log("boards[0] posti", boards[0]);
      console.log("boards[1] posti", boards[1]);
      if (
        boards[1].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        if (
          !boards[1].some(
            (position) => position.x == pos.x + 1 && position.y == pos.y - 1,
          )
        ) {
          console.log("Moves.EatRight");
          return Moves.EatRight;
        }
        if (
          !boards[1].some(
            (position) => position.x == pos.x - 1 && position.y == pos.y - 1,
          )
        ) {
          console.log("Moves.EatLeft");
          return Moves.EatLeft;
        }
        if (
          boards[1].some(
            (position) => position.x == pos.x + 1 && position.y == pos.y - 1,
          )
        ) {
          console.log("Moves.None");
          return Moves.None;
        }
      } else {
        console.log("Moves.MoveToEmptySpot");
        return Moves.MoveToEmptySpot;
      }
    case 1:
      //this checks the spot is empty
      if (
        boards[0].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        //this checks for the spot behind if its is empty or not
        if (
          !boards[0].some(
            (position) => position.x == pos.x + 1 && position.y == pos.y + 1,
          )
        ) {
          console.log("Moves.EatRight");
          return Moves.EatRight;
        }
        if (
          !boards[0].some(
            (position) => position.x == pos.x - 1 && position.y == pos.y + 1,
          )
        ) {
          console.log("Moves.EatLeft");
          return Moves.EatLeft;
        }
        if (
          boards[0].some(
            (position) => position.x == pos.x + 1 && position.y == pos.y + 1,
          )
        ) {
          console.log("Moves.None");
          return Moves.None;
        }
      } else {
        console.log("Moves.MoveToEmptySpot");
        return Moves.MoveToEmptySpot;
      }
  }
};

const modifyPosition = (newPosition: Position, type: number) => {
  switch (type) {
    case 0:
      const index_black = boards[0].findIndex(
        (item) => item.index === newPosition.index,
      );

      boards[0][index_black] = newPosition;

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
    console.log("boards black posti", boards[0]);
    console.log("boards white posti", boards[1]);
    if (logique(position, type) === Moves.MoveToEmptySpot) {
      modifyPosition(position, type);
      socket.emit("update piece", position);
      socket.broadcast.emit("update piece", position);

      console.log("boards black posti", boards[0]);
    } else if (logique(position, type) == Moves.EatRight) {
      socket.emit("remove piece", position, type == 1 ? 0 : 1);
      socket.broadcast.emit("remove piece", position, type == 1 ? 0 : 1);
      modifyPosition(position, type);
      socket.emit("update piece", {
        index: position.index,
        x: position.x + 1,
        y: type === 0 ? position.y - 1 : position.y + 1,
      });
      socket.broadcast.emit("update piece", {
        index: position.index,
        x: position.x + 1,
        y: type === 0 ? position.y - 1 : position.y + 1,
      });
    } else if (logique(position, type) == Moves.EatLeft) {
      socket.emit("remove piece", position, type == 1 ? 1 : 0);
      socket.broadcast.emit("remove piece", position, type == 1 ? 1 : 0);
      modifyPosition(position, type);
      socket.emit("update piece", {
        index: position.index,
        x: position.x - 1,
        y: type === 0 ? position.y - 1 : position.y + 1,
      });
      socket.broadcast.emit("update piece", {
        index: position.index,
        x: position.x - 1,
        y: type === 0 ? position.y - 1 : position.y + 1,
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
