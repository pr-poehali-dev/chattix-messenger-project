import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface MessageInputProps {
  onSendMessage: (content: string, attachment?: AttachmentData) => Promise<void>;
  disabled?: boolean;
}

export interface AttachmentData {
  url: string;
  type: string;
  name: string;
  size: number;
}

const UPLOAD_URL = 'https://functions.poehali.dev/e3d8c032-0124-4f9e-953b-cb8e70ed6cdb';

export default function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимум 10 МБ');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const response = await fetch(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: base64,
            name: file.name,
            type: file.type
          })
        });

        const data = await response.json();
        
        if (response.ok && data.url) {
          setAttachment({
            url: data.url,
            type: data.type,
            name: data.name,
            size: data.size
          });
          toast.success('Файл загружен');
        } else {
          toast.error('Ошибка загрузки файла');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !attachment) || sending || disabled) return;

    setSending(true);
    const content = newMessage.trim() || '';

    try {
      await onSendMessage(content, attachment || undefined);
      setNewMessage('');
      setAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  return (
    <div className="p-4 border-t">
      {attachment && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-accent rounded-lg">
          <Icon 
            name={attachment.type.startsWith('image/') ? 'Image' : 'File'} 
            size={20} 
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} КБ
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeAttachment}
            className="shrink-0"
          >
            <Icon name="X" size={16} />
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending || disabled}
        >
          <Icon name={uploading ? 'Loader2' : 'Paperclip'} size={20} className={uploading ? 'animate-spin' : ''} />
        </Button>
        
        <Input
          placeholder="Введите сообщение..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending || disabled}
          className="flex-1"
        />
        
        <Button
          onClick={handleSend}
          disabled={(!newMessage.trim() && !attachment) || sending || disabled}
          size="icon"
        >
          <Icon name="Send" size={20} />
        </Button>
      </div>
    </div>
  );
}
