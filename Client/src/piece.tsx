import React, { useState } from "react";

interface PieceProps {
  index: number;
  SelectedIndex: number[];
  type: number;
  source: string;
  x: number;
  y: number;
  onSelect: React.Dispatch<React.SetStateAction<number[]>>;
}

export function Piece({
  index,
  SelectedIndex,
  type,
  source,
  x,
  y,
  onSelect,
}: PieceProps) {
  const [position_x, setX] = useState(x);
  const [position_y, setY] = useState(y);
  const [mouse_x, setMouseX] = useState(0);
  const [new_index, setIndex] = useState(index);

  const handleMouseDown = (event: React.MouseEvent) => {
    const { clientX } = event;
    setMouseX(clientX);
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    const { clientX, clientY } = event;
    console.log("mouse X:", clientX);
    console.log("mouse Y:", clientY);
    if (clientX - mouse_x > 0) {
      setIndex(index - 7);
      setX(position_x + 1);
      type === 0 ? setY(position_y - 1) : setY(position_y + 1);
    } else {
      setIndex(index - 9);
      setX(position_x - 1);
      type === 0 ? setY(position_y - 1) : setY(position_y + 1);
    }
    console.log("piece index is :", index);
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
