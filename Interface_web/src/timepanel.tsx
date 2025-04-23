import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";

interface timepanelProp {
  piece_type: number
  time: number
  slow: boolean
}
interface Message {
  text: string
  error: boolean
}


export function TimePanel({ piece_type, time, slow }: timepanelProp) {
  const [messages, setMessages] = useState<Message[]>([]);
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
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    setIsConnected(socket.connected);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket]);

  // Handle game events only when connected
  useEffect(() => {
    if (!isConnected) return;

    const handleMovePiece = (positions: Position[], type: number) => {
      if (piece_type === type) {
        const newMessages: Message[] = [];
        for (const pos of positions) {
          const messageText = JSON.stringify(pos);
          // Check if this message already exists in any form (error or non-error)
          const isDuplicate = messages.some(msg => msg.text === messageText);

          if (!isDuplicate) {
            newMessages.push({ text: messageText, error: false });
          }
        }

        if (newMessages.length > 0) {
          setMessages(prevMessages => [...prevMessages, ...newMessages]);
        }
      }
    };

    const handleWrongMoves = (positions: Position[], type: number) => {
      if (piece_type === type) {
        setMessages(prevMessages => {
          const newMessages = [];
          for (const pos of positions) {
            const messageText = JSON.stringify(pos);
            // Check if this message already exists with error status
            const errorExists = prevMessages.some(msg => msg.text === messageText && msg.error);

            if (!errorExists) {
              // Find and replace any non-error version of this message
              const updatedMessages = prevMessages.filter(msg => msg.text !== messageText);
              // Add the error version
              return [...updatedMessages, { text: messageText, error: true }];
            }
          }
          return prevMessages;
        });
      }
    };

    socket.on("moves", handleMovePiece);
    socket.on("Wrong move", handleWrongMoves);

    return () => {
      socket.off("moves", handleMovePiece);
      socket.off("Wrong move", handleWrongMoves);
    };
  }, [isConnected, socket, piece_type, messages]);

  return (
    <div className={`${piece_type === 0 ? 'bg-gray-900' : 'bg-black'} flex flex-col`}>
      {/* Scrollable container for messages */}
      <div className="flex flex-col overflow-y-auto max-h-64">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`${piece_type === 0 ? 'bg-black text-white' : 'bg-white text-black'} ${msg.error ? 'line-through' : ''}`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className={`${slow ? 'bg-green-600' : 'bg-red-500'} border-black`}>
        {time}
      </div>
    </div>
  );
}
