import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";
import { useNavigate } from "react-router-dom";

export function Rooms() {
  const socket = useSocket();
  const [emptyRooms, setEmptyRooms] = useState<number[]>([])
  const [fullRooms, setFullRooms] = useState<number[]>([])
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      socket.on("rooms", (emptyRooms, fullRooms) => {
        console.log('emptyRooms', emptyRooms)
        console.log('fullRooms', fullRooms)
        setEmptyRooms(emptyRooms)
        setFullRooms(fullRooms)
      })
    }

    function onDisconnect() {
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
  const onNavigate = (room: number) => {
    console.log('navigateing',)
    socket.emit("join room as spectator", room)
    navigate(`/Game/${room}`)
  }
  return (<div className="flex flex-row justify-evenly">
    <div className="flex flex-col justify-evenly">
      <h1>emptyRooms</h1>
      {emptyRooms.map((value, index) => (
        <button key={index} className="bg-gray-300" onClick={() => onNavigate(value)} >
          {value}
        </button>
      ))}
    </div>
    <div className="flex flex-col justify-evenly">
      <h1>FullRooms</h1>
      {fullRooms.map((value, index) => (
        <button key={index} className="bg-gray-300" onClick={() => onNavigate(value)}>
          {value}
        </button>
      ))}
    </div>

  </div>)
}
