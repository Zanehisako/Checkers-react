interface CellProps {
  x: number;
  y: number;
  type: number; // or another appropriate type
  onClickFn: (pos: [number, number]) => void
}

export function Cell({ x, y, type, onClickFn }: CellProps) {
  const get_Cell_Color = (type: number) =>
    type === 1 ? "bg-white" : "bg-orange-900";

  return (
    <div
      className={
        `w-16 h-16 ${get_Cell_Color(type)}`
      }
      onClick={() => { onClickFn([x, y]); console.log('x,y:', x, y) }}
    ></div >
  );
}
