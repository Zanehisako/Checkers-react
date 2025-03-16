import { useEffect, useState } from "react";
import { useSocket } from "./socketcontext";

interface PieceProps {
  index: string;
  SelectedIndex: [number, number] | undefined;
  x: number;
  y: number;
  king: boolean;
}
interface Position {
  index: string
  x: number,
  y: number,
  king: boolean
}


export function WhitePiece({
  index,
  x,
  y,
  king,
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
      src={king ? "/pieces/white_king.png" : "/pieces/white piece.png"}
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
export function BlackPiece({
  index,
  king,
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
      src={king ? "/pieces/black_king.png" : "/pieces/black piece.png"}
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
