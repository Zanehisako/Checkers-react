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
    console.log("init");

    socket.on("init", (boards: Position[][]) => {
      type === types.White
        ? console.log("white init")
        : console.log("black init");
      console.log("boards", boards);
      console.log("positions_state", positions_state);
      positions_state === boards[0] || boards[1]
        ? console.log("the same")
        : console.log("not the same should rerender");
      SetPosition(type == types.Black ? boards[0] : boards[1]);
      console.log("finished set board");
    });

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

  const socket = useSocket()
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
    <div className="grid grid-cols-8 w-128 h-128 relative">
      {cells()}
      {Black_pieces}
      {White_pieces}
    </div>
  );
}
