export type UserRole = "admin" | "pasteur" | "membre" | "visiteur";

export interface Profile {
  id:           string;
  email:        string;
  first_name:   string | null;
  last_name:    string | null;
  role:         UserRole;
  groups:       string[];
  validated:    boolean;
  validated_by: string | null;
  validated_at: string | null;
  phone:        string | null;
  country:      string | null;
  avatar_url:   string | null;
  bio:          string | null;
  created_at:   string;
  updated_at:   string;
}

export interface Sermon {
  id:           string;
  title:        string;
  pastor:       string;
  reference:    string | null;
  series:       string | null;
  excerpt:      string | null;
  youtube_id:   string | null;
  date:         string;
  is_featured:  boolean;
  is_published: boolean;
  created_by:   string | null;
  created_at:   string;
  updated_at:   string;
}

export interface ArcEvent {
  id:           string;
  title:        string;
  description:  string | null;
  date:         string;
  time_start:   string;
  time_end:     string | null;
  location:     string;
  capacity:     number | null;
  price_chf:    number;
  tags:         string[];
  is_public:    boolean;
  is_published: boolean;
  created_by:   string | null;
  created_at:   string;
  updated_at:   string;
  registrations_count?: number;
}

export interface TeamMember {
  id:         string;
  name:       string;
  role_label: string;
  bio:        string | null;
  initials:   string;
  avatar_url: string | null;
  sort_order: number;
  is_active:  boolean;
  created_at: string;
}
