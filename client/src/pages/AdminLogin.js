import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';

function AdminLogin() {
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1); 
    const [adminData, setAdminData] = useState(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [isForgotPassword, setIsForgotPassword] = useState(false); // Forgot Password Toggle
    const [resetStep, setResetStep] = useState(1); // 1: Send OTP, 2: Reset Password
    const [newPassword, setNewPassword] = useState('');
    const [credentials, setCredentials] = useState({
        aadhaarNumber: '',
        password: '',
        otp: ''
    });

    // --- WEBCAM STATE ---
    const [showWebcam, setShowWebcam] = useState(true);
    const [webcamImage, setWebcamImage] = useState(null);
    const [isVerifyingFace, setIsVerifyingFace] = useState(false);
    const webcamRef = useRef(null);

    const handleInputChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    // ==========================================
    //          RESEND & TIMER LOGIC
    // ==========================================
    const startResendTimer = () => {
        setResendTimer(30);
        const interval = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendOTP = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/resend-otp', { 
                aadhaarNumber: credentials.aadhaarNumber 
            });
            alert(res.data.message);
            startResendTimer();
        } catch (error) {
            alert("Error resending OTP.");
        }
    };

    // ==========================================
    //          ADMIN FORGOT PASSWORD LOGIC
    // ==========================================
    const handleAdminForgotRequest = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/forgot-password', { 
                aadhaarNumber: credentials.aadhaarNumber 
            });
            alert(res.data.message);
            setResetStep(2);
        } catch (error) {
            alert(error.response?.data?.message || "Admin account not found.");
        }
    };

    const handleAdminPasswordReset = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/reset-password', {
                aadhaarNumber: credentials.aadhaarNumber,
                otp: credentials.otp,
                newPassword: newPassword
            });
            alert(res.data.message);
            setIsForgotPassword(false);
            setResetStep(1);
        } catch (error) {
            alert("Reset failed. Check your OTP.");
        }
    };

    // ==========================================
    //          NORMAL ADMIN LOGIN LOGIC
    // ==========================================
    const handleAdminCredentialLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/admin/login', {
                aadhaarNumber: credentials.aadhaarNumber,
                password: credentials.password
            });
            alert(res.data.message);
            setStep(2);
        } catch (error) {
            alert(error.response?.data?.message || "Invalid Admin Credentials.");
        }
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
        } catch (error) {
            alert("Invalid OTP.");
        }
    };

    // ==========================================
    //          FACE VERIFICATION LOGIC
    // ==========================================
    const captureSelfie = useCallback(() => {
        const imageSrc = webcamRef.current.getScreenshot();
        setWebcamImage(imageSrc);
        setShowWebcam(false);
    }, [webcamRef]);

    const handleAdminFaceVerification = async () => {
        if (!webcamImage || !adminData?.imagePath) return alert("Missing image data.");
        setIsVerifyingFace(true);
        try {
            const imagePathUrl = adminData.imagePath.replace(/\\/g, '/');
            const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
            const savedImageBlob = await savedImageRes.blob();
            
            // Reusing your blob conversion logic
            const webcamBlob = await (await fetch(webcamImage)).blob();

            const aiFormData = new FormData();
            aiFormData.append('id_image', savedImageBlob, 'admin_db.jpg');
            aiFormData.append('webcam_image', webcamBlob, 'admin_live.jpg');

            const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData);

            if (aiRes.data.is_match) {
                localStorage.setItem('admin', JSON.stringify(adminData));
                alert(`👑 Identity Confirmed. Welcome Admin.`);
                navigate('/admin-dashboard');
            } else {
                alert("❌ Unauthorized Access Denied.");
                setWebcamImage(null);
                setShowWebcam(true);
            }
        } catch (error) {
            alert("AI Server Error.");
        } finally {
            setIsVerifyingFace(false);
        }
    };

    return (
        <div className="bg-login">
            <div className="container" style={{ maxWidth: '450px' }}>
                <h2 style={{ color: '#d9534f', textAlign: 'center' }}>👑 Admin Portal Login</h2>
                <hr style={{ border: '1px solid #eee', marginBottom: '20px' }} />

                {isForgotPassword ? (
                    /* --- ADMIN FORGOT PASSWORD VIEW --- */
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
                    /* --- NORMAL ADMIN LOGIN FLOW --- */
                    <>
                        {step === 1 && (
                            <form onSubmit={handleAdminCredentialLogin}>
                                <div className="form-group">
                                    <label>Admin ID / Aadhaar Number</label>
                                    <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} />
                                </div>
                                <div className="form-group">
                                    <label>Admin Password</label>
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
                                <div style={{ textAlign: 'center', margin: '15px 0' }}>
                                    <button type="button" onClick={handleResendOTP} disabled={resendTimer > 0} style={{ border: 'none', background: 'none', color: resendTimer > 0 ? 'gray' : '#d9534f', cursor: 'pointer' }}>
                                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                                    </button>
                                </div>
                                <button type="submit" className="btn-primary" style={{ background: '#28a745' }}>Verify Identity</button>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="face-verification-step">
                                <h4 style={{ textAlign: 'center' }}>Biometric Authorization</h4>
                                {showWebcam ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" style={{ borderRadius: '8px' }} />
                                        <button onClick={captureSelfie} style={{ marginTop: '15px', padding: '12px', background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px', width: '100%' }}>📸 Capture Face</button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <img src={webcamImage} alt="Admin" style={{ width: '100%', borderRadius: '8px' }} />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                            <button onClick={() => { setWebcamImage(null); setShowWebcam(true); }} style={{ flex: 1 }}>Retake</button>
                                            <button onClick={handleAdminFaceVerification} disabled={isVerifyingFace} style={{ flex: 2, background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px' }}>
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
/*import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Webcam from 'react-webcam';

function AdminLogin() {
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [step, setStep] = useState(1); // 1: Password, 2: OTP, 3: Face Match
    const [adminData, setAdminData] = useState(null);
    const [resendTimer, setResendTimer] = useState(0);
    const [credentials, setCredentials] = useState({
        aadhaarNumber: '',
        password: '',
        otp: ''
    });

    // --- WEBCAM STATE ---
    const [showWebcam, setShowWebcam] = useState(true);
    const [webcamImage, setWebcamImage] = useState(null);
    const [isVerifyingFace, setIsVerifyingFace] = useState(false);
    const webcamRef = useRef(null);

    const handleInputChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    // ==========================================
    //          RESEND OTP LOGIC
    // ==========================================
    const startResendTimer = () => {
        setResendTimer(30);
        const interval = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResendOTP = async () => {
        try {
            const res = await axios.post('http://localhost:5000/api/resend-otp', { 
                aadhaarNumber: credentials.aadhaarNumber 
            });
            alert(res.data.message);
            startResendTimer();
        } catch (error) {
            alert("Error resending OTP.");
        }
    };

    // ==========================================
    //          STEP 1: PASSWORD LOGIN
    // ==========================================
    const handleAdminCredentialLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:5000/api/admin/login', {
                aadhaarNumber: credentials.aadhaarNumber,
                password: credentials.password
            });
            alert(res.data.message);
            setStep(2); // Move to OTP
        } catch (error) {
            alert(error.response?.data?.message || "Admin login failed.");
        }
    };

    // ==========================================
    //          STEP 2: OTP VERIFICATION
    // ==========================================
    const handleVerifyAdminOTP = async (e) => {
        e.preventDefault();
        try {
            // We use the same verification route as voters
            const res = await axios.post('http://localhost:5000/api/verify-otp', {
                aadhaarNumber: credentials.aadhaarNumber,
                otp: credentials.otp
            });
            setAdminData(res.data.user);
            setStep(3); // Move to Face Match
        } catch (error) {
            alert("Invalid or expired OTP.");
        }
    };

    // ==========================================
    //          STEP 3: FACE VERIFICATION
    // ==========================================
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

    const handleAdminFaceVerification = async () => {
        if (!webcamImage || !adminData?.imagePath) return alert("Missing image data.");
        setIsVerifyingFace(true);
        try {
            const imagePathUrl = adminData.imagePath.replace(/\\/g, '/');
            const savedImageRes = await fetch(`http://localhost:5000/${imagePathUrl}`);
            const savedImageBlob = await savedImageRes.blob();
            const webcamBlob = dataURLtoBlob(webcamImage);

            const aiFormData = new FormData();
            aiFormData.append('id_image', savedImageBlob, 'admin_saved.jpg');
            aiFormData.append('webcam_image', webcamBlob, 'admin_live.jpg');

            const aiRes = await axios.post('http://127.0.0.1:8000/verify', aiFormData);

            if (aiRes.data.is_match) {
                localStorage.setItem('admin', JSON.stringify(adminData));
                alert(`👑 Admin Confirmed! Entering Dashboard...`);
                navigate('/admin-dashboard');
            } else {
                alert("❌ Unauthorized! Face does not match Admin profile.");
                setWebcamImage(null);
                setShowWebcam(true);
            }
        } catch (error) {
            alert("AI Face Verification Server Error.");
        } finally {
            setIsVerifyingFace(false);
        }
    };

    return (
        <div className="bg-login">
            <div className="container" style={{ maxWidth: '450px' }}>
                <h2 style={{ color: '#d9534f', textAlign: 'center' }}>👑 Admin Portal Login</h2>
                <hr style={{ border: '2px solid #d9534f', width: '80%', marginBottom: '20px' }} />

                {/* --- STEP 1: CREDENTIALS --- *//*}
                {step === 1 && (
                    <form onSubmit={handleAdminCredentialLogin}>
                        <div className="form-group">
                            <label>Admin ID / Aadhaar Number</label>
                            <input type="text" name="aadhaarNumber" required value={credentials.aadhaarNumber} onChange={handleInputChange} placeholder="Enter Admin ID" />
                        </div>
                        <div className="form-group">
                            <label>Admin Password</label>
                            <input type="password" name="password" required value={credentials.password} onChange={handleInputChange} placeholder="Enter Password" />
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>Secure Login</button>
                    </form>
                )}

                {/* --- STEP 2: OTP --- *//*}
                {step === 2 && (
                    <form onSubmit={handleVerifyAdminOTP}>
                        <h4 style={{ textAlign: 'center' }}>Admin OTP Verification</h4>
                        <div className="form-group">
                            <input type="text" name="otp" maxLength="6" required value={credentials.otp} onChange={handleInputChange} style={{ fontSize: '28px', textAlign: 'center', letterSpacing: '8px' }} placeholder="------" />
                        </div>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <button type="button" onClick={handleResendOTP} disabled={resendTimer > 0} style={{ border: 'none', background: 'none', color: resendTimer > 0 ? 'gray' : '#d9534f', cursor: 'pointer' }}>
                                {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Security Code"}
                            </button>
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: '#28a745' }}>Verify Admin Identity</button>
                    </form>
                )}

                {/* --- STEP 3: FACE MATCH --- *//*}
                {step === 3 && (
                    <div className="face-verification-step">
                        <h4 style={{ textAlign: 'center' }}>Biometric Authorization</h4>
                        {showWebcam ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" width="100%" />
                                <button onClick={captureSelfie} style={{ marginTop: '15px', padding: '10px', background: '#d9534f', color: 'white', width: '100%', border: 'none', borderRadius: '4px' }}>📸 Capture Admin Face</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={webcamImage} alt="Admin Selfie" style={{ width: '100%', borderRadius: '8px' }} />
                                <div style={{ display: 'flex', width: '100%', gap: '10px', marginTop: '15px' }}>
                                    <button onClick={() => { setWebcamImage(null); setShowWebcam(true); }} style={{ flex: 1 }}>Retake</button>
                                    <button onClick={handleAdminFaceVerification} disabled={isVerifyingFace} style={{ flex: 2, background: '#d9534f', color: 'white', border: 'none', borderRadius: '4px' }}>
                                        {isVerifyingFace ? '🧠 AI Processing...' : '✅ Verify & Enter'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminLogin;*/


/*import React, { useState } from 'react';
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

export default AdminLogin;*/