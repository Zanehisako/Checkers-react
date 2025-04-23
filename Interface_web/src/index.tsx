import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Client from "./client";
import { SocketProvider } from "./socketcontext";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Rooms } from "./rooms";
import { AnimatePresence } from "motion/react"

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <AnimatePresence mode="wait">
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Rooms />} />
            <Route path="/Game/:room" element={<Client />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AnimatePresence>
  </React.StrictMode>,
);
