import React from "react";
import { Board, MainBoard } from "./board";
import "./client.css";
import io from "socket.io-client";
import { TimePanel } from "./timepanel";

function Client() {
  return (
    <div className="bg-black">
      <header className="Client-header">
        <TimePanel />
        <MainBoard />
        <TimePanel />
      </header>
    </div>
  );
}

export default Client;
