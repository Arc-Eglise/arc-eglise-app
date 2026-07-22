-- Créer la table pour les informations de l'église
-- Cette table centralise TOUTES les données statiques de l'église
-- qui s'affichent sur le site vitrine

CREATE TABLE IF NOT EXISTS church_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IDENTITÉ
  church_name TEXT NOT NULL DEFAULT 'Ambassade du Royaume de Christ',
  church_acronym TEXT NOT NULL DEFAULT 'ARC',
  church_description TEXT NOT NULL DEFAULT 'Une communauté évangélique vivante, fondée sur la Parole de Dieu, ouverte à toutes les nations.',
  
  -- ADRESSE & LOCALISATION
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Suisse',
  coordinates_lat DECIMAL(10, 8),
  coordinates_lng DECIMAL(11, 8),
  
  -- HORAIRES
  sunday_service_time TEXT NOT NULL DEFAULT '09:30',
  sunday_service_location TEXT,
  wednesday_time TEXT,
  wednesday_activity TEXT,
  friday_time TEXT,
  friday_activity TEXT,
  
  -- CONTACT
  main_phone TEXT,
  main_email TEXT,
  contact_form_email TEXT,
  
  -- RÉSEAUX SOCIAUX
  facebook_url TEXT,
  youtube_url TEXT,
  instagram_url TEXT,
  whatsapp_number TEXT,
  
  -- STATISTIQUES AFFICHÉES SUR LE SITE
  total_members INTEGER DEFAULT 0,
  total_nations INTEGER DEFAULT 0,
  founded_year INTEGER DEFAULT 2018,
  
  -- LEADERSHIP
  pastor_name TEXT,
  pastor_title TEXT,
  pastor_quote TEXT,
  
  -- CONFIGURATION SITE
  primary_color TEXT DEFAULT '#1e2464',
  secondary_color TEXT DEFAULT '#C9A227',
  
  -- MÉTADONNÉES
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE church_info ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture publique (lecture seule pour tout le monde)
CREATE POLICY "church_info_public_read"
  ON church_info FOR SELECT
  USING (true);

-- Policy: Modification admin uniquement
CREATE POLICY "church_info_admin_update"
  ON church_info FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'authenticated' AND 
         (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Insérer les données initiales
INSERT INTO church_info (
  address,
  city,
  postal_code,
  country,
  main_email,
  contact_form_email,
  youtube_url,
  pastor_name,
  pastor_title,
  pastor_quote,
  total_members,
  total_nations,
  founded_year
) VALUES (
  'Av. Charles-Naine 39',
  'La Chaux-de-Fonds',
  '2300',
  'Suisse',
  'contact@arc-eglise.ch',
  'contact@arc-eglise.ch',
  'https://www.youtube.com/channel/UCCpYN5EF_OONd-m3u1wBvYg',
  'Pedro Obova',
  'Pasteur Principal',
  'Construisons des générations de disciples qui influencent positivement leur environnement.',
  250,
  32,
  2018
) ON CONFLICT DO NOTHING;

-- Index pour les recherches courantes
CREATE INDEX idx_church_info_city ON church_info(city);
CREATE INDEX idx_church_info_updated_at ON church_info(updated_at DESC);
