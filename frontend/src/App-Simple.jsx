/**
 * Simplified App Component - Emergency fallback
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import working components
import Agents from './pages/Agents.jsx';

const SimpleApp = () => {
  return (
    <Router>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Simple Navigation */}
        <nav style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '1rem 2rem',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Agent Feed
            </h1>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link 
                to="/" 
                style={{
                  color: '#4f46e5',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid rgba(79, 70, 229, 0.2)'
                }}
              >
                Home
              </Link>
              <Link 
                to="/agents" 
                style={{
                  color: '#4f46e5',
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid rgba(79, 70, 229, 0.2)'
                }}
              >
                Agents
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          <Routes>
            <Route path="/agents" element={<Agents />} />
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const HomePage = () => (
  <div style={{
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white',
    maxWidth: '800px',
    margin: '0 auto'
  }}>
    <h1 style={{
      fontSize: '3rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    }}>
      Welcome to Agent Feed
    </h1>
    <p style={{
      fontSize: '1.25rem',
      marginBottom: '2rem',
      opacity: 0.9
    }}>
      Production agent orchestration dashboard for Claude Code integration
    </p>
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '2rem',
      marginTop: '3rem',
      color: '#1f2937',
      textAlign: 'left'
    }}>
      <h2 style={{ marginTop: 0 }}>Quick Links</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li style={{ marginBottom: '1rem' }}>
          <Link to="/agents" style={{
            color: '#4f46e5',
            textDecoration: 'none',
            fontSize: '1.1rem',
            fontWeight: '500'
          }}>
            🤖 Production Agents - View all production agents from /prod/.claude/agents/
          </Link>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <span style={{ color: '#6b7280' }}>
            📊 Analytics - Coming soon
          </span>
        </li>
        <li style={{ marginBottom: '1rem' }}>
          <span style={{ color: '#6b7280' }}>
            ⚡ Workflows - Coming soon
          </span>
        </li>
      </ul>
    </div>
  </div>
);

const NotFound = () => (
  <div style={{
    padding: '4rem 2rem',
    textAlign: 'center',
    color: 'white'
  }}>
    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Page Not Found</h1>
    <p style={{ marginBottom: '2rem' }}>The page you're looking for doesn't exist.</p>
    <Link 
      to="/" 
      style={{
        color: '#4f46e5',
        textDecoration: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid rgba(79, 70, 229, 0.2)',
        fontWeight: '500'
      }}
    >
      Go Home
    </Link>
  </div>
);

export default SimpleApp;