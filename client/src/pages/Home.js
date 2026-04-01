
import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    // Applied the correct background class
    <div className="bg-home">
      
      {/* 1. HERO SECTION: The existing welcome box (Upgraded style) */}
      <div className="hero-section">
        <div className="welcome-box">
          <h1>Modern. Secure. Transparent Voting.</h1>
          <p>The first-ever Voting Management System secured by Python AI and the MERN stack. Register today and cast your vote with confidence.</p>
          
          <div className="button-group-row">
            <Link to="/register" className="btn-primary-large">Get Started Now →</Link>
          </div>
        </div>
      </div>

      {/* 2. FEATURES/HOW IT WORKS SECTION: The new Content Cards (Fills space) */}
      <div className="features-section">
        <h2>How It Works</h2>
        <div className="feature-grid">
          
          <div className="feature-card">
            <div className="icon-circle blue">📂</div>
            <h3>1. Scan Aadhaar</h3>
            <p>Upload your Aadhaar image. Our Python AI instantly reads your details.</p>
          </div>

          <div className="feature-card">
            <div className="icon-circle green">🧑‍💻</div>
            <h3>2. Face ID Check</h3>
            <p>Snap a quick selfie. Our advanced algorithms match you to your ID.</p>
          </div>

          <div className="feature-card">
            <div className="icon-circle orange">🗳️</div>
            <h3>3. Cast Vote</h3>
            <p>Once verified, instantly access your ballot and vote securely.</p>
          </div>

        </div>
      </div>

      {/* 3. FOOTER: Copyright */}
      <footer className="footer-modern">
        <p>&copy; 2026 Secure Voting Management System. MERN-Python Major Project.</p>
      </footer>
    </div>
  );
}

export default Home;