import React from "react";
import { Board, MainBoard } from "./board";
import io from "socket.io-client";
import { TimePanel } from "./timepanel";
import { SocketProvider } from "./socketcontext";

function Client() {
  return (
    <SocketProvider>
      <div className="bg-gray-900 h-screen w-screen">
        <div className="flex flex-row h-screen w-screen justify-around items-center" >
          <TimePanel />
          <MainBoard />
          <TimePanel />
        </div>
      </div >
    </SocketProvider>
  );
}

export default Client;
