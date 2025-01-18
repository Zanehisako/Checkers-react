import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import Client from "./client";
import { SocketProvider } from "./socketcontext";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Rooms } from "./rooms";

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <SocketProvider>
      <Router>
        <nav>
          <Link to="/">Rooms</Link>
          <Link to="/page2">Game</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Rooms />} />
          <Route path="/page2" element={<Client />} />
        </Routes>
      </Router>
    </SocketProvider>
  </React.StrictMode>,
);
