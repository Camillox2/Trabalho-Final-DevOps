import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time

logger = logging.getLogger(__name__)

def get_db_connection(attempt_count=0):
    db_host = os.getenv('DB_HOST', 'postgres_db')
    db_name_env = os.getenv('POSTGRES_DB')
    db_user_env = os.getenv('POSTGRES_USER')
    db_pass_env = os.getenv('POSTGRES_PASSWORD')
    db_port = os.getenv('DB_PORT', '5432')

    db_name = db_name_env if db_name_env is not None else 'chat_application_db'
    db_user = db_user_env if db_user_env is not None else 'admin_user'
    db_pass = db_pass_env if db_pass_env is not None else 'supersecretpassword'
    
    try:
        conn = psycopg2.connect(
            host=db_host,
            database=db_name,
            user=db_user,
            password=db_pass,
            port=db_port,
            connect_timeout=5
        )
        logger.info(f"Conexão com PostgreSQL ({db_host}:{db_port}/{db_name}) como usuário '{db_user}' estabelecida com sucesso.")
        return conn
    except psycopg2.OperationalError as e:
        logger.error(f"Erro ao conectar ao PostgreSQL (tentativa {attempt_count+1}) com usuário '{db_user}' no BD '{db_name}': {e}")
        return None

def init_db():
    max_retries = 5
    retry_delay = 5
    conn = None
    for i in range(max_retries):
        conn = get_db_connection(attempt_count=i)
        if conn:
            break
        logger.info(f"Falha ao conectar ao DB para init_db. Tentando novamente em {retry_delay}s... ({i+1}/{max_retries})")
        time.sleep(retry_delay)
    
    if not conn:
        logger.error("Não foi possível conectar ao banco de dados após várias tentativas para init_db. O serviço pode não funcionar corretamente.")
        return 

    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    sender_id INTEGER NOT NULL,
                    receiver_id INTEGER,
                    message TEXT NOT NULL
                );
            """)
            conn.commit()
            logger.info("Tabela 'messages' verificada/criada com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao inicializar tabela 'messages': {e}")
    finally:
        if conn:
            conn.close()
