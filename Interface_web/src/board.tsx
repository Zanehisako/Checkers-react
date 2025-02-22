import React, { JSX, useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import io from "socket.io-client";
import { useSocket } from "./socketcontext";

interface Position {
  index: string;
  x: number;
  y: number;
}

interface BoardProp {
  type: number;
  positions: Position[];
  cellIndex: number[];
  SetCell: React.Dispatch<React.SetStateAction<number[]>>;
  move: (position: Position, type: number) => void;
}

export function Board({
  type,
  positions,
  cellIndex,
  SetCell,
  move,
}: BoardProp) {
  const [boardPositions, setBoardPositions] = useState<Position[]>(positions);

  useEffect(() => {
    setBoardPositions(positions);
  }, [positions]);

  return (
    <>
      {boardPositions.map((position, index) => (
        <Piece
          key={`${type}-${position.index}-${position.x}-${position.y}`}
          SelectedIndex={cellIndex}
          type={type === 0 ? 0 : 1}
          source={type === 0 ? "/pieces/black piece.png" : "/pieces/white piece.png"}
          index={position.index}
          x={position.x}
          y={position.y}
          onMove={move}
          onSelect={SetCell}
        />
      ))}
    </>
  );
}


export function MainBoard() {
  const [isLoading, setIsLoading] = useState(true);
  const [blackPieces, setBlackPieces] = useState<Position[]>(getInitialBlackPositions());
  const [whitePieces, setWhitePieces] = useState<Position[]>(getInitialWhitePositions());
  const [selectedCell, setSelectedCell] = useState([0, 0]);
  const socket = useSocket();
  const boardSize = 8;

  useEffect(() => {
    const handleBoardUpdate = (boards: Position[][]) => {
      setBlackPieces(boards[0]);
      setWhitePieces(boards[1]);
      setIsLoading(false);
    };

    socket.on("board", handleBoardUpdate);
    socket.emit("get board");

    return () => {
      socket.off("board", handleBoardUpdate);
    };
  }, [socket]);

  const move = (position: Position, type: number) => {
    socket.emit("move", { position, type });
  };

  if (isLoading) {
    return <div className="loading">Loading board...</div>;
  }

  return (
    <div className="grid grid-cols-8 w-128 h-128 relative">
      {createCells(boardSize)}
      <Board
        type={0}
        positions={blackPieces}
        cellIndex={selectedCell}
        SetCell={setSelectedCell}
        move={move}
      />
      <Board
        type={1}
        positions={whitePieces}
        cellIndex={selectedCell}
        SetCell={setSelectedCell}
        move={move}
      />
    </div>
  );
}

// Default chess starting positions using your Position interface
function getInitialBlackPositions(): Position[] {
  return [
    // Pawns (y=1)
    ...Array(8).fill(0).map((_, x) => ({
      x,
      y: 1,
      index: `${x}${1}`
    })),
    // Other pieces (y=0)
    { x: 0, y: 0, index: "00" },
    { x: 7, y: 0, index: "70" },
    { x: 1, y: 0, index: "10" },
    { x: 6, y: 0, index: "60" },
    { x: 2, y: 0, index: "20" },
    { x: 5, y: 0, index: "50" },
    { x: 3, y: 0, index: "30" },
    { x: 4, y: 0, index: "40" },
  ];
}

function getInitialWhitePositions(): Position[] {
  return [
    // Pawns (y=6)
    ...Array(8).fill(0).map((_, x) => ({
      x,
      y: 6,
      index: `${x}${6}`
    })),
    // Other pieces (y=7)
    { x: 0, y: 7, index: "07" },
    { x: 7, y: 7, index: "77" },
    { x: 1, y: 7, index: "17" },
    { x: 6, y: 7, index: "67" },
    { x: 2, y: 7, index: "27" },
    { x: 5, y: 7, index: "57" },
    { x: 3, y: 7, index: "37" },
    { x: 4, y: 7, index: "47" },
  ];
}
function createCells(size: number) {
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = x + y * size;
      cells.push(
        <Cell
          key={index}
          type={(x + y) % 2 === 0 ? 1 : 0}
        />
      );
    }
  }
  return cells;
}
