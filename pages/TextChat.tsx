import React, { useState, useRef, useEffect } from 'react';
import { NeuCard, NeuInput, NeuButton } from '../components/NeuComponents';
import { sendChatMessage } from '../services/geminiService';
import { Send, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

const TextChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: '¡Hola! Soy tu asistente espiritual. ¿En qué te puedo ayudar hoy? Puedo darte el texto diario de hoy, buscar textos bíblicos, o ayudarte a preparar discursos usando jw.org.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Format history for Gemini API (remove internal props like id/isError)
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const { text, grounding } = await sendChatMessage(history, userMsg.text);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: text,
        grounding: grounding
      };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, tuve un problema al conectar. Por favor intenta de nuevo.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <header className="mb-4 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-700">Asistente JW</h2>
        <p className="text-gray-500 text-sm">Texto diario, investigación y más</p>
      </header>

      <NeuCard className="flex-1 overflow-hidden flex flex-col !p-0 mb-4">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-neu-accent text-white rounded-br-none' 
                    : 'bg-neu-base shadow-[inset_2px_2px_5px_#c8ccd4] text-gray-700 rounded-bl-none border border-white/50'
                } ${msg.isError ? 'border-red-400 bg-red-50 text-red-600' : ''}`}
              >
                {msg.role === 'model' && (
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-xs font-bold uppercase tracking-wide">
                    <Sparkles size={12} /> Asistente
                  </div>
                )}
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 text-inherit">
                   <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-neu-base p-4 rounded-2xl rounded-bl-none shadow-[inset_2px_2px_5px_#c8ccd4] flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </NeuCard>

      <div className="flex space-x-2 flex-shrink-0">
        <NeuInput 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ej. ¿Cuál es el texto diario de hoy?"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <NeuButton onClick={handleSend} disabled={isLoading || !inputValue} className="w-16 flex items-center justify-center">
          <Send size={20} />
        </NeuButton>
      </div>
    </div>
  );
};

export default TextChat;