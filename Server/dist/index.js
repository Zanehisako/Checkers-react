"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express")); // Import Express framework
const cors_1 = __importDefault(require("cors")); // Import CORS middleware
const http_1 = __importDefault(require("http")); // Import Node's HTTP module
const socket_io_1 = require("socket.io"); // Import Socket.IO Server class
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
const logiqueKing = (boards, pos, type) => {
    console.time("Logic took:");
    var result;
    try {
        switch (type) {
            case 0:
                console.log('board', boards[0]);
                console.log("position king black", pos);
                const old_position_black = boards[0][boards[0].findIndex((position) => position.index == pos.index)];
                console.log("old_position_king_black", old_position_black);
                if (old_position_black.y < pos.y || old_position_black.x === pos.x) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("old_position_black.y < pos.y || old_position_black.x === pos.x");
                    return result = MovesKing.None;
                }
                if ((pos.x - old_position_black.x > 2 || old_position_black.x - pos.x > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.x - old_position_black.x > 2 || pos.x + old_position_black.x > 2) && pos.king == false");
                    return result = MovesKing.None;
                }
                if ((pos.y - old_position_black.y > 2 || old_position_black.y - pos.y > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    return result = MovesKing.None;
                }
                if (!boards[1].some((position) => position.x === pos.x && position.y === pos.y)) {
                    console.log("spot is empty");
                    if (boards[1].some((position) => pos.x - 1 === position.x && pos.y + 1 === position.y)) {
                        console.log("EatRight");
                        return MovesKing.EatRightUp;
                    }
                    else if (boards[1].some((position) => pos.x + 1 === position.x && pos.y + 1 === position.y)) {
                        console.log("EatLeft");
                        return MovesKing.EatLeftUp;
                    }
                    else if (boards[1].some((position) => pos.x - 1 === position.x && pos.y - 1 === position.y)) {
                        console.log("EatRightDown");
                        return MovesKing.EatRightDown;
                    }
                    else if (boards[1].some((position) => pos.x + 1 === position.x && pos.y - 1 === position.y)) {
                        console.log("EatLeftDown");
                        return MovesKing.EatLeftDown;
                    }
                    else {
                        return result = MovesKing.MoveToEmptySpot;
                    }
                }
                else {
                    console.log("YOU SHALL NOT PASS!!");
                    return result = MovesKing.None;
                }
            case 1:
                console.log('board', boards[1]);
                console.log("position white", pos);
                const old_position_white = boards[1][boards[1].findIndex((position) => position.index == pos.index)];
                console.log("old_position_white", old_position_white);
                if (old_position_white.y > pos.y || old_position_white.x === pos.x) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("old_position_white.y < pos.y || old_position_white.x === pos.x");
                    return result = MovesKing.None;
                }
                if ((pos.x - old_position_white.x > 2 || old_position_white.x - pos.x > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.x - old_position_white.x > 2 || pos.x + old_position_white.x > 2) && pos.king == false");
                    return result = MovesKing.None;
                }
                if ((pos.y - old_position_white.y > 2 || old_position_white.y - pos.y > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.y - old_position_white.y > 2 || old_position_white.y - pos.y > 2) && pos.king == false");
                    return result = MovesKing.None;
                }
                if (boards[0].some((position) => pos.x + 1 === position.x && pos.y - 1 === position.y)) {
                    console.log("EatRight");
                    return MovesKing.EatRightUp;
                }
                else if (boards[0].some((position) => pos.x - 1 === position.x && pos.y - 1 === position.y)) {
                    console.log("EatLeft");
                    return MovesKing.EatLeftUp;
                }
                else if (boards[0].some((position) => pos.x + 1 === position.x && pos.y + 1 === position.y)) {
                    console.log("EatRightDown");
                    return MovesKing.EatRightDown;
                }
                else if (boards[0].some((position) => pos.x - 1 === position.x && pos.y + 1 === position.y)) {
                    console.log("EatLeftDown");
                    return MovesKing.EatLeftDown;
                }
                else {
                    return result = MovesKing.MoveToEmptySpot;
                }
        }
    }
    finally {
        console.timeEnd("Logic took:");
    }
};
const updateGameKing = (current_room, position, type, time) => {
    console.log("time", time);
    const result = logiqueKing(current_room.board, position, type);
    console.log("the result of the logic is :", result);
    if (result !== MovesKing.None && MovesKing.MoveToEmptySpot) {
        const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type);
        if (updateResult === "Game Over") {
            io.to(current_room.name.toString()).emit("Game Over");
            return;
        }
        current_room.turn = type == 0 ? 0 : 1;
        switch (result) {
            case MovesKing.EatLeftUp:
                removePiece(current_room.name.toString(), current_room.board, `${position.x + 1}${position.y + 1}`, type == 0 ? 1 : 0);
                break;
            case MovesKing.EatLeftDown:
                removePiece(current_room.name.toString(), current_room.board, `${position.x + 1}${position.y - 1}`, type == 0 ? 1 : 0);
                break;
            case MovesKing.EatRightUp:
                removePiece(current_room.name.toString(), current_room.board, `${position.x - 1}${position.y + 1}`, type == 0 ? 1 : 0);
                break;
            case MovesKing.EatRightDown:
                removePiece(current_room.name.toString(), current_room.board, `${position.x - 1}${position.y - 1}`, type == 0 ? 1 : 0);
                break;
        }
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
        io.to(current_room.name).emit("update piece", position, type, time);
    }
    else if (result == MovesKing.MoveToEmptySpot) {
        updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type);
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
        io.to(current_room.name).emit("update piece", position, type, time);
    }
};
const updateGamePawn = (current_room, position, type, time) => {
    console.log("time", time);
    const result = logique(current_room.board, position, type);
    console.log("the result of the logic is :", result);
    if (result == Moves.EatLeft || result == Moves.EatRight) {
        const updateResult = updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type);
        if (updateResult === "Game Over") {
            io.to(current_room.name).emit("Game Over");
            return;
        }
        switch (result) {
            case Moves.EatLeft:
                removePiece(current_room.name, current_room.board, `${position.x + 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                break;
            case Moves.EatRight:
                removePiece(current_room.name, current_room.board, `${position.x - 1}${type == 0 ? position.y + 1 : position.y - 1}`, type == 0 ? 1 : 0);
                break;
        }
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
        io.to(current_room.name).emit("update piece", position, type, time);
    }
    else if (result == Moves.MoveToEmptySpot) {
        updateBoard(current_room.board, { ...position, x: position.x, y: position.y }, type);
        io.to(current_room.name).emit("board", current_room.board);
        io.to(current_room.name).emit("moves", current_room.moves_played[type], type);
        io.to(current_room.name).emit("update piece", position, type, time);
    }
};
const logique = (boards, pos, type) => {
    console.time("Logic took:");
    var result;
    try {
        switch (type) {
            case 0:
                console.log('board', boards[0]);
                console.log("position black", pos);
                const old_position_black = boards[0][boards[0].findIndex((position) => position.index == pos.index)];
                console.log("old_position_black", old_position_black);
                if (old_position_black.y < pos.y || old_position_black.x === pos.x) {
                    /*console.log("boards[0] posti", boards[0]);
                    console.log("boards[1] posti", boards[1]);*/
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("old_position_black.y < pos.y || old_position_black.x === pos.x");
                    return result = Moves.None;
                }
                if ((pos.x - old_position_black.x > 2 || old_position_black.x - pos.x > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.x - old_position_black.x > 2 || pos.x + old_position_black.x > 2) && pos.king == false");
                    return result = Moves.None;
                }
                if ((pos.y - old_position_black.y > 2 || old_position_black.y - pos.y > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    return result = Moves.None;
                }
                if (!boards[1].some((position) => position.x === pos.x && position.y === pos.y)) {
                    console.log("spot is empty");
                    if (boards[1].some((position) => pos.x - 1 === position.x && pos.y + 1 === position.y)) {
                        console.log("EatRight");
                        if (pos.y == 0) {
                            return result = Moves.EatRightUpgrage;
                        }
                        else {
                            return result = Moves.EatRight;
                        }
                    }
                    else if (boards[1].some((position) => pos.x + 1 === position.x && pos.y + 1 === position.y)) {
                        console.log("EatLeft");
                        if (pos.y == 0) {
                            return Moves.EatLeftUpgrage;
                        }
                        else {
                            return Moves.EatLeft;
                        }
                    }
                    else {
                        return result = Moves.MoveToEmptySpot;
                    }
                }
                else {
                    console.log("YOU SHALL NOT PASS!!");
                    return result = Moves.None;
                }
            case 1:
                console.log('board', boards[1]);
                console.log("position white", pos);
                const old_position_white = boards[1][boards[1].findIndex((position) => position.index == pos.index)];
                console.log("old_position_white", old_position_white);
                if (old_position_white.y > pos.y || old_position_white.x === pos.x) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("old_position_white.y < pos.y || old_position_white.x === pos.x");
                    return result = Moves.None;
                }
                if ((pos.x - old_position_white.x > 2 || old_position_white.x - pos.x > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.x - old_position_white.x > 2 || pos.x + old_position_white.x > 2) && pos.king == false");
                    return result = Moves.None;
                }
                if ((pos.y - old_position_white.y > 2 || old_position_white.y - pos.y > 2) && pos.king == false) {
                    console.log("YOU SHALL NOT PASS!!");
                    console.log("(pos.y - old_position_white.y > 2 || old_position_white.y - pos.y > 2) && pos.king == false");
                    return result = Moves.None;
                }
                if (!boards[0].some((position) => position.x == pos.x && position.y == pos.y)) {
                    console.log("spot is empty");
                    console.log("Position after spot is empty", pos);
                    if (boards[0].some((position) => position.x === (pos.x + 1) && position.y === (pos.y - 1))) {
                        console.log(boards[0]);
                        console.log("EatLeft");
                        return result = Moves.EatLeft;
                    }
                    else if (boards[0].some((position) => position.x === (pos.x - 1) && position.y === (pos.y - 1))) {
                        console.log(boards[0]);
                        console.log("EatRight");
                        return Moves.EatRight;
                    }
                    else {
                        return result = Moves.MoveToEmptySpot;
                    }
                }
                else {
                    console.log("there is another piece!!");
                    console.log("YOU SHALL NOT PASS!!");
                    return result = Moves.None;
                }
        }
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
        positions.forEach(position => {
            var result;
            switch (position.king) {
                case true:
                    updateGameKing(current_room, position, type, time);
                    break;
                case false:
                    updateGamePawn(current_room, position, type, time);
                    break;
            }
        });
        current_room.turn = type == 0 ? 0 : 1;
        io.to(current_room.name).except(socket.id).emit("turn");
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
    });
    socket.on("move piece", async (position, type, time) => {
        console.log("position", position);
        console.log("type", type);
        //this make sure only players can send moves not spectators for example
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
                    updateGameKing(current_room, position, type, time);
                    current_room.turn = type == 0 ? 0 : 1;
                    io.to(current_room.name).except(socket.id).emit("turn");
                    break;
                case false:
                    updateGamePawn(current_room, position, type, time);
                    current_room.turn = type == 0 ? 0 : 1;
                    io.to(current_room.name).except(socket.id).emit("turn");
                    break;
            }
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
