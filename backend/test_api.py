import requests
import json
import time

# URL base da API
BASE_URL = "http://localhost:5000"

def test_api():
    """Testa todas as funcionalidades da API"""
    print("🧪 Iniciando testes da API...")
    
    # 1. Testar status da API
    print("\n1️⃣ Testando status da API...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            print("✅ API está funcionando!")
            print(f"   Resposta: {response.json()}")
        else:
            print("❌ API não está respondendo corretamente")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Não foi possível conectar à API. Certifique-se de que o servidor está rodando.")
        return

    # 2. Testar criação de jogadores
    print("\n2️⃣ Testando criação de jogadores...")
    
    test_players = [
        {
            "name": "João Silva",
            "level": "ótimo",
            "gender": "masculino",
            "isSetter": True
        },
        {
            "name": "Maria Santos",
            "level": "bom",
            "gender": "feminino",
            "isSetter": False
        },
        {
            "name": "Pedro Oliveira",
            "level": "delicioso",
            "gender": "masculino",
            "isSetter": False
        }
    ]

    created_players = []
    
    for player_data in test_players:
        try:
            response = requests.post(
                f"{BASE_URL}/players",
                json=player_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                result = response.json()
                if result['success']:
                    created_players.append(result['player'])
                    print(f"✅ Jogador '{player_data['name']}' criado com sucesso!")
                else:
                    print(f"❌ Erro ao criar jogador '{player_data['name']}': {result['error']}")
            else:
                print(f"❌ Erro HTTP {response.status_code} ao criar jogador '{player_data['name']}'")
                
        except Exception as e:
            print(f"❌ Exceção ao criar jogador '{player_data['name']}': {e}")

    # 3. Testar listagem de jogadores
    print("\n3️⃣ Testando listagem de jogadores...")
    try:
        response = requests.get(f"{BASE_URL}/players")
        if response.status_code == 200:
            result = response.json()
            if result['success']:
                players = result['players']
                print(f"✅ {len(players)} jogadores encontrados:")
                for player in players:
                    setter_text = "Levantador" if player['isSetter'] else "Jogador"
                    print(f"   - {player['name']} ({setter_text}, {player['level']}, {player['gender']})")
            else:
                print(f"❌ Erro ao listar jogadores: {result['error']}")
        else:
            print(f"❌ Erro HTTP {response.status_code} ao listar jogadores")
    except Exception as e:
        print(f"❌ Exceção ao listar jogadores: {e}")

    # 4. Testar busca por ID (se temos jogadores criados)
    if created_players:
        print("\n4️⃣ Testando busca por ID...")
        test_player = created_players[0]
        firebase_id = test_player['firebase_id']
        
        try:
            response = requests.get(f"{BASE_URL}/players/{firebase_id}")
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    player = result['player']
                    print(f"✅ Jogador encontrado: {player['name']}")
                else:
                    print(f"❌ Erro ao buscar jogador: {result['error']}")
            else:
                print(f"❌ Erro HTTP {response.status_code} ao buscar jogador")
        except Exception as e:
            print(f"❌ Exceção ao buscar jogador: {e}")

        # 5. Testar atualização
        print("\n5️⃣ Testando atualização de jogador...")
        try:
            updated_data = {
                "name": f"{test_player['name']} (Atualizado)",
                "level": "delicioso",
                "gender": test_player['gender'],
                "isSetter": not test_player['isSetter']  # Inverte o valor
            }
            
            response = requests.put(
                f"{BASE_URL}/players/{firebase_id}",
                json=updated_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result['success']:
                    print(f"✅ Jogador atualizado: {result['player']['name']}")
                else:
                    print(f"❌ Erro ao atualizar jogador: {result['error']}")
            else:
                print(f"❌ Erro HTTP {response.status_code} ao atualizar jogador")
        except Exception as e:
            print(f"❌ Exceção ao atualizar jogador: {e}")

        # 6. Testar remoção (apenas do último jogador criado para não afetar muito os dados)
        if len(created_players) > 1:
            print("\n6️⃣ Testando remoção de jogador...")
            last_player = created_players[-1]
            firebase_id_to_delete = last_player['firebase_id']
            
            try:
                response = requests.delete(f"{BASE_URL}/players/{firebase_id_to_delete}")
                if response.status_code == 200:
                    result = response.json()
                    if result['success']:
                        print(f"✅ {result['message']}")
                    else:
                        print(f"❌ Erro ao remover jogador: {result['error']}")
                else:
                    print(f"❌ Erro HTTP {response.status_code} ao remover jogador")
            except Exception as e:
                print(f"❌ Exceção ao remover jogador: {e}")

    # 7. Testar validações (dados inválidos)
    print("\n7️⃣ Testando validações com dados inválidos...")
    
    invalid_players = [
        {
            "name": "",  # Nome vazio
            "level": "ótimo",
            "gender": "masculino",
            "isSetter": True
        },
        {
            "name": "Teste",
            "level": "expert",  # Nível inválido
            "gender": "masculino",
            "isSetter": True
        },
        {
            "name": "Teste",
            "level": "ótimo",
            "gender": "outro",  # Gênero inválido
            "isSetter": True
        }
    ]

    for i, invalid_data in enumerate(invalid_players, 1):
        try:
            response = requests.post(
                f"{BASE_URL}/players",
                json=invalid_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 400:
                result = response.json()
                print(f"✅ Validação {i} funcionou: {result['error']}")
            else:
                print(f"❌ Validação {i} falhou: deveria retornar erro 400")
                
        except Exception as e:
            print(f"❌ Exceção na validação {i}: {e}")

    print("\n🎉 Testes concluídos!")

if __name__ == "__main__":
    test_api()
