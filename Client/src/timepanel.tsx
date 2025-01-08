import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useSocket } from "./socketcontext";

export function TimePanel() {
  const [messages, setMessages] = useState<string[]>([]);
  const [time, setTime] = useState(0);
  const socket = useSocket();

  useEffect(() => {
    // Verify socket connection
    console.log('Socket connected in TimePanel:', socket.connected);

    // Handle the move piece event
    const handleMovePiece = (position: Position) => {
      console.log('Received move piece event:', position);
      setMessages(prevMessages => [...prevMessages, JSON.stringify(position)]);
    };

    socket.on("move piece", handleMovePiece);

    // Cleanup listener when component unmounts
    return () => {
      socket.off("move piece", handleMovePiece);
    };
  }, [socket]); // Add socket as dependency

  return (
    <div className="bg-gray-900 flex flex-col">
      <div className="flex flex-col">
        {messages.map((value, index) => (
          <a key={index} className="bg-white">
            {value}
          </a>
        ))}
      </div>
      <a className="bg-gray-200 border border-black">{time}</a>
    </div>
  );
}
