const express = require("express"); // Import Express framework
const cors = require("cors"); // Import CORS middleware
const http = require("http"); // Import Node's HTTP module
const { Server } = require("socket.io"); // Import Socket.IO Server class

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
//Add this before the app.get() block
io.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);
  socket.on("move", (msg) => {
    console.log(msg);
    socket.emit("Ok");
  });
  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
  });
});
server.listen(PORT, () => {
  console.log("im listning on ", PORT);
});
