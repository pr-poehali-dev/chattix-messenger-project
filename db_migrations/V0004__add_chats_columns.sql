-- Добавляем недостающие колонки в таблицу chats
ALTER TABLE chats ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'personal';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS avatar VARCHAR(10) DEFAULT '💬';
ALTER TABLE chats ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS created_by INTEGER;

-- Обновляем существующие записи
UPDATE chats SET type = CASE WHEN is_group = true THEN 'group' ELSE 'personal' END WHERE type IS NULL;