interface CellProps {
  key: number; // or `React.Key` if it's used as a React key
  type: number; // or another appropriate type
}

export function Cell({ key, type }: CellProps) {
  const get_Cell_Color = (type: number) =>
    type === 1 ? "bg-white" : "bg-orange-900";

  return (
    <div
      key={key}
      className={
        `w-16 h-16 ${get_Cell_Color(type)}`
      }
    ></div >
  );
}
