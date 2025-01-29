import React, { useEffect, useState } from "react";
import { useSocket } from "./socketcontext";

interface PieceProps {
  index: string;
  SelectedIndex: number[];
  type: number;
  source: string;
  x: number;
  y: number;
  onSelect: React.Dispatch<React.SetStateAction<number[]>>;
  onMove: (key: string, position: Position, type: number) => void;
}


export function Piece({
  index,
  source,
  x,
  y,
}: PieceProps) {
  const socket = useSocket();
  const [position_x, setX] = useState(x);
  const [position_y, setY] = useState(y);
  const [new_index,] = useState(index);

  useEffect(() => {
    socket.on("update piece", (newPos: Position, key) => {
      console.log("recived new pos: ,");
      if (key === index) {
        setX(newPos.x);
        setY(newPos.y);
      }
    });
  }, []);

  return (
    <img
      key={x + y * 8}
      src={source}
      width={36}
      height={36}
      className="absolute cursor-pointer hover:scale-10 transition-transform duration-200 "
      style={{
        width: 64,
        transform: `translate(${position_x * 64}px,${position_y * 64}px)`, //this is the position of the piece
      }}
      alt="piece"
    />
  );
}
