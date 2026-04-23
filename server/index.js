// server/index.js
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const Settings = require('./models/Settings');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('./models/User'); 
const Candidate = require('./models/Candidate');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); 

// --- SET UP THE EMAIL POSTMAN ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// --- STEP 1: LOGIN & SEND OTP ---
app.post('/api/login', async (req, res) => {
    try {
        const { aadhaarNumber, password } = req.body;
        
        const user = await User.findOne({ aadhaarNumber });
        if (!user || user.password !== password) {
            return res.status(400).json({ message: "Invalid Aadhaar Number or Password." });
        }

        // Generate a random 6-digit OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to database, set to expire in 5 minutes
        user.otp = generatedOTP;
        user.otpExpires = Date.now() + 5 * 60 * 1000; 
        await user.save();

        // Send the email
        const mailOptions = {
            from: 'your-email@gmail.com',
            to: user.email,
            subject: 'Your Voting System Security Code',
            text: `Hello ${user.name}, your OTP for login is: ${generatedOTP}. It is valid for 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: "OTP sent to your registered email!" });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login" });
    }
});

// --- STEP 2: VERIFY OTP ---
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { aadhaarNumber, otp } = req.body;

        const user = await User.findOne({ aadhaarNumber });
        if (!user) return res.status(404).json({ message: "User not found." });

        // Security Checks
        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "OTP has expired. Please log in again." });
        }

        // OTP is valid! Clear it from the database for security
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ 
            message: "Login successful!", 
            user: { 
                name: user.name, 
                aadhaarNumber: user.aadhaarNumber,
                hasVoted: user.hasVoted,
                role: user.role || 'voter',
                imagePath: user.imagePath // <-- ADDED: Send the image path back to React so it can do the Face Match!
            } 
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ message: "Server error during verification" });
    }
});

// --- FORGOT PASSWORD - STEP 1: SEND OTP ---
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { aadhaarNumber } = req.body;
        
        const user = await User.findOne({ aadhaarNumber });
        if (!user) {
            return res.status(404).json({ message: "No account found with this ID." });
        }

        // Generate a new 6-digit OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = generatedOTP;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes to reset
        await user.save();

        // Send the recovery email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Password Reset Request - Voting System',
            text: `Hello ${user.name},\n\nYou requested a password reset. Your secret OTP is: ${generatedOTP}\nIt is valid for 10 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Password reset OTP sent to your registered email!" });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// --- FORGOT PASSWORD - STEP 2: VERIFY & RESET ---
app.post('/api/reset-password', async (req, res) => {
    try {
        const { aadhaarNumber, otp, newPassword } = req.body;

        const user = await User.findOne({ aadhaarNumber });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }
        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "OTP has expired. Request a new one." });
        }

        // Security Check: Make sure the new password meets your requirements
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: "Password is too weak." });
        }

        // Update the password and clear the OTP
        user.password = newPassword;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password successfully reset! You can now log in." });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// --- MONGODB CONNECTION ---
mongoose.connect('mongodb://127.0.0.1:27017/voting_system')
.then(async () => {
console.log('MongoDB Connected Successfully!');
const candidateCount = await Candidate.countDocuments();
  if (candidateCount === 0) {
      await Candidate.insertMany([
          { name: 'Arjun Sharma', party: 'Progressive Alliance' },
          { name: 'Priya Patel', party: 'Democratic Front' },
          { name: 'Rahul Verma', party: 'Independent' }
      ]);
      console.log('Initial Candidates loaded into the database!');
  }

  const settingsCount = await Settings.countDocuments();
  if (settingsCount === 0) {
      await Settings.create({ isElectionLive: false });
      console.log('Global System Settings initialized!');
  }

})
.catch((err) => console.error('MongoDB Connection Error:', err));

const upload = multer({ dest: 'uploads/' });

// --- NEW MVP REGISTRATION ROUTE ---
app.post('/api/register', upload.single('aadhaarImage'), async (req, res) => {
    try {
        // 1. Grab the text data from the envelope (ADDED EMAIL HERE!)
        const { name, aadhaarNumber, dob, password, email } = req.body; 
        
        // 2. Check if an image was uploaded
        if (!req.file) {
            return res.status(400).json({ message: "Aadhaar image is required." });
        }
        const imagePath = req.file.path;

        // 3. Check if the user already exists in the database
        const existingUser = await User.findOne({ aadhaarNumber });
        if (existingUser) {
            return res.status(400).json({ message: "A voter with this Aadhaar Number is already registered!" });
        }

        // 4. Create a new User using your schema
        const newVoter = new User({
            name,
            aadhaarNumber,
            dob,
            password, 
            email, // <-- Save the email to the database!
            imagePath
        });

        // 5. Save it to MongoDB
        await newVoter.save();
        console.log(`✅ New voter registered: ${name}`);

        res.status(201).json({ message: "Voter registered successfully in the database!" });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// --- NEW MVP LOGIN ROUTE ---
app.post('/api/admin/login', async (req, res) => {
try {
const { aadhaarNumber, password } = req.body;

    // 1. Find the user
    const user = await User.findOne({ aadhaarNumber });
    if (!user) {
        return res.status(404).json({ message: "Account not found." });
    }

    // 2. Check the password
    if (user.password !== password) {
        return res.status(400).json({ message: "Invalid credentials." });
    }

    // 3. THE BOUNCER: Check if they are actually an Admin!
    if (user.role !== 'admin') {
        console.log(`❌ Unauthorized admin access attempt by: ${user.name}`);
        return res.status(403).json({ message: "Access Denied: You do not have Admin privileges." });
    }

    // 4. Success!
    console.log(`👑 ADMIN logged in: ${user.name}`);
    res.status(200).json({ 
        message: "Admin login successful!", 
        user: { 
            name: user.name, 
            aadhaarNumber: user.aadhaarNumber,
            role: user.role
        } 
    });

} catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server error during admin login" });
}
});

// --- GET ALL CANDIDATES ROUTE ---
app.get('/api/candidates', async (req, res) => {
    try {
        const candidates = await Candidate.find();
        res.status(200).json(candidates);
    } catch (error) {
        res.status(500).json({ message: "Error fetching candidates" });
    }
});

// --- ADD NEW CANDIDATE (ADMIN ONLY) ---
app.post('/api/candidates', async (req, res) => {
try {
const { name, party } = req.body;

    // Create a fresh candidate with 0 votes
    const newCandidate = new Candidate({
        name,
        party,
        voteCount: 0
    });
    
    await newCandidate.save();
    res.status(201).json({ message: "Candidate added successfully!" });
} catch (error) {
    console.error("Error adding candidate:", error);
    res.status(500).json({ message: "Failed to add candidate." });
}
});

// --- DELETE CANDIDATE (ADMIN ONLY) ---
app.delete('/api/candidates/:id', async (req, res) => {
    try {
        await Candidate.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Candidate deleted successfully!" });
    } catch (error) {
        console.error("Error deleting candidate:", error);
        res.status(500).json({ message: "Failed to delete candidate." });
    }
});

// --- CAST A VOTE ROUTE ---
app.post('/api/vote', async (req, res) => {
    try {
        const { aadhaarNumber, candidateId } = req.body;

        // 1. Find the voter
        const user = await User.findOne({ aadhaarNumber });
        if (!user) return res.status(404).json({ message: "Voter not found." });

        // 2. Security Check: Have they already voted?
        if (user.hasVoted) {
            return res.status(400).json({ message: "Fraud Alert: You have already cast your vote!" });
        }

        // 3. Find the candidate
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ message: "Candidate not found." });

        // 4. Process the vote!
        user.hasVoted = true;           // Mark user as having voted
        candidate.voteCount += 1;       // Add 1 vote to the candidate

        await user.save();
        await candidate.save();

        console.log(`🗳️ Vote successfully cast by ${user.name} for ${candidate.name}`);
        res.status(200).json({ message: "Your vote has been securely recorded!" });

    } catch (error) {
        console.error("Voting Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get('/api/settings/election-status', async (req, res) => {
try {
    const settings = await Settings.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });
    res.status(200).json({ isElectionLive: settings.isElectionLive });
    } catch (error) {
        res.status(500).json({ message: "Error fetching election status" });
    }
});

app.post('/api/admin/toggle-election', async (req, res) => {
try {
    const settings = await Settings.findOne();
    if (!settings) return res.status(404).json({ message: "Settings not found" });
        settings.isElectionLive = !settings.isElectionLive;
        await settings.save();
        res.status(200).json({ isElectionLive: settings.isElectionLive });
    } catch (error) {
        res.status(500).json({ message: "Error updating settings" });
    }
});

// --- AI ELECTION CHATBOT ROUTE ---
app.post('/api/chat', async (req, res) => {
    try {
        const { userMessage } = req.body;

        // The Master Rulebook for your AI
        const systemPrompt = `
        You are the official AI Assistant for the "AI-Based Secure Voting Management System". 
        Your job is to help users understand how to vote and provide info about the candidates.
        Keep your answers short, friendly, and highly accurate. Do NOT invent information.

        SYSTEM FACTS:
        - This voting system is unique because it uses 3-Factor Authentication: Password, Email OTP, and Live Facial Recognition to completely eliminate voter fraud.
        - To vote: Users must log in, pass the face scan, go to the Dashboard, select a candidate, and click "Cast Vote". A user can only vote once.
        
        CANDIDATE FACTS:
        1. Arjun Sharma (Progressive Alliance): Holds a Master's in Economics. Focuses on tech innovation and job creation for youth.
        2. Priya Patel (Democratic Front): Former human rights lawyer. Focuses on healthcare reform and equal education opportunities.
        3. Rahul Verma (Independent): Retired military officer. Focuses on national security and infrastructure development.
        
        User Question: ${userMessage}
        `;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(systemPrompt);
        const text = result.response.text();

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Chatbot Error:", error);
        res.status(500).json({ reply: "Sorry, the AI Assistant is currently offline." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

