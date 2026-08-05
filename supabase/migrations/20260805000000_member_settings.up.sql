-- Réglages personnels du membre (modale Paramètres : notifs, confidentialité,
-- langue, Bible). Persistance réelle — remplace les faux « Sauvegarder ».
alter table public.profiles add column if not exists member_settings jsonb;
