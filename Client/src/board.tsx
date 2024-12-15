import React, { useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import io from "socket.io-client";

interface Position {
  index: number;
  x: number;
  y: number;
}

interface BoardProp {
  positions: Position[];
  cellIndex: number[];
  SetCell: React.Dispatch<React.SetStateAction<number[]>>;
  move: (position: Position, type: number) => void;
}

const socket = io("http://192.168.1.7:3001", {
  transports: ["websocket"],
});

export function Board({ positions, cellIndex, SetCell, move }: BoardProp) {
  const board_size = 8;
  const pieces = () => {
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 5; j < 8; j++) {
        const index = i + j * board_size;
        if ((i + j) % 2 !== 0) {
          pieces.push(
            Piece({
              index:
                positions.length !== 0
                  ? positions.find((item) => index === item.index)?.index!
                  : index,
              SelectedIndex: cellIndex,
              type: 0,
              source: "/pieces/black piece.png",
              x:
                positions.length !== 0
                  ? positions[
                    positions.findIndex((item) => index === item.index)!
                  ].x
                  : i,
              y:
                positions.length !== 0
                  ? positions[
                    positions.findIndex((item) => index === item.index)!
                  ].y
                  : j,
              onSelect: SetCell,
              onMove: move,
            }),
          );
        }
      }
    }

    return pieces;
  };
  return pieces;
}

export function MainBoard() {
  const [black_pieces_positions, SetBlack] = useState<Position[]>([]);
  const [white_pieces_positions, SetWhite] = useState<Position[]>([]);
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    console.log("init");

    socket.on("init", (boards: Position[][]) => {
      console.log("boards", boards);
      SetBlack(boards[0]);
      SetWhite(boards[1]);
    });

    socket.on("update", (newPositions: Position[][]) => {
      SetBlack((prev) =>
        JSON.stringify(prev) !== JSON.stringify(newPositions[0])
          ? [...newPositions[0]]
          : prev,
      );
      SetWhite((prev) =>
        JSON.stringify(prev) !== JSON.stringify(newPositions[1])
          ? [...newPositions[1]]
          : prev,
      );
      setForceRender((prev) => !prev);
    });
    return () => {
      socket.off("init");
      socket.off("update");
    };
  }, []);

  const [cellIndex, SetCell] = useState([0, 0]);
  const board_size = 8;

  const move = (position: Position, type: number) => {
    socket.emit("move", { position, type });
  };

  const white_pieces = () => {
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        if ((i + j) % 2 !== 0) {
          const index = i + j * board_size;
          console.log(index);

          pieces.push(
            Piece({
              index:
                white_pieces_positions.length !== 0
                  ? white_pieces_positions.find((item) => index === item.index)
                    ?.index!
                  : index,
              SelectedIndex: cellIndex,
              type: 0,
              source: "/pieces/white piece.png",
              x:
                white_pieces_positions.length !== 0
                  ? white_pieces_positions[
                    white_pieces_positions.findIndex(
                      (item) => index === item.index,
                    )!
                  ].x
                  : i,
              y:
                white_pieces_positions.length !== 0
                  ? white_pieces_positions[
                    white_pieces_positions.findIndex(
                      (item) => index === item.index,
                    )!
                  ].y
                  : j,
              onSelect: SetCell,
              onMove: move,
            }),
          );
        }
      }
    }
    return pieces;
  };
  const Black_pieces = Board({
    positions: black_pieces_positions,
    cellIndex,
    SetCell,
    move,
  });

  const cells = () => {
    const cells = [];
    for (let row = 0; row < board_size; row++) {
      for (let col = 0; col < board_size; col++) {
        const key = col + row * board_size;
        cells.push(
          Cell({
            key: key,
            isSelected: cellIndex,
            type: (row + col) % 2 === 0 ? 1 : 0,
          }),
        );
      }
    }
    return cells;
  };

  return (
    <div className="Board">
      {cells()}
      <Black_pieces />
      {white_pieces()}
    </div>
  );
}
