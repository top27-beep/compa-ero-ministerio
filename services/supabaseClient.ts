import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANTE: Reemplaza estos valores con los de tu proyecto en Supabase
// Ve a: https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://ycvwhfpvrwfizbeaayix.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_k-VR_78j-97yFsCjIONCJA_jh3hKm87';

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

// Si la URL no es válida (o es el placeholder), usamos una URL ficticia válida en formato
// para evitar que la aplicación se rompa al iniciar (crash "Invalid supabaseUrl").
const urlToUse = isValidUrl(SUPABASE_URL) ? SUPABASE_URL : 'https://tu-proyecto.supabase.co';
const keyToUse = SUPABASE_ANON_KEY;

export const supabase = createClient(urlToUse, keyToUse);

// Helper para saber si el usuario ya configuró las claves
export const isConfigured = isValidUrl(SUPABASE_URL) && !SUPABASE_URL.includes('PEGAR_TU');