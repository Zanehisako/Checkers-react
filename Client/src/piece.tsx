import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface Position {
  index: number;
  x: number;
  y: number;
}

interface PieceProps {
  index: number;
  SelectedIndex: number[];
  type: number;
  source: string;
  x: number;
  y: number;
  onSelect: React.Dispatch<React.SetStateAction<number[]>>;
  onMove: (position: Position, type: number) => void;
}

const socket = io("http://192.168.1.7:3001", {
  transports: ["websocket"],
});

export function Piece({
  index,
  SelectedIndex,
  type,
  source,
  x,
  y,
  onSelect,
  onMove,
}: PieceProps) {
  const [position_x, setX] = useState(x);
  const [position_y, setY] = useState(y);
  const [mouse_x, setMouseX] = useState(0);
  const [new_index, setIndex] = useState(index);

  const handleMouseDown = (event: React.MouseEvent) => {
    const { clientX } = event;
    setMouseX(clientX);
  };
  useEffect(() => {
    socket.on("update piece", (newPos: Position) => {
      if (newPos.index === index) {
        setX(newPos.x);
        setY(newPos.y);
      }
    });
  }, []);

  const handleMouseUp = (event: React.MouseEvent) => {
    const { clientX, clientY } = event;
    if (clientX - mouse_x > 0) {
      const position = {
        index: index,
        x: position_x + 1,
        y: type === 0 ? position_y - 1 : position_y + 1,
      };
      socket.emit("move piece", position);
      onMove(position, type);
    } else {
      const position = {
        index: index,
        x: position_x - 1,
        y: type === 0 ? position_y - 1 : position_y + 1,
      };
      socket.emit("move piece", position);
    }
  };

  return (
    <img
      key={x + y * 8}
      src={source}
      width={36}
      height={36}
      className="absolute w4 h4 cursor-pointer hover:scale-10 transition-transform duration-200"
      style={{
        width: 45,
        transform: `translate(${position_x * 48}px,${position_y * 48}px)`,
      }}
      alt="piece"
      onClick={() =>
        onSelect(
          type === 0
            ? [new_index - 7, new_index - 9]
            : [new_index + 7, new_index + 9],
        )
      }
      onMouseDown={handleMouseDown}
      onDragEnd={handleMouseUp}
    />
  );
}
