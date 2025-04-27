import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react"

interface data {
  id: string,
  name: string,
  points: number
  wins: number
  draws: number
  losses: number
  totalTime: number
  totalErrors: number
}


export function Leaderboard() {
  const [data, setData] = useState<data[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const variants = {
    hidden: { opacity: 0, y: -50, borderWidth: 0 }, // Start position for the animation
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      borderWidth: 1,
      transition: {
        delay: i * 0.1, // Delay each row based on its index
        duration: 0.15, // Duration of the animation
        type: "spring", // Use a spring type animation for a bounce effect
        stiffness: 100, // Spring stiffness, adjust for more/less bounce
        damping: 10, // Spring damping, adjust to change how the bounce behaves
      },
    }),
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3001/leaderboard');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const result = await response.json();
        setData(result);
      } catch (error: any) {
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array means this effect runs once when the 

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center bg-gray-900 text-white">
      <h1 className='font-bold '>Leaderboard</h1>
      <table cellSpacing={5} cellPadding={15} >
        <tr>
          <th>Name</th>
          <th>Points</th>
          <th>Wins</th>
          <th>Draws</th>
          <th>Loses</th>
          <th>TotalTime</th>
          <th>TotalErrors</th>
        </tr>
        {
          data!.map((player: data, index) => {
            return <motion.tr className='border' layout key={player.id} variants={variants} initial="hidden" animate="visible" custom={index}>
              <td>{player.name}</td>
              <td>{player.points}</td>
              <td>{player.wins}</td>
              <td>{player.draws}</td>
              <td>{player.losses}</td>
              <td>{player.totalTime}</td>
              <td>{player.totalErrors}</td>
            </motion.tr>
          })
        }
      </table>
    </motion.div >
  );
};

