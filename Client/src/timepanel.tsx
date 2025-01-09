import { useEffect, useState } from "react"
import { io } from "socket.io-client"
import { useSocket } from "./socketcontext";

interface timepanelProp {
  piece_type: number
}

export function TimePanel({ piece_type }: timepanelProp) {
  const [messages, setMessages] = useState<string[]>([]);
  const [time, setTime] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const socket = useSocket();

  // Handle socket connection state
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

    console.log('Registering move piece handler - socket is connected');

    const handleMovePiece = (position: Position, type: number) => {
      console.log('Received move piece event:', position);
      if (piece_type === type) {
        setMessages(prevMessages => [...prevMessages, JSON.stringify(position)]);
      }
    };

    socket.on("update piece", handleMovePiece);

    return () => {
      socket.off("move piece", handleMovePiece);
    };
  }, [isConnected, socket]); // Depend on both socket and connection state

  return (
    <div className="bg-gray-900 flex flex-col">
      <div className="flex flex-col">
        <div className={`px-2 py-1 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>

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
