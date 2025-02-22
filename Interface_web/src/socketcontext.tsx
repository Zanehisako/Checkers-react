// SocketContext.tsx
import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { Socket, io } from 'socket.io-client';

// Create the socket instance
const socket: Socket = io("http://localhost:3001", {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 5000,
  reconnectionAttempts: 5,
});

const SocketContext = createContext<Socket>(socket);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Connection event handlers
    const onConnect = () => {
      console.log('Socket Connected!', socket.id);
      setIsConnected(true);
    };

    const onDisconnect = () => {
      console.log('Socket Disconnected!');
      setIsConnected(false);
    };

    const onError = (error: Error) => {
      console.error('Socket Error:', error);
    };
    const onRooms = (rooms: Map<any, any>) => {
      console.log("the rooms:", rooms)
      console.log("the rooms size is :", rooms.size)
      if (rooms.size === undefined) {
        socket.emit("joinRoom", 1)
      }
    };

    // Register event handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.on('rooms', onRooms);

    // Force connect if not already connected
    if (!socket.connected) {
      console.log('Attempting to connect...');
      socket.connect();
    }

    // Cleanup
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.disconnect();
    };
  }, []);

  if (!isConnected) {
    console.log('Socket is not connected yet...');
  }

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): Socket {
  const socket = useContext(SocketContext);
  if (!socket) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return socket;
}
