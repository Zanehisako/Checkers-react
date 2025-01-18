import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";

export function Rooms() {
  const socket = useSocket();
  const [emptyRooms, setEmptyRooms] = useState<number[]>([])
  const [fullRooms, setFullRooms] = useState<number[]>([])
  const [isConnected, setIsConnected] = useState(false);

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
  useEffect(() => {
    if (!isConnected) {
      return

    } else {
      socket.on("rooms", (emptyRooms, fullRooms) => {
        console.log('emptyRooms', emptyRooms)
        console.log('fullRooms', fullRooms)
        setEmptyRooms(emptyRooms)
        setFullRooms(fullRooms)
      })

    }

  }, [isConnected, socket])
  return (<body className="flex flex-row justify-evenly">
    <div className="flex flex-col justify-evenly">
      <h1>emptyRooms</h1>
      {emptyRooms.map((value, index) => (
        <a key={index} className="bg-gray-300" >
          {value}
        </a>
      ))}
    </div>
    <div className="flex flex-col justify-evenly">
      <h1>FullRooms</h1>
      {fullRooms.map((value, index) => (
        <a key={index} className="bg-gray-300">
          {value}
        </a>
      ))}
    </div>

  </body>)
}
