import React from 'react';

export interface DailyRecord {
  day: number;
  hours: number;
  placements: number;
  returnVisits: number;
  bibleStudies: number;
  notes: string;
  // New field mapped from DB
  publicPlacesFound?: boolean;
}

// Interface for the Supabase Table Row
export interface ServiceLogDB {
  id?: string;
  user_id: string;
  fecha: string; // YYYY-MM-DD
  horario_servicio: number;
  publicaciones: number;
  cursos_biblicos: number;
  revisitas: number;
  nota_del_dia: string;
  encuentra_lugares_publicos: boolean;
  created_at?: string;
}

export interface ServiceReport {
  month: string;
  // Totals (now calculated from days, but kept for caching/display)
  hours: number;
  placements: number; // Publicaciones
  videos: number; // Legacy field, kept for compatibility
  returnVisits: number; // Revisitas
  bibleStudies: number; // Cursos Bíblicos
  days: DailyRecord[]; // Array of daily activity
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  grounding?: any; // For search sources
}

export enum AppRoute {
  PRESENTATIONS = 'presentations',
  RECORD = 'record',
  VOICE = 'voice',
  CHAT = 'chat'
}

// Neumorphic common props
export interface NeuProps {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}