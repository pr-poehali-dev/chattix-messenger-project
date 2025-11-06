import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any
import urllib.request
import urllib.error

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

def get_db_connection():
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    with conn.cursor() as cur:
        cur.execute("SELECT current_schema()")
        schema = cur.fetchone()[0]
    return conn, schema

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
    
    conn, schema = get_db_connection()
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                phone = body_data.get('phone')
                name = body_data.get('name', 'Пользователь')
                avatar = body_data.get('avatar', 'П')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(f"""
                        INSERT INTO {schema}.users (phone, name, avatar, is_online, last_seen) 
                        VALUES (%s, %s, %s, true, NOW()) 
                        ON CONFLICT (phone) 
                        DO UPDATE SET name = EXCLUDED.name, is_online = true, last_seen = NOW() 
                        RETURNING id, phone, name, avatar
                    """, (phone, name, avatar))
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
                is_ai = body_data.get('is_ai', False)
                should_reply = body_data.get('should_reply', False)
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"INSERT INTO {schema}.messages (chat_id, sender_id, content, is_ai) VALUES (%s, %s, %s, %s) RETURNING id, chat_id, sender_id, content, created_at, is_ai",
                        (chat_id, sender_id, content, is_ai)
                    )
                    conn.commit()
                    message = dict(cur.fetchone())
                    message['created_at'] = message['created_at'].isoformat()
                
                ai_reply = None
                if should_reply and not is_ai and OPENAI_API_KEY:
                    openai_data = {
                        'model': 'gpt-3.5-turbo',
                        'messages': [
                            {'role': 'system', 'content': 'Ты - Chattik AI, дружелюбный помощник в мессенджере Chattik. Отвечай кратко, по-дружески и на русском языке.'},
                            {'role': 'user', 'content': content}
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
                            ai_response_text = result['choices'][0]['message']['content']
                            
                            cur.execute(
                                f"INSERT INTO {schema}.messages (chat_id, sender_id, content, is_ai) VALUES (%s, %s, %s, %s) RETURNING id, chat_id, sender_id, content, created_at, is_ai",
                                (chat_id, None, ai_response_text, True)
                            )
                            conn.commit()
                            ai_reply = dict(cur.fetchone())
                            ai_reply['created_at'] = ai_reply['created_at'].isoformat()
                    except Exception:
                        pass
                
                response_data = {'message': message}
                if ai_reply:
                    response_data['ai_reply'] = ai_reply
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps(response_data),
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
                        f"INSERT INTO {schema}.contacts (user_id, contact_user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (user_id_param, contact_user_id)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'update_online_status':
                user_id_param = body_data.get('user_id')
                is_online = body_data.get('is_online', True)
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"UPDATE {schema}.users SET is_online = %s, last_seen = CURRENT_TIMESTAMP WHERE id = %s",
                        (is_online, user_id_param)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'update_status':
                user_id_param = body_data.get('user_id')
                is_online = body_data.get('is_online', True)
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        f"UPDATE {schema}.users SET is_online = %s, last_seen = NOW() WHERE id = %s",
                        (is_online, user_id_param)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_group':
                name = body_data.get('name')
                description = body_data.get('description', '')
                avatar = body_data.get('avatar', '👥')
                created_by = body_data.get('created_by')
                member_ids = body_data.get('member_ids', [])
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(f"INSERT INTO {schema}.groups (name, description, avatar, created_by) VALUES (%s, %s, %s, %s) RETURNING id", (name, description, avatar, created_by))
                    group_id = cur.fetchone()['id']
                    
                    cur.execute(f"INSERT INTO {schema}.chats (type, group_id) VALUES ('group', %s) RETURNING id", (group_id,))
                    chat_id = cur.fetchone()['id']
                    
                    all_members = [created_by] + member_ids
                    for member_id in all_members:
                        cur.execute(f"INSERT INTO {schema}.group_members (group_id, user_id, role) VALUES (%s, %s, %s)", (group_id, member_id, 'admin' if member_id == created_by else 'member'))
                        cur.execute(f"INSERT INTO {schema}.chat_participants (chat_id, user_id) VALUES (%s, %s)", (chat_id, member_id))
                    
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'group_id': group_id, 'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'ai_response':
                user_message = body_data.get('message', '')
                
                if not OPENAI_API_KEY:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'response': 'AI временно недоступен. Добавьте OPENAI_API_KEY в настройки проекта.'}),
                        'isBase64Encoded': False
                    }
                
                openai_data = {
                    'model': 'gpt-3.5-turbo',
                    'messages': [
                        {'role': 'system', 'content': 'Ты - Chattik AI, дружелюбный помощник в мессенджере Chattik. Отвечай кратко, по-дружески и на русском языке.'},
                        {'role': 'user', 'content': user_message}
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
                except Exception:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'response': 'Извините, произошла ошибка. Попробуйте позже.'}),
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
                    cur.execute(f"""
                        SELECT id, name, phone, avatar, 
                               COALESCE(is_online, false) as is_online,
                               CASE 
                                   WHEN last_seen IS NOT NULL 
                                        AND last_seen > NOW() - INTERVAL '5 minutes' 
                                   THEN true 
                                   ELSE COALESCE(is_online, false)
                               END as is_online_realtime
                        FROM {schema}.users
                        WHERE id != %s
                        ORDER BY name
                    """, (user_id,))
                    contacts = [dict(row) for row in cur.fetchall()]
                    
                    for contact in contacts:
                        contact['is_online'] = contact.get('is_online_realtime', False)
                        if 'is_online_realtime' in contact:
                            del contact['is_online_realtime']
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'contacts': contacts}),
                    'isBase64Encoded': False
                }
            
            elif path == 'messages':
                chat_id = params.get('chat_id')
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(f"""
                        SELECT m.id, m.chat_id, m.sender_id, m.content, m.created_at,
                               COALESCE(m.is_ai, false) as is_ai,
                               u.name as sender_name, u.avatar as sender_avatar
                        FROM {schema}.messages m
                        LEFT JOIN {schema}.users u ON u.id = m.sender_id
                        WHERE m.chat_id = %s
                        ORDER BY m.created_at ASC
                        LIMIT 100
                    """, (chat_id,))
                    messages = [dict(row) for row in cur.fetchall()]
                    
                    for msg in messages:
                        if msg['created_at']:
                            msg['created_at'] = msg['created_at'].isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'messages': messages}),
                    'isBase64Encoded': False
                }
            
            elif path == 'search_user':
                search_phone = params.get('phone', '')
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(f"""
                        SELECT id, name, phone, avatar
                        FROM {schema}.users
                        WHERE phone = %s
                    """, (search_phone,))
                    user = cur.fetchone()
                
                if user:
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'user': dict(user)}),
                        'isBase64Encoded': False
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'}),
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