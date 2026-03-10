/**
 * Database type definitions — mirrors the Supabase schema.
 * Keep in sync with supabase/migrations/001_initial_schema.sql
 */

export interface Database {
  public: {
    Tables: {
      water_logs: {
        Row:    { id: string; date: string; oz: number; logged_at: string; created_at: string }
        Insert: { id?: string; date: string; oz: number; logged_at?: string; created_at?: string }
        Update: { id?: string; date?: string; oz?: number; logged_at?: string; created_at?: string }
      }
      water_goals: {
        Row:    { id: string; daily_goal_oz: number; effective_from: string; created_at: string }
        Insert: { id?: string; daily_goal_oz: number; effective_from?: string; created_at?: string }
        Update: { id?: string; daily_goal_oz?: number; effective_from?: string; created_at?: string }
      }
      workout_sessions: {
        Row:    { id: string; date: string; name: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; date: string; name?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: string; date?: string; name?: string | null; notes?: string | null; created_at?: string }
      }
      exercise_library: {
        Row:    { id: string; name: string; category: string | null; notes: string | null; created_at: string }
        Insert: { id?: string; name: string; category?: string | null; notes?: string | null; created_at?: string }
        Update: { id?: string; name?: string; category?: string | null; notes?: string | null; created_at?: string }
      }
      workout_exercises: {
        Row:    { id: string; session_id: string; exercise_id: string; order: number; created_at: string }
        Insert: { id?: string; session_id: string; exercise_id: string; order?: number; created_at?: string }
        Update: { id?: string; session_id?: string; exercise_id?: string; order?: number; created_at?: string }
      }
      exercise_sets: {
        Row:    { id: string; workout_exercise_id: string; set_number: number; reps: number | null; weight_lbs: number | null; created_at: string }
        Insert: { id?: string; workout_exercise_id: string; set_number: number; reps?: number | null; weight_lbs?: number | null; created_at?: string }
        Update: { id?: string; workout_exercise_id?: string; set_number?: number; reps?: number | null; weight_lbs?: number | null; created_at?: string }
      }
      cardio_entries: {
        Row:    { id: string; session_id: string; type: string; duration_minutes: number; distance_miles: number | null; created_at: string }
        Insert: { id?: string; session_id: string; type: string; duration_minutes: number; distance_miles?: number | null; created_at?: string }
        Update: { id?: string; session_id?: string; type?: string; duration_minutes?: number; distance_miles?: number | null; created_at?: string }
      }
      fruit_logs: {
        Row:    { id: string; date: string; item_name: string; servings: number; created_at: string }
        Insert: { id?: string; date: string; item_name: string; servings?: number; created_at?: string }
        Update: { id?: string; date?: string; item_name?: string; servings?: number; created_at?: string }
      }
      vegetable_logs: {
        Row:    { id: string; date: string; item_name: string; servings: number; created_at: string }
        Insert: { id?: string; date: string; item_name: string; servings?: number; created_at?: string }
        Update: { id?: string; date?: string; item_name?: string; servings?: number; created_at?: string }
      }
      vitamin_definitions: {
        Row:    { id: string; name: string; active: boolean; created_at: string }
        Insert: { id?: string; name: string; active?: boolean; created_at?: string }
        Update: { id?: string; name?: string; active?: boolean; created_at?: string }
      }
      vitamin_logs: {
        Row:    { id: string; date: string; vitamin_id: string; taken: boolean; created_at: string }
        Insert: { id?: string; date: string; vitamin_id: string; taken?: boolean; created_at?: string }
        Update: { id?: string; date?: string; vitamin_id?: string; taken?: boolean; created_at?: string }
      }
      habit_overrides: {
        Row:    { id: string; date: string; habit_key: string; value: boolean; created_at: string }
        Insert: { id?: string; date: string; habit_key: string; value: boolean; created_at?: string }
        Update: { id?: string; date?: string; habit_key?: string; value?: boolean; created_at?: string }
      }
      flashcards: {
        Row:    { id: string; french: string; english: string; pronunciation_note: string | null; created_at: string }
        Insert: { id?: string; french: string; english: string; pronunciation_note?: string | null; created_at?: string }
        Update: { id?: string; french?: string; english?: string; pronunciation_note?: string | null; created_at?: string }
      }
      review_logs: {
        Row:    { id: string; card_id: string; direction: 'fr_to_en' | 'en_to_fr'; rating: 'again' | 'hard' | 'good' | 'easy'; reviewed_at: string; next_review_at: string; ease_factor: number; created_at: string }
        Insert: { id?: string; card_id: string; direction: 'fr_to_en' | 'en_to_fr'; rating: 'again' | 'hard' | 'good' | 'easy'; reviewed_at?: string; next_review_at: string; ease_factor?: number; created_at?: string }
        Update: { id?: string; card_id?: string; direction?: 'fr_to_en' | 'en_to_fr'; rating?: 'again' | 'hard' | 'good' | 'easy'; reviewed_at?: string; next_review_at?: string; ease_factor?: number; created_at?: string }
      }
      mood_checkins: {
        Row:    { id: string; date: string; period: 'morning' | 'evening'; energy_level: number; emotion: string; intention: string | null; reflection: string | null; gratitude: string | null; logged_at: string; created_at: string }
        Insert: { id?: string; date: string; period: 'morning' | 'evening'; energy_level: number; emotion: string; intention?: string | null; reflection?: string | null; gratitude?: string | null; logged_at?: string; created_at?: string }
        Update: { id?: string; date?: string; period?: 'morning' | 'evening'; energy_level?: number; emotion?: string; intention?: string | null; reflection?: string | null; gratitude?: string | null; logged_at?: string; created_at?: string }
      }
    }
  }
}

// Convenience row types — use these throughout the app
type Tables = Database['public']['Tables']
export type WaterLog          = Tables['water_logs']['Row']
export type WaterGoal         = Tables['water_goals']['Row']
export type WorkoutSession    = Tables['workout_sessions']['Row']
export type ExerciseLibrary   = Tables['exercise_library']['Row']
export type WorkoutExercise   = Tables['workout_exercises']['Row']
export type ExerciseSet       = Tables['exercise_sets']['Row']
export type CardioEntry       = Tables['cardio_entries']['Row']
export type FruitLog          = Tables['fruit_logs']['Row']
export type VegetableLog      = Tables['vegetable_logs']['Row']
export type VitaminDefinition = Tables['vitamin_definitions']['Row']
export type VitaminLog        = Tables['vitamin_logs']['Row']
export type HabitOverride     = Tables['habit_overrides']['Row']
export type Flashcard         = Tables['flashcards']['Row']
export type ReviewLog         = Tables['review_logs']['Row']
export type MoodCheckin       = Tables['mood_checkins']['Row']
