import React, { useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import io from "socket.io-client";

interface Position {
  index: number;
  value: number;
}

const socket = io("http://192.168.1.7:3001", {
  transports: ["websocket"],
});

export function Board() {
  useEffect(() => {
    socket.on("init", (boards: Position[][]) => {
      console.log("boards", boards);
      SetBlack(boards[0]);
      SetWhite(boards[1]);
    });
  }, []);
  const [cellIndex, SetCell] = useState([0, 0]);
  const board_size = 8;
  const [white_pieces_positions, SetWhite] = useState<Position[]>([]);
  const [black_pieces_positions, SetBlack] = useState<Position[]>([]);

  socket.on("init", (boards: Position[][]) => {
    console.log("boards", boards);
    SetBlack(boards[0]);
    SetWhite(boards[1]);
  });
  const black_pieces = () => {
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 5; j < 8; j++) {
        const index = i + j * board_size;
        if ((i + j) % 2 !== 0) {
          pieces.push(
            Piece({
              index: index,
              SelectedIndex: cellIndex,
              type: 0,
              source: "/pieces/black piece.png",
              x: i,
              y: j,
              onSelect: SetCell,
              onMove: SetBlack,
            }),
          );
        }
      }
    }
    return pieces;
  };

  const white_pieces = () => {
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 3; j++) {
        const index = i + j * board_size;
        if ((i + j) % 2 !== 0) {
          pieces.push(
            Piece({
              index: index,
              SelectedIndex: cellIndex,
              type: 1,
              source: "/pieces/white piece.png",
              x: i,
              y: j,
              onSelect: SetCell,
              onMove: SetWhite,
            }),
          );
        }
      }
    }
    return pieces;
  };

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
      {black_pieces()}
      {white_pieces()}
    </div>
  );
}
