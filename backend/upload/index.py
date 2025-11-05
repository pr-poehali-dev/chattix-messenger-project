import json
import os
import base64
import uuid
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Загрузка файлов и изображений для чата
    Args: event с httpMethod, body содержащим base64 файл
    Returns: URL загруженного файла
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    file_data = body_data.get('file')
    file_name = body_data.get('name', 'file')
    file_type = body_data.get('type', 'application/octet-stream')
    
    if not file_data:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'No file data provided'}),
            'isBase64Encoded': False
        }
    
    try:
        file_bytes = base64.b64decode(file_data.split(',')[1] if ',' in file_data else file_data)
        file_size = len(file_bytes)
        
        if file_size > 10 * 1024 * 1024:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'File too large. Max 10MB'}),
                'isBase64Encoded': False
            }
        
        file_id = str(uuid.uuid4())
        file_ext = file_name.split('.')[-1] if '.' in file_name else 'bin'
        stored_name = f"{file_id}.{file_ext}"
        
        upload_dir = '/tmp/uploads'
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, stored_name)
        
        with open(file_path, 'wb') as f:
            f.write(file_bytes)
        
        file_url = f"https://storage.example.com/chattik/{stored_name}"
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'url': file_url,
                'name': file_name,
                'type': file_type,
                'size': file_size
            }),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Upload failed: {str(e)}'}),
            'isBase64Encoded': False
        }
