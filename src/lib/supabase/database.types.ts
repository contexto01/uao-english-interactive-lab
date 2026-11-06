export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          role: 'student' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          role?: 'student' | 'admin';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          role?: 'student' | 'admin';
          created_at?: string;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          user_id: string;
          challenge_id: string;
          completed: boolean;
          best_score: number;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          challenge_id: string;
          completed?: boolean;
          best_score?: number;
          completed_at?: string;
        };
        Update: {
          user_id?: string;
          challenge_id?: string;
          completed?: boolean;
          best_score?: number;
          completed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_challenge: {
        Args: { p_challenge_id: string; p_score: number };
        Returns: { challenge_id: string; best_score: number; completed_at: string }[];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
