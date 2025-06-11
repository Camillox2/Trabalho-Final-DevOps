from flask import Blueprint, request, jsonify
import logging
from services.message_service import MessageService

message_bp = Blueprint('messages', __name__)
logger = logging.getLogger(__name__)

@message_bp.route('/message', methods=['POST'])
def record_message():
    data = request.get_json()
    if not data or not all(k in data for k in ('sender_id', 'message')):
        return jsonify({'error': 'Dados incompletos. sender_id e message são obrigatórios.'}), 400

    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    message = data.get('message')

    result, error = MessageService.record_message(sender_id, message, receiver_id)

    if error:
        logger.error(f"Erro no controller ao gravar mensagem: {error}")
        return jsonify({'error': error}), 500
    
    logger.info(f"Mensagem gravada com sucesso via controller. ID: {result['message_id']}")
    return jsonify({'message': 'Mensagem gravada com sucesso!', 'message_id': result['message_id']}), 201

@message_bp.route('/message', methods=['GET'])
def get_messages():
    print("get_messages chamado")
    user_id = request.args.get('userId', type=int)
    print(f"Parâmetro userId recebido: {user_id}")
    if not user_id:
        return jsonify({'error': 'Parâmetro userId é obrigatório.'}), 400

    messages, error = MessageService.get_messages_for_user(user_id)

    if error:
        logger.error(f"Erro no controller ao buscar mensagens: {error}")
        return jsonify({'error': error}), 500
    
    print(f"Mensagens encontradas: {messages}")

    messages_json = [msg.__dict__ for msg in messages]

    logger.info(f"Mensagens buscadas com sucesso via controller para o usuário {user_id}.")
    return jsonify(messages_json), 200
