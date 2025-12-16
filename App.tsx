import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { MessageCircle, BookOpen, Clock, Mic, UserCircle } from 'lucide-react';
import Presentations from './pages/Presentations';
import RecordAndMap from './pages/RecordAndMap';
import VoiceChat from './pages/VoiceChat';
import TextChat from './pages/TextChat';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth } from './components/RequireAuth';
import { useAuth } from './contexts/AuthContext';

// Navigation Item Component
const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link to={to} className="flex-1 flex flex-col items-center justify-center py-2 group">
      <div 
        className={`
          w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 mb-1
          ${isActive 
            ? 'text-neu-accent shadow-[inset_5px_5px_10px_#c8ccd4,inset_-5px_-5px_10px_#ffffff]' 
            : 'text-gray-400 shadow-[5px_5px_10px_#c8ccd4,-5px_-5px_10px_#ffffff] group-hover:scale-105'
          }
        `}
      >
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${isActive ? 'text-neu-accent' : 'text-gray-400'}`}>
        {label}
      </span>
    </Link>
  );
};

// Navigation Container (only shown when authenticated)
const Navigation: React.FC = () => {
    const { session } = useAuth();
    if (!session) return null;

    return (
        <nav className="fixed bottom-0 left-0 w-full z-50 bg-neu-base/90 backdrop-blur-md border-t border-white/20 pb-safe">
            <div className="max-w-2xl mx-auto px-4 pb-4 pt-2 flex justify-between items-center">
              <NavItem to="/" icon={<BookOpen size={20} />} label="Ideas" />
              <NavItem to="/record" icon={<Clock size={20} />} label="Informe" />
              
              {/* Floating Action Button Style for Voice */}
              <div className="relative -top-6">
                <Link to="/voice">
                    <div className="w-16 h-16 rounded-full bg-neu-base shadow-[8px_8px_16px_#c8ccd4,-8px_-8px_16px_#ffffff] flex items-center justify-center text-neu-accent border-4 border-neu-base hover:scale-110 transition-transform">
                        <Mic size={28} />
                    </div>
                </Link>
              </div>

              <NavItem to="/chat" icon={<MessageCircle size={20} />} label="Chat" />
              <NavItem to="/profile" icon={<UserCircle size={20} />} label="Perfil" />
            </div>
        </nav>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <Router>
          <div className="min-h-screen bg-neu-base font-sans text-gray-700 selection:bg-neu-accent/30">
            {/* Main Content Area */}
            <main className="max-w-2xl mx-auto min-h-screen p-6 relative">
              <Routes>
                {/* Public Route */}
                <Route path="/auth" element={<Auth />} />

                {/* Protected Routes */}
                <Route path="/" element={<RequireAuth><Presentations /></RequireAuth>} />
                <Route path="/record" element={<RequireAuth><RecordAndMap /></RequireAuth>} />
                <Route path="/voice" element={<RequireAuth><VoiceChat /></RequireAuth>} />
                <Route path="/chat" element={<RequireAuth><TextChat /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              </Routes>
            </main>

            {/* Bottom Navigation Bar */}
            <Navigation />
          </div>
        </Router>
    </AuthProvider>
  );
};

export default App;