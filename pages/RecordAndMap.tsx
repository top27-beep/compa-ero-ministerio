import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NeuCard, NeuInput, NeuButton, NeuTextarea, NeuIconButton } from '../components/NeuComponents';
import { ServiceReport, DailyRecord, ServiceLogDB } from '../types';
import { MapPin, Save, Clock, Book, RotateCcw, Search, Loader2, GraduationCap, Trash2, Calendar, ChevronRight, Edit3, Play, Pause, CheckSquare, Square } from 'lucide-react';
import { findPreachingLocations } from '../services/geminiService';
import { reportService } from '../services/reportService';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';

const RecordAndMap: React.FC = () => {
  const { user } = useAuth();
  
  // --- Date Helpers ---
  const getMonthName = (date: Date) => {
    const month = date.toLocaleString('es-ES', { month: 'long' });
    const year = date.getFullYear();
    // Capitalize first letter
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`; 
  };

  const getCurrentDay = () => new Date().getDate();

  // Helper to construct YYYY-MM-DD from month string and day number
  // Format expectation: "Febrero 2024" -> requires parsing
  const constructDateString = (monthStr: string, day: number): string => {
    const parts = monthStr.split(' ');
    if (parts.length !== 2) return new Date().toISOString().split('T')[0];
    
    const monthNames = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const monthIndex = monthNames.indexOf(parts[0].toLowerCase());
    const year = parseInt(parts[1]);
    
    // Create date in UTC to avoid timezone shifts when formatting
    const d = new Date(Date.UTC(year, monthIndex, day));
    return d.toISOString().split('T')[0];
  };

  // Helper to parse "YYYY-MM-DD" back to { day, monthStr }
  const parseDateString = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      // Create date object (months are 0-indexed in JS Date)
      const dateObj = new Date(y, m - 1, d);
      return {
          day: d,
          monthStr: getMonthName(dateObj)
      };
  };

  // --- Service Record Logic ---
  const [history, setHistory] = useState<ServiceReport[]>([]); // Derived from DB data
  const [dbRecords, setDbRecords] = useState<ServiceLogDB[]>([]); // Raw DB data
  const [selectedDay, setSelectedDay] = useState<number>(getCurrentDay());
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // The UI needs a "Current Report" object to render the month view
  const [currentMonthStr, setCurrentMonthStr] = useState<string>(getMonthName(new Date()));

  // Derived state: Build the "ServiceReport" structure for the currently selected month from DB records
  const report: ServiceReport = useMemo(() => {
    const recordsForMonth = dbRecords.filter(r => {
        const parsed = parseDateString(r.fecha);
        return parsed.monthStr === currentMonthStr;
    });

    const dailyRecords: DailyRecord[] = recordsForMonth.map(r => {
        const parsed = parseDateString(r.fecha);
        return {
            day: parsed.day,
            hours: r.horario_servicio,
            placements: r.publicaciones,
            returnVisits: r.revisitas,
            bibleStudies: r.cursos_biblicos,
            notes: r.nota_del_dia,
            publicPlacesFound: r.encuentra_lugares_publicos
        };
    });

    return {
        month: currentMonthStr,
        hours: 0, // Calculated below
        placements: 0,
        videos: 0,
        returnVisits: 0,
        bibleStudies: 0,
        days: dailyRecords
    };
  }, [dbRecords, currentMonthStr]);

  // Calculate totals dynamically from the derived report
  const calculatedTotals = useMemo(() => {
    return report.days.reduce((acc, day) => ({
        hours: acc.hours + (day.hours || 0),
        placements: acc.placements + (day.placements || 0),
        returnVisits: acc.returnVisits + (day.returnVisits || 0),
        bibleStudies: acc.bibleStudies + (day.bibleStudies || 0), 
    }), { hours: 0, placements: 0, returnVisits: 0, bibleStudies: 0 });
  }, [report]);

  // --- Data Loading ---
  const loadData = async () => {
    if (!user) return;
    setIsLoadingData(true);
    try {
        const records = await reportService.getAllReports();
        setDbRecords(records);
        
        // Calculate history (unique months) for the sidebar/list
        const months = new Set<string>();
        records.forEach(r => {
            const parsed = parseDateString(r.fecha);
            months.add(parsed.monthStr);
        });
        
        // Build history summaries
        const hist: ServiceReport[] = Array.from(months).map(m => {
            const recs = records.filter(r => parseDateString(r.fecha).monthStr === m);
            const totalH = recs.reduce((sum, r) => sum + r.horario_servicio, 0);
            const totalP = recs.reduce((sum, r) => sum + r.publicaciones, 0);
            return {
                month: m,
                hours: totalH,
                placements: totalP,
                videos: 0,
                returnVisits: 0,
                bibleStudies: 0,
                days: []
            };
        });
        setHistory(hist);

    } catch (error) {
        console.error("Error loading reports:", error);
        alert("Error cargando historial.");
    } finally {
        setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // --- Interaction Logic ---

  // Get current day object or default
  const currentDayRecord: DailyRecord = useMemo(() => {
    return report.days.find(d => d.day === selectedDay) || {
        day: selectedDay,
        hours: 0,
        placements: 0,
        returnVisits: 0,
        bibleStudies: 0,
        notes: '',
        publicPlacesFound: false
    };
  }, [report, selectedDay]);

  // Update Local State (Immediate Feedback)
  const updateDailyRecord = (field: keyof DailyRecord, value: any) => {
      // We need to simulate the update in dbRecords to reflect in UI immediately
      const dateStr = constructDateString(currentMonthStr, selectedDay);
      
      setDbRecords(prev => {
          const existingIndex = prev.findIndex(r => r.fecha === dateStr);
          
          // Helper to map DailyRecord fields to ServiceLogDB fields
          const mapToDB = (curr: DailyRecord): ServiceLogDB => ({
              user_id: user?.id || '',
              fecha: dateStr,
              horario_servicio: curr.hours,
              publicaciones: curr.placements,
              cursos_biblicos: curr.bibleStudies,
              revisitas: curr.returnVisits,
              nota_del_dia: curr.notes,
              encuentra_lugares_publicos: curr.publicPlacesFound || false
          });

          // Create a merged object
          const updatedLocal: DailyRecord = { ...currentDayRecord, [field]: value };
          const newDbRow = mapToDB(updatedLocal);

          if (existingIndex >= 0) {
              const newRecs = [...prev];
              newRecs[existingIndex] = { ...newRecs[existingIndex], ...newDbRow };
              return newRecs;
          } else {
              return [...prev, newDbRow];
          }
      });
  };

  const saveDay = async () => {
      if (!user) return;
      setIsSaving(true);
      try {
          const dateStr = constructDateString(currentMonthStr, selectedDay);
          
          // Prepare payload
          const payload: ServiceLogDB = {
              user_id: user.id,
              fecha: dateStr,
              horario_servicio: currentDayRecord.hours || 0,
              publicaciones: currentDayRecord.placements || 0,
              cursos_biblicos: currentDayRecord.bibleStudies || 0,
              revisitas: currentDayRecord.returnVisits || 0,
              nota_del_dia: currentDayRecord.notes || '',
              encuentra_lugares_publicos: currentDayRecord.publicPlacesFound || false
          };

          await reportService.saveDailyReport(payload);
          // Refresh data to ensure sync (optional, but safer)
          await loadData();
          alert("Guardado exitosamente.");
      } catch (e) {
          console.error(e);
          alert("Error al guardar.");
      } finally {
          setIsSaving(false);
      }
  };

  const deleteDay = async () => {
      if (!confirm(`¿Borrar datos del día ${selectedDay}?`)) return;
      setIsSaving(true);
      try {
          const dateStr = constructDateString(currentMonthStr, selectedDay);
          await reportService.deleteDailyReport(dateStr);
          
          // Remove from local state immediately
          setDbRecords(prev => prev.filter(r => r.fecha !== dateStr));
          
          alert("Día reiniciado.");
      } catch (e) {
          alert("Error al borrar.");
      } finally {
          setIsSaving(false);
      }
  };

  const switchToHistoryMonth = (m: string) => {
      setCurrentMonthStr(m);
      setSelectedDay(1); // Reset to first of month
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const switchToCurrent = () => {
      setCurrentMonthStr(getMonthName(new Date()));
      setSelectedDay(getCurrentDay());
  }

  // --- Timer Logic (Unchanged but connected to updateDailyRecord) ---
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setIsTimerActive(false);
  }, [selectedDay]);

  useEffect(() => {
    if (isTimerActive) {
        timerRef.current = setInterval(() => {
             // Add 1 second
             const currentH = currentDayRecord.hours || 0;
             updateDailyRecord('hours', currentH + (1/3600));
        }, 1000);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerActive, currentDayRecord, selectedDay]); // Depends on currentDayRecord to get latest state

  const toggleTimer = () => setIsTimerActive(!isTimerActive);
  
  // Format helpers
  const formatTotalHours = (totalHours: number) => {
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };
  
  const getHoursParts = (decimalHours: number) => {
    const totalSeconds = Math.round(decimalHours * 3600);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  };

  const updateHoursFromParts = (part: 'h'|'m'|'s', value: number) => {
    const current = getHoursParts(currentDayRecord.hours || 0);
    const newParts = { ...current, [part]: value };
    const newDecimal = newParts.h + (newParts.m / 60) + (newParts.s / 3600);
    updateDailyRecord('hours', newDecimal);
  };

  const timeParts = getHoursParts(currentDayRecord.hours || 0);
  const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);
  const isCurrentMonth = currentMonthStr === getMonthName(new Date());

  // --- Map Logic (Unchanged) ---
  const [mapQuery, setMapQuery] = useState('');
  const [mapResult, setMapResult] = useState<{ text: string; grounding?: any } | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const handleFindTerritory = async () => {
    if (!navigator.geolocation) return alert("Geolocalización no soportada.");
    setMapLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const data = await findPreachingLocations(mapQuery, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMapResult(data);
      } catch (e) { alert("Error buscando territorio."); } 
      finally { setMapLoading(false); }
    });
  };

  return (
    <div className="space-y-6 pb-24">
       <header className="flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-gray-700">Informe</h2>
            <p className="text-neu-accent font-semibold capitalize">{currentMonthStr}</p>
        </div>
        {!isCurrentMonth && (
            <NeuButton onClick={switchToCurrent} className="px-3 py-2 text-sm">
                Ir a Hoy
            </NeuButton>
        )}
      </header>

      {/* Monthly Summary Cards */}
      <div className="bg-neu-base rounded-2xl p-4 shadow-[inset_4px_4px_8px_#c8ccd4,inset_-4px_-4px_8px_#ffffff]">
          {isLoadingData ? (
             <div className="flex justify-center p-2"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : (
            <div className="flex justify-between text-center divide-x divide-gray-300">
                <div className="px-2 w-1/4">
                    <div className="text-xl font-bold text-gray-700">{formatTotalHours(calculatedTotals.hours)}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Horas</div>
                </div>
                <div className="px-2 w-1/4">
                    <div className="text-xl font-bold text-green-600">{calculatedTotals.placements}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Pub.</div>
                </div>
                <div className="px-2 w-1/4">
                    <div className="text-xl font-bold text-blue-600">{calculatedTotals.bibleStudies}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Est.</div>
                </div>
                <div className="px-2 w-1/4">
                    <div className="text-xl font-bold text-orange-600">{calculatedTotals.returnVisits}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Rev.</div>
                </div>
            </div>
          )}
      </div>

      <hr className="border-gray-300 opacity-50" />

      {/* Day Selector */}
      <div className="relative">
          <div className="flex overflow-x-auto pb-4 pt-2 space-x-3 hide-scrollbar snap-x">
              {daysArray.map(day => {
                  const isActive = day === selectedDay;
                  const hasData = report.days?.some(d => d.day === day && (d.hours > 0 || d.placements > 0 || d.notes));
                  return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`
                            flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg snap-center transition-all duration-200
                            ${isActive 
                                ? 'bg-neu-base text-neu-accent shadow-[inset_4px_4px_8px_#c8ccd4,inset_-4px_-4px_8px_#ffffff]' 
                                : hasData 
                                    ? 'bg-neu-base text-gray-700 shadow-[4px_4px_8px_#c8ccd4,-4px_-4px_8px_#ffffff] border border-neu-accent/30'
                                    : 'bg-neu-base text-gray-400 shadow-[4px_4px_8px_#c8ccd4,-4px_-4px_8px_#ffffff]'
                            }
                        `}
                      >
                          {day}
                      </button>
                  )
              })}
          </div>
          <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-neu-base to-transparent pointer-events-none" />
      </div>

      {/* Daily Input Section */}
      <div className="animate-fade-in">
        <h3 className="text-gray-500 font-bold mb-4 flex items-center gap-2">
            <Edit3 size={16} /> Actividad del Día {selectedDay}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Hours */}
            <NeuCard className="flex flex-col items-center justify-center p-3 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                    <button onClick={toggleTimer} className={`p-2 rounded-full transition-all ${isTimerActive ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                        {isTimerActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                </div>
                <Clock className={`mb-2 transition-colors ${isTimerActive ? 'text-green-500 animate-pulse' : 'text-neu-accent'}`} />
                <span className="text-xs text-gray-500 mb-2">Horas : Min : Seg</span>
                <div className="flex items-center space-x-1 w-full justify-center">
                    <NeuInput type="number" value={timeParts.h} onChange={(e) => updateHoursFromParts('h', parseInt(e.target.value) || 0)} className="text-center font-bold text-lg p-1 w-12 h-10 !px-0" placeholder="HH" />
                    <span className="font-bold text-gray-400">:</span>
                    <NeuInput type="number" value={timeParts.m} onChange={(e) => updateHoursFromParts('m', parseInt(e.target.value) || 0)} className="text-center font-bold text-lg p-1 w-12 h-10 !px-0" placeholder="MM" />
                     <span className="font-bold text-gray-400">:</span>
                    <NeuInput type="number" value={timeParts.s} onChange={(e) => updateHoursFromParts('s', parseInt(e.target.value) || 0)} className="text-center font-bold text-xs p-1 w-10 h-10 !px-0 text-gray-500" placeholder="SS" />
                </div>
            </NeuCard>

            <NeuCard className="flex flex-col items-center justify-center p-4">
                <Book className="text-green-500 mb-2" />
                <span className="text-xs text-gray-500 mb-1">Publicaciones</span>
                <NeuInput type="number" value={currentDayRecord.placements || ''} placeholder="0" onChange={(e) => updateDailyRecord('placements', parseInt(e.target.value) || 0)} className="text-center font-bold text-lg" />
            </NeuCard>
            <NeuCard className="flex flex-col items-center justify-center p-4">
                <GraduationCap className="text-blue-500 mb-2" />
                <span className="text-xs text-gray-500 mb-1">Cursos Bíblicos</span>
                <NeuInput type="number" value={currentDayRecord.bibleStudies || ''} placeholder="0" onChange={(e) => updateDailyRecord('bibleStudies', parseInt(e.target.value) || 0)} className="text-center font-bold text-lg" />
            </NeuCard>
            <NeuCard className="flex flex-col items-center justify-center p-4">
                <RotateCcw className="text-orange-500 mb-2" />
                <span className="text-xs text-gray-500 mb-1">Revisitas</span>
                <NeuInput type="number" value={currentDayRecord.returnVisits || ''} placeholder="0" onChange={(e) => updateDailyRecord('returnVisits', parseInt(e.target.value) || 0)} className="text-center font-bold text-lg" />
            </NeuCard>
        </div>

        <NeuCard className="p-4 space-y-3">
            <span className="text-xs text-gray-500 block font-semibold">Notas del día {selectedDay}</span>
            <NeuTextarea 
                placeholder="Ej. Prediqué en parque, hablé con Juan..."
                rows={2}
                value={currentDayRecord.notes || ''}
                onChange={(e) => updateDailyRecord('notes', e.target.value)}
            />
            {/* New: Public Places Toggle */}
            <div 
                className="flex items-center gap-2 cursor-pointer text-gray-600"
                onClick={() => updateDailyRecord('publicPlacesFound', !currentDayRecord.publicPlacesFound)}
            >
                {currentDayRecord.publicPlacesFound 
                    ? <CheckSquare className="text-neu-accent" size={20} /> 
                    : <Square className="text-gray-400" size={20} />
                }
                <span className="text-sm">Encontré lugar público adecuado</span>
            </div>
        </NeuCard>
      </div>

      <div className="flex space-x-3 pt-4">
          <NeuButton onClick={saveDay} disabled={isSaving} className="flex-1 text-neu-accent">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} 
            Guardar Día
          </NeuButton>
          <NeuButton onClick={deleteDay} disabled={isSaving} className="text-red-500">
            <Trash2 size={18} />
          </NeuButton>
      </div>

      {/* History List */}
      <div className="pt-6">
          <h3 className="text-gray-500 font-bold mb-4 flex items-center gap-2">
              <Calendar size={18} /> Historial
          </h3>
          <div className="space-y-3">
              {history.length === 0 && <p className="text-sm text-gray-400">No hay historial aún.</p>}
              {history.map((hist, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => switchToHistoryMonth(hist.month)}
                    className={`
                        cursor-pointer p-4 rounded-xl flex justify-between items-center transition-all
                        ${hist.month === currentMonthStr ? 'bg-neu-base shadow-[inset_4px_4px_8px_#c8ccd4,inset_-4px_-4px_8px_#ffffff]' : 'bg-neu-base shadow-[4px_4px_8px_#c8ccd4,-4px_-4px_8px_#ffffff] hover:scale-[1.02]'}
                    `}
                  >
                      <div className="flex flex-col">
                          <span className="font-bold text-gray-700 capitalize">{hist.month}</span>
                          <span className="text-xs text-gray-500">
                              Total: {formatTotalHours(hist.hours)}h • {hist.placements} pub
                          </span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                  </div>
              ))}
          </div>
      </div>

      <hr className="border-gray-300 opacity-50 my-6" />

      {/* Map Section */}
      <header>
        <h2 className="text-2xl font-bold text-gray-700">Explorar Territorio</h2>
        <p className="text-gray-500 text-sm">Encuentra lugares públicos cercanos</p>
      </header>

      <NeuCard>
          <div className="flex space-x-2">
            <NeuInput 
                placeholder="Ej. Parques tranquilos, Paradas de bus..."
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
            />
             <NeuButton onClick={handleFindTerritory} disabled={mapLoading} className="w-16 flex items-center justify-center">
               {mapLoading ? <Loader2 className="animate-spin" /> : <MapPin size={20} />}
            </NeuButton>
          </div>
      </NeuCard>

      {mapResult && (
           <div className="space-y-4">
               <NeuCard className="prose prose-slate max-w-none text-gray-700 bg-neu-base">
                  <ReactMarkdown>{mapResult.text}</ReactMarkdown>
               </NeuCard>
           </div>
      )}

    </div>
  );
};

export default RecordAndMap;