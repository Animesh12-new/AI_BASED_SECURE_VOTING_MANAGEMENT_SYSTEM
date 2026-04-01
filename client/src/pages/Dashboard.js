import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
const [user, setUser] = useState(null);
const [localHasVoted, setLocalHasVoted] = useState(false);
const [isElectionLive, setIsElectionLive] = useState(false);
const [candidates, setCandidates] = useState([]);
const navigate = useNavigate();

useEffect(() => {
// 1. SECURITY CHECK
const storedVoter = localStorage.getItem('voter');
if (storedVoter) {
const parsedVoter = JSON.parse(storedVoter);
setUser(parsedVoter);
setLocalHasVoted(parsedVoter.hasVoted || false);
} else {
navigate('/login');
return;
}

// 2. FETCH CANDIDATES (Only runs once on load)
const fetchCandidates = async () => {
  try {
    const candidatesRes = await axios.get('http://localhost:5000/api/candidates');
    setCandidates(candidatesRes.data);
  } catch (error) {
    console.error("Error fetching candidates:", error);
  }
};

// 3. FETCH ELECTION STATUS (We will check this repeatedly)
const fetchElectionStatus = async () => {
  try {
    const statusRes = await axios.get('http://localhost:5000/api/settings/election-status');
    setIsElectionLive(statusRes.data.isElectionLive);
  } catch (error) {
    console.error("Error fetching election status:", error);
  }
};

fetchCandidates();
fetchElectionStatus();

// 4. THE AUTO-REFRESH MAGIC (Pings the database every 2 seconds)
const pollingInterval = setInterval(() => {
  fetchElectionStatus();
}, 2000);

// Cleanup the timer if the user leaves the page
return () => clearInterval(pollingInterval);
}, [navigate]);

const handleVote = async (candidateId) => {
try {
const res = await axios.post('http://localhost:5000/api/vote', {
aadhaarNumber: user.aadhaarNumber,
candidateId: candidateId
});

  alert(res.data.message);
  setLocalHasVoted(true); 
  
  const updatedUser = { ...user, hasVoted: true };
  localStorage.setItem('voter', JSON.stringify(updatedUser));
  setUser(updatedUser);

} catch (error) {
  alert(error.response?.data?.message || "Error casting vote.");
}
};

const handleLogout = () => {
localStorage.removeItem('voter');
navigate('/login');
};

return (
<div className="bg-register">
<div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto' }}>

    <h2 style={{ textAlign: 'center' }}>👋 Welcome, {user ? user.name : 'Voter'}!</h2>
    <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
      Voter ID: {user ? user.aadhaarNumber : 'XXXX'}
    </p>

    {/* --- ELECTION LIVE / OFFLINE TOGGLE --- */}
    {isElectionLive ? (
      <div className="voting-section">

        {/* THE ALREADY VOTED MESSAGE */}
        {localHasVoted && (
          <div className="status-box" style={{ background: '#dcfce7', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
            <h3 style={{ color: '#166534', margin: 0 }}>✅ You have already voted!</h3>
            <p style={{ color: '#15803d', margin: '5px 0 0 0' }}>Your vote has been securely recorded.</p>
          </div>
        )}

        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginBottom: '15px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>🗳️ Official Ballot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {candidates.map(candidate => (
              <div key={candidate._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.2rem' }}>{candidate.name}</strong>
                  <br/><span style={{ color: '#64748b', fontSize: '0.9rem' }}>{candidate.party}</span>
                </div>
                
                {/* DISABLED BUTTON LOGIC */}
                <button 
                  disabled={localHasVoted}
                  onClick={() => handleVote(candidate._id)}
                  className="btn-primary"
                  style={{ 
                    background: localHasVoted ? '#cbd5e1' : '#3b82f6', 
                    color: localHasVoted ? '#64748b' : 'white',
                    padding: '10px 20px', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: localHasVoted ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold' 
                  }}
                >
                  {localHasVoted ? 'Already Voted' : 'Vote'}
                </button>

              </div>
            ))}

          </div>
        </div>

      </div>
    ) : (
      <div className="status-box offline-box" style={{ background: '#f1f5f9', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px solid #cbd5e1' }}>
        <div className="status-badge offline-badge" style={{ display: 'inline-block', background: '#e2e8f0', color: '#475569', padding: '5px 15px', borderRadius: '20px', marginBottom: '15px', fontWeight: 'bold' }}>⏸️ Offline</div>
        <h3 style={{ color: '#334155' }}>No Active Elections</h3>
        <p style={{ color: '#64748b' }}>Currently, the election is not live. Please come back later.</p>
      </div>
    )}

    {/* --- LOGOUT BUTTON --- */}
    <div style={{ marginTop: '30px', textAlign: 'center' }}>
      <button 
        onClick={handleLogout} 
        style={{ background: '#ef4444', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 'bold', fontSize: '1rem' }}
      >
        Secure Logout
      </button>
    </div>

  </div>
</div>
);
}

export default Dashboard;