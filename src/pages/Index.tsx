import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

import AuthForm from '@/components/chat/AuthForm';
import ChatList, { type Chat } from '@/components/chat/ChatList';
import MessageList, { type Message } from '@/components/chat/MessageList';
import MessageInput, { type AttachmentData } from '@/components/chat/MessageInput';
import ContactsList, { type Contact } from '@/components/chat/ContactsList';
import NewGroupDialog from '@/components/chat/NewGroupDialog';

const API_URL = 'https://functions.poehali.dev/4e211b7c-8161-4af3-a134-9f3e4b20c363';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  const handleAuthSuccess = (uid: number) => {
    setUserId(uid);
    setIsAuthenticated(true);
    loadChats(uid);
    loadContacts(uid);
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
  };

  const sendMessage = async (content: string, attachment?: AttachmentData) => {
    if (!selectedChat || !userId) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: selectedChat.id,
          sender_id: userId,
          content,
          attachment_url: attachment?.url,
          attachment_type: attachment?.type,
          attachment_name: attachment?.name,
          attachment_size: attachment?.size
        })
      });

      const data = await response.json();
      
      if (response.ok && data.message) {
        setMessages(prev => [...prev, data.message]);
        
        if (selectedChat.type === 'ai' && !attachment) {
          const aiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ai_response',
              message: content
            })
          });
          
          const aiData = await aiResponse.json();
          
          if (aiData.response) {
            const aiMessageResponse = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'send_message',
                chat_id: selectedChat.id,
                sender_id: null,
                content: aiData.response,
                is_ai: true
              })
            });
            
            const aiMessageData = await aiMessageResponse.json();
            if (aiMessageData.message) {
              setMessages(prev => [...prev, aiMessageData.message]);
            }
          }
        }
        
        loadChats(userId);
      }
    } catch (error) {
      toast.error('Ошибка отправки сообщения');
      throw error;
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

  const createGroup = async (name: string, memberIds: number[]) => {
    if (!userId) return;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_group',
        name,
        description: '',
        avatar: '👥',
        created_by: userId,
        member_ids: memberIds
      })
    });
    
    const data = await response.json();
    if (data.chat_id) {
      loadChats(userId);
    }
  };

  if (!isAuthenticated) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} apiUrl={API_URL} />;
  }

  return (
    <div className="h-screen flex bg-background">
      <Card className="w-80 m-4 flex flex-col shadow-lg rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>💬</span>
            Chattik
          </h1>
        </div>
        
        <Tabs defaultValue="chats" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 m-2">
            <TabsTrigger value="chats">Чаты</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chats" className="flex-1 flex flex-col m-0">
            <div className="p-2 space-y-2">
              <Button onClick={startAIChat} variant="outline" className="w-full">
                <Icon name="Bot" className="mr-2" size={20} />
                Chattik AI
              </Button>
              <NewGroupDialog contacts={contacts} onCreateGroup={createGroup} />
            </div>
            <ChatList chats={chats} selectedChat={selectedChat} onChatSelect={openChat} />
          </TabsContent>
          
          <TabsContent value="contacts" className="flex-1 flex flex-col m-0">
            <ContactsList contacts={contacts} onContactClick={startChatWithContact} />
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="flex-1 m-4 ml-0 flex flex-col shadow-lg rounded-xl overflow-hidden">
        {selectedChat ? (
          <>
            <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <h2 className="text-xl font-semibold">{selectedChat.name}</h2>
            </div>
            
            <MessageList messages={messages} userId={userId} chatName={selectedChat.name} />
            <MessageInput onSendMessage={sendMessage} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageCircle" className="mx-auto mb-4" size={64} />
              <p className="text-xl font-semibold">Выберите чат</p>
              <p className="text-sm">Начните общение или создайте новый чат</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
