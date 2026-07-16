#!/bin/bash
# =============================================================================
# ARC LLM — Installation des 3 modèles open-source via Ollama
# Sources : Qwen2.5 (Alibaba), DeepSeek-R1 (DeepSeek AI), GLM-4 (ZhipuAI)
#
# Prérequis : Ollama installé (https://ollama.com)
# Usage    : bash scripts/setup-arc-llm.sh
# =============================================================================

set -e

echo "============================================"
echo "  ARC Église AI — Installation LLM locale"
echo "============================================"
echo ""

# Vérifier que Ollama est disponible
if ! command -v ollama &> /dev/null; then
  echo "❌ Ollama n'est pas installé."
  echo "   Installe-le depuis : https://ollama.com/download"
  exit 1
fi

echo "✅ Ollama détecté : $(ollama --version)"
echo ""

# ── 1. ARC LLM Qwen (principal, multilingue FR/EN/AR/ZH) ────────────────────
echo "📥 [1/3] Téléchargement de Qwen2.5:7b..."
echo "   Source : https://huggingface.co/Qwen/Qwen2.5-7B-Instruct"
echo "   Via Ollama : qwen2.5:7b"
ollama pull qwen2.5:7b

echo "🔧 Création du modèle arc-llm-qwen..."
ollama create arc-llm-qwen -f scripts/Modelfile
echo "✅ arc-llm-qwen créé"
echo ""

# ── 2. ARC LLM DeepSeek-R1 (raisonnement théologique) ──────────────────────
echo "📥 [2/3] Téléchargement de DeepSeek-R1:7b..."
echo "   Source : https://huggingface.co/deepseek-ai/DeepSeek-R1"
echo "   Via Ollama : deepseek-r1:7b (distillation 7B gratuite)"
ollama pull deepseek-r1:7b

echo "🔧 Création du modèle arc-llm-deepseek..."
ollama create arc-llm-deepseek -f scripts/Modelfile.deepseek
echo "✅ arc-llm-deepseek créé"
echo ""

# ── 3. ARC LLM GLM-4 (contexte long, passages bibliques) ───────────────────
echo "📥 [3/3] Téléchargement de GLM-4..."
echo "   Source : https://huggingface.co/zai-org/GLM-5.2 (GLM-4 pour Ollama)"
echo "   Note : GLM-5.2 GGUF disponible sur HuggingFace quand publié"
echo "          Pour l'instant : glm4 (version Ollama stable)"
ollama pull glm4

echo "🔧 Création du modèle arc-llm-glm..."
ollama create arc-llm-glm -f scripts/Modelfile.glm
echo "✅ arc-llm-glm créé"
echo ""

# ── Résumé ───────────────────────────────────────────────────────────────────
echo "============================================"
echo "  Installation terminée !"
echo "============================================"
echo ""
echo "Modèles disponibles :"
ollama list | grep arc-llm
echo ""
echo "Ajoute dans .env.local :"
echo "  OLLAMA_BASE_URL=http://localhost:11434/v1"
echo "  OLLAMA_QWEN_MODEL=arc-llm-qwen"
echo "  OLLAMA_DS_MODEL=arc-llm-deepseek"
echo "  OLLAMA_GLM_MODEL=arc-llm-glm"
echo ""
echo "Test rapide :"
echo "  ollama run arc-llm-qwen 'Cite Jean 3:16 en français'"
echo "  ollama run arc-llm-deepseek 'Explique la doctrine de la prédestination'"
echo "  ollama run arc-llm-glm 'Résume le livre de Jean'"
echo ""

# ── Optionnel : GLM-5.2 depuis HuggingFace ──────────────────────────────────
echo "Pour upgrader vers GLM-5.2 quand le GGUF sera disponible :"
echo "  1. Télécharge le GGUF depuis https://huggingface.co/zai-org/GLM-5.2"
echo "  2. Édite Modelfile.glm : remplace 'FROM glm4' par 'FROM /chemin/glm-5.2.gguf'"
echo "  3. Relance : ollama create arc-llm-glm -f scripts/Modelfile.glm"
