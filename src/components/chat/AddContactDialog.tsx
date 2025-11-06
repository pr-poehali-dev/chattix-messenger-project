import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface AddContactDialogProps {
  apiUrl: string;
  userId: number;
  onContactAdded: () => void;
}

export default function AddContactDialog({ apiUrl, userId, onContactAdded }: AddContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddContact = async () => {
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }

    setLoading(true);
    try {
      const searchResponse = await fetch(`${apiUrl}?path=search_user&phone=${encodeURIComponent(phone)}`);
      const searchData = await searchResponse.json();

      if (!searchResponse.ok || !searchData.user) {
        toast.error('Пользователь не найден');
        return;
      }

      const addResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_contact',
          user_id: userId,
          contact_user_id: searchData.user.id
        })
      });

      if (addResponse.ok) {
        toast.success('Контакт добавлен');
        setPhone('');
        setOpen(false);
        onContactAdded();
      } else {
        toast.error('Ошибка добавления контакта');
      }
    } catch (error) {
      toast.error('Ошибка подключения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Icon name="UserPlus" className="mr-2" size={20} />
          Добавить контакт
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить контакт</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Номер телефона"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
          />
          <Button onClick={handleAddContact} disabled={loading} className="w-full">
            {loading ? 'Поиск...' : 'Добавить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
