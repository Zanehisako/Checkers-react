import { useRef } from "react";

const GlowButton = ({ value, onNavigate, empty }: { value: number, onNavigate: (room: number) => void, empty: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    containerRef.current.style.setProperty('--x', `${x}px`);
    containerRef.current.style.setProperty('--y', `${y}px`);
  };

  const handleMouseLeave = () => {
    if (!containerRef.current) return;
    containerRef.current.style.removeProperty('--x');
    containerRef.current.style.removeProperty('--y');
  };

  return (
    <div
      ref={containerRef}
      className="relative glow-button-container group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => { onNavigate(value) }}
    >
      {/* Glow overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: 'radial-gradient(150px circle at var(--x, 50%) var(--y, 50%), rgba(99,102,241,0.4), transparent 80%)'
        }}
      />

      {/* Button */}
      <button className="flex flex-row gap-8 relative px-16 py-3 bg-gray-900 text-white text-opacity-40 rounded-full font-bold 
                        border border-blue-300/20 hover:border-white/80 transition-all duration-200
                        hover:text-opacity-100 hover:scale-[1.1]">
        {value}
        {<h1 className={empty ? "text-green-500 " : "text-red-500"} >{empty ? " 1/2" : " 2/2"}</h1>}
      </button>
    </div >
  );
};

export default GlowButton;
