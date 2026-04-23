// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar'; 
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import Chatbot from './components/Chatbot'; // <-- 1. Import the AI Chatbot
import './App.css'; 

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar /> 
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} /> 
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-login" element={<AdminLogin />} />
        </Routes>

        {/* <-- 2. The Chatbot sits outside the Routes so it never disappears! */}
        <Chatbot /> 
        
      </div>
    </Router>
  );
}

export default App;