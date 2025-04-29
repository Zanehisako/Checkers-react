import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react"

interface data {
  id: number,
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

  //to sort the leaderbord
  const [idAsc, setIDAscending] = useState(true);
  const [pointsAsc, setPointAscending] = useState(true);
  const [winsAsc, setAscendingWins] = useState(true);
  const [LossesAsc, setAscendingLosses] = useState(true);
  const [DrawsAsc, setAscendingDraws] = useState(true);
  const [TotalTimeAsc, setAscendingTotalTime] = useState(true);
  const [TotalErrorsAsc, setAscendingTotalErrors] = useState(true);

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
        const result: data[] = await response.json();
        setData(result.sort((a, b) => b.points - a.points));
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen w-screen overflow-auto flex flex-col items-center bg-gray-900 text-white gap-5">
      <h1 className='font-extrabold text-2xl'>Leaderboard</h1>
      <table cellSpacing={5} cellPadding={15} >
        <thead>
          <tr>

            <th>Name</th>

            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (pointsAsc) {
                  setPointAscending(false)
                  return (b.points - a.points)
                } else {
                  setPointAscending(true)
                  return a.points - b.points
                }

              })); console.log('hello')
            }}>Points</th>
            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (winsAsc) {
                  setAscendingWins(false)
                  return (b.wins - a.wins)
                } else {
                  setAscendingWins(true)
                  return a.wins - b.wins
                }

              })); console.log('hello')
            }}>wins</th>
            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (DrawsAsc) {
                  setAscendingDraws(false)
                  return (b.draws - a.draws)
                } else {
                  setAscendingDraws(true)
                  return a.draws - b.draws
                }

              })); console.log('hello')
            }}>draws</th>

            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (LossesAsc) {
                  setAscendingLosses(false)
                  return (b.losses - a.losses)
                } else {
                  setAscendingLosses(true)
                  return a.losses - b.losses
                }

              })); console.log('hello')
            }}>Losses</th>

            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (TotalTimeAsc) {
                  setAscendingTotalTime(false)
                  return (b.totalTime - a.totalTime)
                } else {
                  setAscendingTotalTime(true)
                  return a.totalTime - b.totalTime
                }
              })); console.log('hello')
            }}>TotalTime</th>

            <th onClick={() => {
              setData([...data!].sort((a, b) => {
                if (TotalErrorsAsc) {
                  setAscendingTotalErrors(false)
                  return (b.totalErrors - a.totalErrors)
                } else {
                  setAscendingTotalErrors(true)
                  return a.totalErrors - b.totalErrors
                }
              })); console.log('hello')
            }}>TotalErrors</th>


          </tr>
        </thead>
        <tbody>
          {
            data!.map((player: data, index) => {
              return <motion.tr className='border' layout key={player.id} variants={variants} initial="hidden" animate="visible" custom={index}>
                <td className='font-extrabold'>{player.name}</td>
                <td className='text-green-400 font-extrabold'>{player.points}</td>
                <td>{player.wins}</td>
                <td>{player.draws}</td>
                <td>{player.losses}</td>
                <td>{player.totalTime}</td>
                <td className='text-red-600 font-extrabold'>{player.totalErrors}</td>
              </motion.tr>
            })
          }
        </tbody>
      </table>
    </motion.div >
  );
};

