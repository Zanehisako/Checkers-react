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
          <TimePanel piece_type={1} />
          <MainBoard />
          <TimePanel piece_type={0} />
        </div>
      </div >
    </SocketProvider>
  );
}

export default Client;
