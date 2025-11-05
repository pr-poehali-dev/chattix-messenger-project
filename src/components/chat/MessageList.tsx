import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

export interface Message {
  id: number;
  content: string;
  sender_id: number | null;
  sender_name?: string;
  sender_avatar?: string;
  is_ai: boolean;
  created_at: string;
  attachment_url?: string;
  attachment_type?: string;
  attachment_name?: string;
  attachment_size?: number;
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((msg) => {
          const isOwnMessage = msg.sender_id === userId;
          const isAI = msg.is_ai;
          const hasAttachment = !!msg.attachment_url;
          const isImage = msg.attachment_type?.startsWith('image/');
          
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
                  className={`rounded-2xl overflow-hidden ${
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground'
                      : isAI
                      ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100'
                      : 'bg-accent'
                  }`}
                >
                  {hasAttachment && (
                    <div className="p-2">
                      {isImage ? (
                        <img
                          src={msg.attachment_url}
                          alt={msg.attachment_name}
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(msg.attachment_url, '_blank')}
                        />
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 bg-background/10 rounded-lg hover:bg-background/20 transition-colors"
                        >
                          <Icon name="File" size={24} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{msg.attachment_name}</p>
                            {msg.attachment_size && (
                              <p className="text-xs opacity-70">{formatFileSize(msg.attachment_size)}</p>
                            )}
                          </div>
                          <Icon name="Download" size={16} />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {msg.content && (
                    <div className="px-4 py-2">
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  )}
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
