import React, { JSX, useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import io from "socket.io-client";
import { useSocket } from "./socketcontext";

interface Position {
  index: number;
  x: number;
  y: number;
}
enum types {
  Black,
  White,
}

interface BoardProp {
  type: types;
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

  const socket = useSocket();
  const [positions_state, SetPosition] = useState<Position[]>(positions);
  const [pieces, SetPieces] = useState<JSX.Element[]>(() => {
    var pieces: JSX.Element[] = [];
    for (let index = 0; index < positions_state.length; index++) {
      pieces.push(
        <Piece
          key={index}
          SelectedIndex={cellIndex}
          type={type === types.Black ? 0 : 1}
          source={
            type == types.Black
              ? "/pieces/black piece.png"
              : "/pieces/white piece.png"
          }
          index={positions_state[index].index}
          x={positions_state[index].x}
          y={positions_state[index].y}
          onMove={move}
          onSelect={SetCell}
        />,
      );
    }
    return pieces;
  });
  useEffect(() => {
    socket.on("update piece", (position: Position) => {
      SetPieces((prev) => {
        const index = prev.findIndex(
          (item) => item.props.index === position.index,
        );
        console.log("index", index);
        const new_Pieces = prev.map((item) => {
          if (item.props.index === position.index) {
            // Update the properties directly
            return {
              ...item,
              props: {
                ...item.props,
                x: position.x,
                y: position.y,
              },
            };
          }
          // Return the unchanged item if the condition is not met
          return item;
        });
        console.log("pieces length after", prev.length);
        console.log("removed type", type);
        return new_Pieces!;
      });
      console.log(pieces.length);
    });
    socket.on("remove piece", (position: Position, type_f: number) => {
      if (type === type_f) {
        console.log("type ", type);
        console.log("type_f ", type_f);
        console.log("x", position.x);

        console.log("remove piece from ", type);
        SetPieces((prev) => {
          console.log("pieces length before ", prev.length);
          const index = prev.findIndex(
            (item) =>
              item.props.x === position.x && item.props.y === position.y,
          );
          console.log("index", index);
          const new_Pieces = prev.filter(
            (_, index_prev) => index !== index_prev,
          );
          console.log("pieces length after", prev.length);
          console.log("removed type", type);
          return new_Pieces!;
        });
        console.log(pieces.length);
      }
    });
    return () => {
      socket.off("init");
      socket.off("remove piece");
    };
  }, []);
  console.log("positions_state", positions_state);

  return pieces;
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

  const move = (position: Position, type: types) => {
    socket.emit("move", { position, type });
  };

  if (isLoading) {
    return <div className="loading">Loading board...</div>;
  }

  return (
    <div className="grid grid-cols-8 w-128 h-128 relative">
      {createCells(boardSize)}
      <Board
        type={types.Black}
        positions={blackPieces}
        cellIndex={selectedCell}
        SetCell={setSelectedCell}
        move={move}
      />
      <Board
        type={types.White}
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
    ...Array(8).fill(0).map((_, x) => ({ x, y: 1, index: x + 1 * 8 })),
    // Other pieces (y=0)
    { x: 0, y: 0, index: 0 },
    { x: 7, y: 0, index: 7 },
    { x: 1, y: 0, index: 1 },
    { x: 6, y: 0, index: 6 },
    { x: 2, y: 0, index: 2 },
    { x: 5, y: 0, index: 5 },
    { x: 3, y: 0, index: 3 },
    { x: 4, y: 0, index: 4 },
  ];
}

function getInitialWhitePositions(): Position[] {
  return [
    // Pawns (y=6)
    ...Array(8).fill(0).map((_, x) => ({ x, y: 6, index: x + 6 * 8 })),
    // Other pieces (y=7)
    { x: 0, y: 7, index: 56 },
    { x: 7, y: 7, index: 63 },
    { x: 1, y: 7, index: 57 },
    { x: 6, y: 7, index: 62 },
    { x: 2, y: 7, index: 58 },
    { x: 5, y: 7, index: 61 },
    { x: 3, y: 7, index: 59 },
    { x: 4, y: 7, index: 60 },
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
