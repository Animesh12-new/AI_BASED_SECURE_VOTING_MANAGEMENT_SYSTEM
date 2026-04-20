// client/src/pages/Register.js
import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios'; 
import Tesseract from 'tesseract.js';
import Webcam from 'react-webcam'; // NEW: Imported Webcam

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    aadhaarNumber: '',
    dob: '',
    password: '', 
    image: null
  });

  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');

  // --- NEW STATE FOR FACIAL RECOGNITION ---
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamImage, setWebcamImage] = useState(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const webcamRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));

      setIsScanning(true);
      setScanProgress('Initializing Edge AI...');

      try {
        const result = await Tesseract.recognize(
          file,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setScanProgress(`AI Scanning: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        );

        const extractedText = result.data.text;
        console.log("Raw Text Extracted by AI:\n", extractedText);

        const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let extractedName = "";

        for (let i = 0; i < lines.length; i++) {
          const currentLine = lines[i];
          // eslint-disable-next-line no-useless-escape
          if (currentLine.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/) || currentLine.toUpperCase().includes("DOB")) {
            if (i > 0) {
              let possibleName = lines[i - 1];
              if (/[a-zA-Z]/.test(possibleName) && !possibleName.toLowerCase().includes("government")) {
                extractedName = possibleName.replace(/[^a-zA-Z\s]/g, "").trim(); 
              } else if (i > 1) {
                let alternateName = lines[i - 2];
                extractedName = alternateName.replace(/[^a-zA-Z\s]/g, "").trim();
              }
            }
            break; 
          }
        }

        const aadhaarRegex = /\b(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})\b/;
        const aadhaarMatch = extractedText.match(aadhaarRegex);

        const dobRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
        const dobMatch = extractedText.match(dobRegex);

        let updatedData = { ...formData, image: file };

        if (extractedName) updatedData.name = extractedName;
        if (aadhaarMatch) updatedData.aadhaarNumber = aadhaarMatch[1] + aadhaarMatch[2] + aadhaarMatch[3];
        if (dobMatch) updatedData.dob = `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}`;

        setFormData(updatedData);

        if (aadhaarMatch || dobMatch || extractedName) {
          alert("✅ AI successfully extracted your details!");
        } else {
          alert("⚠️ AI could not read the card clearly. Please type your details manually.");
        }

      } catch (error) {
        console.error("OCR Engine Error:", error);
        alert("OCR failed. Please enter details manually.");
      } finally {
        setIsScanning(false);
        setScanProgress('');
      }
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- NEW: CAPTURE WEBCAM PHOTO ---
  const captureSelfie = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setWebcamImage(imageSrc);
    setShowWebcam(false); // Turn off camera after taking pic
  }, [webcamRef]);

  // --- NEW: HELPER TO CONVERT BASE64 IMAGE TO BLOB FOR SERVER ---
  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
  }

  // --- NEW: SEND BOTH IMAGES TO PYTHON AI SERVER ---
  const handleFaceVerification = async () => {
    if (!formData.image || !webcamImage) {
      alert("Please upload your ID and take a selfie first.");
      return;
    }

    setIsVerifyingFace(true);

    // Package the files to send to Python
    const aiFormData = new FormData();
    aiFormData.append('id_image', formData.image); 
    aiFormData.append('webcam_image', dataURLtoBlob(webcamImage), 'selfie.jpg');

    try {
      const res = await axios.post('http://127.0.0.1:8000/verify', aiFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.is_match) {
        setFaceVerified(true);
        alert(`✅ Face Match Confirmed! (Distance: ${res.data.distance.toFixed(2)})`);
      } else {
        setFaceVerified(false);
        // NEW: Smarter error handling
        if (res.data.error_type === "NO_FACE_FOUND") {
             alert("🛑 No face detected! Please ensure your face is fully visible in the camera and the ID card is clear.");
        } else {
             alert("❌ Face Mismatch! The person in the camera does not match the ID card.");
        }
        setWebcamImage(null); 
      }
    } catch (error) {
      console.error("AI Server Error:", error);
      alert("AI Verification failed. Make sure your Python server is running.");
    } finally {
      setIsVerifyingFace(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // --- NEW: BLOCK SUBMISSION IF FACE ISN'T VERIFIED ---
    if (!faceVerified) {
      alert("🛑 Security Error: You must pass AI Face Verification before registering.");
      return;
    }

    const aadhaarRegex = /^\d{12}$/;
    if (!aadhaarRegex.test(formData.aadhaarNumber)) {
      alert("❌ Invalid Input: Aadhaar Number must be exactly 12 digits.");
      return; 
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      alert("🔒 Weak Password: Your password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return; 
    }

    const dobDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDifference = today.getMonth() - dobDate.getMonth();
    
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }

    if (age < 18) {
      alert("🛑 Eligibility Error: You must be at least 18 years old to register to vote.");
      return; 
    }

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('aadhaarNumber', formData.aadhaarNumber);
    dataToSend.append('dob', formData.dob);
    dataToSend.append('password', formData.password);
    dataToSend.append('aadhaarImage', formData.image); 

    try {
      const res = await axios.post('http://localhost:5000/api/register', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
            <label>1. Upload ID Card (AI Scan)</label>
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
                  <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain', opacity: isScanning ? 0.5 : 1 }} />
                ) : (
                  "📂 Click to Upload ID"
                )}
              </label>
              
              {isScanning && (
                <div style={{ marginTop: '10px', color: '#007bff', fontWeight: 'bold' }}>
                  🔄 {scanProgress}
                </div>
              )}
            </div>
          </div>

          {/* --- NEW WEBCAM SECTION --- */}
          <div className="form-group">
            <label>2. Live Face Verification</label>
            
            {!showWebcam && !webcamImage && (
              <button type="button" onClick={() => setShowWebcam(true)} style={{ padding: '8px 12px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                📷 Open Camera
              </button>
            )}

            {showWebcam && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  style={{ borderRadius: '8px', border: '2px solid #ccc' }}
                />
                <button type="button" onClick={captureSelfie} style={{ marginTop: '10px', padding: '8px 16px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  📸 Capture Selfie
                </button>
              </div>
            )}

            {webcamImage && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px' }}>
                <img src={webcamImage} alt="Selfie" style={{ width: '150px', borderRadius: '8px', border: '2px solid #4CAF50' }} />
                <button type="button" onClick={() => { setWebcamImage(null); setShowWebcam(true); setFaceVerified(false); }} style={{ marginTop: '5px', padding: '5px 10px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Retake Photo
                </button>
              </div>
            )}

            {/* AI Verification Button */}
            {preview && webcamImage && !faceVerified && (
              <button 
                type="button" 
                onClick={handleFaceVerification} 
                disabled={isVerifyingFace}
                style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {isVerifyingFace ? '🧠 AI Comparing Faces...' : '✅ Verify Match'}
              </button>
            )}

            {faceVerified && (
              <div style={{ marginTop: '10px', padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                Identity Verified! Proceed to register.
              </div>
            )}
          </div>
          <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

          {/* Existing Form Inputs */}
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

          <div className="form-group">
            <label>Create Password</label>
            <input type="password" name="password" placeholder="Create a secure password" required value={formData.password} onChange={handleInputChange} />
          </div>

          <button type="submit" className="btn-primary" disabled={isScanning || !faceVerified}>
            {isScanning ? 'AI Processing...' : 'Register Voter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;