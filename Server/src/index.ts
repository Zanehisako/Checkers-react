import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import http from "http"; // Import Node's HTTP module
import { Server } from "socket.io"; // Import Socket.IO Server class
import { randomUUID } from "crypto";

interface Position {
  index: string;
  x: number;
  y: number;
  king: boolean
}

interface Room {
  board: Position[][] | undefined,
  moves_played: Position[][] | undefined,
  name: string;
  players: Map<string, number>;
  size: number;
  spectators: string[];
  turn: number;
}

interface Puzzle {
  board: Position[][] | undefined,
  name: string,
  solution: Position[]
}


interface PuzzleRoom {
  moves_played: Position[] | undefined,
  puzzle: Puzzle,
  player: string,
  spectators: string[] | undefined
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
enum MovesKing {
  None,
  MoveToEmptySpot,
  EatRightUp,
  EatLeftUp,
  EatRightDown,
  EatLeftDown,
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
const emptyRooms = new Map<string, Room>()
const fullRooms = new Map<string, Room>()

const Puzzles = new Map<string, Puzzle>()
const puzzlesRooms = new Map<string, PuzzleRoom>()

const initboard = () => {
  const black_pieces_pos: Position[] = [];
  const white_pieces_pos: Position[] = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 5; j < 8; j++) {
      if ((i + j) % 2 !== 0) {
        black_pieces_pos.push({
          index: `${i}${j}`,
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
        white_pieces_pos.push({
          index: `${i}${j}`,
          x: i,
          y: j,
          king: false
        });
      }
    }
  }
  console.log(black_pieces_pos, white_pieces_pos)
  return [black_pieces_pos, white_pieces_pos];
};


const calculateKingMove = (
  boards: Position[][],
  newPos: Position,
  player: number
): Moves => {
  console.time("King Logic took:");
  try {
    const playerBoard = boards[player];
    const enemyBoard = boards[1 - player];

    // Find the moving piece on the player's board.
    const movingPiece = playerBoard.find(piece => piece.index === newPos.index);
    if (!movingPiece) return Moves.None;
    // Ensure the piece is actually a king.
    if (!movingPiece.king) return Moves.None;

    // Calculate differences.
    const dx = newPos.x - movingPiece.x;
    const dy = newPos.y - movingPiece.y;

    // The move must be strictly diagonal.
    if (Math.abs(dx) !== Math.abs(dy)) return Moves.None;

    // Check that the destination square is empty.
    const destinationOccupied = boards[0]
      .concat(boards[1])
      .some(piece => piece.x === newPos.x && piece.y === newPos.y);
    if (destinationOccupied) return Moves.None;

    // Simple move: one square diagonal.
    if (Math.abs(dx) === 1) {
      return Moves.MoveToEmptySpot;
    }

    // Capture move: two squares diagonal.
    if (Math.abs(dx) === 2) {
      // Compute the midpoint (the square being jumped).
      const midX = movingPiece.x + dx / 2;
      const midY = movingPiece.y + dy / 2;

      // An enemy piece must occupy the midpoint.
      const enemyPresent = enemyBoard.some(piece => piece.x === midX && piece.y === midY);
      if (!enemyPresent) return Moves.None;

      // Determine the horizontal direction for capture.
      // (This is arbitrary; you can choose labels as needed.)
      return dx < 0 ? Moves.EatLeft : Moves.EatRight;
    }

    // If the king tries to move more than two squares (i.e. “flying king” logic),
    // it’s not supported in this simple implementation.
    return Moves.None;
  } finally {
    console.timeEnd("King Logic took:");
  }
};

const updateGameKing = (current_room: Room, position: Position, type: number, time: number) => {
  console.log("time", time);
  const result = calculateKingMove(current_room.board, position, type)
  console.log("the result of the logic is :", result)
  if (result !== Moves.None) {
    if (result === Moves.EatLeft || Moves.EatRight || Moves.MoveToEmptySpot) {
      const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type)
    }
    switch (result) {
      case Moves.EatLeft:
        removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;

      case Moves.EatRight:
        removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;

      default:
        break;
    }
    io.to(current_room!.name).emit("board", current_room.board)
    io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
    io.to(current_room!.name).emit("update piece", position, type, time)
  }
}

const updateGamePawn = (current_room: Room, position: Position, type: number, time: number) => {
  console.log("time", time);
  const result = calculateMove(current_room.board, position, type)
  console.log("the result of the logic is :", result)
  if (result !== Moves.None) {
    if (result === Moves.EatLeft || Moves.EatRight || Moves.MoveToEmptySpot) {
      const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type)
    } else if (result === Moves.EatRightUpgrage || Moves.EatLeftUpgrage || Moves.MoveToEmptySpotUpgrade) {
      const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y, king: true }, type)
    }
    switch (result) {
      case Moves.EatLeft:
        removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;

      case Moves.EatRight:
        removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;
      case Moves.EatLeftUpgrage:
        removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;

      case Moves.EatRightUpgrage:
        removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0)
        break;
      default:
        break;
    }
    io.to(current_room!.name).emit("board", current_room.board)
    io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
    io.to(current_room!.name).emit("update piece", position, type, time)
  }
}

const calculateMove = (
  boards: Position[][],
  newPos: Position,
  player: number
): Moves => {
  console.time("Logic took:");
  try {
    // Get the moving piece from the player's board by matching the index.
    const playerBoard = boards[player];
    const enemyBoard = boards[1 - player];
    const movingPiece = playerBoard.find((p) => p.index === newPos.index);
    if (!movingPiece) return Moves.None;

    // Compute the differences between the new position and the old one.
    const dx = newPos.x - movingPiece.x;
    const dy = newPos.y - movingPiece.y;

    // The move must be diagonal: dx and dy must be nonzero and have the same absolute value.
    if (dx === 0 || Math.abs(dx) !== Math.abs(dy)) {
      return Moves.None;
    }

    // For non-king pieces, enforce forward movement.
    // (Player 0 moves up: new y must be lower; player 1 moves down: new y must be higher.)
    if (!movingPiece.king) {
      if (player === 0 && dy >= 0) return Moves.None;
      if (player === 1 && dy <= 0) return Moves.None;
    }

    // For non-king pieces, only one-step (simple move) or two-step (capture) moves are allowed.
    if (!movingPiece.king && Math.abs(dx) > 2) return Moves.None;

    // Ensure the destination is not occupied by any piece.
    const destinationOccupied = boards[0]
      .concat(boards[1])
      .some((p) => p.x === newPos.x && p.y === newPos.y);
    if (destinationOccupied) return Moves.None;

    // If moving two steps, it must be a capture move.
    if (Math.abs(dx) === 2) {
      // The piece being jumped over should be exactly midway.
      const midX = movingPiece.x + dx / 2;
      const midY = movingPiece.y + dy / 2;
      const enemyPresent = enemyBoard.some((p) => p.x === midX && p.y === midY);
      if (!enemyPresent) return Moves.None;

      // Determine left or right capture based on horizontal movement.
      // (You can rename these as you prefer; here a leftward move is considered "EatLeft".)
      // Also, check for promotion:
      const promotionRow = player === 0 ? 0 : 7; // adjust board size if needed
      const isPromotion = newPos.y === promotionRow;
      if (dx < 0) {
        return isPromotion ? Moves.EatLeftUpgrage : Moves.EatLeft;
      } else {
        return isPromotion ? Moves.EatRightUpgrage : Moves.EatRight;
      }
    }

    // A one-step diagonal move into an empty square is allowed.
    if (Math.abs(dx) === 1) {
      return Moves.MoveToEmptySpot;
    }

    // If none of the valid cases match, return None.
    return Moves.None;
  } finally {
    console.timeEnd("Logic took:");
  }
};


const updateBoard = (board: Position[][], newPosition: Position, type: number) => {
  console.log("updating board with position", newPosition)
  switch (type) {
    case 0:
      const indexBlack = board[0].findIndex(p => p.index === newPosition.index);
      if (indexBlack > -1) {
        board[0][indexBlack] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
        if (board[0].length === 0) {
          return "Game Over"
        }
      }
      break;

    case 1:
      const indexWhite = board[1].findIndex(p => p.index === newPosition.index);
      if (indexWhite > -1) {
        board[1][indexWhite] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
        if (board[1].length === 0) {
          return "Game Over"
        }
      }
      break;
  }
};

const removePiece = (room_number: string, boards: Position[][], removeIndex: string, type: number) => {
  console.log("removed index", removeIndex)
  switch (type) {
    case 0:
      const index_black = boards[0].findIndex(
        (item) => item.index === removeIndex,
      );
      console.log("before black board :", boards[0]);
      boards[0].splice(index_black, 1);
      console.log("new black board :", boards[0]);

      break;

    case 1:
      const index_white = boards[1].findIndex(
        (item) => item.index === removeIndex,
      );

      boards[1].splice(index_white, 1);
      console.log("new white board :", boards[1]);
      break;
  }

};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  var current_room: Room | undefined = { name: '', size: 0, players: new Map<string, number>, spectators: [], turn: 1, board: initboard(), moves_played: [[], []] }
  //join a room 
  console.log("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))

  socket.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))

  socket.on("leave room", async (room: String) => {
    socket.leave(room.toString())
  })

  socket.on("Eat Multiple", (positions: Position[], type, time) => {
    try {
      positions.forEach(position => {
        var result
        switch (position.king) {
          case true:
            updateGameKing(current_room, position, type, time)
            break;
          case false:
            updateGamePawn(current_room, position, type, time)
            break;

        }
      });
      current_room!.turn = type == 0 ? 0 : 1;
      io.to(current_room!.name).except(socket.id).emit("turn")
    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("msg", error)
    }
  });


  socket.on("join room as player", async (room: string) => {
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
    socket.on("join room as spectator", async (room: string) => {
      current_room = emptyRooms.get(room) ?? fullRooms.get(room)
      if (current_room === undefined) {
        socket.emit("msg", "Room doesn't exits");
      } else {
        await socket.join(room.toString())
        io.to(current_room.name).emit("board", current_room.board)
        current_room.spectators.push(socket.id)
      }
    });

  socket.on("get board", async () => {
    console.log("room", current_room)
    socket.emit("board", current_room.board)
    socket.emit("moves", current_room.moves_played[0], 0)
    socket.emit("moves", current_room.moves_played[1], 1)

  })
  socket.on("create room", async (room_name: string) => {
    current_room = emptyRooms.get(room_name) ?? fullRooms.get(room_name)
    if (current_room === undefined) {
      socket.join(room_name);
      const room: Room = {
        name: room_name,
        size: 1,
        players: new Map<string, number>,
        spectators: [],
        turn: 0,//0 cuz the first move is gonna be of type 1 white 
        board: initboard(),
        moves_played: [[], []]
      }
      current_room = room
      room.players.set(socket.id, 1)
      socket.emit("msg", "Room Created Successfully");
      emptyRooms.set(room_name, room)
      io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
    } else {
      socket.emit("msg", "Room does exits");
    }
  });
  socket.on("play puzzle", async (puzzle_name: string) => {
    try {

      const puzzle = Puzzles[puzzle_name]
      const puzzle_room_name = puzzle_name + randomUUID()
      socket.join(puzzle_room_name);
      const puzzle_room: PuzzleRoom = {
        puzzle: puzzle,
        player: socket.id,
        spectators: undefined,
        moves_played: undefined
      }
      socket.emit("msg", "Puzzle Room Created Successfully");
      puzzlesRooms.set(puzzle_room_name, puzzle_room)
      io.emit("Puzzle rooms", Array.from(puzzlesRooms.keys()))
    } catch (error) {
      console.log(error)
      io.emit("msg", error)
    }
  });
  socket.on("move piece puzzle", async (position: Position, type: number, time: number, puzzle_room_name: string) => {
    const puzzle_room: PuzzleRoom = puzzlesRooms[puzzle_room_name]
    console.log("position", position)
    console.log("type", type)
    //this make sure only players can send moves not spectators for example
    try {
      if (puzzle_room.player !== socket.id) {
        return;
      }
      puzzle_room.moves_played.push(position)
      switch (position.king) {
        case true:
          updateGameKing(current_room, position, type, time)
          current_room!.turn = type == 0 ? 0 : 1;
          io.to(current_room!.name).except(socket.id).emit("turn")
          break;

        case false:
          updateGamePawn(current_room, position, type, time)
          current_room!.turn = type == 0 ? 0 : 1;
          io.to(current_room!.name).except(socket.id).emit("turn")
          break;
      }

    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("msg", error)
    }
  });

  socket.on("move piece", async (position: Position, type: number, time: number) => {
    console.log("position", position)
    console.log("type", type)
    //this make sure only players can send moves not spectators for example
    try {
      if (!current_room?.players.has(socket.id)) {
        return;
      }
      current_room.moves_played[type].push(position)
      console.log("current Room", current_room)
      console.log("type", type)
      if (current_room?.turn == type) {
        console.log("its not u're turn nigga damn!", type)
        return;
      } else {
        switch (position.king) {
          case true:
            updateGameKing(current_room, position, type, time)
            current_room!.turn = type == 0 ? 0 : 1;
            io.to(current_room!.name).except(socket.id).emit("turn")
            break;

          case false:
            updateGamePawn(current_room, position, type, time)
            current_room!.turn = type == 0 ? 0 : 1;
            io.to(current_room!.name).except(socket.id).emit("turn")
            break;
        }
      }

    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("msg", error)
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
            emptyRooms.delete(current_room.name)
            console.log("deleting empty room")
            break;
          case 1:
            fullRooms.delete(current_room.name)
            emptyRooms.set(current_room.name, current_room)
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
