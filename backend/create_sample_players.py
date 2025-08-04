#!/usr/bin/env python3
"""
Script para criar jogadores de exemplo no Firebase
"""

import requests
import json
import time

# Configuração da API
API_BASE_URL = 'http://localhost:5000'

def create_sample_players():
    """Cria jogadores de exemplo no Firebase através da API"""
    
    sample_players = [
        {"name": "João Silva", "level": "bom", "gender": "masculino", "isSetter": False},
        {"name": "Maria Santos", "level": "ótimo", "gender": "feminino", "isSetter": True},
        {"name": "Pedro Costa", "level": "delicioso", "gender": "masculino", "isSetter": False},
        {"name": "Ana Oliveira", "level": "bom", "gender": "feminino", "isSetter": False},
        {"name": "Carlos Lima", "level": "ok", "gender": "masculino", "isSetter": True},
        {"name": "Fernanda Rocha", "level": "ótimo", "gender": "feminino", "isSetter": False},
        {"name": "Roberto Alves", "level": "delicioso", "gender": "masculino", "isSetter": False},
        {"name": "Juliana Mendes", "level": "bom", "gender": "feminino", "isSetter": True}
    ]
    
    print("🔧 Criando jogadores de exemplo no Firebase...")
    
    # Verifica se a API está funcionando
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ API está funcionando")
        else:
            print("❌ API não está respondendo corretamente")
            return
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao conectar com a API: {e}")
        print("💡 Certifique-se de que o servidor Flask está rodando em http://localhost:5000")
        return
    
    # Cria os jogadores
    for player in sample_players:
        try:
            response = requests.post(
                f"{API_BASE_URL}/players",
                json=player,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 201:
                result = response.json()
                print(f"✅ Jogador {player['name']} criado com sucesso")
            else:
                result = response.json()
                print(f"❌ Erro ao criar jogador {player['name']}: {result.get('error', 'Erro desconhecido')}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Erro de conexão ao criar jogador {player['name']}: {e}")
        
        # Pequeno delay entre criações
        time.sleep(0.5)
    
    print("\n📋 Lista atual de jogadores:")
    list_players()

def list_players():
    """Lista todos os jogadores do Firebase"""
    try:
        response = requests.get(f"{API_BASE_URL}/players", timeout=10)
        if response.status_code == 200:
            result = response.json()
            if result['success'] and result['players']:
                print(f"Total de jogadores: {len(result['players'])}")
                for player in result['players']:
                    setter_info = " (Levantador)" if player.get('isSetter') else ""
                    print(f"  - {player['name']}: {player['level']}, {player['gender']}{setter_info}")
            else:
                print("Nenhum jogador encontrado")
        else:
            print("❌ Erro ao listar jogadores")
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao listar jogadores: {e}")

if __name__ == "__main__":
    print("🚀 Script para criar jogadores de exemplo")
    print("=" * 50)
    
    # Pergunta se o usuário quer criar os jogadores
    response = input("Deseja criar jogadores de exemplo? (s/N): ").lower().strip()
    
    if response in ['s', 'sim', 'y', 'yes']:
        create_sample_players()
    else:
        print("📋 Listando jogadores existentes...")
        list_players()
    
    print("\n✅ Script concluído!")
