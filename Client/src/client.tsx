import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Board, MainBoard } from "./board";
import io from "socket.io-client";
import { TimePanel } from "./timepanel";
import { useSocket } from "./socketcontext";

function Client() {
  const { room } = useParams()
  const [Time1, setTime1] = useState(0);
  const [Time2, setTime2] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [slowIndex, setSlowIndex] = useState(2);
  const socket = useSocket();

  useEffect(() => {
    function onConnect() {
      console.log('Socket connected in TimePanel!');
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log('Socket disconnected in TimePanel!');
      setIsConnected(false);
    }

    // Register connection handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);
  // Handle game events only when connected
  useEffect(() => {
    if (!isConnected) {
      return; // Don't register handlers if not connected
    }
    const handleMovePiece = (position: Position, type: number, time: number) => {
      console.log("time", time);
      if (type === 0) {
        setTime1((prevTime1) => {
          const newTime1 = prevTime1 + time;
          setSlowIndex(newTime1 > Time2 ? 1 : 0); // Compare against Time2
          console.log("Updated Time1", newTime1);
          return newTime1;
        });
      } else if (type === 1) {
        setTime2((prevTime2) => {
          const newTime2 = prevTime2 + time;
          setSlowIndex(Time1 > newTime2 ? 1 : 0); // Compare against Time1
          console.log("Updated Time2", newTime2);
          return newTime2;
        });
      }
      console.log("Current SlowIndex", slowIndex);
    };

    socket.on("update piece", handleMovePiece);
    return () => {
      socket.off("update piece", handleMovePiece);
    };
  }, [socket, isConnected, Time1, Time2]); // Depend on latest values of Time1, Time2
  const navigate = useNavigate();
  const onNavigate = () => {
    console.log('navigateing',)
    navigate("/")
  }

  return (
    <div className="bg-gray-900 h-screen w-screen">
      <button className="bg-white" onClick={onNavigate}>Rooms</button>
      <div className="flex flex-row h-screen w-screen justify-around items-center" >
        <TimePanel time={Time1} piece_type={0} slow={slowIndex === 0} />
        <MainBoard />
        <TimePanel time={Time2} piece_type={1} slow={slowIndex === 1} />
      </div>
    </div >
  );
}

export default Client;
