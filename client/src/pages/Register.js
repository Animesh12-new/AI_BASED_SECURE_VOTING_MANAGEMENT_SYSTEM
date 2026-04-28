import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios'; 
import Tesseract from 'tesseract.js';
import Webcam from 'react-webcam'; 

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    aadhaarNumber: '',
    dob: '',
    password: '', 
    email: '', 
    image: null
  });

  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState('');
  const [showWebcam, setShowWebcam] = useState(false);
  const [webcamImage, setWebcamImage] = useState(null);
  const webcamRef = useRef(null);

  // Cleanup preview URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (preview) URL.revokeObjectURL(preview); // Clean up old preview
      setFormData({ ...formData, image: file });
      setPreview(URL.createObjectURL(file));
      setIsScanning(true);
      setScanProgress('Initializing AI Scan...');

      try {
        const result = await Tesseract.recognize(file, 'eng', {
          logger: m => {
            if (m.status === 'recognizing text') {
              setScanProgress(`AI Scanning: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        const extractedText = result.data.text;
        const lines = extractedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let extractedName = "";

        // Improved Name Logic
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(/\d{2}[/-]\d{2}[/-]\d{4}/) || lines[i].toUpperCase().includes("DOB")) {
            if (i > 0) {
              let possibleName = lines[i - 1];
              if (/[a-zA-Z]/.test(possibleName) && !possibleName.toLowerCase().includes("government")) {
                extractedName = possibleName.replace(/[^a-zA-Z\s]/g, "").trim(); 
              }
            }
            break; 
          }
        }

        // Improved Regex for 12-digit ID
        const idRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/;
        const idMatch = extractedText.match(idRegex);
        const dobRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b/;
        const dobMatch = extractedText.match(dobRegex);

        let updatedData = { ...formData };
        if (extractedName) updatedData.name = extractedName;
        // Clean the ID of any spaces or dashes
        if (idMatch) updatedData.aadhaarNumber = idMatch[0].replace(/[^0-9]/g, "");
        if (dobMatch) updatedData.dob = `${dobMatch[3]}-${dobMatch[2]}-${dobMatch[1]}`;

        setFormData(updatedData);
        alert(idMatch || dobMatch || extractedName ? "✅ Details extracted!" : "⚠️ AI Scan incomplete. Please verify details.");
      } catch (error) {
        alert("OCR failed. Enter details manually.");
      } finally {
        setIsScanning(false);
        setScanProgress('');
      }
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!webcamImage) return alert("🛑 Capture a live face scan to register.");
    if (!/^\d{12}$/.test(formData.aadhaarNumber)) return alert("❌ ID Number must be 12 digits.");
    
    // Eligibility Check
    const dobDate = new Date(formData.dob);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
    
    if (age < 18) return alert("🛑 Eligibility Error: You must be 18+ to register.");

    const dataToSend = new FormData();
    dataToSend.append('name', formData.name);
    dataToSend.append('aadhaarNumber', formData.aadhaarNumber);
    dataToSend.append('dob', formData.dob);
    dataToSend.append('password', formData.password);
    dataToSend.append('email', formData.email); 
    dataToSend.append('registrationFace', dataURLtoBlob(webcamImage), 'golden_face.jpg'); 

    try {
      const res = await axios.post('http://localhost:5000/api/register', dataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Success! ${res.data.message}`);
    } catch (error) {
      alert("Registration failed. " + (error.response?.data?.message || "Check server connection."));
    }
  };

  return (
    <div className="bg-register">
      <div className="container" style={{ maxWidth: '550px', padding: '30px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🗳️ Voter Registration</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>1. Upload ID Card (AI Scan)</label>
            <div className="upload-box" style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
              <input type="file" id="file-upload" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
              <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {preview ? (
                  <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '150px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ padding: '20px', color: '#666' }}>📂 Click to Upload ID Card</div>
                )}
              </label>
              {isScanning && <div style={{ color: '#007bff', marginTop: '10px', fontWeight: 'bold' }}>🔄 {scanProgress}</div>}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '25px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>2. Live Face Capture</label>
            <div style={{ textAlign: 'center' }}>
              {!showWebcam && !webcamImage && (
                <button type="button" onClick={() => setShowWebcam(true)} className="btn-secondary" style={{ width: '100%' }}>📷 Open Camera</button>
              )}
              {showWebcam && (
                <div>
                  <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ borderRadius: '8px', border: '1px solid #ddd' }} />
                  <button type="button" onClick={captureSelfie} className="btn-primary" style={{ marginTop: '10px', background: '#28a745' }}>📸 Capture Registration Photo</button>
                </div>
              )}
              {webcamImage && (
                <div>
                  <img src={webcamImage} alt="Selfie" style={{ width: '150px', borderRadius: '8px', border: '3px solid #28a745' }} />
                  <button type="button" onClick={() => { setWebcamImage(null); setShowWebcam(true); }} className="btn-danger" style={{ display: 'block', margin: '10px auto', padding: '5px 15px' }}>Retake Photo</button>
                </div>
              )}
            </div>
          </div>

          <hr style={{ margin: '25px 0', opacity: '0.1' }} />

          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" className="form-control" placeholder="Extracted from ID" required value={formData.name} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input type="email" name="email" className="form-control" placeholder="voter@example.com" required value={formData.email} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label>12-Digit ID Number</label>
            <input type="text" name="aadhaarNumber" className="form-control" placeholder="XXXX XXXX XXXX" required value={formData.aadhaarNumber} onChange={handleInputChange} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" name="dob" className="form-control" required value={formData.dob} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Secure Password</label>
              <input type="password" name="password" className="form-control" placeholder="Min 8 chars" required minLength="8" value={formData.password} onChange={handleInputChange} />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={isScanning || !webcamImage} style={{ width: '100%', marginTop: '25px', height: '50px' }}>
            {isScanning ? '🧠 AI Processing...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Register;
