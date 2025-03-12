import { useRef } from "react";

interface GlowButtonProps {
  text: string;
  value?: number;
  onClick: (room?: number) => void;
  size?: "small" | "medium" | "large"; // Added size prop
  className?: string; // Added optional className prop
}

const GlowButton = ({
  text,
  value,
  onClick,
  size = "medium", // Default is medium
  className = ""
}: GlowButtonProps) => {
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

  // Size variants
  const sizeClasses = {
    small: "px-2 py-1 text-sm",
    medium: "px-4 py-2",
    large: "px-16 py-3"
  };

  // Glow size based on button size
  const glowSize = {
    small: "75px",
    medium: "100px",
    large: "150px"
  };

  return (
    <div
      ref={containerRef}
      className="relative glow-button-container group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Glow overlay */}
      <div
        className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{
          background: `radial-gradient(${glowSize[size]} circle at var(--x, 50%) var(--y, 50%), rgba(99,102,241,0.4), transparent 80%)`
        }}
      />
      {/* Button */}
      <button
        className={`flex items-center justify-center relative ${sizeClasses[size]} bg-gray-900 text-white text-opacity-40 rounded-full font-bold 
                  border border-blue-300/20 hover:border-white/80 transition-all duration-200
                  hover:text-opacity-100 hover:scale-[1.05] ${className}`}
        onClick={() => { onClick(value) }}
      >
        {text}
      </button>
    </div>
  );
};

export default GlowButton;
