import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ConversationContext, ConversationState, Message } from '../types/conversation';
import { sendMessageToKai } from '../services/ai/kaiAgent';

interface UseConversationOptions {
  organizationId: string;
  familyId?: string;
  onError?: (error: Error) => void;
  onFallbackToForm?: () => void;
}

export function useConversation(options: UseConversationOptions) {
  const { organizationId, familyId, onError, onFallbackToForm } = options;

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [state, setState] = useState<ConversationState>('greeting');
  const [context, setContext] = useState<ConversationContext>({
    conversationId: '',
    organizationId,
    familyId,
    currentState: 'greeting',
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeConversation();
  }, [organizationId, familyId]);

  const initializeConversation = useCallback(async () => {
    try {
      const { data, error } = await (supabase
        .from('conversations')
        .insert({
          family_id: familyId || null,
          channel: 'web',
          state: 'greeting',
          context: {
            organizationId,
            familyId,
            currentState: 'greeting',
          } as any,
          messages: [] as any,
        })
        .select()
        .single() as any);

      if (error) throw error;

      if (data) {
        setConversationId(data.id);
        setContext({
          conversationId: data.id,
          organizationId,
          familyId,
          currentState: 'greeting',
        });
      }
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      onError?.(error as Error);
    }
  }, [organizationId, familyId, onError]);

  const sendMessage = useCallback(
    async (userMessage: string): Promise<Message | null> => {
      if (!conversationId) {
        console.error('No conversation ID');
        return null;
      }

      setIsLoading(true);

      try {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: userMessage,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);

        const response = await sendMessageToKai({
          message: userMessage,
          conversationId,
          context,
        });

        if (response.success && response.response) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.response.message,
            timestamp: new Date(),
            metadata: {
              quickReplies: response.response.quickReplies,
              extractedData: response.response.extractedData,
            },
          };

          setMessages((prev) => [...prev, aiMsg]);

          const newState = response.response.nextState;
          setState(newState);

          const newContext: ConversationContext = {
            ...context,
            currentState: newState,
            ...response.response.extractedData,
          };
          setContext(newContext);

          await supabase
            .from('conversations')
            .update({
              state: newState,
              context: newContext as any,
              messages: [...messages, userMsg, aiMsg] as any,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId);

          setIsLoading(false);
          return aiMsg;
        } else if (response.error?.fallbackToForm) {
          onFallbackToForm?.();
          setIsLoading(false);
          return null;
        } else {
          throw new Error(response.error?.message || 'AI service error');
        }
      } catch (error) {
        console.error('Send message error:', error);
        onError?.(error as Error);
        setIsLoading(false);
        return null;
      }
    },
    [conversationId, context, messages, onError, onFallbackToForm]
  );

  const addSystemMessage = useCallback((content: string) => {
    const systemMsg: Message = {
      id: Date.now().toString(),
      role: 'system',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, systemMsg]);
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setState('greeting');
    setContext({
      conversationId: '',
      organizationId,
      familyId,
      currentState: 'greeting',
    });
    initializeConversation();
  }, [organizationId, familyId, initializeConversation]);

  return {
    conversationId,
    state,
    context,
    messages,
    isLoading,
    sendMessage,
    addSystemMessage,
    resetConversation,
  };
}
