// client/src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // We need axios to talk to the server

function Login() {
  const navigate = useNavigate();
  
  // Create state to hold what the user types
  const [credentials, setCredentials] = useState({
    aadhaarNumber: '',
    password: ''
  });

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault(); 
    
    try {
      // Send the credentials to our new Node.js login route
      const res = await axios.post('http://localhost:5000/api/login', credentials);
      
      // 1. Grab the user data sent back from the server
      const loggedInUser = res.data.user;
      
      // 2. Save it to the browser's local memory (localStorage)
      // We use JSON.stringify because localStorage can only save text strings!
      localStorage.setItem('voter', JSON.stringify(loggedInUser));
      
      alert(`Welcome back, ${loggedInUser.name}!`);
      
      // 3. Redirect to the dashboard
      navigate('/dashboard'); 

    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <div className="bg-login">
      <div className="container">
        <h2>🔐 Voter Login</h2>
        <form onSubmit={handleLogin}>
          
          <div className="form-group">
            <label>Aadhaar Number</label>
            <input 
              type="text" 
              name="aadhaarNumber"
              placeholder="Enter your ID" 
              required 
              value={credentials.aadhaarNumber}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="Enter password" 
              required 
              value={credentials.password}
              onChange={handleInputChange}
            />
          </div>

          <button type="submit" className="btn-primary">Login</button>
        </form>
        <p style={{marginTop: '15px', textAlign: 'center'}}>
          Don't have an account? <Link to="/register">Sign Up here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;