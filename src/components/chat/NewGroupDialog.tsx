import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { Contact } from './ContactsList';

interface NewGroupDialogProps {
  contacts: Contact[];
  onCreateGroup: (name: string, memberIds: number[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export default function NewGroupDialog({ contacts, onCreateGroup, trigger }: NewGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleMember = (contactId: number) => {
    setSelectedMembers(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error('Введите название и выберите участников');
      return;
    }

    setCreating(true);
    try {
      await onCreateGroup(groupName.trim(), selectedMembers);
      setGroupName('');
      setSelectedMembers([]);
      setOpen(false);
      toast.success('Группа создана');
    } catch (error) {
      toast.error('Ошибка создания группы');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full">
            <Icon name="Users" className="mr-2" size={20} />
            Создать группу
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая группа</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Название группы</label>
            <Input
              placeholder="Моя группа"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              disabled={creating}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Участники ({selectedMembers.length})</label>
            <ScrollArea className="h-64 border rounded-lg">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer"
                  onClick={() => toggleMember(contact.id)}
                >
                  <Checkbox
                    checked={selectedMembers.includes(contact.id)}
                    onCheckedChange={() => toggleMember(contact.id)}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">{contact.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          
          <Button
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length === 0 || creating}
            className="w-full"
          >
            {creating ? 'Создание...' : 'Создать группу'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
