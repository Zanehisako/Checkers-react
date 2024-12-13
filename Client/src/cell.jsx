export function Cell({ key, isSelected, type }) {
  console.log("index:", isSelected);

  const get_Cell_Color = (type) => (type === 1 ? "bg-white" : "bg-black");

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
