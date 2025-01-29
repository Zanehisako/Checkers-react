import React, { JSX, useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import { useSocket } from "./socketcontext";

interface Position {
  x: number;
  y: number;
  king: boolean
}
enum types {
  Black,
  White,
}

interface BoardProp {
  type: types;
  positions: Map<string, Position>;
  cellIndex: number[];
  SetCell: React.Dispatch<React.SetStateAction<number[]>>;
  move: (key: string, position: Position, type: number) => void;
}

export function Board({
  type,
  positions,
  cellIndex,
  SetCell,
  move,
}: BoardProp) {

  const socket = useSocket();
  const [positions_state, SetPosition] = useState<Position[]>(Array.from(positions.values()));
  const [pieces, SetPieces] = useState<JSX.Element[]>(() => {
    var pieces: JSX.Element[] = [];
    const keys = Array.from(positions.keys())
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
          index={keys[index]}
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
    socket.on("update piece", (key, position: Position) => {
      SetPieces((prev) => {
        const index = prev.findIndex(
          (item) => item.props.index === key,
        );
        console.log("index", index);
        const new_Pieces = prev.map((item) => {
          if (item.props.index === key) {
            // Update the properties directly
            return {
              ...item,
              props: {
                ...item.props,
                index: position.x.toString() + position.y.toString(),
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
  const [blackPieces, setBlackPieces] = useState<Map<string, Position>>(getInitialBlackPositions());
  const [whitePieces, setWhitePieces] = useState<Map<string, Position>>(getInitialWhitePositions());
  const [selectedCell, setSelectedCell] = useState([0, 0]);
  const socket = useSocket();
  const boardSize = 8;

  useEffect(() => {
    const handleBoardUpdate = (boards: Map<string, Position>[]) => {
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

  const move = (key: string, position: Position, type: types) => {
    socket.emit("move", { key, position, type });
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
function getInitialBlackPositions(): Map<string, Position> {
  const positionMap = new Map<string, Position>();

  // Pawns (y=1)
  for (let x = 0; x < 8; x++) {
    const index = `${x}1`; // Index is "x1" (e.g., "01", "11", ..., "71")
    positionMap.set(index, { x, y: 1, king: false });
  }

  // Back row pieces (y=0)
  const backRowBlack = [
    { x: 0, y: 0, king: false },
    { x: 7, y: 0, king: false },
    { x: 1, y: 0, king: false },
    { x: 6, y: 0, king: false },
    { x: 2, y: 0, king: false },
    { x: 5, y: 0, king: false },
    { x: 3, y: 0, king: false },
    { x: 4, y: 0, king: false },
  ];

  backRowBlack.forEach(pos => {
    const index = `${pos.x}${pos.y}`; // Index is "xy" (e.g., "00", "70", etc.)
    positionMap.set(index, pos);
  });

  return positionMap;
}

function getInitialWhitePositions(): Map<string, Position> {
  const positionMap = new Map<string, Position>();

  // Pawns (y=6)
  for (let x = 0; x < 8; x++) {
    const index = `${x}6`; // Index is "x6" (e.g., "06", "16", ..., "76")
    positionMap.set(index, { x, y: 6, king: false });
  }

  // Back row pieces (y=7)
  const backRowWhite = [
    { x: 0, y: 7, king: false },
    { x: 7, y: 7, king: false },
    { x: 1, y: 7, king: false },
    { x: 6, y: 7, king: false },
    { x: 2, y: 7, king: false },
    { x: 5, y: 7, king: false },
    { x: 3, y: 7, king: false },
    { x: 4, y: 7, king: false },
  ];

  backRowWhite.forEach(pos => {
    const index = `${pos.x}${pos.y}`; // Index is "xy" (e.g., "07", "77", etc.)
    positionMap.set(index, pos);
  });

  return positionMap;
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
