import { useState } from "react"

export function TimePanel() {
  const [messages, setMessages] = useState<string[]>(["fdasfsdafasdfas dfadfsdfasd ", "fsdafadsfsfd"])
  const [time, setTime] = useState(0)
  return (
    <div className="bg-gray-900">
      <p>
        {messages?.map((value) => {
          return <a>{value}</a>
        })}
      </p>
      <a className="bg-gray-200 border border-black">{time}</a>
    </div >
  )
}
