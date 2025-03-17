import { Canvas } from '@react-three/fiber'

export function Lobby() {
  return (
    <div id="canvas-container">
      <Canvas>
        <mesh position={[4, -2, 3]}>
          <boxGeometry args={[2, 5, 1]} />
          <meshStandardMaterial />
        </mesh>
        <ambientLight intensity={0.1} />
        <directionalLight color="cyan" position={[0, 0, 5]} />
      </Canvas>
    </div>
  )
}
