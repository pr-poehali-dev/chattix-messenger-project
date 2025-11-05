-- Добавляем поля для вложений в таблицу messages
ALTER TABLE messages 
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type VARCHAR(50),
ADD COLUMN attachment_name TEXT,
ADD COLUMN attachment_size INTEGER;

-- Создаем индекс для быстрого поиска сообщений с вложениями
CREATE INDEX idx_messages_with_attachments ON messages(attachment_url) WHERE attachment_url IS NOT NULL;
