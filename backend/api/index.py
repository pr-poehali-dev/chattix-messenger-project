import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с чатами, сообщениями, контактами
    Args: event с httpMethod, body, queryStringParameters
    Returns: HTTP response с данными из базы
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    headers = event.get('headers', {})
    user_id = headers.get('x-user-id') or headers.get('X-User-Id')
    params = event.get('queryStringParameters', {}) or {}
    path = params.get('path', '')
    
    conn = get_db_connection()
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                phone = body_data.get('phone')
                name = body_data.get('name', 'Пользователь')
                avatar = body_data.get('avatar', 'П')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO users (phone, name, avatar) VALUES (%s, %s, %s) ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id, phone, name, avatar",
                        (phone, name, avatar)
                    )
                    conn.commit()
                    user = dict(cur.fetchone())
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': user}),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_message':
                chat_id = body_data.get('chat_id')
                sender_id = body_data.get('sender_id')
                content = body_data.get('content')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO messages (chat_id, sender_id, content) VALUES (%s, %s, %s) RETURNING id, chat_id, sender_id, content, created_at",
                        (chat_id, sender_id, content)
                    )
                    conn.commit()
                    message = dict(cur.fetchone())
                    message['created_at'] = message['created_at'].isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': message}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_chat':
                name = body_data.get('name', '')
                is_group = body_data.get('is_group', False)
                members = body_data.get('members', [])
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO chats (name, is_group) VALUES (%s, %s) RETURNING id, name, is_group",
                        (name, is_group)
                    )
                    chat = dict(cur.fetchone())
                    chat_id = chat['id']
                    
                    for member_id in members:
                        cur.execute(
                            "INSERT INTO chat_members (chat_id, user_id) VALUES (%s, %s)",
                            (chat_id, member_id)
                        )
                    
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat': chat}),
                    'isBase64Encoded': False
                }
            
            elif action == 'add_contact':
                user_id_param = body_data.get('user_id')
                contact_user_id = body_data.get('contact_user_id')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO contacts (user_id, contact_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (user_id_param, contact_user_id)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
        
        elif method == 'GET':
            if path == 'chats' and user_id:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT c.id, c.name, c.is_group,
                               COALESCE(last_msg.content, '') as last_message,
                               COALESCE(TO_CHAR(last_msg.created_at, 'HH24:MI'), '') as time,
                               0 as unread
                        FROM chats c
                        JOIN chat_members cm ON cm.chat_id = c.id
                        LEFT JOIN LATERAL (
                            SELECT content, created_at
                            FROM messages
                            WHERE chat_id = c.id
                            ORDER BY created_at DESC
                            LIMIT 1
                        ) last_msg ON true
                        WHERE cm.user_id = %s
                        ORDER BY last_msg.created_at DESC NULLS LAST
                    """, (user_id,))
                    chats = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chats': chats}),
                    'isBase64Encoded': False
                }
            
            elif path == 'contacts' and user_id:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT u.id, u.name, u.phone, u.avatar
                        FROM users u
                        JOIN contacts c ON c.contact_user_id = u.id
                        WHERE c.user_id = %s
                        ORDER BY u.name
                    """, (user_id,))
                    contacts = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'contacts': contacts}),
                    'isBase64Encoded': False
                }
            
            elif path == 'messages':
                chat_id = params.get('chat_id')
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute("""
                        SELECT m.id, m.chat_id, m.sender_id, m.content,
                               TO_CHAR(m.created_at, 'HH24:MI') as time,
                               u.name as sender_name, u.avatar as sender_avatar
                        FROM messages m
                        JOIN users u ON u.id = m.sender_id
                        WHERE m.chat_id = %s
                        ORDER BY m.created_at ASC
                        LIMIT 100
                    """, (chat_id,))
                    messages = [dict(row) for row in cur.fetchall()]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'messages': messages}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'}),
            'isBase64Encoded': False
        }
    
    finally:
        conn.close()