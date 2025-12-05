import { useRef, useEffect, useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useConversation } from '../../hooks/useConversation';
import type { Message } from '../../types/conversation';

interface ChatInterfaceProps {
  organizationId: string;
  familyId?: string;
  onComplete?: () => void;
}

export function ChatInterface({ organizationId, familyId }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const [showFallbackForm, setShowFallbackForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    addSystemMessage,
  } = useConversation({
    organizationId,
    familyId,
    onError: (err) => {
      console.error('Conversation error:', err);
      const errorMessage = err.message || 'Something went wrong. Please try again.';
      setError(errorMessage);
    },
    onFallbackToForm: () => {
      setShowFallbackForm(true);
      addSystemMessage('Let me show you a form to complete your registration.');
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const hasAddedInitialMessage = useRef(false);

  useEffect(() => {
    if (hasAddedInitialMessage.current) return;

    const initialMessage: Message = {
      id: 'initial',
      role: 'assistant',
      content: "Hi! I'm Kai. I'd love to help you register your child for a program. What's your child's name?",
      timestamp: new Date(),
    };

    if (messages.length === 0) {
      addSystemMessage(initialMessage.content);
      hasAddedInitialMessage.current = true;
    }
  }, [messages.length, addSystemMessage]);

  const handleSendMessage = async (messageOverride?: string) => {
    const messageContent = messageOverride || inputValue;
    if (!messageContent.trim() || isLoading) return;

    setInputValue('');
    setError(null);

    await sendMessage(messageContent);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (showFallbackForm) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[500px] max-h-[900px] max-w-2xl mx-auto bg-[#1a2332] rounded-lg shadow-2xl border border-gray-800">
        <div className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-semibold">Complete Your Registration</h2>
          <p className="text-sm text-blue-100">Just a few more details needed</p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-300 mb-4">Form fallback coming soon...</p>
            <p className="text-sm text-gray-500">For now, please refresh to start over.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] min-h-[500px] max-h-[900px] max-w-2xl mx-auto bg-[#1a2332] rounded-lg shadow-2xl border border-gray-800">
      <div className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">Register with Kai</h2>
        <p className="text-sm text-blue-100">Quick registration in 5 minutes</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border-l-4 border-red-500 p-4 mx-4 mt-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f1419]">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onQuickReply={(reply) => {
              handleSendMessage(reply);
            }}
            onSelectSession={(sessionId, programName) => {
              // Pass the selected session ID in context
              const sessionMessage = `I'd like to register for ${programName}`;
              sendMessage(sessionMessage, { selectedSessionId: sessionId });
            }}
            organizationId={organizationId}
            onSignUp={(sessionId, programName) => {
              const sessionMessage = `I'd like to register for ${programName}`;
              handleSendMessage(sessionMessage);
            }}
          />
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              K
            </div>
            <div className="bg-[#1a2332] border border-gray-800 rounded-lg px-4 py-3 max-w-[70%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-[#6366f1] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#8b5cf6] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#06b6d4] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-[#1a2332]">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="px-4"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Powered by Kairo Pro & RocketHub 🚀 • {messages.length} messages
        </p>
      </div>
    </div>
  );
}
