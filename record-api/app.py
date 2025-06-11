from flask import Flask, jsonify
import logging
from config.database import init_db, get_db_connection
from controllers.message_controller import message_bp

app = Flask(__name__)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

app.register_blueprint(message_bp)

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
