import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';

function AdminLogin() {
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1); 
    const [adminData, setAdminData] = useState(null);
    const [resendTimer, setResendTimer] = useState(0); 
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [resetStep, setResetStep] = useState(1);
    const [newPassword, setNewPassword] = useState('');
    const [credentials, setCredentials] = useState({
        aadhaarNumber: '',
        password: '',
        otp: ''
    });

    // --- WEBCAM & AI STATE ---
    const [showWebcam, setShowWebcam] = useState(true);
    const [webcamImage, setWebcamImage] = useState(null);
    const [isVerifyingFace, setIsVerifyingFace] = useState(false);
    const [livenessStatus, setLivenessStatus] = useState(''); 
    const webcamRef = useRef(null);

    // --- TIMER LOGIC (THE "TICKING" ENGINE) ---
    useEffect(() => {
        let interval = null;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const startTimer = () => setResendTimer(30);

    // --- HELPER: DATA URL TO BLOB ---
    const dataURLtoBlob = (dataurl) => {
        if (!dataurl) return null;
        let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){ u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], {type:mime});
    };

    const handleInputChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    // --- AI LIVENESS: TEXTURE ANALYSIS ---
    const captureLivenessBurst = async () => {
        setIsVerifyingFace(true);
        setLivenessStatus('🔍 AI Analyzing Surface Texture...');
        const frames = [];
        
        try {
            for (let i = 0; i < 5; i++) {
                const imageSrc = webcamRef.current?.getScreenshot();
                if (imageSrc) {
                    frames.push(dataURLtoBlob(imageSrc));
                }
                await new Promise(resolve => setTimeout(resolve, 150)); 
            }

            const formData = new FormData();
            frames.forEach((frame, index) => {
                formData.append('files', frame, `admin_frame_${index}.jpg`);
            });

            const livenessRes = await axios.post('http://127.0.0.1:8000/verify-liveness', formData);

            if (livenessRes.data.is_live) {
                const finalImage = webcamRef.current.getScreenshot();
                setWebcamImage(finalImage);
                setShowWebcam(false);
                setLivenessStatus('✅ Liveness Confirmed');
                handleAdminFaceVerification(finalImage);
            } else {
                alert("🛑 Security Alert: Spoofing detected! Use a live face.");
                setIsVerifyingFace(false);
                setLivenessStatus('❌ Liveness Failed');
            }
        } catch (error) {
            alert("AI Server Offline. Ensure Python is running on port 8000.");
            setIsVerifyingFace(false);
        }
    };

    // --- FACE MATCHING LOGIC ---
    const handleAdminFaceVerification = async (finalWebcamImage) => {
        const imageToVerify = finalWebcamImage || webcamImage;
        if (!imageToVerify || !adminData?.imagePath) {
            alert("Missing biometric record.");
            setIsVerifyingFace(false);
            return;
        }

        try {
            const imagePathUrl = adminData.imagePath.replace(/\\/g, '/');
            const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
            const savedImageBlob = await savedImageRes.blob();
            const webcamBlob = dataURLtoBlob(imageToVerify);

            const aiFormData = new FormData();
            aiFormData.append('id_image', savedImageBlob, 'admin_db.jpg');
            aiFormData.append('webcam_image', webcamBlob, 'admin_live.jpg');

            const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData);

            if (aiRes.data.is_match) {
                localStorage.setItem('admin', JSON.stringify(adminData));
                alert(`👑 Admin Identity Confirmed. Welcome.`);
                navigate('/admin');
            } else {
                alert("❌ Identity Mismatch: Unauthorized Access Denied.");
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

    // --- CREDENTIAL & OTP LOGIC ---
    const handleAdminCredentialLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/admin/login', {
                aadhaarNumber: credentials.aadhaarNumber,
                password: credentials.password
            });
            alert(res.data.message);
            setStep(2);
            startTimer(); // Start the 30s countdown
        } catch (error) { alert("Invalid Admin Credentials."); }
    };

    const handleResendOTP = async () => {
        try {
            await axios.post('http://localhost:5000/api/resend-otp', { aadhaarNumber: credentials.aadhaarNumber });
            alert("New OTP Sent!");
            startTimer(); 
        } catch (error) { alert("Error resending OTP."); }
    };

    const handleVerifyAdminOTP = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/verify-otp', {
                aadhaarNumber: credentials.aadhaarNumber,
                otp: credentials.otp
            });
            setAdminData(res.data.user);
            setStep(3);
        } catch (error) { alert("Invalid OTP."); }
    };

    const handleAdminForgotRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/forgot-password', { aadhaarNumber: credentials.aadhaarNumber });
            alert(res.data.message);
            setResetStep(2);
        } catch (error) { alert("Admin account not found."); }
    };

    const handleAdminPasswordReset = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/reset-password', {
                aadhaarNumber: credentials.aadhaarNumber,
                otp: credentials.otp,
                newPassword: newPassword
            });
            alert("Password updated securely!");
            setCredentials({ ...credentials, password: '', otp: '' }); 
            setIsForgotPassword(false);
            setResetStep(1);
        } catch (error) { alert("Reset failed."); }
    };

    return (
        <div className="bg-login">
            <div className="container" style={{ maxWidth: '450px', padding: '30px' }}>
                <h2 style={{ color: '#d9534f', textAlign: 'center' }}>👑 Admin Portal Login</h2>
                <hr style={{ border: '1px solid #eee', marginBottom: '20px' }} />

                {isForgotPassword ? (
                    <div>
                        <h4 style={{ textAlign: 'center' }}>Reset Admin Password</h4>
                        {resetStep === 1 ? (
                            <form onSubmit={handleAdminForgotRequest}>
                                <div className="form-group">
                                    <label>Admin ID</label>
                                    <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: '#f59e0b' }}>Send Recovery Code</button>
                                <p style={{ textAlign: 'center', marginTop: '15px', color: '#d9534f', cursor: 'pointer' }} onClick={() => setIsForgotPassword(false)}>Back to Login</p>
                            </form>
                        ) : (
                            <form onSubmit={handleAdminPasswordReset}>
                                <div className="form-group">
                                    <label>6-Digit Code</label>
                                    <input type="text" name="otp" required value={credentials.otp} onChange={handleInputChange} style={{ textAlign: 'center', fontSize: '24px' }} />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: '#10b981' }}>Update Password</button>
                            </form>
                        )}
                    </div>
                ) : (
                    <>
                        {step === 1 && (
                            <form onSubmit={handleAdminCredentialLogin}>
                                <div className="form-group">
                                    <label>Admin ID</label>
                                    <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" name="password" required value={credentials.password} onChange={handleInputChange} />
                                </div>
                                <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                                    <span style={{ color: '#d9534f', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }} onClick={() => setIsForgotPassword(true)}>
                                        Forgot Admin Credentials?
                                    </span>
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: '#d9534f' }}>Secure Login</button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyAdminOTP}>
                                <h4 style={{ textAlign: 'center' }}>Admin OTP Check</h4>
                                <input type="text" name="otp" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ fontSize: '28px', textAlign: 'center', letterSpacing: '8px', width: '100%' }} />
                                
                                <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                    <button 
                                        type="button" 
                                        onClick={handleResendOTP} 
                                        disabled={resendTimer > 0} 
                                        style={{ border: 'none', background: 'none', color: resendTimer > 0 ? 'gray' : '#d9534f', cursor: resendTimer > 0 ? 'default' : 'pointer' }}
                                    >
                                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend Code"}
                                    </button>
                                </div>

                                <button type="submit" className="btn-primary" style={{ background: '#28a745', marginTop: '20px' }}>Verify Identity</button>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="face-verification-step">
                                <h4 style={{ textAlign: 'center' }}>Biometric Authorization</h4>
                                {showWebcam ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ borderRadius: '8px' }} />
                                        {livenessStatus && <p style={{ margin: '10px 0', fontWeight: 'bold', color: livenessStatus.includes('✅') ? 'green' : '#007bff' }}>{livenessStatus}</p>}
                                        <button type="button" onClick={captureLivenessBurst} disabled={isVerifyingFace} style={{ marginTop: '5px', padding: '12px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', width: '100%' }}>
                                            {isVerifyingFace ? '🧠 Analyzing Texture (Stay Still)...' : '📸 Start AI Biometric Scan'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={webcamImage} alt="Admin" style={{ width: '100%', borderRadius: '8px' }} />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                            <button type="button" onClick={() => { setWebcamImage(null); setShowWebcam(true); setLivenessStatus(''); }} style={{ flex: 1, padding: '10px' }}>Retake</button>
                                            <button type="button" onClick={() => handleAdminFaceVerification()} disabled={isVerifyingFace} style={{ flex: 2, background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', padding: '10px' }}>
                                                {isVerifyingFace ? 'AI Matching...' : '✅ Confirm Admin Access'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default AdminLogin;