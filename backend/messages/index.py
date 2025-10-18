"""
Business: API для работы с сообщениями и чатами в мессенджере
Args: event с httpMethod, body, queryStringParameters; context с request_id
Returns: JSON с сообщениями, чатами или результатом операции
"""

import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import urllib.request
import urllib.error

DATABASE_URL = os.environ.get('DATABASE_URL')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action', 'get_chats')
            user_id = params.get('user_id')
            
            if action == 'get_chats':
                cur.execute("""
                    SELECT DISTINCT c.id, c.type, c.created_at,
                           CASE 
                               WHEN c.type = 'group' THEN g.name
                               WHEN c.type = 'ai' THEN 'Chattik AI'
                               ELSE (
                                   SELECT u.name 
                                   FROM chat_participants cp2
                                   JOIN users u ON u.id = cp2.user_id
                                   WHERE cp2.chat_id = c.id AND cp2.user_id != %s
                                   LIMIT 1
                               )
                           END as name,
                           CASE 
                               WHEN c.type = 'group' THEN g.avatar
                               WHEN c.type = 'ai' THEN '🤖'
                               ELSE (
                                   SELECT u.avatar 
                                   FROM chat_participants cp2
                                   JOIN users u ON u.id = cp2.user_id
                                   WHERE cp2.chat_id = c.id AND cp2.user_id != %s
                                   LIMIT 1
                               )
                           END as avatar,
                           (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                           (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_time
                    FROM chats c
                    LEFT JOIN groups g ON c.group_id = g.id
                    LEFT JOIN chat_participants cp ON c.id = cp.chat_id
                    WHERE cp.user_id = %s OR c.type = 'ai'
                    ORDER BY last_message_time DESC NULLS LAST
                """, (user_id, user_id, user_id))
                
                chats = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chats': chats}, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_messages':
                chat_id = params.get('chat_id')
                
                cur.execute("""
                    SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
                    FROM messages m
                    LEFT JOIN users u ON m.sender_id = u.id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC
                """, (chat_id,))
                
                messages = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'messages': messages}, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'get_contacts':
                cur.execute("""
                    SELECT id, name, phone, avatar, is_online, last_seen
                    FROM users
                    WHERE id != %s
                    ORDER BY name ASC
                """, (user_id,))
                
                contacts = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'contacts': contacts}, default=str),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'send_message':
                chat_id = body_data.get('chat_id')
                sender_id = body_data.get('sender_id')
                content = body_data.get('content')
                is_ai = body_data.get('is_ai', False)
                
                cur.execute("""
                    INSERT INTO messages (chat_id, sender_id, content, is_ai, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    RETURNING id, chat_id, sender_id, content, is_ai, created_at
                """, (chat_id, sender_id, content, is_ai))
                
                message = dict(cur.fetchone())
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': message}, default=str),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_chat':
                user_id = body_data.get('user_id')
                contact_id = body_data.get('contact_id')
                
                cur.execute("""
                    SELECT c.id FROM chats c
                    JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = %s
                    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = %s
                    WHERE c.type = 'private'
                    LIMIT 1
                """, (user_id, contact_id))
                
                existing = cur.fetchone()
                
                if existing:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'chat_id': existing['id']}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("INSERT INTO chats (type) VALUES ('private') RETURNING id")
                chat_id = cur.fetchone()['id']
                
                cur.execute("INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                           (chat_id, user_id, chat_id, contact_id))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_group':
                name = body_data.get('name')
                description = body_data.get('description', '')
                avatar = body_data.get('avatar', '👥')
                created_by = body_data.get('created_by')
                member_ids = body_data.get('member_ids', [])
                
                cur.execute("""
                    INSERT INTO groups (name, description, avatar, created_by)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                """, (name, description, avatar, created_by))
                
                group_id = cur.fetchone()['id']
                
                cur.execute("INSERT INTO chats (type, group_id) VALUES ('group', %s) RETURNING id", (group_id,))
                chat_id = cur.fetchone()['id']
                
                all_members = [created_by] + member_ids
                for member_id in all_members:
                    cur.execute("INSERT INTO group_members (group_id, user_id, role) VALUES (%s, %s, %s)",
                               (group_id, member_id, 'admin' if member_id == created_by else 'member'))
                    cur.execute("INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s)",
                               (chat_id, member_id))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'group_id': group_id, 'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_ai_chat':
                user_id = body_data.get('user_id')
                
                cur.execute("""
                    SELECT c.id FROM chats c
                    JOIN chat_participants cp ON c.id = cp.chat_id
                    WHERE c.type = 'ai' AND cp.user_id = %s
                    LIMIT 1
                """, (user_id,))
                
                existing = cur.fetchone()
                
                if existing:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'chat_id': existing['id']}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("INSERT INTO chats (type) VALUES ('ai') RETURNING id")
                chat_id = cur.fetchone()['id']
                
                cur.execute("INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s)", (chat_id, user_id))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'ai_message':
                user_message = body_data.get('message', '')
                
                if not OPENAI_API_KEY:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'response': 'AI временно недоступен. Добавьте OPENAI_API_KEY в настройках проекта.'}),
                        'isBase64Encoded': False
                    }
                
                openai_data = {
                    'model': 'gpt-3.5-turbo',
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'Ты - Chattik AI, дружелюбный помощник в мессенджере Chattik. Отвечай кратко, по-дружески и на русском языке.'
                        },
                        {
                            'role': 'user',
                            'content': user_message
                        }
                    ],
                    'max_tokens': 500,
                    'temperature': 0.7
                }
                
                request_data = json.dumps(openai_data).encode('utf-8')
                
                req = urllib.request.Request(
                    'https://api.openai.com/v1/chat/completions',
                    data=request_data,
                    headers={
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {OPENAI_API_KEY}'
                    }
                )
                
                try:
                    with urllib.request.urlopen(req) as response:
                        result = json.loads(response.read().decode('utf-8'))
                        ai_response = result['choices'][0]['message']['content']
                        
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'response': ai_response}),
                            'isBase64Encoded': False
                        }
                
                except Exception as e:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'response': 'Извините, произошла ошибка. Попробуйте позже.'}),
                        'isBase64Encoded': False
                    }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()