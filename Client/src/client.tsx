import React from "react";
import { Board } from "./board";
import "./client.css";
import io from "socket.io-client";

const socket = io("http://localhost:3001", {
  withCredentials: false,
  transports: ["websocket", "polling"],
});

function Client() {
  const move = async () => {
    socket.emit("move", "move ur ass to the gym");
  };
  return (
    <div className="bg-black">
      <header className="Client-header">
        <button onClick={move}>move</button>
        <Board />
      </header>
    </div>
  );
}

export default Client;
