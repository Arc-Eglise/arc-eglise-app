-- ══════════════════════════════════════════════════════════════
--  ARC — Supprimer toutes les données fictives de messagerie
--  À exécuter dans : Supabase > SQL Editor > New Query
-- ══════════════════════════════════════════════════════════════

-- Supprimer les réactions aux messages
DELETE FROM message_reactions;

-- Supprimer les messages épinglés
DELETE FROM pinned_messages;

-- Supprimer les réponses de threads
DELETE FROM thread_replies;

-- Supprimer tous les messages
DELETE FROM messages;

-- Optionnel : supprimer les canaux créés pour les tests
-- (décommente si tu veux repartir de zéro sur les canaux aussi)
-- DELETE FROM channels;

-- Vérification
SELECT 'messages' AS table_name, COUNT(*) FROM messages
UNION ALL SELECT 'message_reactions', COUNT(*) FROM message_reactions;
