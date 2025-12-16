import React, { useState } from 'react';
import { NeuCard, NeuInput, NeuButton } from '../components/NeuComponents';
import { generatePresentations } from '../services/geminiService';
import { Search, BookOpen, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const Presentations: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [result, setResult] = useState<{ text: string; grounding?: any } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await generatePresentations(topic);
      setResult(data);
    } catch (error) {
      alert("Error al conectar con Gemini. Verifica tu conexión o clave API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-700">Presentaciones</h2>
        <p className="text-gray-500 text-sm">Ideas basadas en jw.org</p>
      </header>

      <NeuCard>
        <div className="flex flex-col space-y-4">
          <label className="text-gray-600 font-medium">¿De qué quieres hablar hoy?</label>
          <div className="flex space-x-2">
            <NeuInput 
              placeholder="Ej. El sufrimiento, La familia, Noticias recientes..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <NeuButton onClick={handleGenerate} disabled={loading || !topic} className="w-16 flex items-center justify-center">
               {loading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            </NeuButton>
          </div>
        </div>
      </NeuCard>

      {result && (
        <div className="animate-fade-in space-y-6">
            <NeuCard className="prose prose-slate max-w-none text-gray-700 bg-neu-base">
                 <ReactMarkdown>{result.text}</ReactMarkdown>
            </NeuCard>
        </div>
      )}
    </div>
  );
};

export default Presentations;