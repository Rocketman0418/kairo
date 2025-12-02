import { AuthProvider } from './contexts/AuthContext';
import { ChatInterface } from './components/registration/ChatInterface';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Kairo</h1>
            <p className="text-lg text-gray-600">Register in 3 Minutes, Not 20</p>
          </div>

          <ChatInterface organizationId="demo-org" />

          <div className="text-center mt-8 text-sm text-gray-500">
            <p>Powered by AI • Secure • Mobile-Friendly</p>
          </div>
        </div>
      </div>
    </AuthProvider>
  );
}

export default App;
