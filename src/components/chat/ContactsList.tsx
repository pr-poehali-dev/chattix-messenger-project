import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';

export interface Contact {
  id: number;
  name: string;
  phone: string;
  avatar: string;
  is_online: boolean;
}

interface ContactsListProps {
  contacts: Contact[];
  onContactClick: (contactId: number) => void;
}

export default function ContactsList({ contacts, onContactClick }: ContactsListProps) {
  return (
    <ScrollArea className="flex-1">
      {contacts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Icon name="Users" className="mx-auto mb-2" size={48} />
          <p>Нет контактов</p>
          <p className="text-sm">Добавьте новые контакты</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => onContactClick(contact.id)}
              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="relative">
                <Avatar>
                  <AvatarFallback>{contact.avatar}</AvatarFallback>
                </Avatar>
                {contact.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{contact.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{contact.phone}</p>
              </div>
              {contact.is_online && (
                <Badge variant="outline" className="shrink-0 text-green-600">
                  Онлайн
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );
}
