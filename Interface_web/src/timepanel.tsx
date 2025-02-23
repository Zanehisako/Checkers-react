import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";

interface timepanelProp {
  piece_type: number
  time: number
  slow: boolean
}

export function TimePanel({ piece_type, time, slow }: timepanelProp) {
  const [messages, setMessages] = useState<string[]>([]);
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

    const handleMovePiece = (positions: Position[], type: number) => {
      if (piece_type === type) {
        setMessages(positions.map(pos => JSON.stringify(pos)));
      }
    };

    socket.on("moves", handleMovePiece);

    return () => {
      socket.off("move piece", handleMovePiece);
    };
  }, [isConnected, socket]); // Depend on both socket and connection state

  return (
    <div className={`${piece_type === 0 ? 'bg-gray-900' : 'bg-black'} flex flex-col`}>
      <div className="flex flex-col">
        {messages.map((value, index) => (
          <a key={index} className={`${piece_type === 0 ? 'bg-black text-white' : 'bg-white text-black'}`}>
            {value}
          </a>
        ))}
      </div>
      <a className={`${slow ? 'bg-green-600' : 'bg-red-500'} border - black"`}>{time}</a>
    </div >
  );
}
