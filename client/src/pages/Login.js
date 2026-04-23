// client/src/pages/Login.js
import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import Webcam from 'react-webcam'; 

function Login() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT: NORMAL LOGIN ---
  const [step, setStep] = useState(1); // Step 1: Password, Step 2: OTP, Step 3: Face Match
  const [userData, setUserData] = useState(null); 
  const [credentials, setCredentials] = useState({
    aadhaarNumber: '',
    password: '',
    otp: ''
  });

  // --- STATE MANAGEMENT: FORGOT PASSWORD ---
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Enter ID, 2: Enter OTP & New Password
  const [newPassword, setNewPassword] = useState('');

  // --- WEBCAM STATE ---
  const [showWebcam, setShowWebcam] = useState(true);
  const [webcamImage, setWebcamImage] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const webcamRef = useRef(null);

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // ==========================================
  //          NORMAL 3-STEP LOGIN LOGIC
  // ==========================================

  // --- STEP 1: VERIFY PASSWORD & SEND EMAIL ---
  const handleCredentialLogin = async (e) => {
    e.preventDefault(); 
    try {
      const res = await axios.post('http://localhost:5000/api/login', {
        aadhaarNumber: credentials.aadhaarNumber,
        password: credentials.password
      });
      alert(res.data.message); 
      setStep(2); 
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
    }
  };

  // --- STEP 2: VERIFY THE 6-DIGIT OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/verify-otp', {
        aadhaarNumber: credentials.aadhaarNumber,
        otp: credentials.otp
      });
      setUserData(res.data.user);
      setStep(3); 
    } catch (error) {
      console.error("OTP Verification error:", error);
      alert(error.response?.data?.message || "Invalid or expired OTP. Please try again.");
    }
  };

  // --- WEBCAM CAPTURE LOGIC ---
  const captureSelfie = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setWebcamImage(imageSrc);
    setShowWebcam(false); 
  }, [webcamRef]);

  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
  }

  // --- STEP 3: VERIFY FACE VIA PYTHON AI ---
  const handleFaceVerification = async () => {
    if (!webcamImage || !userData?.imagePath) {
      alert("Missing image data. Please try again.");
      return;
    }
    setIsVerifyingFace(true);

    try {
      const imagePathUrl = userData.imagePath.replace(/\\/g, '/');
      const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
      const savedImageBlob = await savedImageRes.blob();

      const webcamBlob = dataURLtoBlob(webcamImage);
      const aiFormData = new FormData();
      aiFormData.append('id_image', savedImageBlob, 'saved_id.jpg'); 
      aiFormData.append('webcam_image', webcamBlob, 'login_selfie.jpg'); 

      const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (aiRes.data.is_match) {
        localStorage.setItem('voter', JSON.stringify(userData));
        alert(`✅ Identity Confirmed! Welcome back, ${userData.name}!`);
        navigate('/dashboard'); 
      } else {
        if (aiRes.data.error_type === "NO_FACE_FOUND") {
             alert("🛑 No face detected! Please ensure your face is fully visible.");
        } else {
             alert("❌ Security Alert: The person in the camera does not match the registered account owner.");
        }
        setWebcamImage(null);
        setShowWebcam(true);
      }
    } catch (error) {
      console.error("AI Verification error:", error);
      alert("Face verification failed to process. Check your Python server.");
    } finally {
      setIsVerifyingFace(false);
    }
  };

  // ==========================================
  //          FORGOT PASSWORD LOGIC
  // ==========================================

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    if (!credentials.aadhaarNumber) return alert("Please enter your ID Number first.");
    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', { aadhaarNumber: credentials.aadhaarNumber });
      alert(res.data.message);
      setResetStep(2); 
    } catch (error) {
      alert(error.response?.data?.message || "Failed to send reset email.");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/reset-password', {
        aadhaarNumber: credentials.aadhaarNumber,
        otp: credentials.otp,
        newPassword: newPassword
      });
      alert(res.data.message);
      // Reset UI back to normal login
      setIsForgotPassword(false); 
      setResetStep(1);
      setNewPassword('');
      setCredentials({ ...credentials, password: '', otp: '' });
    } catch (error) {
      alert(error.response?.data?.message || "Failed to reset password.");
    }
  };

  // ==========================================
  //                 UI RENDER
  // ==========================================

  return (
    <div className="bg-login">
      <div className="container" style={{ maxWidth: '450px' }}>
        
        {/* --- FORGOT PASSWORD VIEW --- */}
        {isForgotPassword ? (
          <div>
            <h2>🔑 Reset Password</h2>
            {resetStep === 1 ? (
              <form onSubmit={handleForgotPasswordRequest}>
                <p style={{ textAlign: 'center', marginBottom: '20px', color: '#555' }}>
                  Enter your ID. We will send a recovery code to your registered email.
                </p>
                <div className="form-group">
                  <label>ID Number</label>
                  <input type="text" name="aadhaarNumber" placeholder="Enter your ID" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#ff9800', border: 'none' }}>Send Recovery Code</button>
                <p style={{marginTop: '20px', textAlign: 'center'}}>
                  <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => setIsForgotPassword(false)}>Back to Login</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label>Enter 6-Digit Code</label>
                  <input type="text" name="otp" placeholder="------" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ fontSize: '24px', letterSpacing: '5px', textAlign: 'center' }} />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" placeholder="Enter secure new password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#28a745', border: 'none' }}>Save New Password</button>
              </form>
            )}
          </div>
        ) : (
          /* --- NORMAL LOGIN VIEW --- */
          <div>
            <h2>🔐 Voter Login</h2>
            
            {step === 1 && (
              <form onSubmit={handleCredentialLogin}>
                <div className="form-group">
                  <label>ID Number</label>
                  <input type="text" name="aadhaarNumber" placeholder="Enter your ID" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" placeholder="Enter password" required value={credentials.password} onChange={handleInputChange} />
                </div>
                
                {/* FORGOT PASSWORD LINK */}
                <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                  <span style={{ color: '#007bff', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }} onClick={() => setIsForgotPassword(true)}>
                    Forgot Password?
                  </span>
                </div>

                <button type="submit" className="btn-primary">Next Step: Verification</button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#333'}}>Step 2: Email Verification</h4>
                <div className="form-group">
                  <label style={{ color: '#28a745', fontWeight: 'bold', textAlign: 'center', display: 'block' }}>Enter the 6-digit code sent to your email</label>
                  <input type="text" name="otp" placeholder="------" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ fontSize: '28px', letterSpacing: '8px', textAlign: 'center', marginTop: '10px' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#28a745', border: 'none' }}>Verify Code</button>
              </form>
            )}

            {step === 3 && (
              <div className="face-verification-step">
                <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#333'}}>Step 3: Live Face Scan</h4>
                {showWebcam && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ borderRadius: '8px', border: '2px solid #ccc' }} />
                    <button onClick={captureSelfie} style={{ marginTop: '15px', padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>📸 Capture Login Selfie</button>
                  </div>
                )}
                {webcamImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={webcamImage} alt="Selfie" style={{ width: '100%', borderRadius: '8px', border: '3px solid #007bff' }} />
                    <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '15px' }}>
                      <button onClick={() => { setWebcamImage(null); setShowWebcam(true); }} style={{ flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Retake</button>
                      <button onClick={handleFaceVerification} disabled={isVerifyingFace} style={{ flex: 2, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{isVerifyingFace ? '🧠 AI Comparing...' : '✅ Verify & Login'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <p style={{marginTop: '20px', textAlign: 'center'}}>
                Don't have an account? <Link to="/register">Sign Up here</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
