import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import AddContactDialog from '@/components/chat/AddContactDialog';

const API_URL = 'https://functions.poehali.dev/4e211b7c-8161-4af3-a134-9f3e4b20c363';

interface Message {
  id: number;
  content: string;
  sender_id: number | null;
  sender_name?: string;
  sender_avatar?: string;
  is_ai: boolean;
  created_at: string;
}

interface Chat {
  id: number;
  type: 'private' | 'group' | 'ai';
  name: string;
  avatar: string;
  last_message?: string;
  last_message_time?: string;
}

interface Contact {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  is_online: boolean;
}

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    
    const updateOnlineStatus = async (isOnline: boolean) => {
      try {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_online_status',
            user_id: userId,
            is_online: isOnline
          })
        });
      } catch (error) {
        console.error('Error updating online status:', error);
      }
    };

    updateOnlineStatus(true);

    const interval = setInterval(() => {
      updateOnlineStatus(true);
      loadContacts(userId);
    }, 30000);

    const handleBeforeUnload = () => {
      updateOnlineStatus(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateOnlineStatus(false);
    };
  }, [userId]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone) {
      toast.error('Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          phone,
          name: name || phone,
          avatar: (name || phone)[0].toUpperCase()
        })
      });
      const data = await response.json();
      
      if (response.ok && data.user) {
        setUserId(data.user.id);
        setIsAuthenticated(true);
        toast.success('Добро пожаловать в Chattik!');
        loadChats(data.user.id);
        loadContacts(data.user.id);
      } else {
        toast.error('Ошибка авторизации');
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const loadChats = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}?path=chats&user_id=${uid}`);
      const data = await response.json();
      if (data.chats) {
        setChats(data.chats);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const updateUserStatus = async (uid: number) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_status',
          user_id: uid,
          is_online: true
        })
      });
    } catch (error) {
      console.error('Failed to update status');
    }
  };

  const loadContacts = async (uid: number) => {
    try {
      const response = await fetch(`${API_URL}?path=contacts&user_id=${uid}`);
      const data = await response.json();
      if (data.contacts) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  useEffect(() => {
    if (userId && isAuthenticated) {
      const interval = setInterval(() => {
        updateUserStatus(userId);
        loadContacts(userId);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [userId, isAuthenticated]);

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${API_URL}?path=messages&chat_id=${chatId}`);
      const data = await response.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const openChat = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !userId) return;

    setSendingMessage(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat.id,
          sender_id: userId,
          content,
          should_reply: selectedChat.type === 'ai'
        })
      });

      const data = await response.json();
      
      if (response.ok && data.message) {
        setMessages(prev => [...prev, data.message]);
        
        if (data.ai_reply) {
          setMessages(prev => [...prev, data.ai_reply]);
        }
        
        loadChats(userId);
      }
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    } finally {
      setSendingMessage(false);
    }
  };

  const startChatWithContact = async (contactId: number) => {
    if (!userId) return;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat',
          name: '',
          is_group: false,
          members: [userId, contactId]
        })
      });
      
      const data = await response.json();
      if (data.chat) {
        loadChats(userId);
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
          openChat({
            id: data.chat.id,
            type: 'private',
            name: contact.name,
            avatar: contact.avatar
          });
        }
      }
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const startAIChat = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_chat',
          name: 'Chattik AI',
          is_group: false,
          members: [userId],
          is_ai: true
        })
      });
      
      const data = await response.json();
      if (data.chat) {
        loadChats(userId);
        openChat({
          id: data.chat.id,
          type: 'ai',
          name: 'Chattik AI',
          avatar: '🤖'
        });
      }
    } catch (error) {
      toast.error('Ошибка создания AI чата');
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0 || !userId) {
      toast.error('Введите название и выберите участников');
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_group',
          name: groupName,
          description: '',
          avatar: '👥',
          created_by: userId,
          member_ids: selectedMembers
        })
      });

      const data = await response.json();
      if (data.group_id && data.chat_id) {
        toast.success('Группа создана!');
        setShowNewGroup(false);
        setGroupName('');
        setSelectedMembers([]);
        loadChats(userId);
      }
    } catch (error) {
      toast.error('Ошибка создания группы');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-cyan-50 to-pink-50 p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-purple mb-4">
              <Icon name="MessageCircle" size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Chattik</h1>
            <p className="text-muted-foreground">Современный мессенджер с AI</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Номер телефона</label>
              <Input
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ваше имя (необязательно)</label>
              <Input
                type="text"
                placeholder="Иван Иванов"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-purple text-white hover:opacity-90 text-lg py-6">
              {loading ? 'Вход...' : 'Войти / Зарегистрироваться'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Регистрация доступна только по реальному номеру телефона
          </p>
        </Card>
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="flex items-center gap-3 p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <Avatar className="w-10 h-10 gradient-cyan">
            <AvatarFallback className="text-white font-bold">{selectedChat.avatar}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold">{selectedChat.name}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedChat.type === 'ai' ? 'AI ассистент' : selectedChat.type === 'group' ? 'Группа' : 'Онлайн'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === userId;
            const isAI = msg.is_ai;
            
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isOwn && (
                    <Avatar className="w-8 h-8 gradient-pink flex-shrink-0">
                      <AvatarFallback className="text-white text-xs">
                        {isAI ? '🤖' : (msg.sender_avatar || '?')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`rounded-2xl px-4 py-2 ${isOwn ? 'gradient-purple text-white' : 'bg-muted'}`}>
                    {!isOwn && !isAI && (
                      <p className="text-xs font-semibold mb-1">{msg.sender_name}</p>
                    )}
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={sendingMessage}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={sendingMessage || !newMessage.trim()}
              className="gradient-purple text-white"
              size="icon"
            >
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chattik</h1>
            <p className="text-sm text-muted-foreground">{phone}</p>
          </div>
          <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
            <DialogTrigger asChild>
              <Button className="gradient-purple text-white">
                <Icon name="Plus" size={20} className="mr-2" />
                Группа
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая группа</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Название группы"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedMembers.includes(contact.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMembers([...selectedMembers, contact.id]);
                          } else {
                            setSelectedMembers(selectedMembers.filter(id => id !== contact.id));
                          }
                        }}
                      />
                      <Avatar className="w-8 h-8 gradient-pink">
                        <AvatarFallback className="text-white text-xs">{contact.avatar}</AvatarFallback>
                      </Avatar>
                      <span>{contact.name}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={createGroup} className="w-full gradient-purple text-white">
                  Создать группу
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="chats" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chats">Чаты</TabsTrigger>
          <TabsTrigger value="contacts">Контакты</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex-1 overflow-y-auto px-4 mt-0">
          {chats.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="MessageCircle" size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Нет чатов</p>
              <p className="text-sm text-muted-foreground">Начните общение с контактами</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {chats.map(chat => (
                <Card
                  key={chat.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 gradient-cyan">
                      <AvatarFallback className="text-white font-bold">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold truncate">{chat.name}</h3>
                        {chat.last_message_time && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(chat.last_message_time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {chat.last_message && (
                        <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 overflow-y-auto px-4 mt-0">
          <div className="py-2">
            <AddContactDialog 
              apiUrl={API_URL} 
              userId={userId!} 
              onContactAdded={() => loadContacts(userId!)} 
            />
          </div>
          <div className="space-y-2 py-2">
            {contacts.map(contact => (
              <Card
                key={contact.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => startChatWithContact(contact.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 gradient-pink">
                    <AvatarFallback className="text-white font-bold">{contact.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{contact.name}</h3>
                    <p className="text-sm text-muted-foreground">{contact.phone}</p>
                  </div>
                  {contact.is_online && (
                    <Badge variant="default" className="gradient-green text-white">Онлайн</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai" className="flex-1 overflow-y-auto px-4 mt-0">
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl gradient-cyan mb-4">
              <Icon name="Sparkles" size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Chattik AI</h2>
            <p className="text-muted-foreground mb-6">Ваш умный помощник всегда на связи</p>
            
            <Button onClick={startAIChat} className="gradient-purple text-white mb-6">
              <Icon name="MessageCircle" size={20} className="mr-2" />
              Начать общение с AI
            </Button>

            <div className="space-y-3 text-left max-w-md mx-auto">
              <Card className="p-4 gradient-purple text-white">
                <div className="flex items-start gap-3">
                  <Icon name="Lightbulb" size={20} />
                  <div>
                    <h4 className="font-semibold mb-1">Получайте идеи</h4>
                    <p className="text-sm opacity-90">AI поможет с креативными решениями</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 gradient-cyan text-white">
                <div className="flex items-start gap-3">
                  <Icon name="Languages" size={20} />
                  <div>
                    <h4 className="font-semibold mb-1">Переводите текст</h4>
                    <p className="text-sm opacity-90">Мгновенный перевод на любой язык</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4 gradient-pink text-white">
                <div className="flex items-start gap-3">
                  <Icon name="FileText" size={20} />
                  <div>
                    <h4 className="font-semibold mb-1">Пишите тексты</h4>
                    <p className="text-sm opacity-90">Создавайте контент любой сложности</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}