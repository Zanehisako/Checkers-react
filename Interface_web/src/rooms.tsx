import { useEffect, useState } from "react"
import { useSocket } from "./socketcontext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react"
import GlowButton from "./glowbutton";

export function Rooms() {
  const socket = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [room, setRoom] = useState("");
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
  const onNavigate = (room?: number) => {
    console.log('navigateing',)
    socket.emit("join room as spectator", room)
    sessionStorage.setItem('emptyRoomsState', JSON.stringify(emptyRooms));
    sessionStorage.setItem('fullRoomsState', JSON.stringify(fullRooms));
    navigate(`/Game/${room}`)
  }
  const onNavigatePlayer = (room?: number) => {
    console.log('navigateing',)
    socket.emit("join room as player", room)
    sessionStorage.setItem('emptyRoomsState', JSON.stringify(emptyRooms));
    sessionStorage.setItem('fullRoomsState', JSON.stringify(fullRooms));
    navigate(`/Game/${room}`)
  }
  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center gap-4 text-white">
      <GlowButton size="large" color="green" text="Create Room" onClick={() => setIsOpen(true)} />

      <AnimatePresence>
        {/* List of rooms - moved outside AnimatePresence */}
        {
          !isOpen && (
            <motion.div
              initial={{ opacity: 0, }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 items-start">
              <h1 className="text-white font-extrabold content-center">Rooms:</h1>
              <div className="flex flex-col justify-center items-center gap-8">
                {emptyRooms.map((value, index) => (
                  <div key={index} className="flex flex-row gap-10 justify-between items-center">
                    <a>{value}</a>
                    <div className="flex flex-row gap-1">
                      <GlowButton size="medium" color="blue" text={"🎮"} value={value} onClick={onNavigatePlayer} />
                      <GlowButton size="medium" color="blue" text={"📺"} value={value} onClick={onNavigate} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center items-center gap-3">
                {fullRooms.map((value, index) => (
                  <div key={index} className="flex flex-row gap-10 justify-between items-center">
                    <a>{value}</a>
                    <GlowButton size="medium" key={index} color="blue" text={"📺"} value={value} onClick={onNavigate} />
                  </div>
                ))}
              </div>
            </motion.div>
          )
        }

      </AnimatePresence >
      {/* Modal with proper AnimatePresence */}
      <AnimatePresence>
        {
          isOpen && (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="modal-backdrop"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1.2 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2, ease: "easeIn" }}
                className="flex flex-col items-center gap-2 p-6 bg-gray-900 rounded-lg shadow-lg w-80"
              >
                <h2 className="text-xl font-bold">Creating room</h2>
                <input
                  type="text"
                  className="border border-gray-300 p-2 rounded-md text-black"
                  placeholder="name.."
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
                <div className="flex flex-row items-center gap-5">
                  <button
                    className="mt-4 px-2 py-2 bg-blue-100 bg-opacity-50 text-black rounded-lg"
                    onClick={() => {
                      setIsOpen(false);
                    }}
                  >
                    close
                  </button>
                  <button
                    className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
                    onClick={() => {
                      setIsOpen(false);
                      socket.emit("create room", room);
                      navigate(`/Game/${room}`);
                    }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )
        }
      </AnimatePresence >
    </div >
  );
}
