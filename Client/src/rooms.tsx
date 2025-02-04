import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";
import { useNavigate } from "react-router-dom";
import GlowButton from "./glowbutton";

export function Rooms() {
  const socket = useSocket();
  const [emptyRooms, setEmptyRooms] = useState<number[]>(() => {
    const saved = sessionStorage.getItem('emptyRoomsState');
    return saved ? JSON.parse(saved) : [];
  })
  const [fullRooms, setFullRooms] = useState<number[]>(() => {
    const saved = sessionStorage.getItem('fullRoomsState');
    return saved ? JSON.parse(saved) : [];
  })
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
    sessionStorage.setItem('emptyRoomsState', JSON.stringify(emptyRooms));
    sessionStorage.setItem('fullRoomsState', JSON.stringify(fullRooms));
    navigate(`/Game/${room}`)
  }
  return (<div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center gap-4  text-white">
    <h1 className="text-white font-bold">Rooms:</h1>
    <div className="flex flex-col justify-center items-center gap-3">
      {emptyRooms.map((value, index) => (
        <GlowButton key={index} value={value} onNavigate={onNavigate} empty={true} />
      ))}
    </div>
    <div className="flex flex-col justify-center items-center gap-3 ">
      {fullRooms.map((value, index) => (
        <GlowButton key={index} value={value} onNavigate={onNavigate} empty={false} />
      ))}
    </div>

  </div>)
}
