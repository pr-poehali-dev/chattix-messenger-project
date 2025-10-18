import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

const API_URL = 'https://functions.poehali.dev/4e211b7c-8161-4af3-a134-9f3e4b20c363';

type Chat = {
  id: number;
  name: string;
  avatar: string;
  type: string;
  last_message: string;
  time: string;
  unread: number;
};

type Contact = {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  bio?: string;
};

type Message = {
  id: number;
  content: string;
  sender_id: number | null;
  is_ai: boolean;
  time: string;
  sender_name: string;
  sender_avatar: string;
};

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
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
    if (isAuthenticated && userId) {
      loadChats();
      loadContacts();
    }
  }, [isAuthenticated, userId]);

  const loadChats = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}?path=chats`, {
        headers: { 'X-User-Id': userId.toString() }
      });
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadContacts = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}?path=contacts`, {
        headers: { 'X-User-Id': userId.toString() }
      });
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Ошибка загрузки контактов:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(`${API_URL}?path=messages&chat_id=${chatId}`, {
        headers: { 'X-User-Id': userId?.toString() || '' }
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

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
          phone: phone,
          name: name || phone
        })
      });
      const data = await response.json();
      
      if (response.ok && data.user) {
        setUserId(data.user.id);
        setIsAuthenticated(true);
        toast.success('Добро пожаловать!');
        await createAIChat(data.user.id);
      } else {
        toast.error(data.error || 'Ошибка авторизации');
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  const createAIChat = async (userId: number) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_group',
          name: 'Chattik AI',
          avatar: '🤖',
          description: 'Ваш умный помощник',
          created_by: userId,
          members: []
        })
      });
      
      if (response.ok) {
        await loadChats();
      }
    } catch (error) {
      console.error('Ошибка создания AI чата:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat || !userId) return;

    const userMessage = messageInput;
    setMessageInput('');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat.id,
          sender_id: userId,
          content: userMessage,
          is_ai: false
        })
      });

      if (response.ok) {
        await loadMessages(selectedChat.id);
        
        if (selectedChat.type === 'group' && selectedChat.name === 'Chattik AI') {
          setTimeout(async () => {
            const aiResponse = generateAIResponse(userMessage);
            await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_message',
                chat_id: selectedChat.id,
                sender_id: null,
                content: aiResponse,
                is_ai: true
              })
            });
            await loadMessages(selectedChat.id);
          }, 1000);
        }
      }
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
      return 'Привет! 👋 Я Chattik AI. Чем могу помочь?';
    }
    if (lowerMessage.includes('как дела')) {
      return 'У меня всё отлично! Спасибо, что спросили 😊';
    }
    if (lowerMessage.includes('спасибо')) {
      return 'Всегда пожалуйста! Рад помочь 🤗';
    }
    if (lowerMessage.includes('погода')) {
      return 'К сожалению, у меня нет данных о погоде, но я могу помочь с другими вопросами! ☀️';
    }
    if (lowerMessage.includes('время') || lowerMessage.includes('час')) {
      return `Сейчас ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} ⏰`;
    }
    
    return 'Интересный вопрос! Я всё ещё учусь и развиваюсь. Могу помочь с базовой информацией 🤖';
  };

  const handleStartChat = async (contact: Contact) => {
    if (!userId) return;
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_personal_chat',
          user1_id: userId,
          user2_id: contact.id
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        await loadChats();
        const newChat = chats.find(c => c.id === data.chat.id) || {
          id: data.chat.id,
          name: contact.name,
          avatar: contact.avatar,
          type: 'personal',
          last_message: '',
          time: '',
          unread: 0
        };
        setSelectedChat(newChat);
        setActiveTab('chats');
        await loadMessages(data.chat.id);
      }
    } catch (error) {
      toast.error('Ошибка создания чата');
    }
  };

  const handleCreateGroup = async () => {
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
          avatar: '👥',
          description: '',
          created_by: userId,
          members: selectedMembers
        })
      });

      if (response.ok) {
        toast.success('Группа создана!');
        setShowCreateGroup(false);
        setGroupName('');
        setSelectedMembers([]);
        await loadChats();
      }
    } catch (error) {
      toast.error('Ошибка создания группы');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-cyan-50 p-4">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-purple mb-4">
              <Icon name="MessageCircle" size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Chattik</h1>
            <p className="text-muted-foreground">Войдите по номеру телефона</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Номер телефона</label>
              <Input
                type="tel"
                placeholder="+7 900 123-45-67"
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
                placeholder="Как вас зовут?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-purple text-white hover:opacity-90 text-lg py-6">
              {loading ? 'Загрузка...' : 'Войти'}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Регистрация только по реальному номеру телефона
          </p>
        </Card>
      </div>
    );
  }

  if (showCreateGroup) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setShowCreateGroup(false)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <h2 className="text-xl font-bold">Новая группа</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <Input
              placeholder="Название группы"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="text-lg"
            />
          </div>

          <h3 className="font-semibold mb-3">Участники</h3>
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => {
                  if (selectedMembers.includes(contact.id)) {
                    setSelectedMembers(selectedMembers.filter(id => id !== contact.id));
                  } else {
                    setSelectedMembers([...selectedMembers, contact.id]);
                  }
                }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer ${
                  selectedMembers.includes(contact.id) ? 'bg-purple-50' : 'hover:bg-gray-50'
                }`}
              >
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="gradient-pink text-white font-semibold">
                    {contact.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">{contact.phone}</div>
                </div>
                {selectedMembers.includes(contact.id) && (
                  <Icon name="Check" size={20} className="text-purple-600" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t bg-white">
          <Button 
            onClick={handleCreateGroup} 
            className="w-full gradient-purple text-white py-6"
            disabled={!groupName.trim() || selectedMembers.length === 0}
          >
            Создать группу ({selectedMembers.length})
          </Button>
        </div>
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <div className="flex items-center gap-3 p-4 border-b bg-white sticky top-0 z-10">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <Avatar className="w-10 h-10">
            <AvatarFallback className="gradient-cyan text-white font-semibold text-sm">
              {selectedChat.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-bold">{selectedChat.name}</div>
            <div className="text-xs text-muted-foreground">онлайн</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.sender_id === userId ? 'flex-row-reverse' : ''}`}
            >
              {msg.sender_id !== userId && (
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="gradient-pink text-white text-xs">
                    {msg.sender_avatar}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${msg.sender_id === userId ? 'items-end' : 'items-start'} flex flex-col`}>
                {msg.sender_id !== userId && selectedChat.type === 'group' && (
                  <div className="text-xs font-medium text-purple-600 mb-1">{msg.sender_name}</div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    msg.sender_id === userId
                      ? 'bg-purple-600 text-white rounded-tr-sm'
                      : msg.is_ai
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-tl-sm'
                      : 'bg-white border rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className={`text-xs mt-1 ${msg.sender_id === userId || msg.is_ai ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {msg.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Сообщение..."
              className="flex-1 rounded-full"
            />
            <Button type="submit" size="icon" className="rounded-full gradient-purple text-white">
              <Icon name="Send" size={20} />
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="p-4 border-b bg-white sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Chattik</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
          <TabsTrigger value="chats" className="gap-2">
            <Icon name="MessageCircle" size={18} />
            Чаты
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Icon name="Users" size={18} />
            Контакты
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <Icon name="User" size={18} />
            Профиль
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chats" className="flex-1 overflow-y-auto m-0">
          <div className="p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat);
                  loadMessages(chat.id);
                }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100"
              >
                <Avatar className="w-14 h-14">
                  <AvatarFallback className={`${chat.type === 'group' ? 'gradient-cyan' : 'gradient-pink'} text-white font-semibold`}>
                    {chat.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold truncate">{chat.name}</span>
                    <span className="text-xs text-muted-foreground">{chat.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                    {chat.unread > 0 && (
                      <Badge className="ml-2 gradient-purple text-white">{chat.unread}</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 overflow-y-auto m-0">
          <div className="p-4">
            <Button 
              onClick={() => setShowCreateGroup(true)} 
              className="w-full gradient-purple text-white mb-4 py-6"
            >
              <Icon name="Users" size={20} className="mr-2" />
              Создать группу
            </Button>

            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleStartChat(contact)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer active:bg-gray-100"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="gradient-pink text-white font-semibold">
                      {contact.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">{contact.phone}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="flex-1 overflow-y-auto m-0">
          <div className="p-4">
            <div className="text-center mb-6">
              <Avatar className="w-24 h-24 gradient-pink mx-auto mb-3">
                <AvatarFallback className="text-white text-3xl font-bold">{name ? name[0].toUpperCase() : 'П'}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{name || 'Пользователь'}</h2>
              <p className="text-sm text-muted-foreground">{phone}</p>
            </div>

            <div className="space-y-2">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Icon name="Phone" size={20} className="text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Телефон</div>
                    <div className="font-medium">{phone}</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Icon name="User" size={20} className="text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Имя</div>
                    <div className="font-medium">{name || 'Не указано'}</div>
                  </div>
                </div>
              </Card>

              <Button 
                onClick={() => {
                  setIsAuthenticated(false);
                  setUserId(null);
                  toast.success('Вы вышли из аккаунта');
                }} 
                variant="destructive" 
                className="w-full mt-4"
              >
                <Icon name="LogOut" size={20} className="mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
