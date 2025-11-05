import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

export interface Message {
  id: number;
  content: string;
  sender_id: number | null;
  sender_name?: string;
  sender_avatar?: string;
  is_ai: boolean;
  created_at: string;
}

interface MessageListProps {
  messages: Message[];
  userId: number | null;
  chatName?: string;
}

export default function MessageList({ messages, userId, chatName }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Icon name="MessageSquare" className="mx-auto mb-4" size={64} />
          <p className="text-xl font-semibold mb-2">Начните общение</p>
          <p className="text-sm">Отправьте первое сообщение в {chatName || 'чат'}</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((msg) => {
          const isOwnMessage = msg.sender_id === userId;
          const isAI = msg.is_ai;
          
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {!isOwnMessage && (
                <Avatar className="shrink-0">
                  <AvatarFallback>
                    {isAI ? '🤖' : (msg.sender_avatar || msg.sender_name?.[0] || '?')}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                {!isOwnMessage && msg.sender_name && (
                  <span className="text-xs font-medium text-muted-foreground px-3">
                    {msg.sender_name}
                  </span>
                )}
                
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : isAI
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                      : 'bg-accent'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                
                <span className="text-xs text-muted-foreground px-3">
                  {new Date(msg.created_at).toLocaleTimeString('ru', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
