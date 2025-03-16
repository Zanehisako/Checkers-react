import React, { JSX, useEffect, useRef, useState } from "react";
import { WhitePiece, BlackPiece } from "./piece";
import { Cell } from "./cell";
import { useSocket } from "./socketcontext";

export interface Position {
  index: string;
  x: number;
  y: number;
  king: boolean;
}

interface BoardProp {
  type: number;
  positions: Position[];
  cellIndex: [number, number] | undefined;
  SetCell: React.Dispatch<React.SetStateAction<[number, number] | undefined>>;
  move: (position: Position, type: number) => void;
}

export function Board({
  type,
  positions,
  cellIndex,
}: BoardProp) {
  const [boardPositions, setBoardPositions] = useState<Position[]>(positions);

  useEffect(() => {
    setBoardPositions(positions);
  }, [positions]);

  return (
    <>
      {boardPositions.map((position) => (
        type === 1 ?
          <WhitePiece
            king={position.king}
            key={`${type}-${position.index}-${position.x}-${position.y}`}
            SelectedIndex={cellIndex}
            index={position.index}
            x={position.x}
            y={position.y}
          />
          :
          <BlackPiece
            king={position.king}
            key={`${type}-${position.index}-${position.x}-${position.y}`}
            SelectedIndex={cellIndex}
            index={position.index}
            x={position.x}
            y={position.y}
          />
      ))}
    </>
  );
}


export function MainBoard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOurTurn, setOurTurn] = useState(false);
  const [playerType, setType] = useState(1);
  const [blackPieces, setBlackPieces] = useState<Position[]>(getInitialBlackPositions());
  const [whitePieces, setWhitePieces] = useState<Position[]>(getInitialWhitePositions());
  const [selectedCell, setSelectedCell] = useState<[number, number]>();
  const socket = useSocket();
  const boardSize = 8;
  const isFirstSelectionRef = useRef(true);
  const previousSelectionRef = useRef("");
  const kingsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!selectedCell || !isOurTurn) return;

    console.log('selectedCell', selectedCell);

    if (isFirstSelectionRef.current) {
      console.log('Selecting piece at', selectedCell);
      previousSelectionRef.current = `${selectedCell[0]}${selectedCell[1]}`;
      isFirstSelectionRef.current = false;
    } else {
      console.log('Moving piece from', previousSelectionRef.current, 'to', selectedCell);
      console.log("kings", kingsRef.current);

      const isking = kingsRef.current.has(`${previousSelectionRef.current}`);
      console.log('isking', isking);

      if (isking) {
        kingsRef.current.add(`${selectedCell[0]}${selectedCell[1]}`);
        kingsRef.current.delete(previousSelectionRef.current);
        console.log("kings", kingsRef.current);
      }
      const move = {
        index: previousSelectionRef.current,
        x: selectedCell[0],
        y: selectedCell[1],
        king: isking
      };
      if (!isking) {
        switch (playerType) {
          case 0:
            if (move.y === 0) {
              console.log("added black king");
              kingsRef.current.add(`${selectedCell[0]}${selectedCell[1]}`);
              console.log("kings", kingsRef.current);
            }
            break;
          case 1:
            if (move.y === 7) {
              console.log("added white king");
              kingsRef.current.add(`${selectedCell[0]}${selectedCell[1]}`);
              console.log("kings", kingsRef.current);
            }
            break;
        }
      }

      socket.emit("move piece", move, playerType, 0);
      isFirstSelectionRef.current = true;
      previousSelectionRef.current = "";
      setSelectedCell(undefined)
    }
  }, [selectedCell]);

  useEffect(() => {
    const handleBoardUpdate = (boards: Position[][]) => {
      setBlackPieces(boards[0]);
      setWhitePieces(boards[1]);
      setIsLoading(false);
    };
    const handleTurn = (type: number) => {
      setType(type);
      setOurTurn(true);
    };
    socket.on("board", handleBoardUpdate);
    socket.on("turn", handleTurn);
    socket.emit("get board");

    return () => {
      socket.off("board", handleBoardUpdate);
    };
  }, [socket]);

  const move = (position: Position, type: number) => {
    socket.emit("move", { position, type });
  };

  const cancelSelection = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent the default context menu
    isFirstSelectionRef.current = true;
    setSelectedCell(undefined)
  }


  // Default chess starting positions using your Position interface
  function getInitialBlackPositions(): Position[] {
    return [
      // Pawns (y=1)
      ...Array(8).fill(0).map((_, x) => ({
        x,
        y: 1,
        index: `${x}${1}`,
        king: false
      })),
      // Other pieces (y=0)
      { x: 0, y: 0, index: "00", king: false },
      { x: 7, y: 0, index: "70", king: false },
      { x: 1, y: 0, index: "10", king: false },
      { x: 6, y: 0, index: "60", king: false },
      { x: 2, y: 0, index: "20", king: false },
      { x: 5, y: 0, index: "50", king: false },
      { x: 3, y: 0, index: "30", king: false },
      { x: 4, y: 0, index: "40", king: false },
    ];
  }

  function getInitialWhitePositions(): Position[] {
    return [
      // Pawns (y=6)
      ...Array(8).fill(0).map((_, x) => ({
        x,
        y: 6,
        index: `${x}${6}`,
        king: false
      })),
      // Other pieces (y=7)
      { x: 0, y: 7, index: "07", king: false },
      { x: 7, y: 7, index: "77", king: false },
      { x: 1, y: 7, index: "17", king: false },
      { x: 6, y: 7, index: "67", king: false },
      { x: 2, y: 7, index: "27", king: false },
      { x: 5, y: 7, index: "57", king: false },
      { x: 3, y: 7, index: "37", king: false },
      { x: 4, y: 7, index: "47", king: false },
    ];
  }
  if (isLoading) {
    return <div className="loading">Loading board...</div>;
  }
  function createCells(size: number) {
    const cells: JSX.Element[] = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        cells.push(
          <Cell
            x={x}
            y={y}
            selected={selectedCell?.[0] === x && selectedCell?.[1] === y ? true : false}
            type={(x + y) % 2 === 0 ? 1 : 0}
            onClickFn={setSelectedCell}
          />
        );
      }
    }
    return cells;
  }

  return (
    <div className=" grid grid-cols-8 w-128 h-128 relative" onContextMenu={cancelSelection}>
      {createCells(boardSize)}
      <Board
        type={0}
        positions={blackPieces}
        cellIndex={selectedCell!}
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
