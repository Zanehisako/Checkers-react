import express from "express"; // Import Express framework
import cors from "cors"; // Import CORS middleware
import http from "http"; // Import Node's HTTP module
import { Server } from "socket.io"; // Import Socket.IO Server class
import { randomUUID } from "crypto";
import { readFile } from "node:fs/promises"

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
  total_time: number[]
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
  return [black_pieces_pos, white_pieces_pos];
};


var current_time = Date.now()

//a get route that returns the leaderboard of players
app.get("/leaderboard", async (_, res) => {
  try {
    const data = await readFile("./leaderboard.json")
    console.log(data.toString())
    res.json(JSON.parse(data.toString()))
  }
  catch (error) {
    res.json(error)
    console.log(error)
  }

})


const CheckDraw = (moves_played: Position[][]): boolean => {
  if (moves_played.length < 2) {
    return false;
  }

  const moveCount = (obj: Position, type: number) => {
    var repeated_count = 0
    for (let index = 0; index < moves_played[type].length; index++) {
      const element = moves_played[type][index];
      if (JSON.stringify(obj) === JSON.stringify(element)) {
        repeated_count++
      }
    }
    return repeated_count
  }

  var moves_checked_white = new Set<Position>()
  var moves_checked_black = new Set<Position>()

  var white_draw = false
  var black_draw = false

  for (let index = 0; index < moves_played[0].length; index++) {
    const element_white = moves_played[0][index];
    if (!moves_checked_white.has(element_white)) {
      moves_checked_white.add(element_white)
      if (moveCount(element_white, 0) >= 5) {
        white_draw = true
      }
    }
    console.log(`move ${JSON.stringify(element_white)} was played: ${moveCount(element_white, 0)}`)
  }

  for (let index = 0; index < moves_played[1].length; index++) {
    const element_black = moves_played[1][index];
    if (!moves_checked_black.has(element_black)) {
      moves_checked_black.add(element_black)
      if (moveCount(element_black, 1) >= 5) {
        black_draw = true
      }
    }
  }

  if (white_draw && black_draw) {
    return true
  }

  return false;
};



const repeatedMoves = (moves_played: Position[], position: Position): boolean => {
  if (moves_played.length < 2) {
    return false;
  }

  const last = moves_played.length - 1;

  // Function to compare two JSON objects
  const isEqual = (obj1: any, obj2: any): boolean => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  };

  if (isEqual(moves_played[last], position) &&
    isEqual(moves_played[last], moves_played[last - 1])) {
    console.log(`last move: ${JSON.stringify(moves_played[last])}`);
    console.log(`new move: ${JSON.stringify(position)}`);
    console.log(`player repeated a move more than 3 times`);
    return true
  }

  return false;
};


const calculateKingMove = (
  boards: Position[][],
  newPos: Position,
  player: number
): MovesKing => {
  try {
    const playerBoard = boards[player];
    const enemyBoard = boards[1 - player];

    // Find the moving piece on the player's board.
    const movingPiece = playerBoard.find(piece => piece.index.trim() === newPos.index.trim());
    if (!movingPiece) {
      console.log("couldnt find king ")
      return MovesKing.None;
    }

    // // Ensure the piece is actually a king.
    // if (!movingPiece.king) {
    //   console.log("is not a king")
    //   return MovesKing.None
    // };

    // Calculate differences.
    const dx = newPos.x - movingPiece.x;
    const dy = newPos.y - movingPiece.y;

    // The move must be strictly diagonal.
    if (Math.abs(dx) !== Math.abs(dy)) {
      console.log("move is not diagonal")
      return MovesKing.None;
    }

    // Check that the destination square is empty.
    const destinationOccupied = boards[0]
      .concat(boards[1])
      .some(piece => piece.x === newPos.x && piece.y === newPos.y);
    if (destinationOccupied) {
      console.log("destination is Occupied")
      return MovesKing.None;
    }

    // Simple move: one square diagonal.
    if (Math.abs(dx) === 1) {
      return MovesKing.MoveToEmptySpot;
    }

    // Capture move: two squares diagonal.
    if (Math.abs(dx) === 2) {
      // Compute the midpoint (the square being jumped).
      const midX = movingPiece.x + dx / 2;
      const midY = movingPiece.y + dy / 2;

      // An enemy piece must occupy the midpoint.
      const enemyPresent = enemyBoard.some(piece => piece.x === midX && piece.y === midY);
      if (!enemyPresent) return MovesKing.None;

      // Determine the capture direction.
      if (dx > 0 && dy < 0) return MovesKing.EatRightUp;
      if (dx < 0 && dy < 0) return MovesKing.EatLeftUp;
      if (dx > 0 && dy > 0) return MovesKing.EatRightDown;
      if (dx < 0 && dy > 0) return MovesKing.EatLeftDown;
    }

    // If the king tries to move more than two squares (i.e. “flying king” logic),
    // it’s not supported in this simple implementation.
    return MovesKing.None;
  } finally {
  }
};



const updateGameKing = (
  multiple: boolean,
  bot: boolean,
  player_name: string,
  current_room: Room,
  newPos: Position,  // new position the player is moving to
  type: number,    // player number (0 or 1)
  time: number
) => {

  // Check if any capture move is mandatory.
  /*
  const captureRequired = hasMandatoryCapture(current_room.board, player);
  console.log(`Mandatory capture required: ${ captureRequired }`);
  */

  // Retrieve the moving king’s original position.
  const playerBoard = current_room.board[type];
  const movingPiece = playerBoard.find(piece => piece.index === newPos.index);
  if (!movingPiece) {
    io.to(player_name).emit("Error", "Moving piece not found!");
    console.log("Error Moving piece not found")
    return;
  }
  const oldX = movingPiece.x;
  const oldY = movingPiece.y;

  // Check what move type was attempted.
  const result = calculateKingMove(current_room.board, newPos, type);

  // Reject non–capture moves if a capture is available.
  /*
  if (
    captureRequired &&
    !(
      result === MovesKing.EatLeftUp ||
      result === MovesKing.EatRightUp ||
      result === MovesKing.EatLeftDown ||
      result === MovesKing.EatRightDown
    )
  ) {
    console.log("Move rejected: Capture is mandatory!");
    io.to(player_name).emit("Error", "You must capture an opponent's piece!");
    return;
  }*/

  if (result !== MovesKing.None) {
    // Update the board to reflect the new position.
    const updateResult = updateBoard(current_room.board, newPos, type);
    if (updateResult === "Game Over") {
      io.to(current_room.name).emit("board", current_room.board);
      io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
      io.to(current_room.name).emit("update piece", newPos, type, time);
      io.to(current_room.name).emit("Game Over");
      return;
    }

    // If the move was a capture, remove the enemy piece.
    if (
      result === MovesKing.EatLeftUp ||
      result === MovesKing.EatRightUp ||
      result === MovesKing.EatLeftDown ||
      result === MovesKing.EatRightDown
    ) {
      // Compute the midpoint coordinates.
      const enemyX = oldX + (newPos.x - oldX) / 2;
      const enemyY = oldY + (newPos.y - oldY) / 2;
      const enemyPlayer = type === 0 ? 1 : 0;
      removePiece(current_room.name, current_room.board, `${enemyX}${enemyY}`, enemyPlayer);

      // Check if the same piece can capture again.
      /*const captureStillAvailable = hasMandatoryCapture(current_room.board, player);
      if (captureStillAvailable && !multiple) {
        console.log("Mandatory additional capture required.");
        io.to(player_name).emit("Error", "You must continue capturing!");
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[player], player);
        io.to(current_room.name).emit("update piece", newPos, player, time);
        return;
      }*/
    } else {

    }

    // Broadcast the updated board state.
    io.to(current_room.name).emit("board", current_room.board);
    io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
    io.to(current_room.name).emit("update piece", newPos, type, time);

    if (!multiple) {
      // Switch turn if not in a multiple–capture sequence.
      current_room.turn = type === 0 ? 1 : 0;
      if (bot) {
        io.to(current_room!.name).emit("turn", current_room.turn)
      } else {
        io.to(current_room.name).except(player_name).emit("turn", current_room.turn);
      }
    }
    current_time = Date.now()
    return result;
  }
  else {
    io.to(current_room!.name).emit("Wrong move", current_room.moves_played[type], type)
    io.to(player_name).emit("turn", current_room.turn)
    current_time = Date.now()
    console.log("wrong move")
  }
};

const updateGamePawn = (multiple: boolean, bot: boolean, player_name: string, current_room: Room, position: Position, type: number, time: number) => {
  // Check if a mandatory capture exists
  /*
  const captureRequired = hasMandatoryCapture(current_room.board, type);
  console.log(`Mandatory capture required: ${ captureRequired }`);
  */

  // Check what move type was attempted
  const result = calculateMove(current_room.board, position, type)
  //console.log("result of logic checking: ", result)

  // Reject non-capture moves if a capture is available
  /*
  if (captureRequired && !(result === Moves.EatLeft || result === Moves.EatRight)) {
    console.log("Move rejected: Capture is mandatory!");
    io.to(player_name).emit("Error", "You must capture an opponent's piece!");
    console.timeEnd("updateGamePawn");
    return;
  }*/
  if (result !== Moves.None) {
    if (result === Moves.EatLeft || Moves.EatRight || Moves.MoveToEmptySpot) {
      const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type)
      if (updateResult === "Game Over") {
        io.to(current_room!.name).emit("board", current_room.board)
        io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
        io.to(current_room!.name).emit("update piece", position, type, time)
        io.to(current_room.name).emit("Game Over")
        return
      }
    } else if (result === Moves.EatRightUpgrage || Moves.EatLeftUpgrage || Moves.MoveToEmptySpotUpgrade) {
      const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y, king: true }, type)
      if (updateResult === "Game Over") {
        io.to(current_room!.name).emit("board", current_room.board)
        io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
        io.to(current_room!.name).emit("update piece", position, type, time)
        io.to(current_room.name).emit("Game Over")
        return
      }
    }
    //const captureRequired = hasMandatoryCapture(current_room.board, type);
    switch (result) {
      case Moves.EatLeft:
        removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1} `, type == 0 ? 1 : 0)
        /* const captureRequiredLeft = hasMandatoryCapture(current_room.board, type);
        if (captureRequiredLeft && !multiple) {
          console.log(`Mandatory capture required: ${ captureRequired } `);
          io.to(player_name).emit("Error", "Mandatory capture required")
          io.to(current_room!.name).emit("board", current_room.board)
          io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
          io.to(current_room!.name).emit("update piece", position, type, time)
          return
        } */
        break;

      case Moves.EatRight:
        removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1} `, type == 0 ? 1 : 0)
        /*
          const captureRequiredRight = hasMandatoryCapture(current_room.board, type);
          if (captureRequiredRight && !multiple) {
            console.log(`Mandatory capture required: ${ captureRequired } `);
            io.to(player_name).emit("Error", "Mandatory capture required")
            io.to(current_room!.name).emit("board", current_room.board)
            io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
            io.to(current_room!.name).emit("update piece", position, type, time)
            return
          }*/
        break;
      case Moves.EatLeftUpgrage:
        removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1} `, type == 0 ? 1 : 0)
        /* const captureRequiredLeft_Upgraded = hasMandatoryCapture(current_room.board, type);
        if (captureRequiredLeft_Upgraded && !multiple) {
          console.log(`Mandatory capture required: ${ captureRequired } `);
          io.to(player_name).emit("Error", "Mandatory capture required")
          io.to(current_room!.name).emit("board", current_room.board)
          io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
          io.to(current_room!.name).emit("update piece", position, type, time)
          return
        } */
        break;

      case Moves.EatRightUpgrage:
        removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1} `, type == 0 ? 1 : 0)
        /* const captureRequiredRight_Upgraded = hasMandatoryCapture(current_room.board, type);
        if (captureRequiredRight_Upgraded && !multiple) {
          console.log(`Mandatory capture required: ${ captureRequired } `);
          io.to(player_name).emit("Error", "Mandatory capture required")
          io.to(current_room!.name).emit("board", current_room.board)
          io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
          io.to(current_room!.name).emit("update piece", position, type, time)
          return
        } */
        break;
      default:
        break;
    }
    //this checkes for another capture

    io.to(current_room!.name).emit("board", current_room.board)
    io.to(current_room!.name).emit("moves", current_room.moves_played[type], type)
    io.to(current_room!.name).emit("update piece", position, type, time)
    if (!multiple) {
      current_room!.turn = type == 0 ? 1 : 0;
      if (bot) {
        io.to(current_room!.name).emit("turn", current_room.turn)
      } else {
        io.to(current_room!.name).except(player_name).emit("turn", current_room.turn)
      }

      current_time = Date.now()
    }
  }
  else {
    io.to(current_room!.name).emit("Wrong move", current_room.moves_played[type], type)
    io.to(player_name).emit("turn", current_room.turn)

    current_time = Date.now()
  }
  return result
}

const hasMandatoryCapture = (board: Position[][], player: number): boolean => {
  // For a pawn, determine the vertical movement direction.
  // Player 0 must move upward (negative y change), and player 1 downward (positive y change).
  const dy = player === 0 ? -1 : 1;
  const jumpY = player === 0 ? -2 : 2;

  // The pieces for the current player and the opponent.
  const playerPieces = board[player];
  const opponentPieces = board[player === 0 ? 1 : 0];

  return playerPieces.some((piece) => {
    const { x, y, king } = piece;

    // Define the basic capture moves for a pawn.
    let captureMoves = [
      { dx: -1, dy: dy, jumpX: -2, jumpY: jumpY }, // Left capture
      { dx: 1, dy: dy, jumpX: 2, jumpY: jumpY }  // Right capture
    ];

    // If this piece is a king, add the backward capture moves.
    if (king) {
      captureMoves.push(
        { dx: -1, dy: -dy, jumpX: -2, jumpY: -jumpY },
        { dx: 1, dy: -dy, jumpX: 2, jumpY: -jumpY }
      );
    }

    // Check each possible capture move.
    return captureMoves.some(({ dx, dy: moveDy, jumpX, jumpY: moveJumpY }) => {
      const midX = x + dx;
      const midY = y + moveDy;
      const landX = x + jumpX;
      const landY = y + moveJumpY;

      // Determine if an opponent piece occupies the middle square.
      const isOpponent = opponentPieces.some((p) => p.x === midX && p.y === midY);
      // And ensure that the landing square is not occupied by any piece.
      const isLandingEmpty = !playerPieces.some((p) => p.x === landX && p.y === landY) &&
        !opponentPieces.some((p) => p.x === landX && p.y === landY);

      if (isOpponent && isLandingEmpty) {
        console.log(`Mandatory capture found for player ${player}: piece at(${x}, ${y}) can jump over(${midX}, ${midY}) to(${landX}, ${landY})`);
        return true;
      }
      return false;
    });
  });
};

const calculateMove = (
  boards: Position[][],
  newPos: Position,
  player: number
): Moves => {
  try {
    // Get the moving piece from the player's board by matching the index.
    const playerBoard = boards[player];
    const enemyBoard = boards[1 - player];
    const movingPiece = playerBoard.find((p) => p.index.trim() === newPos.index.trim());
    if (!movingPiece) {
      console.log("Get the moving piece from the player's board by matching the index."); return Moves.None;
    }

    // Compute the differences between the new position and the old one.
    const dx = newPos.x - movingPiece.x;
    const dy = newPos.y - movingPiece.y;

    // The move must be diagonal: dx and dy must be nonzero and have the same absolute value.
    if (dx === 0 || Math.abs(dx) !== Math.abs(dy)) {
      console.log("The move must be diagonal")
      return Moves.None;
    }

    // For non-king pieces, enforce forward movement.
    // (Player 0 moves up: new y must be lower; player 1 moves down: new y must be higher.)
    if (!movingPiece.king) {
      if (player === 0 && dy >= 0) { console.log("Player 0 moves up: new y must be lower; player 1 moves down: new y must be higher."); return Moves.None; }
      if (player === 1 && dy <= 0) { console.log("Player 0 moves up: new y must be lower; player 1 moves down: new y must be higher."); return Moves.None; }
    }

    // For non-king pieces, only one-step (simple move) or two-step (capture) moves are allowed.
    if (!movingPiece.king && Math.abs(dx) > 2) { console.log("For non-king pieces, only one-step (simple move) or two-step (capture) moves are allowed."); return Moves.None };

    // Ensure the destination is not occupied by any piece.
    const destinationOccupied = boards[0]
      .concat(boards[1])
      .some((p) => p.x === newPos.x && p.y === newPos.y);
    if (destinationOccupied) { console.log("occupied"); return Moves.None; }

    // If moving two steps, it must be a capture move.
    if (Math.abs(dx) === 2) {
      // The piece being jumped over should be exactly midway.
      const midX = movingPiece.x + dx / 2;
      const midY = movingPiece.y + dy / 2;
      const enemyPresent = enemyBoard.some((p) => p.x === midX && p.y === midY);
      if (!enemyPresent) { console.log("If moving two steps, it must be a capture move."); return Moves.None; }

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
    console.log("If none of the valid cases match, return None.")
    return Moves.None;
  } finally {
  }
};


const updateBoard = (board: Position[][], newPosition: Position, type: number) => {
  switch (type) {
    case 0:
      const indexBlack = board[0].findIndex(p => p.index === newPosition.index);
      if (indexBlack > -1) {
        if (newPosition.king) {
          board[0][indexBlack] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
        } else {
          board[0][indexBlack] = { ...newPosition, index: `${newPosition.x}${newPosition.y}`, king: newPosition.y === 0 ? true : false }; // ✅ Direct array update
        }
        if (board[0].length === 0 || board[1].length === 0) {
          return "Game Over"
        }
      }
      break;

    case 1:
      const indexWhite = board[1].findIndex(p => p.index === newPosition.index);
      if (indexWhite > -1) {
        if (newPosition.king) {
          board[1][indexWhite] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
        } else {
          board[1][indexWhite] = { ...newPosition, index: `${newPosition.x}${newPosition.y}`, king: newPosition.y === 7 ? true : false }; // ✅ Direct array update
        }
        if (board[0].length === 0 || board[1].length === 0) {
          return "Game Over"
        }
      }
      break;
  }
};

const removePiece = (room_number: string, boards: Position[][], removeIndex: string, type: number) => {
  switch (type) {
    case 0:
      const index_black = boards[0].findIndex(
        (item) => item.index.trim() === removeIndex.trim(),
      );
      boards[0].splice(index_black, 1);

      break;

    case 1:
      const index_white = boards[1].findIndex(
        (item) => item.index.trim() === removeIndex.trim(),
      );

      boards[1].splice(index_white, 1);
      break;
  }

};

io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  var current_room: Room | undefined = { name: '', size: 0, players: new Map<string, number>, spectators: [], turn: 1, board: initboard(), moves_played: [[], []], total_time: [0, 0] }
  //join a room 
  console.log("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))

  socket.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))

  socket.on("leave room", async (room: String) => {
    socket.leave(room.toString())
  })

  socket.on("Eat Multiple", (positions: Position[], type, time) => {
    try {
      positions.forEach(position => {
        switch (position.king) {
          case true:
            const resultKing = updateGameKing(true, false, socket.id, current_room, position, type, time)
            if (resultKing === MovesKing.MoveToEmptySpot) {
              return
            }
            break;
          case false:
            const resultPawn = updateGamePawn(true, false, socket.id, current_room, position, type, time)
            if (resultPawn === Moves.MoveToEmptySpot || Moves.MoveToEmptySpotUpgrade) {
              return
            }
            break;

        }
      });
      current_room!.turn = type == 0 ? 0 : 1;
      io.to(current_room!.name).except(socket.id).emit("turn")

    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("Error", error)
    }
    current_time = Date.now()
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
          io.to(room.toString()).except(socket.id).emit("board", current_room.board)
          io.to(room.toString()).except(socket.id).emit("turn", current_room.turn)

          io.to(room.toString()).except(socket.id).emit("Player Joined", socket.id)
          current_time = Date.now()
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
        io.to(current_room.name).emit("total time", current_room.total_time)
        current_room.spectators.push(socket.id)
      }
    });

  socket.on("get board", async () => {
    socket.emit("board", current_room.board)
    socket.emit("moves", current_room.moves_played[0], 0)
    socket.emit("moves", current_room.moves_played[1], 1)
    socket.emit("total time", current_room.total_time)
  })

  socket.on("create room", async (room_name: string) => {
    try {

      current_room = emptyRooms.get(room_name) ?? fullRooms.get(room_name)
      if (current_room === undefined) {
        socket.join(room_name);
        const room: Room = {
          name: room_name,
          size: 1,
          players: new Map<string, number>,
          spectators: [],
          turn: 1,//1 cuz the first move is gonna be of type 1 white 
          board: initboard(),
          moves_played: [[], []],
          total_time: [0, 0]
        }
        current_room = room
        room.players.set(socket.id, 1)
        socket.emit("msg", "Room Created Successfully");
        emptyRooms.set(room_name, room)
        io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))
      } else {
        socket.emit("msg", "Room does exits");
      }
    } catch (error) {
      console.log(error)
      io.emit("Error", error)

    }
  });

  socket.on("create room bots", async (room_name: string) => {
    try {
      current_room = emptyRooms.get(room_name) ?? fullRooms.get(room_name)
      if (current_room === undefined) {
        socket.join(room_name);
        const room: Room = {
          name: room_name,
          size: 2,
          players: new Map<string, number>,
          spectators: [],
          turn: 1,//1 cuz the first move is gonna be of type 1 white 
          board: initboard(),
          moves_played: [[], []],
          total_time: [0, 0]
        }
        current_room = room
        room.players.set("white", 1)
        room.players.set("black", 0)
        socket.emit("msg", "Room Created Successfully");
        socket.emit("board", current_room.board);
        setTimeout(() => 1)
        socket.emit("turn", room.turn);
        fullRooms.set(room_name, room)
        io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()))

        current_time = Date.now()
      } else {
        socket.emit("msg", "Room does exits");
      }
    } catch (error) {
      console.log(error)
      io.emit("Error", error)
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
      io.emit("Error", error)
    }
  });
  socket.on("move piece puzzle", async (position: Position, type: number, time: number, puzzle_room_name: string) => {
    const puzzle_room: PuzzleRoom = puzzlesRooms[puzzle_room_name]
    //this make sure only players can send moves not spectators for example
    try {
      if (puzzle_room.player !== socket.id) {
        return;
      }
      puzzle_room.moves_played.push(position)
      switch (position.king) {
        case true:
          updateGameKing(false, false, socket.id, current_room, position, type, time)
          io.to(current_room!.name).except(socket.id).emit("turn", current_room.turn)
          current_time = Date.now()
          break;

        case false:
          updateGamePawn(false, false, socket.id, current_room, position, type, time)
          io.to(current_room!.name).except(socket.id).emit("turn", current_room.turn)

          current_time = Date.now()
          break;
      }

    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("Error", error)
    }
  });

  socket.on("move piece", async (position: Position, type: number, time: number) => {
    //this make sure only players can send moves not spectators for example
    time = (Date.now() - current_time) / 1000
    current_room.total_time[1 - type] += time
    try {
      if (!current_room?.players.has(socket.id)) {
        return;
      }
      current_room.moves_played[type].push(position)
      if (repeatedMoves(current_room.moves_played[type], position)) {
        io.to(current_room.name).emit("Game Over")
        console.log("Game Over")
        return
      } else if (CheckDraw(current_room.moves_played)) {
        io.to(current_room.name).emit("Draw")
        console.log("Draw")
        return
      }
      if (current_room?.turn != type) {
        console.log("its not u're turn nigga damn!", type)
        return;
      } else {
        switch (position.king) {
          case true:
            updateGameKing(false, false, socket.id, current_room, position, type, time)
            io.to(current_room.name).emit("total time", current_room.total_time)
            break;

          case false:
            updateGamePawn(false, false, socket.id, current_room, position, type, time)
            io.to(current_room.name).emit("total time", current_room.total_time)
            break;
        }
      }

    } catch (error) {
      console.log(error)
      io.to(current_room!.name).emit("msg", error)
    }
  });

  socket.on("move piece bot", async (position: Position, type: number, time: number) => {
    time = (Date.now() - current_time) / 1000
    current_room.total_time[1 - type] += time

    current_room.moves_played[type].push(position)
    if (repeatedMoves(current_room.moves_played[type], position)) {
      io.to(current_room.name).emit("Game Over")
      console.log("Game Over")
      return
    } else if (CheckDraw(current_room.moves_played)) {
      io.to(current_room.name).emit("Draw")
      console.log("Draw")
      return
    }
    if (current_room?.turn != type) {
      console.log("its not u're turn nigga damn!", type)
      return;
    } else {
      switch (position.king) {
        case true:
          updateGameKing(false, true, socket.id, current_room, position, type, time)
          io.to(current_room.name).emit("total time", current_room.total_time)
          break;

        case false:
          updateGamePawn(false, true, socket.id, current_room, position, type, time)
          io.to(current_room.name).emit("total time", current_room.total_time)
          break;
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
    if (current_room.players.has("white")) {
      fullRooms.delete(current_room.name)
    }
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
