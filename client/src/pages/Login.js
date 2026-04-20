// client/src/pages/Login.js
import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import Webcam from 'react-webcam'; // NEW: Imported Webcam

function Login() {
  const navigate = useNavigate();
  
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState(1); // Step 1: Password, Step 2: Face Match
  const [userData, setUserData] = useState(null); // Holds user info between steps
  
  const [credentials, setCredentials] = useState({
    aadhaarNumber: '',
    password: ''
  });

  // --- WEBCAM STATE ---
  const [showWebcam, setShowWebcam] = useState(true);
  const [webcamImage, setWebcamImage] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const webcamRef = useRef(null);

  const handleInputChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  // --- STEP 1: VERIFY PASSWORD ---
  const handleCredentialLogin = async (e) => {
    e.preventDefault(); 
    try {
      const res = await axios.post('http://localhost:5000/api/login', credentials);
      // Grab the user data (which now includes imagePath)
      setUserData(res.data.user);
      setStep(2); // Move to Face Verification Step
    } catch (error) {
      console.error("Login error:", error);
      alert(error.response?.data?.message || "Login failed. Please try again.");
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
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

  // --- STEP 2: VERIFY FACE VIA PYTHON AI ---
  const handleFaceVerification = async () => {
    if (!webcamImage || !userData?.imagePath) {
      alert("Missing image data. Please try again.");
      return;
    }

    setIsVerifyingFace(true);

    try {
      // 1. Fetch the master ID photo from the Node.js server
      // (We replace backslashes with forward slashes just in case Windows formatted the path weirdly)
      const imagePathUrl = userData.imagePath.replace(/\\/g, '/');
      const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
      const savedImageBlob = await savedImageRes.blob();

      // 2. Convert the new live selfie to a Blob
      const webcamBlob = dataURLtoBlob(webcamImage);

      // 3. Package both images together
      const aiFormData = new FormData();
      aiFormData.append('id_image', savedImageBlob, 'saved_id.jpg'); // The DB image
      aiFormData.append('webcam_image', webcamBlob, 'login_selfie.jpg'); // The live image

      // 4. Send to Python AI
      const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (aiRes.data.is_match) {
        // SUCCESS! Save user to local memory and enter the app
        localStorage.setItem('voter', JSON.stringify(userData));
        alert(`✅ Identity Confirmed! Welcome back, ${userData.name}!`);
        navigate('/dashboard'); 
      } else {
        // AI SECURITY TRIGGERED
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

  return (
    <div className="bg-login">
      <div className="container" style={{ maxWidth: '450px' }}>
        <h2>🔐 Voter Login</h2>
        
        {step === 1 && (
          <form onSubmit={handleCredentialLogin}>
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
            <button type="submit" className="btn-primary">Next Step: Verification</button>
          </form>
        )}

        {step === 2 && (
          <div className="face-verification-step">
            <h4 style={{textAlign: 'center', marginBottom: '15px', color: '#333'}}>Step 2: Live Face Scan</h4>
            
            {showWebcam && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  style={{ borderRadius: '8px', border: '2px solid #ccc' }}
                />
                <button onClick={captureSelfie} style={{ marginTop: '15px', padding: '10px 20px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                  📸 Capture Login Selfie
                </button>
              </div>
            )}

            {webcamImage && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <img src={webcamImage} alt="Selfie" style={{ width: '100%', borderRadius: '8px', border: '3px solid #007bff' }} />
                
                <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '15px' }}>
                  <button onClick={() => { setWebcamImage(null); setShowWebcam(true); }} style={{ flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Retake
                  </button>
                  <button onClick={handleFaceVerification} disabled={isVerifyingFace} style={{ flex: 2, padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {isVerifyingFace ? '🧠 AI Comparing...' : '✅ Verify & Login'}
                  </button>
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
    </div>
  );
}

export default Login;