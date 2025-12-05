import { AuthProvider } from './contexts/AuthContext';
import { ChatInterface } from './components/registration/ChatInterface';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419]">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
                Registration
              </span>
              <br />
              <span className="text-white">Reimagined</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Transforming youth sports registration from an 18-minute ordeal into a 3-minute conversation.
              AI-powered. Voice-enabled. Built for busy parents.
            </p>
          </div>

          <ChatInterface organizationId="00000000-0000-0000-0000-000000000001" />

          <div className="text-center mt-8 text-sm text-gray-500">
            <p>Copyright 2026 Kairo & RocketHub Labs</p>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
