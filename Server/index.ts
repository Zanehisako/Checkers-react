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
  switch (type) {
    case 0:
      console.log("position white", pos);
      console.log("boards[0] posti", boards[0]);
      console.log("boards[1] posti", boards[1]);
      if (
        !boards[1].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        console.log("spot is empty");
        if (
          boards[1].some((position) => pos.x - 1 === position.x && pos.y + 1 === position.y)
        ) {
          console.log("EatRight");
          return Moves.EatRight;
        }
        else if (
          boards[1].some((position) => position.x + 1 === pos.x && position.y + 1 === pos.y)
        ) {
          console.log("EatLeft");
          return Moves.EatLeft;
        } else {
          return Moves.MoveToEmptySpot;
        }

      }
      else {
        console.log("YOU SHALL NOT PASS!!")
        return Moves.None;
      }
    case 1:
      console.log("position white", pos);
      console.log("boards[0] posti", boards[0]);
      console.log("boards[1] posti", boards[1]);
      if (
        !boards[0].some((position) => position.x == pos.x && position.y == pos.y)
      ) {
        console.log("spot is empty");
        if (
          boards[0].some((position) => pos.x - 1 === position.x && pos.y - 1 === position.y)
        ) {
          console.log("EatRight");
          return Moves.EatRight;
        }
        else if (
          boards[0].some((position) => position.x + 1 === pos.x && position.y - 1 === pos.y)
        ) {
          console.log("EatLeft");
          return Moves.EatLeft;
        } else {
          return Moves.MoveToEmptySpot;
        }

      }
      else {
        console.log("YOU SHALL NOT PASS!!")
        return Moves.None;
      }
  }
};

const modifyPosition = (newPosition: Position, type: number) => {
  switch (type) {
    case 0:
      const index_black = boards[0].findIndex(
        (item) => item.index === newPosition.index,
      );

      console.log("index :", index_black);

      console.log("before black board :", boards[0]);
      boards[0][index_black] = newPosition;
      console.log("new black board :", boards[0]);

      break;

    case 1:
      const index_white = boards[1].findIndex(
        (item) => item.index === newPosition.index,
      );

      boards[1][index_white] = newPosition;
      console.log("new white board :", boards[1]);
      break;
  }

};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  console.log("boards black posti", boards[0]);
  console.log("boards white posti", boards[1]);

  socket.emit("init", boards);
  socket.on("move piece", (position: Position, type: number) => {
    console.log("boards black posti", boards[0]);
    console.log("boards white posti", boards[1]);
    const result = logique(position, type);
    switch (result) {
      case Moves.MoveToEmptySpot:
        modifyPosition(position, type);
        io.emit("update piece", position, type);
        console.log("boards black posti", boards[0]);
        break;
      case Moves.EatRight:
        modifyPosition(position, type);
        io.emit("update piece", position, type);
        io.emit("remove piece", { ...position, x: position.x - 1, y: position.y + 1 }, type == 1 ? 0 : 1)
        console.log("boards black posti", boards[0]);
        break;
      case Moves.EatLeft:
        modifyPosition(position, type);
        io.emit("update piece", position, type);
        io.emit("remove piece", { ...position, x: position.x + 1, y: position.y + 1 }, type == 1 ? 0 : 1)
        console.log("boards black posti", boards[0]);
        break;
      default:
        break;
    }
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
