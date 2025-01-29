import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import http from "http"; // Import Node's HTTP module
import { Server } from "socket.io"; // Import Socket.IO Server class

interface Position {
  x: number;
  y: number;
  king: boolean
}

interface Room {
  board: Map<string, Position>[] | undefined,
  number: number;
  players: Map<string, number>;
  size: number;
  spectators: string[];
  turn: number;
}

enum Moves {
  None,
  MoveToEmptySpot,
  EatRight,
  EatLeft,
  MoveToEmptySpotUpgrade,
  EatRightUpgrage,
  EatLeftUpgrage,
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
const emptyRooms = new Map<number, Room>()
const fullRooms = new Map<number, Room>()

const initboard = () => {
  const black_pieces_pos = new Map<string, Position>;
  const white_pieces_pos = new Map<string, Position>;
  for (let i = 0; i < 8; i++) {
    for (let j = 5; j < 8; j++) {
      if ((i + j) % 2 !== 0) {
        const index = i.toString() + j.toString();
        black_pieces_pos.set(index, {
          x: i,
          y: j,
          king: false
        });
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 !== 0) {
        const index = i.toString() + j.toString();
        white_pieces_pos.set(index, {
          x: i,
          y: j,
          king: false
        });
      }
    }
  }
  return [black_pieces_pos, white_pieces_pos];
};

const logique = (key: string, boards: Map<string, Position>[], pos: Position, type: number, time: number) => {
  console.time("Logic took:");
  var result: Moves;
  try {
    switch (type) {
      case 0: {
        console.log('black board', boards[0]);
        console.log("position black", pos);
        const old_position_black = boards[0].get(key)!;
        console.log("old_position_black", old_position_black);

        // Movement validation checks
        if (old_position_black.y < pos.y || old_position_black.x === pos.x) {
          console.log("YOU SHALL NOT PASS!! - Invalid direction or same column");
          return result = Moves.None;
        }
        if ((Math.abs(pos.x - old_position_black.x) > 2 || Math.abs(pos.y - old_position_black.y) > 2) && !pos.king) {
          console.log("YOU SHALL NOT PASS!! - Move too far");
          return result = Moves.None;
        }

        // Check target position
        const opponentPieces = Array.from(boards[1].values());
        if (!opponentPieces.some(p => p.x === pos.x && p.y === pos.y)) {
          console.log("spot is empty");

          // Check possible captures
          const hasRightPrey = opponentPieces.some(p =>
            p.x === pos.x - 1 && p.y === pos.y + 1
          );
          const hasLeftPrey = opponentPieces.some(p =>
            p.x === pos.x + 1 && p.y === pos.y + 1
          );

          if (hasRightPrey) {
            console.log("EatRight");
            return pos.y === 0 ? Moves.EatRightUpgrage : Moves.EatRight;
          }
          if (hasLeftPrey) {
            console.log("EatLeft");
            return pos.y === 0 ? Moves.EatLeftUpgrage : Moves.EatLeft;
          }
          return result = Moves.MoveToEmptySpot;
        }
        console.log("YOU SHALL NOT PASS!! - Occupied spot");
        return result = Moves.None;
      }

      case 1: {
        console.log('white board', boards[1]);
        console.log("position white", pos);
        const old_position_white = boards[1].get(key)!;
        console.log("old_position_white", old_position_white);

        // Movement validation checks
        if (old_position_white.y > pos.y || old_position_white.x === pos.x) {
          console.log("YOU SHALL NOT PASS!! - Invalid direction or same column");
          return result = Moves.None;
        }
        if ((Math.abs(pos.x - old_position_white.x) > 2 || Math.abs(pos.y - old_position_white.y) > 2) && !pos.king) {
          console.log("YOU SHALL NOT PASS!! - Move too far");
          return result = Moves.None;
        }

        // Check target position
        const opponentPieces = Array.from(boards[0].values());
        if (!opponentPieces.some(p => p.x === pos.x && p.y === pos.y)) {
          console.log("spot is empty");

          // Check possible captures
          const hasRightPrey = opponentPieces.some(p =>
            p.x === pos.x - 1 && p.y === pos.y - 1
          );
          const hasLeftPrey = opponentPieces.some(p =>
            p.x === pos.x + 1 && p.y === pos.y - 1
          );

          if (hasRightPrey) {
            console.log("EatRight");
            return Moves.EatRight;
          }
          if (hasLeftPrey) {
            console.log("EatLeft");
            return result = Moves.EatLeft;
          }
          return result = Moves.MoveToEmptySpot;
        }
        console.log("YOU SHALL NOT PASS!! - Occupied spot");
        return result = Moves.None;
      }
    }
  } finally {
    console.timeEnd("Logic took:");
  }
};


const updateBoard = (key: string, board: Map<string, Position>[], newPosition: Position, type: number) => {
  console.log("updating board");
  switch (type) {
    case 0:
      if (board[0].has(key)) {
        board[0].set(key, newPosition);
      }
      break;
    case 1:
      if (board[1].has(key)) {
        board[1].set(key, newPosition);
      }
      break;
  }
};

const modifyPosition = (key: string, boards: Map<string, Position>[], newPosition: Position, type: number) => {
  switch (type) {
    case 0:
      console.log("position index:", key);
      console.log("before black board:", boards[0]);
      boards[0].set(key, newPosition);
      console.log("new black board:", boards[0]);
      break;
    case 1:
      boards[1].set(key, newPosition);
      console.log("new white board:", boards[1]);
      break;
  }
};

const removePiece = (key: string, boards: Map<string, Position>[], type: number) => {
  switch (type) {
    case 0:
      console.log("before black board:", boards[0]);
      boards[0].delete(key);
      console.log("new black board:", boards[0]);
      break;
    case 1:
      boards[1].delete(key);
      console.log("new white board:", boards[1]);
      break;
  }
};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  var current_room: Room | undefined = { number: 0, size: 0, players: new Map<string, number>, spectators: [], turn: 1, board: undefined }
  //join a room 
  console.log("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
  socket.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
  socket.on("leave room", async (room: String) => {
    socket.leave(room.toString())
  })
  socket.on("join room as player", async (room: number) => {
    console.log("join room as player")
    current_room = emptyRooms.get(room) ?? fullRooms.get(room)
    if (current_room === undefined) {
      socket.emit("msg", "Room doesn't exits");
    } else if (!current_room.players.has(socket.id)) {
      switch (current_room.size) {
        case 1:
          await socket.join(room.toString())
          current_room.size += 1
          current_room.players.set(socket.id, 0)
          fullRooms.set(room, current_room)
          emptyRooms.delete(room)
          console.log("player joined room Successfully")
          socket.emit("msg", "joined room Successfully");
          io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
          console.log("Room", room.toString())
          io.to(room.toString()).except(socket.id).emit("turn")
          io.to(room.toString()).except(socket.id).emit("Player Joined", socket.id)
          break;

        default:
          socket.emit("msg", "Room is full ");
          break;

      }
    } else {
      socket.emit("msg", "The client is already in the room");
    }
  }),
    socket.on("join room as spectator", async (room: number) => {
      current_room = emptyRooms.get(room) ?? fullRooms.get(room)
      if (current_room === undefined) {
        socket.emit("msg", "Room doesn't exits");
      } else {
        await socket.join(room.toString())
        io.to(current_room.number.toString()).emit("board", current_room.board)
        current_room.spectators.push(socket.id)
      }
    });

  socket.on("get board", async () => {
    console.log("room", current_room)
    socket.emit("board", current_room.board)

  })
  socket.on("create room", async (room_number: number) => {
    current_room = emptyRooms.get(room_number) ?? fullRooms.get(room_number)
    if (current_room === undefined) {
      socket.join(room_number.toString())
      const room: Room = {
        number: room_number,
        size: 1,
        players: new Map<string, number>,
        spectators: [],
        turn: 0,//0 cuz the first move is gonna be of type 1 white 
        board: initboard()
      }
      current_room = room
      room.players.set(socket.id, 1)
      socket.emit("msg", "Room Created Successfully");
      emptyRooms.set(room_number, room)
      io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
    } else {
      socket.emit("msg", "Room does exits");
    }
  });

  socket.on("move piece", async (key, position: Position, type: number, time: number) => {
    //this make sure only players can send moves not spectators for example
    if (!current_room?.players.has(socket.id)) {
      return;
    }
    console.log("current Room", current_room)
    console.log("type", type)
    if (current_room?.turn == type) {
      console.log("its not u're turn nigga damn!", type)
      return;
    } else {
      console.log("time", time);
      const result = logique(key, current_room.board, position, type, time)
      console.log("the result of the logic is :", result)
      if (result == Moves.EatLeft || result == Moves.EatRight) {
        switch (result) {
          case Moves.EatLeft:
            const removeKeyBlack = (position.x + 1).toString() + (type == 0 ? position.y + 1 : position.y - 1).toString()
            removePiece(removeKeyBlack, current_room.board, type)
            break;

          case Moves.EatRight:
            const removeKeyWhite = (position.x - 1).toString() + (type == 0 ? position.y + 1 : position.y - 1).toString()
            removePiece(removeKeyWhite, current_room.board, type)
            break;
        }
        updateBoard(key, current_room.board, position, type)
        io.to(current_room!.number.toString()).emit("remove piece", position, type, time)
        io.to(current_room!.number.toString()).emit("update piece", position, type, time)
        current_room!.turn = type == 0 ? 0 : 1;
        io.to(current_room!.number.toString()).except(socket.id).emit("turn")
      } else if (result == Moves.MoveToEmptySpot) {
        updateBoard(key, current_room.board, position, type)
        io.to(current_room!.number.toString()).emit("update piece", position, type, time)
        current_room!.turn = type == 0 ? 0 : 1;
        io.to(current_room!.number.toString()).except(socket.id).emit("turn")

      }
      else {
        current_room!.turn = type == 0 ? 0 : 1;
        io.to(current_room!.number.toString()).except(socket.id).emit("turn")
      }
    }
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
    const isPlayer = current_room.players.has(socket.id)

    switch (isPlayer) {
      case true:
        if (current_room.size > 0) {
          current_room!.size -= 1
        }
        current_room?.players.delete(socket.id)
        switch (current_room.size) {
          case 0:
            console.log(current_room.number)
            emptyRooms.delete(current_room.number)
            console.log("deleting empty room")
            break;
          case 1:
            fullRooms.delete(current_room.number)
            emptyRooms.set(current_room.number, current_room)
            console.log("deleting full room and creating a full room")
            break;
        }
        io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
        console.log("empty rooms", emptyRooms)
        console.log("full rooms", fullRooms)

        break;

      case false:
        const index = current_room.spectators.indexOf(socket.id)
        current_room.spectators.splice(index, 1)
        break;
    }
  });
});

server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
