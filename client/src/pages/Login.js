import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import Webcam from 'react-webcam'; 

function Login() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState(1); 
  const [userData, setUserData] = useState(null); 
  const [credentials, setCredentials] = useState({
    aadhaarNumber: '',
    password: '',
    otp: ''
  });

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState(1); 
  const [newPassword, setNewPassword] = useState('');

  // --- WEBCAM STATE ---
  const [showWebcam, setShowWebcam] = useState(true);
  const [webcamImage, setWebcamImage] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState(''); // Added for UI feedback
  const webcamRef = useRef(null);

  // --- HELPER: DATA URL TO BLOB ---
  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
  };

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // --- UPDATED NATIVE LIVENESS LOGIC (NO BLINK NEEDED) ---
  const captureLivenessBurst = async () => {
    setIsVerifyingFace(true);
    setLivenessStatus('🔍 Initializing Secure Scan...');
    const frames = [];
    
    // Capture 5 frames quickly for CNN texture analysis
    for (let i = 0; i < 5; i++) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const blob = dataURLtoBlob(imageSrc);
        frames.push(blob); 
      }
      await new Promise(resolve => setTimeout(resolve, 150)); 
    }

    const formData = new FormData();
    frames.forEach((frame, index) => {
      formData.append('files', frame, `frame_${index}.jpg`);
    });

    try {
      // Hits the updated Python server logic
      const livenessRes = await axios.post('http://127.0.0.1:8000/verify-liveness', formData);

      if (livenessRes.data.is_live) {
        const finalImage = webcamRef.current.getScreenshot();
        setWebcamImage(finalImage);
        setShowWebcam(false);
        setLivenessStatus('✅ Liveness Confirmed');
        
        // Identity Matching
        handleFaceVerification(finalImage);
      } else {
        alert("🛑 Security Alert: AI detected a possible spoofing attempt. Please ensure you are a live person.");
        setIsVerifyingFace(false);
        setLivenessStatus('');
      }
    } catch (error) {
      console.error("Liveness Error:", error);
      alert("AI Server connection failed.");
      setIsVerifyingFace(false);
    }
  };

  // --- FACE VERIFICATION LOGIC ---
  const handleFaceVerification = async (finalCapture) => {
    const imageToVerify = finalCapture || webcamImage;
    if (!imageToVerify || !userData?.imagePath) {
        alert("Missing image data.");
        setIsVerifyingFace(false);
        return;
    }

    try {
      const imagePathUrl = userData.imagePath.replace(/\\/g, '/');
      const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
      const savedImageBlob = await savedImageRes.blob();
      const webcamBlob = dataURLtoBlob(imageToVerify);

      const aiFormData = new FormData();
      aiFormData.append('id_image', savedImageBlob, 'saved_id.jpg'); 
      aiFormData.append('webcam_image', webcamBlob, 'login_selfie.jpg'); 

      const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData);

      if (aiRes.data.is_match) {
        localStorage.setItem('voter', JSON.stringify(userData));
        alert(`✅ Identity Confirmed! Welcome back, ${userData.name}!`);
        navigate('/dashboard'); 
      } else {
        alert("❌ Access Denied: Face does not match registered record.");
        setWebcamImage(null);
        setShowWebcam(true);
        setLivenessStatus('');
      }
    } catch (error) {
      alert("AI Verification Error.");
    } finally {
      setIsVerifyingFace(false);
    }
  };

  // (OTP and Password Reset functions remain unchanged...)
  const startResendTimer = () => {
    setResendTimer(30); 
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/resend-otp', { aadhaarNumber: credentials.aadhaarNumber });
      alert(res.data.message);
      startResendTimer();
    } catch (error) { alert("Error resending OTP."); }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault(); 
    try {
      const res = await axios.post('http://localhost:5000/api/login', {
        aadhaarNumber: credentials.aadhaarNumber,
        password: credentials.password
      });
      alert(res.data.message); 
      setStep(2); 
    } catch (error) { alert("Login failed. Check credentials."); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/verify-otp', {
        aadhaarNumber: credentials.aadhaarNumber,
        otp: credentials.otp
      });
      setUserData(res.data.user);
      setStep(3); 
    } catch (error) { alert("Invalid OTP."); }
  };

  const handleForgotPasswordRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', { aadhaarNumber: credentials.aadhaarNumber });
      alert(res.data.message);
      setResetStep(2); 
    } catch (error) { alert("Account not found."); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/reset-password', {
        aadhaarNumber: credentials.aadhaarNumber,
        otp: credentials.otp,
        newPassword: newPassword
      });
      alert("Password Updated Successfully!");
      setCredentials({ ...credentials, password: '', otp: '' });
      setIsForgotPassword(false); 
      setResetStep(1);
    } catch (error) { alert("Reset failed."); }
  };

  return (
    <div className="bg-login">
      <div className="container" style={{ maxWidth: '450px', padding: '30px' }}>
        
        {isForgotPassword ? (
          <div>
            <h2>🔑 Reset Password</h2>
            {resetStep === 1 ? (
              <form onSubmit={handleForgotPasswordRequest}>
                <div className="form-group">
                  <label>ID Number</label>
                  <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#ff9800' }}>Send Recovery Code</button>
                <p style={{marginTop: '20px', textAlign: 'center', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setIsForgotPassword(false)}>Back to Login</p>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset}>
                <div className="form-group">
                  <label>6-Digit Code</label>
                  <input type="text" name="otp" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ textAlign: 'center', fontSize: '24px' }} />
                </div>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <button type="button" onClick={handleResendOTP} disabled={resendTimer > 0} style={{ border: 'none', background: 'none', color: resendTimer > 0 ? 'gray' : '#007bff', cursor: 'pointer' }}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                    </button>
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#28a745' }}>Save New Password</button>
              </form>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ textAlign: 'center' }}>🔐 Voter Login</h2>
            <hr style={{ margin: '20px 0', opacity: '0.1' }} />
            
            {step === 1 && (
              <form onSubmit={handleCredentialLogin}>
                <div className="form-group">
                  <label>ID Number</label>
                  <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" name="password" required value={credentials.password} onChange={handleInputChange} />
                </div>
                <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                  <span style={{ color: '#007bff', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }} onClick={() => setIsForgotPassword(true)}>Forgot Password?</span>
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Next: Identity Verification</button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <h4 style={{textAlign: 'center'}}>Step 2: OTP Verification</h4>
                <div className="form-group">
                  <input type="text" name="otp" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ fontSize: '28px', textAlign: 'center', letterSpacing: '8px', width: '100%' }} />
                </div>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <button type="button" onClick={handleResendOTP} disabled={resendTimer > 0} style={{ border: 'none', background: 'none', color: resendTimer > 0 ? 'gray' : '#007bff', cursor: 'pointer' }}>
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Didn't get the code? Resend"}
                    </button>
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#28a745', width: '100%' }}>Verify OTP</button>
              </form>
            )}

            {step === 3 && (
              <div className="face-verification-step">
                <h4 style={{textAlign: 'center'}}>Step 3: Biometric Security</h4>
                {showWebcam ? (
                  <div style={{ textAlign: 'center' }}>
                    <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ borderRadius: '8px' }} />
                    
                    {livenessStatus && (
                        <p style={{ margin: '10px 0', fontWeight: 'bold', color: livenessStatus.includes('✅') ? 'green' : '#007bff' }}>
                            {livenessStatus}
                        </p>
                    )}

                    <button 
                        type="button"
                        onClick={captureLivenessBurst} 
                        disabled={isVerifyingFace}
                        style={{ marginTop: '5px', padding: '12px', background: '#007bff', color: 'white', width: '100%', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
                    >
                        {isVerifyingFace ? '🧠 Analyzing Texture (Stay Still)...' : '📸 Start AI Biometric Scan'}
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <img src={webcamImage} alt="Selfie" style={{ width: '100%', borderRadius: '8px', border: '3px solid #28a745' }} />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button type="button" onClick={() => { setWebcamImage(null); setShowWebcam(true); setLivenessStatus(''); }} style={{ flex: 1, padding: '10px' }}>Retake</button>
                      <button type="button" onClick={() => handleFaceVerification()} disabled={isVerifyingFace} style={{ flex: 2, background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
                        {isVerifyingFace ? 'AI Matching...' : '✅ Confirm Identity'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;