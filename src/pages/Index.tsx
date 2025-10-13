import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
  isGroup?: boolean;
}

interface Contact {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  online?: boolean;
}

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState('');
  const [currentTab, setCurrentTab] = useState('chats');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [message, setMessage] = useState('');

  const mockChats: Chat[] = [
    { id: 1, name: 'Анна Петрова', lastMessage: 'Привет! Как дела?', time: '14:23', unread: 2, avatar: 'АП' },
    { id: 2, name: 'Рабочая группа', lastMessage: 'Встреча в 15:00', time: '13:45', unread: 5, avatar: 'РГ', isGroup: true },
    { id: 3, name: 'Иван Смирнов', lastMessage: 'Отправил файлы', time: '12:10', unread: 0, avatar: 'ИС' },
    { id: 4, name: 'Друзья', lastMessage: 'Кто идет в кино?', time: 'Вчера', unread: 1, avatar: 'Д', isGroup: true },
  ];

  const mockContacts: Contact[] = [
    { id: 1, name: 'Анна Петрова', phone: '+7 999 123-45-67', avatar: 'АП', online: true },
    { id: 2, name: 'Иван Смирнов', phone: '+7 999 234-56-78', avatar: 'ИС', online: false },
    { id: 3, name: 'Мария Козлова', phone: '+7 999 345-67-89', avatar: 'МК', online: true },
    { id: 4, name: 'Петр Васильев', phone: '+7 999 456-78-90', avatar: 'ПВ', online: false },
  ];

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      toast.success('Код отправлен на ваш номер!');
      setTimeout(() => {
        setIsAuthenticated(true);
        toast.success('Добро пожаловать в Чаттикс!');
      }, 1500);
    }
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      toast.success('Сообщение отправлено');
      setMessage('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen gradient-purple flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl gradient-cyan mb-4">
              <Icon name="MessageCircle" size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              CHATTIX
            </h1>
            <p className="text-muted-foreground">Современный мессенджер для общения</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Номер телефона</label>
              <Input
                type="tel"
                placeholder="+7 999 123-45-67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
              />
            </div>

            <Button type="submit" className="w-full gradient-purple text-white hover:opacity-90 text-lg py-6">
              Войти
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Нажимая "Войти", вы соглашаетесь с условиями использования
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 to-cyan-50">
      <header className="gradient-purple text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Icon name="MessageCircle" size={32} />
            <h1 className="text-2xl font-bold">CHATTIX</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Icon name="Search" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Icon name="Settings" size={20} />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full">
        <aside className="w-80 bg-white border-r flex flex-col">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-5 m-4 p-1 bg-purple-100">
              <TabsTrigger value="chats" className="data-[state=active]:gradient-purple data-[state=active]:text-white">
                <Icon name="MessageSquare" size={18} />
              </TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:gradient-purple data-[state=active]:text-white">
                <Icon name="Users" size={18} />
              </TabsTrigger>
              <TabsTrigger value="groups" className="data-[state=active]:gradient-purple data-[state=active]:text-white">
                <Icon name="UsersRound" size={18} />
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:gradient-cyan data-[state=active]:text-white">
                <Icon name="Sparkles" size={18} />
              </TabsTrigger>
              <TabsTrigger value="profile" className="data-[state=active]:gradient-pink data-[state=active]:text-white">
                <Icon name="User" size={18} />
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chats" className="flex-1 overflow-y-auto px-2 mt-0">
              <div className="p-2 text-sm font-semibold text-muted-foreground">Чаты</div>
              {mockChats.map((chat) => (
                <Card
                  key={chat.id}
                  className="p-3 mb-2 cursor-pointer hover-scale border-0 shadow-sm hover:shadow-md transition-all"
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className={chat.isGroup ? 'gradient-pink' : 'gradient-purple'}>
                      <AvatarFallback className="text-white font-semibold">{chat.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm truncate">{chat.name}</h3>
                        <span className="text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="gradient-purple text-white">{chat.unread}</Badge>
                    )}
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="contacts" className="flex-1 overflow-y-auto px-2 mt-0">
              <div className="p-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Контакты</span>
                <Button size="sm" className="gradient-purple text-white">
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
              {mockContacts.map((contact) => (
                <Card key={contact.id} className="p-3 mb-2 hover-scale border-0 shadow-sm hover:shadow-md cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="gradient-cyan">
                        <AvatarFallback className="text-white font-semibold">{contact.avatar}</AvatarFallback>
                      </Avatar>
                      {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{contact.name}</h3>
                      <p className="text-xs text-muted-foreground">{contact.phone}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="groups" className="flex-1 overflow-y-auto px-2 mt-0">
              <div className="p-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Группы</span>
                <Button size="sm" className="gradient-pink text-white">
                  <Icon name="Plus" size={16} />
                </Button>
              </div>
              {mockChats.filter(c => c.isGroup).map((group) => (
                <Card key={group.id} className="p-3 mb-2 hover-scale border-0 shadow-sm hover:shadow-md cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Avatar className="gradient-pink">
                      <AvatarFallback className="text-white font-semibold">{group.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">Участников: 12</p>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="ai" className="flex-1 overflow-y-auto px-2 mt-0">
              <div className="p-4">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-cyan mb-3">
                    <Icon name="Sparkles" size={32} className="text-white" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Chattik AI</h2>
                  <p className="text-sm text-muted-foreground">Ваш умный помощник</p>
                </div>

                <Card className="p-4 gradient-cyan text-white mb-3">
                  <p className="text-sm mb-2">Привет! Я Chattik AI 👋</p>
                  <p className="text-xs opacity-90">Я могу помочь вам с поиском информации, ответить на вопросы и многое другое!</p>
                </Card>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="Lightbulb" size={16} className="mr-2" />
                    Подсказать идею
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="FileText" size={16} className="mr-2" />
                    Написать текст
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="Languages" size={16} className="mr-2" />
                    Перевести сообщение
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="flex-1 overflow-y-auto px-2 mt-0">
              <div className="p-4">
                <div className="text-center mb-6">
                  <Avatar className="w-24 h-24 gradient-pink mx-auto mb-3">
                    <AvatarFallback className="text-white text-3xl font-bold">ВЫ</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">Ваш профиль</h2>
                  <p className="text-sm text-muted-foreground">{phone}</p>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="User" size={16} className="mr-2" />
                    Редактировать профиль
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="Bell" size={16} className="mr-2" />
                    Уведомления
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="Lock" size={16} className="mr-2" />
                    Приватность
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Icon name="Palette" size={16} className="mr-2" />
                    Оформление
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Выйти
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        <main className="flex-1 flex flex-col bg-white">
          {selectedChat ? (
            <>
              <div className="gradient-purple text-white px-6 py-4 flex items-center gap-3 shadow-md">
                <Avatar className={selectedChat.isGroup ? 'gradient-pink' : 'gradient-cyan'}>
                  <AvatarFallback className="text-white font-semibold">{selectedChat.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold">{selectedChat.name}</h2>
                  <p className="text-xs opacity-80">онлайн</p>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Icon name="Phone" size={20} />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Icon name="Video" size={20} />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Icon name="MoreVertical" size={20} />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-purple-50/30 to-cyan-50/30">
                <div className="flex justify-start">
                  <Card className="max-w-md p-3 border-purple-200 animate-fade-in">
                    <p className="text-sm">{selectedChat.lastMessage}</p>
                    <p className="text-xs text-muted-foreground mt-1">{selectedChat.time}</p>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Card className="max-w-md p-3 gradient-purple text-white border-0 animate-fade-in">
                    <p className="text-sm">Отлично, спасибо за информацию!</p>
                    <p className="text-xs opacity-80 mt-1">14:30</p>
                  </Card>
                </div>
              </div>

              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="text-purple-600">
                    <Icon name="Paperclip" size={20} />
                  </Button>
                  <Input
                    placeholder="Напишите сообщение..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" className="text-purple-600">
                    <Icon name="Smile" size={20} />
                  </Button>
                  <Button className="gradient-purple text-white" onClick={handleSendMessage}>
                    <Icon name="Send" size={20} />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-purple-50/30 to-cyan-50/30">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl gradient-cyan mb-4">
                  <Icon name="MessageCircle" size={48} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Выберите чат
                </h2>
                <p className="text-muted-foreground">Начните общение с друзьями и коллегами</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
