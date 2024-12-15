import React, { useEffect, useState } from "react";
import { Piece } from "./piece";
import { Cell } from "./cell";
import io from "socket.io-client";

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

const socket = io("http://192.168.1.7:3001", {
  transports: ["websocket"],
});

export function Board({
  type,
  positions,
  cellIndex,
  SetCell,
  move,
}: BoardProp) {
  const [positions_state, SetPosition] = useState<Position[]>(positions);
  useEffect(() => {
    console.log("init");

    socket.on("init", (boards: Position[][]) => {
      positions_state === boards[0] || boards[1]
        ? console.log("the same")
        : console.log("not the same should rerender");
      SetPosition(type == types.Black ? boards[0] : boards[1]);
      console.log("finished set board");
    });
  }, []);
  console.log("positions_state", positions_state);

  const pieces = () => {
    var pieces = [];
    for (let index = 0; index < positions_state.length; index++) {
      pieces.push(
        Piece({
          index: positions_state[index].index,
          SelectedIndex: cellIndex,
          type: 0,
          source:
            type == types.Black
              ? "/pieces/black piece.png"
              : "/pieces/white piece.png",
          x: positions_state[index].x,
          y: positions_state[index].y,
          onSelect: SetCell,
          onMove: move,
        }),
      );
    }
    return pieces;
  };
  return pieces;
}

function init(type: types) {
  const board_size = 8;
  var positions: Position[] = [];
  switch (type) {
    case types.Black:
      for (let i = 0; i < 8; i++) {
        for (let j = 5; j < 8; j++) {
          const index = i + j * board_size;
          if ((i + j) % 2 !== 0) {
            const position: Position = { index: index, x: i, y: j };
            positions.push(position);
          }
        }
      }
      return positions;

    case types.White:
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 3; j++) {
          const index = i + j * board_size;
          if ((i + j) % 2 !== 0) {
            const position: Position = { index: index, x: i, y: j };
            positions.push(position);
          }
        }
      }
      return positions;
  }
}

export function MainBoard() {
  const [black_pieces_positions, SetBlack] = useState<Position[]>([]);
  const [white_pieces_positions, SetWhite] = useState<Position[]>([]);

  const [cellIndex, SetCell] = useState([0, 0]);
  const board_size = 8;

  const move = (position: Position, type: number) => {
    socket.emit("move", { position, type });
  };

  const Black_pieces = Board({
    type: types.Black,
    positions: init(0)!,
    cellIndex,
    SetCell,
    move,
  });

  const White_pieces = Board({
    type: types.White,
    positions: init(1)!,
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
      <White_pieces />
    </div>
  );
}
