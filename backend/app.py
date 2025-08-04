from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, db
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Permite requisições de qualquer origem

# Configuração do Firebase Admin SDK
firebase_config = {
    "type": "service_account",
    "project_id": "gerador-times-volei",
    "private_key_id": "YOUR_PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "YOUR_CLIENT_EMAIL",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "YOUR_CLIENT_CERT_URL"
}

# Inicializar Firebase Admin (substitua pela sua chave de serviço)
try:
    # Tenta carregar credenciais do arquivo
    if os.path.exists('firebase-credentials.json'):
        cred = credentials.Certificate('firebase-credentials.json')
    else:
        # Usa configuração direta (substitua pelos valores reais)
        cred = credentials.Certificate(firebase_config)
    
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://gerador-times-volei-default-rtdb.firebaseio.com'
    })
    print("✅ Firebase inicializado com sucesso!")
except Exception as e:
    print(f"❌ Erro ao inicializar Firebase: {e}")

# Referência ao banco de dados
db_ref = db.reference()

class PlayersCRUD:
    """Classe para operações CRUD de jogadores"""
    
    @staticmethod
    def validate_player_data(data):
        """Valida os dados do jogador"""
        required_fields = ['name', 'level', 'gender', 'isSetter']
        valid_levels = ['ok', 'bom', 'ótimo', 'delicioso']
        valid_genders = ['masculino', 'feminino']
        
        # Verifica se todos os campos obrigatórios estão presentes
        for field in required_fields:
            if field not in data:
                return False, f"Campo '{field}' é obrigatório"
        
        # Valida o nome
        if not data['name'] or not isinstance(data['name'], str) or data['name'].strip() == '':
            return False, "Nome deve ser uma string não vazia"
        
        # Valida o nível
        if data['level'] not in valid_levels:
            return False, f"Nível deve ser um dos seguintes: {', '.join(valid_levels)}"
        
        # Valida o gênero
        if data['gender'] not in valid_genders:
            return False, f"Gênero deve ser um dos seguintes: {', '.join(valid_genders)}"
        
        # Valida isSetter
        if not isinstance(data['isSetter'], bool):
            return False, "isSetter deve ser um valor booleano"
        
        return True, "Dados válidos"

    @staticmethod
    def create_player(data):
        """Cria um novo jogador no Firebase"""
        try:
            # Valida os dados
            is_valid, message = PlayersCRUD.validate_player_data(data)
            if not is_valid:
                return {'success': False, 'error': message}
            
            # Prepara os dados do jogador
            player_data = {
                'name': data['name'].strip(),
                'level': data['level'],
                'gender': data['gender'],
                'isSetter': data['isSetter'],
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            }
            
            # Salva no Firebase
            players_ref = db_ref.child('players')
            new_player_ref = players_ref.push(player_data)
            
            # Adiciona o ID gerado aos dados
            player_data['firebase_id'] = new_player_ref.key
            
            return {
                'success': True, 
                'player': player_data,
                'message': f'Jogador {data["name"]} criado com sucesso!'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Erro ao criar jogador: {str(e)}'}

    @staticmethod
    def get_all_players():
        """Recupera todos os jogadores do Firebase"""
        try:
            players_ref = db_ref.child('players')
            players_data = players_ref.get()
            
            if players_data is None:
                return {'success': True, 'players': []}
            
            players = []
            for firebase_id, player_data in players_data.items():
                player_data['firebase_id'] = firebase_id
                players.append(player_data)
            
            # Ordena por nome
            players.sort(key=lambda x: x['name'].lower())
            
            return {'success': True, 'players': players}
            
        except Exception as e:
            return {'success': False, 'error': f'Erro ao buscar jogadores: {str(e)}'}

    @staticmethod
    def get_player_by_id(firebase_id):
        """Recupera um jogador específico pelo ID"""
        try:
            player_ref = db_ref.child('players').child(firebase_id)
            player_data = player_ref.get()
            
            if player_data is None:
                return {'success': False, 'error': 'Jogador não encontrado'}
            
            player_data['firebase_id'] = firebase_id
            return {'success': True, 'player': player_data}
            
        except Exception as e:
            return {'success': False, 'error': f'Erro ao buscar jogador: {str(e)}'}

    @staticmethod
    def update_player(firebase_id, data):
        """Atualiza um jogador existente"""
        try:
            # Valida os dados
            is_valid, message = PlayersCRUD.validate_player_data(data)
            if not is_valid:
                return {'success': False, 'error': message}
            
            # Verifica se o jogador existe
            result = PlayersCRUD.get_player_by_id(firebase_id)
            if not result['success']:
                return result
            
            # Prepara os dados atualizados
            updated_data = {
                'name': data['name'].strip(),
                'level': data['level'],
                'gender': data['gender'],
                'isSetter': data['isSetter'],
                'updatedAt': datetime.now().isoformat()
            }
            
            # Atualiza no Firebase
            player_ref = db_ref.child('players').child(firebase_id)
            player_ref.update(updated_data)
            
            # Recupera os dados atualizados
            updated_player = PlayersCRUD.get_player_by_id(firebase_id)
            
            return {
                'success': True,
                'player': updated_player['player'],
                'message': f'Jogador {data["name"]} atualizado com sucesso!'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Erro ao atualizar jogador: {str(e)}'}

    @staticmethod
    def delete_player(firebase_id):
        """Remove um jogador"""
        try:
            # Verifica se o jogador existe
            result = PlayersCRUD.get_player_by_id(firebase_id)
            if not result['success']:
                return result
            
            player_name = result['player']['name']
            
            # Remove do Firebase
            player_ref = db_ref.child('players').child(firebase_id)
            player_ref.delete()
            
            return {
                'success': True,
                'message': f'Jogador {player_name} removido com sucesso!'
            }
            
        except Exception as e:
            return {'success': False, 'error': f'Erro ao remover jogador: {str(e)}'}

# Rotas da API
@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'API do Gerador de Times de Vôlei Villa',
        'version': '1.0',
        'endpoints': {
            'GET /players': 'Lista todos os jogadores',
            'POST /players': 'Cria um novo jogador',
            'GET /players/<id>': 'Busca um jogador específico',
            'PUT /players/<id>': 'Atualiza um jogador',
            'DELETE /players/<id>': 'Remove um jogador'
        }
    })

@app.route('/players', methods=['GET'])
def get_players():
    """GET /players - Lista todos os jogadores"""
    result = PlayersCRUD.get_all_players()
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 500

@app.route('/players', methods=['POST'])
def create_player():
    """POST /players - Cria um novo jogador"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Dados JSON não fornecidos'}), 400
        
        result = PlayersCRUD.create_player(data)
        if result['success']:
            return jsonify(result), 201
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Erro na requisição: {str(e)}'}), 400

@app.route('/players/<firebase_id>', methods=['GET'])
def get_player(firebase_id):
    """GET /players/<id> - Busca um jogador específico"""
    result = PlayersCRUD.get_player_by_id(firebase_id)
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 404

@app.route('/players/<firebase_id>', methods=['PUT'])
def update_player(firebase_id):
    """PUT /players/<id> - Atualiza um jogador"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Dados JSON não fornecidos'}), 400
        
        result = PlayersCRUD.update_player(firebase_id, data)
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400 if 'não encontrado' not in result['error'] else 404
            
    except Exception as e:
        return jsonify({'success': False, 'error': f'Erro na requisição: {str(e)}'}), 400

@app.route('/players/<firebase_id>', methods=['DELETE'])
def delete_player(firebase_id):
    """DELETE /players/<id> - Remove um jogador"""
    result = PlayersCRUD.delete_player(firebase_id)
    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 404 if 'não encontrado' in result['error'] else 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se a API está funcionando"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'firebase_connected': True  # Você pode implementar uma verificação real aqui
    })

if __name__ == '__main__':
    print("🚀 Iniciando servidor Flask...")
    print("📋 Endpoints disponíveis:")
    print("   GET    / - Informações da API")
    print("   GET    /players - Lista jogadores")
    print("   POST   /players - Cria jogador")
    print("   GET    /players/<id> - Busca jogador")
    print("   PUT    /players/<id> - Atualiza jogador")
    print("   DELETE /players/<id> - Remove jogador")
    print("   GET    /health - Status da API")
    print("\n🌐 Servidor rodando em: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
