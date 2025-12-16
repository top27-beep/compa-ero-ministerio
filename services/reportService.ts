import { supabase } from './supabaseClient';
import { ServiceLogDB } from '../types';

export const reportService = {
  /**
   * Fetch all reports for the current user
   */
  async getAllReports() {
    const { data, error } = await supabase
      .from('informes_servicio')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) throw error;
    return data as ServiceLogDB[];
  },

  /**
   * Upsert (Insert or Update) a daily report
   * Requires a unique constraint on (user_id, fecha) in the database
   */
  async saveDailyReport(report: ServiceLogDB) {
    const { data, error } = await supabase
      .from('informes_servicio')
      .upsert(report, { onConflict: 'user_id, fecha' })
      .select();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a report for a specific date
   */
  async deleteDailyReport(date: string) {
      const { error } = await supabase
        .from('informes_servicio')
        .delete()
        .eq('fecha', date);
      
      if (error) throw error;
  }
};