import React from "react";
import { Board } from "./board";
import "./client.css";
import io from "socket.io-client";

function Client() {
  return (
    <div className="bg-black">
      <header className="Client-header">
        <Board />
      </header>
    </div>
  );
}

export default Client;
