-- Nettoyage des données de TEST créées pendant la validation d'ARC IA agentique
-- (session 16, 26/07/2026) dans la mémoire de l'assistant, sur le compte admin Jaise.
-- Ces lignes feraient sinon « se souvenir » ARC IA de messages de test
-- (« Qui est Moïse ? », recherche mail, message de test sur la dépression).
--
-- À exécuter dans le SQL Editor Supabase :
-- https://supabase.com/dashboard/project/fobyvhulyjxwbhusouqz/sql

-- 1) Supprimer les résumés de session de test (messagerie, 26/07)
delete from ai_bible_sessions
where mode = 'messagerie'
  and created_at >= '2026-07-26'
  and created_at <  '2026-07-27'
  and (
    summary ilike '%dépression%'
    or summary ilike '%Moïse%'
    or summary ilike '%doléance%'
    or summary ilike '%mail%'
  );

-- 2) (Optionnel) Réinitialiser les centres d'intérêt pollués par les mots de test
--    pour le compte de Jaise. Adapter l'email si besoin.
update ai_user_preferences p
set fav_topics = '{}'
from profiles pr
where pr.id = p.user_id
  and pr.email = 'jaise.buka.dilu@gmail.com';

-- Vérification :
-- select created_at, summary from ai_bible_sessions where mode='messagerie' order by created_at desc;
