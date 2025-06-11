import logging
from psycopg2.extras import RealDictCursor
from config.database import get_db_connection # Importa a função de conexão
from models.message_model import Message # Importa o modelo de Message
from typing import Union, List, Dict, Optional # Importa Union e outros tipos para type hints

logger = logging.getLogger(__name__)

class MessageService:
    @staticmethod
    def record_message(sender_id: int, message: str, receiver_id: int = None) -> (Union[Dict, None], Union[str, None]):
        conn = get_db_connection()
        if not conn:
            logger.error("MessageService.record_message: Falha na conexão com o banco de dados.")
            return None, "Falha na conexão com o banco de dados"

        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO messages (sender_id, receiver_id, message)
                    VALUES (%s, %s, %s) RETURNING id;
                    """,
                    (sender_id, receiver_id, message)
                )
                message_id = cur.fetchone()[0]
                conn.commit()
            
            logger.info(f"Mensagem gravada com sucesso! ID: {message_id}")

            return {"message_id": message_id}, None
        except Exception as e:
            logger.error(f"Erro ao gravar mensagem: {e}")
            return None, f"Erro ao gravar mensagem: {str(e)}"
        finally:
            if conn:
                conn.close()

    @staticmethod
    def get_messages_for_user(user_id: int) -> (Union[List[Message], None], Union[str, None]):
        conn = get_db_connection()
        if not conn:
            logger.error("MessageService.get_messages_for_user: Falha na conexão com o banco de dados.")
            return None, "Falha na conexão com o banco de dados"

        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id, sender_id, receiver_id, message, created_at
                    FROM messages
                    WHERE sender_id = %s OR receiver_id = %s
                    ORDER BY created_at DESC;
                    """,
                    (user_id, user_id)
                )
                messages_data = cur.fetchall()
                
                messages = [
                    Message(
                        id=msg['id'],
                        sender_id=msg['sender_id'],
                        receiver_id=msg['receiver_id'],
                        message=msg['message'],
                        created_at=msg['created_at']
                    ) for msg in messages_data
                ]
            
            logger.info(f"Mensagens buscadas para o usuário {user_id}: {len(messages)} encontradas.")
            return messages, None
        except Exception as e:
            logger.error(f"Erro ao buscar mensagens: {e}")
            return None, f"Erro ao buscar mensagens: {str(e)}"
        finally:
            if conn:
                conn.close()
