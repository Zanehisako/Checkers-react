"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express")); // Import Express framework
const cors_1 = __importDefault(require("cors")); // Import CORS middleware
const http_1 = __importDefault(require("http")); // Import Node's HTTP module
const socket_io_1 = require("socket.io"); // Import Socket.IO Server class
const crypto_1 = require("crypto");
var Moves;
(function (Moves) {
    Moves[Moves["None"] = 0] = "None";
    Moves[Moves["MoveToEmptySpot"] = 1] = "MoveToEmptySpot";
    Moves[Moves["EatRight"] = 2] = "EatRight";
    Moves[Moves["EatLeft"] = 3] = "EatLeft";
    Moves[Moves["MoveToEmptySpotUpgrade"] = 4] = "MoveToEmptySpotUpgrade";
    Moves[Moves["EatRightUpgrage"] = 5] = "EatRightUpgrage";
    Moves[Moves["EatLeftUpgrage"] = 6] = "EatLeftUpgrage";
})(Moves || (Moves = {}));
var MovesKing;
(function (MovesKing) {
    MovesKing[MovesKing["None"] = 0] = "None";
    MovesKing[MovesKing["MoveToEmptySpot"] = 1] = "MoveToEmptySpot";
    MovesKing[MovesKing["EatRightUp"] = 2] = "EatRightUp";
    MovesKing[MovesKing["EatLeftUp"] = 3] = "EatLeftUp";
    MovesKing[MovesKing["EatRightDown"] = 4] = "EatRightDown";
    MovesKing[MovesKing["EatLeftDown"] = 5] = "EatLeftDown";
})(MovesKing || (MovesKing = {}));
const PORT = 3001;
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
const emptyRooms = new Map();
const fullRooms = new Map();
const Puzzles = new Map();
const puzzlesRooms = new Map();
const initboard = () => {
    const black_pieces_pos = [];
    const white_pieces_pos = [];
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
    console.log(black_pieces_pos, white_pieces_pos);
    return [black_pieces_pos, white_pieces_pos];
};
const calculateKingMove = (boards, newPos, player) => {
    console.time("King Logic took:");
    try {
        const playerBoard = boards[player];
        const enemyBoard = boards[1 - player];
        // Find the moving piece on the player's board.
        const movingPiece = playerBoard.find(piece => piece.index === newPos.index);
        if (!movingPiece)
            return MovesKing.None;
        // Ensure the piece is actually a king.
        if (!movingPiece.king)
            return MovesKing.None;
        // Calculate differences.
        const dx = newPos.x - movingPiece.x;
        const dy = newPos.y - movingPiece.y;
        // The move must be strictly diagonal.
        if (Math.abs(dx) !== Math.abs(dy))
            return MovesKing.None;
        // Check that the destination square is empty.
        const destinationOccupied = boards[0]
            .concat(boards[1])
            .some(piece => piece.x === newPos.x && piece.y === newPos.y);
        if (destinationOccupied)
            return MovesKing.None;
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
            if (!enemyPresent)
                return MovesKing.None;
            // Determine the capture direction.
            if (dx > 0 && dy < 0)
                return MovesKing.EatRightUp;
            if (dx < 0 && dy < 0)
                return MovesKing.EatLeftUp;
            if (dx > 0 && dy > 0)
                return MovesKing.EatRightDown;
            if (dx < 0 && dy > 0)
                return MovesKing.EatLeftDown;
        }
        // If the king tries to move more than two squares (i.e. “flying king” logic),
        // it’s not supported in this simple implementation.
        return MovesKing.None;
    }
    finally {
        console.timeEnd("King Logic took:");
    }
};
const updateGameKing = (multiple, player_name, current_room, newPos, // new position the player is moving to
player, // player number (0 or 1)
time) => {
    console.log("time", time);
    // Check if any capture move is mandatory.
    const captureRequired = hasMandatoryCapture(current_room.board, player);
    console.log(`Mandatory capture required: ${captureRequired}`);
    // Retrieve the moving king’s original position.
    const playerBoard = current_room.board[player];
    const movingPiece = playerBoard.find(piece => piece.index === newPos.index);
    if (!movingPiece) {
        io.to(player_name).emit("Error", "Moving piece not found!");
        return;
    }
    const oldX = movingPiece.x;
    const oldY = movingPiece.y;
    // Check what move type was attempted.
    const result = calculateKingMove(current_room.board, newPos, player);
    // Reject non–capture moves if a capture is available.
    if (captureRequired &&
        !(result === MovesKing.EatLeftUp ||
            result === MovesKing.EatRightUp ||
            result === MovesKing.EatLeftDown ||
            result === MovesKing.EatRightDown)) {
        console.log("Move rejected: Capture is mandatory!");
        io.to(player_name).emit("Error", "You must capture an opponent's piece!");
        return;
    }
    console.log("Result from king move logic:", result);
    if (result !== MovesKing.None) {
        // Update the board to reflect the new position.
        const updateResult = updateBoard(current_room.board, newPos, player);
        if (updateResult === "Game Over") {
            io.to(current_room.name).emit("board", current_room.board);
            io.to(current_room.name).emit("moves", current_room.moves_played[player], player);
            io.to(current_room.name).emit("update piece", newPos, player, time);
            io.to(current_room.name).emit("Game Over");
            return;
        }
        // If the move was a capture, remove the enemy piece.
        if (result === MovesKing.EatLeftUp ||
            result === MovesKing.EatRightUp ||
            result === MovesKing.EatLeftDown ||
            result === MovesKing.EatRightDown) {
            // Compute the midpoint coordinates.
            const enemyX = oldX + (newPos.x - oldX) / 2;
            const enemyY = oldY + (newPos.y - oldY) / 2;
            const enemyPlayer = player === 0 ? 1 : 0;
            removePiece(current_room.name, current_room.board, `${enemyX}${enemyY}`, enemyPlayer);
            // Check if the same piece can capture again.
            const captureStillAvailable = hasMandatoryCapture(current_room.board, player);
            if (captureStillAvailable && !multiple) {
                console.log("Mandatory additional capture required.");
                io.to(player_name).emit("Error", "You must continue capturing!");
                io.to(current_room.name).emit("board", current_room.board);
                io.to(current_room.name).emit("moves", current_room.moves_played[player], player);
                io.to(current_room.name).emit("update piece", newPos, player, time);
                return;
            }
        }
        // Broadcast the updated board state.
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[player], player);
        io.to(current_room.name).emit("update piece", newPos, player, time);
        if (!multiple) {
            // Switch turn if not in a multiple–capture sequence.
            current_room.turn = player === 0 ? 1 : 0;
            io.to(current_room.name).except(player_name).emit("turn");
        }
        return result;
    }
};
const updateGamePawn = (multiple, player_name, current_room, position, type, time) => {
    console.log("time", time);
    // Check if a mandatory capture exists
    const captureRequired = hasMandatoryCapture(current_room.board, type);
    console.log(`Mandatory capture required: ${captureRequired}`);
    // Check what move type was attempted
    const result = calculateMove(current_room.board, position, type);
    // Reject non-capture moves if a capture is available
    if (captureRequired && !(result === Moves.EatLeft || result === Moves.EatRight)) {
        console.log("Move rejected: Capture is mandatory!");
        io.to(player_name).emit("Error", "You must capture an opponent's piece!");
        console.timeEnd("updateGamePawn");
        return;
    }
    console.log("the result of the logic is :", result);
    if (result !== Moves.None) {
        if (result === Moves.EatLeft || Moves.EatRight || Moves.MoveToEmptySpot) {
            const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type);
            if (updateResult === "Game Over") {
                io.to(current_room.name).emit("board", current_room.board);
                io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                io.to(current_room.name).emit("update piece", position, type, time);
                io.to(current_room.name).emit("Game Over");
                return;
            }
        }
        else if (result === Moves.EatRightUpgrage || Moves.EatLeftUpgrage || Moves.MoveToEmptySpotUpgrade) {
            const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y, king: true }, type);
            if (updateResult === "Game Over") {
                io.to(current_room.name).emit("board", current_room.board);
                io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                io.to(current_room.name).emit("update piece", position, type, time);
                io.to(current_room.name).emit("Game Over");
                return;
            }
        }
        const captureRequired = hasMandatoryCapture(current_room.board, type);
        switch (result) {
            case Moves.EatLeft:
                removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                const captureRequiredLeft = hasMandatoryCapture(current_room.board, type);
                if (captureRequiredLeft && !multiple) {
                    console.log(`Mandatory capture required: ${captureRequired}`);
                    io.to(player_name).emit("Error", "Mandatory capture required");
                    io.to(current_room.name).emit("board", current_room.board);
                    io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                    io.to(current_room.name).emit("update piece", position, type, time);
                    return;
                }
                break;
            case Moves.EatRight:
                removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                const captureRequiredRight = hasMandatoryCapture(current_room.board, type);
                if (captureRequiredRight && !multiple) {
                    console.log(`Mandatory capture required: ${captureRequired}`);
                    io.to(player_name).emit("Error", "Mandatory capture required");
                    io.to(current_room.name).emit("board", current_room.board);
                    io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                    io.to(current_room.name).emit("update piece", position, type, time);
                    return;
                }
                break;
            case Moves.EatLeftUpgrage:
                removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                const captureRequiredLeft_Upgraded = hasMandatoryCapture(current_room.board, type);
                if (captureRequiredLeft_Upgraded && !multiple) {
                    console.log(`Mandatory capture required: ${captureRequired}`);
                    io.to(player_name).emit("Error", "Mandatory capture required");
                    io.to(current_room.name).emit("board", current_room.board);
                    io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                    io.to(current_room.name).emit("update piece", position, type, time);
                    return;
                }
                break;
            case Moves.EatRightUpgrage:
                removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                const captureRequiredRight_Upgraded = hasMandatoryCapture(current_room.board, type);
                if (captureRequiredRight_Upgraded && !multiple) {
                    console.log(`Mandatory capture required: ${captureRequired}`);
                    io.to(player_name).emit("Error", "Mandatory capture required");
                    io.to(current_room.name).emit("board", current_room.board);
                    io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
                    io.to(current_room.name).emit("update piece", position, type, time);
                    return;
                }
                break;
            default:
                break;
        }
        //this checkes for another capture
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
        io.to(current_room.name).emit("update piece", position, type, time);
        if (!multiple) {
            current_room.turn = type == 0 ? 0 : 1;
            io.to(current_room.name).except(player_name).emit("turn");
        }
    }
    return result;
};
const hasMandatoryCapture = (board, player) => {
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
            { dx: 1, dy: dy, jumpX: 2, jumpY: jumpY } // Right capture
        ];
        // If this piece is a king, add the backward capture moves.
        if (king) {
            captureMoves.push({ dx: -1, dy: -dy, jumpX: -2, jumpY: -jumpY }, { dx: 1, dy: -dy, jumpX: 2, jumpY: -jumpY });
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
                console.log(`Mandatory capture found for player ${player}: piece at (${x}, ${y}) can jump over (${midX}, ${midY}) to (${landX}, ${landY})`);
                return true;
            }
            return false;
        });
    });
};
const calculateMove = (boards, newPos, player) => {
    console.time("Logic took:");
    try {
        // Get the moving piece from the player's board by matching the index.
        const playerBoard = boards[player];
        const enemyBoard = boards[1 - player];
        const movingPiece = playerBoard.find((p) => p.index === newPos.index);
        if (!movingPiece)
            return Moves.None;
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
            if (player === 0 && dy >= 0)
                return Moves.None;
            if (player === 1 && dy <= 0)
                return Moves.None;
        }
        // For non-king pieces, only one-step (simple move) or two-step (capture) moves are allowed.
        if (!movingPiece.king && Math.abs(dx) > 2)
            return Moves.None;
        // Ensure the destination is not occupied by any piece.
        const destinationOccupied = boards[0]
            .concat(boards[1])
            .some((p) => p.x === newPos.x && p.y === newPos.y);
        if (destinationOccupied)
            return Moves.None;
        // If moving two steps, it must be a capture move.
        if (Math.abs(dx) === 2) {
            // The piece being jumped over should be exactly midway.
            const midX = movingPiece.x + dx / 2;
            const midY = movingPiece.y + dy / 2;
            const enemyPresent = enemyBoard.some((p) => p.x === midX && p.y === midY);
            if (!enemyPresent)
                return Moves.None;
            // Determine left or right capture based on horizontal movement.
            // (You can rename these as you prefer; here a leftward move is considered "EatLeft".)
            // Also, check for promotion:
            const promotionRow = player === 0 ? 0 : 7; // adjust board size if needed
            const isPromotion = newPos.y === promotionRow;
            if (dx < 0) {
                return isPromotion ? Moves.EatLeftUpgrage : Moves.EatLeft;
            }
            else {
                return isPromotion ? Moves.EatRightUpgrage : Moves.EatRight;
            }
        }
        // A one-step diagonal move into an empty square is allowed.
        if (Math.abs(dx) === 1) {
            return Moves.MoveToEmptySpot;
        }
        // If none of the valid cases match, return None.
        return Moves.None;
    }
    finally {
        console.timeEnd("Logic took:");
    }
};
const updateBoard = (board, newPosition, type) => {
    console.log("updating board with position", newPosition);
    switch (type) {
        case 0:
            const indexBlack = board[0].findIndex(p => p.index === newPosition.index);
            if (indexBlack > -1) {
                board[0][indexBlack] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
                if (board[0].length === 0) {
                    return "Game Over";
                }
            }
            break;
        case 1:
            const indexWhite = board[1].findIndex(p => p.index === newPosition.index);
            if (indexWhite > -1) {
                board[1][indexWhite] = { ...newPosition, index: `${newPosition.x}${newPosition.y}` }; // ✅ Direct array update
                if (board[1].length === 0) {
                    return "Game Over";
                }
            }
            break;
    }
};
const removePiece = (room_number, boards, removeIndex, type) => {
    console.log("removed index", removeIndex);
    switch (type) {
        case 0:
            const index_black = boards[0].findIndex((item) => item.index === removeIndex);
            console.log("before black board :", boards[0]);
            boards[0].splice(index_black, 1);
            console.log("new black board :", boards[0]);
            break;
        case 1:
            const index_white = boards[1].findIndex((item) => item.index === removeIndex);
            boards[1].splice(index_white, 1);
            console.log("new white board :", boards[1]);
            break;
    }
};
io.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    var current_room = { name: '', size: 0, players: new Map, spectators: [], turn: 1, board: initboard(), moves_played: [[], []] };
    //join a room 
    console.log("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
    socket.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
    socket.on("leave room", async (room) => {
        socket.leave(room.toString());
    });
    socket.on("Eat Multiple", (positions, type, time) => {
        try {
            positions.forEach(position => {
                switch (position.king) {
                    case true:
                        const resultKing = updateGameKing(true, socket.id, current_room, position, type, time);
                        if (resultKing === MovesKing.MoveToEmptySpot) {
                            return;
                        }
                        break;
                    case false:
                        const resultPawn = updateGamePawn(true, socket.id, current_room, position, type, time);
                        if (resultPawn === Moves.MoveToEmptySpot || Moves.MoveToEmptySpotUpgrade) {
                            return;
                        }
                        break;
                }
            });
            current_room.turn = type == 0 ? 0 : 1;
            io.to(current_room.name).except(socket.id).emit("turn");
        }
        catch (error) {
            console.log(error);
            io.to(current_room.name).emit("Error", error);
        }
    });
    socket.on("join room as player", async (room) => {
        console.log("join room as player");
        current_room = emptyRooms.get(room) ?? fullRooms.get(room);
        if (current_room === undefined) {
            socket.emit("msg", "Room doesn't exits");
        }
        else if (!current_room.players.has(socket.id)) {
            switch (current_room.size) {
                case 1:
                    await socket.join(room.toString());
                    current_room.size += 1;
                    current_room.players.set(socket.id, 0);
                    fullRooms.set(room, current_room);
                    emptyRooms.delete(room);
                    console.log("player joined room Successfully");
                    socket.emit("msg", "joined room Successfully");
                    io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
                    console.log("Room", room.toString());
                    io.to(room.toString()).except(socket.id).emit("turn");
                    io.to(room.toString()).except(socket.id).emit("Player Joined", socket.id);
                    break;
                default:
                    socket.emit("msg", "Room is full ");
                    break;
            }
        }
        else {
            socket.emit("msg", "The client is already in the room");
        }
    }),
        socket.on("join room as spectator", async (room) => {
            current_room = emptyRooms.get(room) ?? fullRooms.get(room);
            if (current_room === undefined) {
                socket.emit("msg", "Room doesn't exits");
            }
            else {
                await socket.join(room.toString());
                io.to(current_room.name).emit("board", current_room.board);
                current_room.spectators.push(socket.id);
            }
        });
    socket.on("get board", async () => {
        console.log("room", current_room);
        socket.emit("board", current_room.board);
        socket.emit("moves", current_room.moves_played[0], 0);
        socket.emit("moves", current_room.moves_played[1], 1);
    });
    socket.on("create room", async (room_name) => {
        try {
            current_room = emptyRooms.get(room_name) ?? fullRooms.get(room_name);
            if (current_room === undefined) {
                socket.join(room_name);
                const room = {
                    name: room_name,
                    size: 1,
                    players: new Map,
                    spectators: [],
                    turn: 0, //0 cuz the first move is gonna be of type 1 white 
                    board: initboard(),
                    moves_played: [[], []]
                };
                current_room = room;
                room.players.set(socket.id, 1);
                socket.emit("msg", "Room Created Successfully");
                emptyRooms.set(room_name, room);
                io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
            }
            else {
                socket.emit("msg", "Room does exits");
            }
        }
        catch (error) {
            console.log(error);
            io.emit("Error", error);
        }
    });
    socket.on("play puzzle", async (puzzle_name) => {
        try {
            const puzzle = Puzzles[puzzle_name];
            const puzzle_room_name = puzzle_name + (0, crypto_1.randomUUID)();
            socket.join(puzzle_room_name);
            const puzzle_room = {
                puzzle: puzzle,
                player: socket.id,
                spectators: undefined,
                moves_played: undefined
            };
            socket.emit("msg", "Puzzle Room Created Successfully");
            puzzlesRooms.set(puzzle_room_name, puzzle_room);
            io.emit("Puzzle rooms", Array.from(puzzlesRooms.keys()));
        }
        catch (error) {
            console.log(error);
            io.emit("Error", error);
        }
    });
    socket.on("move piece puzzle", async (position, type, time, puzzle_room_name) => {
        const puzzle_room = puzzlesRooms[puzzle_room_name];
        console.log("position", position);
        console.log("type", type);
        //this make sure only players can send moves not spectators for example
        try {
            if (puzzle_room.player !== socket.id) {
                return;
            }
            puzzle_room.moves_played.push(position);
            switch (position.king) {
                case true:
                    updateGameKing(false, socket.id, current_room, position, type, time);
                    io.to(current_room.name).except(socket.id).emit("turn");
                    break;
                case false:
                    updateGamePawn(false, socket.id, current_room, position, type, time);
                    io.to(current_room.name).except(socket.id).emit("turn");
                    break;
            }
        }
        catch (error) {
            console.log(error);
            io.to(current_room.name).emit("Error", error);
        }
    });
    socket.on("move piece", async (position, type, time) => {
        console.log("position", position);
        console.log("type", type);
        //this make sure only players can send moves not spectators for example
        try {
            if (!current_room?.players.has(socket.id)) {
                return;
            }
            current_room.moves_played[type].push(position);
            console.log("current Room", current_room);
            console.log("type", type);
            if (current_room?.turn == type) {
                console.log("its not u're turn nigga damn!", type);
                return;
            }
            else {
                switch (position.king) {
                    case true:
                        updateGameKing(false, socket.id, current_room, position, type, time);
                        break;
                    case false:
                        updateGamePawn(false, socket.id, current_room, position, type, time);
                        break;
                }
            }
        }
        catch (error) {
            console.log(error);
            io.to(current_room.name).emit("msg", error);
        }
    });
    socket.on("disconnect", () => {
        console.log("🔥: A user disconnected");
        const isPlayer = current_room.players.has(socket.id);
        switch (isPlayer) {
            case true:
                if (current_room.size > 0) {
                    current_room.size -= 1;
                }
                current_room?.players.delete(socket.id);
                switch (current_room.size) {
                    case 0:
                        emptyRooms.delete(current_room.name);
                        console.log("deleting empty room");
                        break;
                    case 1:
                        fullRooms.delete(current_room.name);
                        emptyRooms.set(current_room.name, current_room);
                        console.log("deleting full room and creating a full room");
                        break;
                }
                io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
                console.log("empty rooms", emptyRooms);
                console.log("full rooms", fullRooms);
                break;
            case false:
                const index = current_room.spectators.indexOf(socket.id);
                current_room.spectators.splice(index, 1);
                break;
        }
    });
});
server.listen(PORT, () => {
    console.log("im listning on ", PORT);
});
