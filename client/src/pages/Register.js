// client/src/pages/Register.js
import React, { useState } from 'react';
import axios from 'axios'; 

function Register() {
  // 1. Added 'password' to our state memory
  const [formData, setFormData] = useState({
    name: '',
    aadhaarNumber: '',
    dob: '',
    password: '', 
    image: null
  });

  const [preview, setPreview] = useState(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- 1. AADHAAR VALIDATION (Exactly 12 digits) ---
    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(formData.aadhaarNumber)) {
      alert("❌ Invalid Input: Aadhaar Number must be exactly 12 digits.");
      return; // Stops the form from submitting!
    }

    // --- 2. INTERNATIONAL STANDARD PASSWORD VALIDATION ---
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      alert("🔒 Weak Password: Your password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return; 
    }

    // --- 3. AGE VALIDATION (Must be 18 or older) ---
    const dobDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDifference = today.getMonth() - dobDate.getMonth();
    
    // If the birthday hasn't happened yet this year, subtract 1 from their age
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age < 18) {
      alert("🛑 Eligibility Error: You must be at least 18 years old to register to vote.");
      return; // Stops the form from submitting!
    }

    // --- 4. IMAGE UPLOAD CHECK ---
    if (!formData.image) {
      alert("Please upload an Aadhaar card image first!");
      return;
    }

    // We now package ALL the data into the FormData envelope
    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('aadhaarNumber', formData.aadhaarNumber);
    dataToSend.append('dob', formData.dob);
    dataToSend.append('password', formData.password);
    dataToSend.append('aadhaarImage', formData.image); 

    try {
      alert("Saving voter details to Database... Please wait.");

      const res = await axios.post('http://localhost:5000/api/register', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log("Server Response:", res.data);
      alert(`Success! ${res.data.message}`);
      
    } catch (error) {
      console.error("Error registering:", error);
      alert("Registration failed. " + (error.response?.data?.message || "Check your server."));
    }
  };

  return (
    <div className="bg-register">
      <div className="container">
        <h2>🗳️ Voter Registration</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label>Upload Aadhaar Card</label>
            <div className="upload-box">
              <input 
                type="file" 
                id="file-upload" 
                accept="image/*"
                style={{ display: 'none' }} 
                onChange={handleImageUpload}
              />
              <label htmlFor="file-upload" className="upload-label">
                {preview ? (
                  <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                ) : (
                  "📂 Click to Upload Aadhaar"
                )}
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" placeholder="Your Name" required value={formData.name} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Aadhaar Number</label>
            <input type="text" name="aadhaarNumber" placeholder="XXXX-XXXX-XXXX" required value={formData.aadhaarNumber} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Date of Birth</label>
            <input type="date" name="dob" required value={formData.dob} onChange={handleInputChange} />
          </div>

          {/* 4. The new Password Field */}
          <div className="form-group">
            <label>Create Password</label>
            <input type="password" name="password" placeholder="Create a secure password" required value={formData.password} onChange={handleInputChange} />
          </div>

          <button type="submit" className="btn-primary">Register Voter</button>
        </form>
      </div>
    </div>
  );
}

export default Register;