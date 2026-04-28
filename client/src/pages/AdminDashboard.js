import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [isElectionLive, setIsElectionLive] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateParty, setNewCandidateParty] = useState('');

  const fetchData = async () => {
    try {
      const statusRes = await axios.get('http://localhost:5000/api/settings/election-status');
      setIsElectionLive(statusRes.data.isElectionLive);

      const candidatesRes = await axios.get('http://localhost:5000/api/candidates');
      setCandidates(candidatesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    // 1. SECURITY CHECK (Syncing with the login session key)
    const storedAdmin = localStorage.getItem('admin'); 
    if (storedAdmin) {
      const parsedAdmin = JSON.parse(storedAdmin);
      if (parsedAdmin.role !== 'admin') {
        alert("SECURITY ALERT: You do not have administrator privileges.");
        window.location.href = '/admin-login';
        return;
      }
    } else {
      window.location.href = '/admin-login';
      return;
    }

    // 2. FETCH INITIAL DATA
    fetchData();

    // 3. AUTO-REFRESH LIVE VOTES EVERY 2 SECONDS
    const pollingInterval = setInterval(() => {
      fetchData();
    }, 2000);

    return () => clearInterval(pollingInterval);
  }, []);

  const handleToggleElection = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/admin/toggle-election');
      setIsElectionLive(res.data.isElectionLive);
    } catch (error) {
      console.error("Error toggling election:", error);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/candidates', {
        name: newCandidateName,
        party: newCandidateParty
      });
      setNewCandidateName('');
      setNewCandidateParty('');
      fetchData();
    } catch (error) {
      alert("Failed to add candidate.");
    }
  };

  const handleDeleteCandidate = async (id) => {
    if (window.confirm("Are you sure you want to delete this candidate? All their votes will be lost!")) {
      try {
        await axios.delete(`http://localhost:5000/api/candidates/${id}`);
        fetchData();
      } catch (error) {
        alert("Failed to delete candidate.");
      }
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin');
    window.location.href = '/admin-login';
  };

  return (
    <div className="bg-register">
      <div className="dashboard-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#ef4444' }}>👑 Admin Control Panel</h2>
          <button onClick={handleAdminLogout} style={{ background: '#ef4444', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
        </div>

        {/* --- SECTION 1: ELECTION CONTROLS --- */}
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e2e8f0', marginTop: '20px' }}>
          <h3>Global Election Status: {isElectionLive ? '🔴 LIVE' : '⏸️ OFFLINE'}</h3>
          <p>Turn the election on or off for all registered voters.</p>
          <button 
            onClick={handleToggleElection} 
            style={{ 
              background: isElectionLive ? '#ef4444' : '#22c55e', 
              color: 'white', 
              border: 'none', 
              marginTop: '10px', 
              width: '100%', 
              padding: '15px', 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              borderRadius: '8px', 
              cursor: 'pointer' 
            }}
          >
            {isElectionLive ? 'Stop Election' : 'Start Election'}
          </button>
        </div>

        {/* --- SECTION 2: ADD NEW CANDIDATE --- */}
        <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
          <h3 style={{ color: '#166534', marginBottom: '15px' }}>➕ Add New Candidate</h3>
          <form onSubmit={handleAddCandidate} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Candidate Name" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} required style={{ flex: '1', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '200px' }} />
            <input type="text" placeholder="Party Name" value={newCandidateParty} onChange={(e) => setNewCandidateParty(e.target.value)} required style={{ flex: '1', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', minWidth: '200px' }} />
            <button type="submit" style={{ background: '#16a34a', color: 'white', padding: '12px 25px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>Add to Ballot</button>
          </form>
        </div>

        {/* --- SECTION 3: LIVE RESULTS --- */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3>📊 Live Voting Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            
            {candidates.map(candidate => (
              <div key={candidate._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: '#f1f5f9', borderRadius: '8px', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{candidate.name}</strong> 
                  <br/><span style={{ fontSize: '0.9rem', color: '#64748b' }}>{candidate.party}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                    {candidate.voteCount} Votes
                  </div>
                  <button 
                    onClick={() => handleDeleteCandidate(candidate._id)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '1.5rem', cursor: 'pointer' }}
                    title="Delete Candidate"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;