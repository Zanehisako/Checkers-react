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
    Moves[Moves["Upgrade"] = 4] = "Upgrade";
})(Moves || (Moves = {}));
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
const board_size = 8;
const emptyRooms = new Map();
const fullRooms = new Map();
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
                    king: false
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
                    king: false
                });
            }
        }
    }
    return [black_pieces_pos, white_pieces_pos];
};
var boards = initboard();
const logique = (pos, type, time) => {
    var result;
    switch (type) {
        case 0:
            console.log("position black", pos);
            const old_position_black = boards[0][boards[0].findIndex((position) => position.index == pos.index)];
            console.log("old_position_black", old_position_black);
            if (old_position_black.y < pos.y) {
                /*console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]);*/
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            if (old_position_black.x === pos.x) {
                /* console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]); */
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            if (!boards[1].some((position) => position.x == pos.x && position.y == pos.y)) {
                console.log("spot is empty");
                if (boards[1].some((position) => pos.x - 1 === position.x && pos.y + 1 === position.y)) {
                    console.log("EatRight");
                    result = Moves.EatRight;
                }
                else if (boards[1].some((position) => position.x + 1 === pos.x && position.y + 1 === pos.y)) {
                    console.log("EatLeft");
                    return Moves.EatLeft;
                }
                else {
                    result = Moves.MoveToEmptySpot;
                }
            }
            else {
                /* console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]); */
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            break;
        case 1:
            console.log("position white", pos);
            const old_position_white = boards[1][boards[1].findIndex((position) => position.index == pos.index)];
            console.log("old_position_white", old_position_white);
            if (old_position_white.y > pos.y) {
                /* console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]); */
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            if (old_position_white.x === pos.x) {
                /* console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]); */
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            if (!boards[0].some((position) => position.x == pos.x && position.y == pos.y)) {
                console.log("spot is empty");
                if (boards[0].some((position) => pos.x - 1 === position.x && pos.y - 1 === position.y)) {
                    console.log("EatRight");
                    return Moves.EatRight;
                }
                else if (boards[0].some((position) => position.x + 1 === pos.x && position.y - 1 === pos.y)) {
                    console.log("EatLeft");
                    result = Moves.EatLeft;
                }
                else {
                    result = Moves.MoveToEmptySpot;
                }
            }
            else {
                /* console.log("boards[0] posti", boards[0]);
                console.log("boards[1] posti", boards[1]); */
                console.log("YOU SHALL NOT PASS!!");
                result = Moves.None;
            }
            break;
    }
    return result;
};
const gameLogique = (position, type, time) => {
    const result = logique(position, type, time);
};
const modifyPosition = (newPosition, type) => {
    switch (type) {
        case 0:
            const index_black = boards[0].findIndex((item) => item.index === newPosition.index);
            console.log("index :", index_black);
            console.log("before black board :", boards[0]);
            boards[0][index_black] = newPosition;
            console.log("new black board :", boards[0]);
            break;
        case 1:
            const index_white = boards[1].findIndex((item) => item.index === newPosition.index);
            boards[1][index_white] = newPosition;
            console.log("new white board :", boards[1]);
            break;
    }
};
io.on("connection", (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);
    var current_room = { number: 0, size: 0, players: new Map, spectators: [], turn: 1 };
    //join a room 
    console.log("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
    socket.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
    socket.on("leave room", async (room) => {
        socket.leave(room.toString());
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
                    current_room.players.set(socket.id, 1);
                    fullRooms.set(room, current_room);
                    emptyRooms.delete(room);
                    console.log("player joined room Successfully");
                    socket.emit("msg", "joined room Successfully");
                    io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
                    console.log("Room", room.toString());
                    io.to(room.toString()).except(socket.id).emit("U're turn");
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
            var current_room = emptyRooms.get(room) ?? fullRooms.get(room);
            if (current_room === undefined) {
                socket.emit("msg", "Room doesn't exits");
            }
            else {
                socket.join(room.toString());
                current_room.spectators.push(socket.id);
            }
        });
    socket.on("create room", async (room_number) => {
        current_room = emptyRooms.get(room_number) ?? fullRooms.get(room_number);
        if (current_room === undefined) {
            socket.join(room_number.toString());
            const room = {
                number: room_number,
                size: 1,
                players: new Map,
                spectators: [],
                turn: 1 //1 cuz the first move is gonna be of type 0 
            };
            current_room = room;
            room.players.set(socket.id, 0);
            socket.emit("msg", "Room Created Successfully");
            emptyRooms.set(room_number, room);
            io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
        }
        else {
            socket.emit("msg", "Room does exits");
        }
    });
    socket.emit("init", boards);
    socket.on("move piece", async (position, type, time) => {
        //this make sure only players can send moves not spectators for example
        if (!current_room?.players.has(socket.id)) {
            return;
        }
        console.log("current Room", current_room);
        console.log("type", type);
        if (current_room?.turn == type) {
            console.log("its not u're turn nigga damn!", type);
            return;
        }
        else {
            console.log("time", time);
            console.log("boards black posti", boards[0]);
            console.log("boards white posti", boards[1]);
            const result = logique(position, type, time);
            switch (result) {
                case Moves.EatLeft:
                    io.to(current_room.number.toString()).emit("update piece", position, type, time);
                    break;
                case Moves.EatRight:
                    io.to(current_room.number.toString()).emit("update piece", position, type, time);
                    break;
                case Moves.MoveToEmptySpot:
                    io.to(current_room.number.toString()).emit("update piece", position, type, time);
                    io.to(current_room.number.toString()).except(socket.id).emit("U're Turn");
                    current_room.turn = type == 0 ? 0 : 1;
                    break;
                default:
                    current_room.turn = type == 0 ? 0 : 1;
                    io.to(current_room.number.toString()).except(socket.id).emit("U're Turn");
                    break;
            }
        }
    });
    socket.on("disconnect", () => {
        console.log("🔥: A user disconnected");
        if (current_room.size > 0) {
            current_room.size -= 1;
        }
        current_room?.players.delete(socket.id);
        switch (current_room.size) {
            case 0:
                console.log(current_room.number);
                emptyRooms.delete(current_room.number);
                console.log("deleting empty room");
                break;
            case 1:
                fullRooms.delete(current_room.number);
                emptyRooms.set(current_room.number, current_room);
                console.log("deleting full room and creating a full room");
                break;
        }
        io.emit("rooms", Array.from(emptyRooms.keys()), Array.from(fullRooms.keys()));
        console.log("empty rooms", emptyRooms);
        console.log("full rooms", fullRooms);
    });
});
server.listen(PORT, () => {
    console.log("im listning on ", PORT);
});
