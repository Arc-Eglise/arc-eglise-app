"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "pasteur" | "membre" | "visiteur" | null;

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: UserRole;
  groups: string[];
  validated: boolean;
  avatar_url: string | null;
}

export function useUser() {
  const supabase = createClient();
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role, groups, validated, avatar_url")
        .eq("id", userId)
        .single();
      setProfile(data ?? null);
    };

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchProfile(user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const isAdmin    = profile?.role === "admin";
  const isPasteur  = profile?.role === "pasteur" || isAdmin;
  const isMembre   = profile?.validated === true || isPasteur;
  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email
    : null;

  return { user, profile, loading, signOut, isAdmin, isPasteur, isMembre, displayName };
}
