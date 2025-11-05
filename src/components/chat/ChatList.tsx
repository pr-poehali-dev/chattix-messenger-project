import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'ai';
  name: string;
  avatar: string;
  last_message?: string;
  last_message_time?: string;
}

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
}

export default function ChatList({ chats, selectedChat, onChatSelect }: ChatListProps) {
  return (
    <ScrollArea className="flex-1">
      {chats.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Icon name="MessageCircle" className="mx-auto mb-2" size={48} />
          <p>Нет чатов</p>
          <p className="text-sm">Начните новый диалог</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedChat?.id === chat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              <Avatar>
                <AvatarFallback>{chat.avatar}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold truncate">{chat.name}</h3>
                  {chat.last_message_time && (
                    <span className="text-xs opacity-70">
                      {new Date(chat.last_message_time).toLocaleTimeString('ru', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <p className="text-sm opacity-70 truncate">{chat.last_message}</p>
                )}
              </div>
              {chat.type === 'ai' && (
                <Badge variant="secondary" className="shrink-0">AI</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
