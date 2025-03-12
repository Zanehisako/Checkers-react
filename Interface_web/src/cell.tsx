interface CellProps {
  x: number;
  y: number;
  type: number; // or another appropriate type
  selected: boolean
  onClickFn: (pos: [number, number]) => void
}

export function Cell({ x, y, type, selected, onClickFn }: CellProps) {
  const get_Cell_Color = (type: number) =>
    type === 1 ? "bg-white" : "bg-orange-900";

  return (
    <div
      className={
        `w-16 h-16 ${get_Cell_Color(type)}${selected ? 'border border-red-50' : ''}`
      }
      onClick={() => { onClickFn([x, y]); }}
    ></div >
  );
}
