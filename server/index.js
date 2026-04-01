// server/index.js
const Settings = require('./models/Settings');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const User = require('./models/User'); // <-- 1. Import your new Blueprint!
const Candidate = require('./models/Candidate');

const app = express();
app.use(cors());
app.use(express.json());

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
        // 1. Grab the text data from the envelope
        const { name, aadhaarNumber, dob, password } = req.body;
        
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
            password, // Note: In a production app, we would hash this password first!
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
// --- NORMAL VOTER LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        const { aadhaarNumber, password } = req.body;
        
        const user = await User.findOne({ aadhaarNumber });
        if (!user) {
            return res.status(404).json({ message: "Voter not found. Please register." });
        }

        if (user.password !== password) {
            return res.status(400).json({ message: "Incorrect password." });
        }

        // Send success signal
        console.log(`✅ Voter logged in: ${user.name} as ${user.role || 'voter'}`);
        res.status(200).json({ 
            message: "Login successful!", 
            user: { 
                name: user.name, 
                aadhaarNumber: user.aadhaarNumber,
                hasVoted: user.hasVoted,
                role: user.role || 'voter'
            } 
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login" });
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

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
