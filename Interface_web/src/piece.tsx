import React, { useEffect, useState } from "react";
import { useSocket } from "./socketcontext";

interface PieceProps {
  index: string;
  SelectedIndex: number[];
  type: number;
  source: string;
  x: number;
  y: number;
  onMove: (position: Position, type: number) => void;
}
interface Position {
  index: string
  x: number,
  y: number,
  king: boolean
}


export function Piece({
  index,
  type,
  source,
  x,
  y,
}: PieceProps) {
  const socket = useSocket();
  const [position_x, setX] = useState(x);
  const [position_y, setY] = useState(y);

  useEffect(() => {
    socket.on("update piece", (newPos: Position) => {
      console.log("recived new pos: ,");
      if (newPos.index === index) {
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
      className={"absolute hover:scale-10 transition-transform duration-200 pointer-events-none"}
      style={{
        width: 64,
        transform: `translate(${position_x * 64}px,${position_y * 64}px)`, //this is the position of the piece
      }}
      alt="piece"
      draggable="false"
    />
  );
}
