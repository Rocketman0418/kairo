import { ChatInterface } from '../components/registration/ChatInterface';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419]">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">
            <span className="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
              Kairo Pro
            </span>
          </h1>
          <p className="text-2xl text-white mb-2">Registration Reimagined</p>
          <p className="text-lg text-gray-400 mb-4">Built for Busy Parents</p>
        </div>

        <ChatInterface organizationId="00000000-0000-0000-0000-000000000001" />

        <div className="text-center mt-8 text-sm text-gray-500 space-y-2">
          <p>Copyright 2026 Kairo Pro & RocketHub Labs</p>
          <div className="flex justify-center gap-4">
            <Link to="/privacy" className="hover:text-[#06b6d4] transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#06b6d4] transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
