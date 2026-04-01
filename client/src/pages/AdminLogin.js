import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AdminLogin() {
const [aadhaarNumber, setAadhaarNumber] = useState('');
const [password, setPassword] = useState('');
const navigate = useNavigate();

const handleAdminLogin = async (e) => {
e.preventDefault();
try {
const res = await axios.post('http://localhost:5000/api/admin/login', {
aadhaarNumber,
password
});

  alert(res.data.message);
  // Save the admin info to local storage
  localStorage.setItem('adminUser', JSON.stringify(res.data.user));
  // Send them directly to the dashboard
  navigate('/admin'); 

} catch (error) {
  if (error.response) {
    alert(error.response.data.message); // Shows "Access Denied" if normal voter
  } else {
    alert("Login failed. Please try again.");
  }
}
};

return (
<div className="bg-register">
<div className="form-container" style={{ borderTop: '5px solid #ef4444' }}>
<h2 style={{ color: '#ef4444' }}>👑 Admin Portal Login</h2>
<p style={{ textAlign: 'center', marginBottom: '20px', color: '#64748b' }}>Authorized Personnel Only</p>

    <form onSubmit={handleAdminLogin}>
      <div className="form-group">
        <label>Admin ID / Aadhaar Number</label>
        <input 
          type="text" 
          value={aadhaarNumber} 
          onChange={(e) => setAadhaarNumber(e.target.value)} 
          required 
        />
      </div>
      <div className="form-group">
        <label>Admin Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
      </div>
      <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>
        Secure Login
      </button>
    </form>
  </div>
</div>
);
}

export default AdminLogin;