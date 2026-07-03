SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('prieres', 'notes_bibliques', 'messages', 'groupes', 'membres_groupes')
ORDER BY table_name, ordinal_position;
