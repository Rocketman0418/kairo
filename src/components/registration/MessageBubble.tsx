import { Message } from '../../types/conversation';
import { SessionCard } from './SessionCard';

interface MessageBubbleProps {
  message: Message;
  onQuickReply?: (reply: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

export function MessageBubble({ message, onQuickReply, onSelectSession }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (!isUser && !isSystem) {
    console.log('MessageBubble rendering assistant message:', {
      messageId: message.id,
      hasMetadata: !!message.metadata,
      hasRecommendations: !!message.metadata?.recommendations,
      recommendationsLength: message.metadata?.recommendations?.length || 0,
      recommendations: message.metadata?.recommendations,
    });
  }

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-600 text-sm px-4 py-2 rounded-full">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-3`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            K
          </div>
        )}
        <div
          className={`
            rounded-lg px-4 py-3 max-w-[70%]
            ${isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
            }
          `}
        >
          <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
          {message.metadata?.quickReplies && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.metadata.quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => onQuickReply?.(reply)}
                  className="px-3 py-1 bg-white text-blue-600 rounded-full text-sm hover:bg-blue-50 transition-colors border border-blue-200"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            U
          </div>
        )}
      </div>

      {!isUser && message.metadata?.recommendations && message.metadata.recommendations.length > 0 && (
        <div className="ml-11 space-y-3">
          {message.metadata.recommendations.map((session) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              onSelect={(sessionId) => onSelectSession?.(sessionId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
