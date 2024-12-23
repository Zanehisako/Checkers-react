interface CellProps {
  key: number; // or `React.Key` if it's used as a React key
  isSelected: number[];
  type: number; // or another appropriate type
}

export function Cell({ key, isSelected, type }: CellProps) {
  const get_Cell_Color = (type: number) =>
    type === 1 ? "bg-white" : "bg-orange-900";

  return (
    <div
      key={key}
      className={
        isSelected[0] === key || isSelected[1] === key
          ? `w-12 h-12 ${get_Cell_Color(type)} border-2 border-red-500`
          : `w-12 h-12 ${get_Cell_Color(type)}`
      }
    ></div>
  );
}
