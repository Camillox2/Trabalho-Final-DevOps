from flask import Flask, request, jsonify
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging
import time

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(name)s:%(message)s')
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
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            logger.info("Tabela 'messages' verificada/criada com sucesso.")
    except Exception as e:
        logger.error(f"Erro ao inicializar tabela 'messages': {e}")
    finally:
        if conn:
            conn.close()

@app.route('/message', methods=['POST'])
def record_message():
    data = request.get_json()
    if not data or not all(k in data for k in ('sender_id', 'message')):
        return jsonify({'error': 'Dados incompletos. sender_id e message são obrigatórios.'}), 400

    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    message = data.get('message')

    conn = get_db_connection()
    if not conn:
        logger.error("POST /message: Falha na conexão com o banco de dados.")
        return jsonify({'error': 'Falha na conexão com o banco de dados ao gravar msg'}), 503

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
        return jsonify({'message': 'Mensagem gravada com sucesso!', 'message_id': message_id}), 201
    except Exception as e:
        logger.error(f"Erro ao gravar mensagem: {e}")
        return jsonify({'error': f'Erro ao gravar mensagem: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/message', methods=['GET'])
def get_messages():
    user_id = request.args.get('userId', type=int)
    if not user_id:
        return jsonify({'error': 'Parâmetro userId é obrigatório.'}), 400

    conn = get_db_connection()
    if not conn:
        logger.error("GET /message: Falha na conexão com o banco de dados.")
        return jsonify({'error': 'Falha na conexão com o banco de dados ao buscar msgs'}), 503

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM messages WHERE sender_id = %s OR receiver_id = %s ORDER BY created_at DESC",
                (user_id, user_id)
            )
            messages = cur.fetchall()
        return jsonify(messages), 200
    except Exception as e:
        logger.error(f"Erro ao buscar mensagens: {e}")
        return jsonify({'error': f'Erro ao buscar mensagens: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/health', methods=['GET'])
def health_check():
    try:
        logger.info("Endpoint /health da Record-API chamado")
        conn = None
        db_status = "disconnected"
        db_ok = False
        error_message = None
        try:
            conn = get_db_connection()
            if conn:
                try:
                    with conn.cursor() as cur:
                        cur.execute("SELECT 1")
                    db_status = "connected"
                    db_ok = True
                except Exception as e:
                    error_message = str(e)
                    logger.error(f"Health check DB query error (Record-API): {error_message}")
                    db_status = f"error_query: {error_message}"
            else:
                db_status = "connection_failed"
        except Exception as e:
            error_message = str(e)
            logger.error(f"Health check DB connection error (Record-API): {error_message}")
            db_status = f"error_connecting: {error_message}"
        finally:
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

        response_data = {'service_status': 'UP', 'database_status': db_status}
        if not db_ok and error_message:
            response_data['database_error_details'] = error_message

        if db_ok:
            logger.info("Health check (Record-API): DB OK, retornando 200")
            return jsonify(response_data), 200
        else:
            logger.warning(f"Health check (Record-API): DB NOT OK (db_status: {db_status}), retornando 503")
            return jsonify(response_data), 503
    except Exception as e:
        logger.error(f"Erro inesperado no endpoint /health: {e}")
        return jsonify({'service_status': 'DOWN', 'error': str(e)}), 503

if __name__ == '__main__':
    logger.info("Iniciando Record-API...")
    init_db()
    app.run(host='0.0.0.0', port=5002, debug=False) 
    logger.info("Record-API encerrada.")
