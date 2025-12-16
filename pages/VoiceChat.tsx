import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { NeuButton, NeuCard } from '../components/NeuComponents';
import { Mic, MicOff, Volume2, Radio } from 'lucide-react';

const SYSTEM_INSTRUCTION = `
Eres un compañero de ministerio amigable. 
Puedes practicar presentaciones conmigo o conversar sobre textos bíblicos.
Usa solo información de jw.org. Habla español de forma natural y cálida.
`;

// Audio Helpers (based on Google GenAI SDK documentation)
function createBlob(data: Float32Array): { data: string; mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);

    return {
        data: b64,
        mimeType: 'audio/pcm;rate=16000',
    };
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const VoiceChat: React.FC = () => {
    const [isActive, setIsActive] = useState(false);
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Refs for audio handling
    const inputContextRef = useRef<AudioContext | null>(null);
    const outputContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const stopSession = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(s => s.close()).catch(() => {});
            sessionPromiseRef.current = null;
        }
        
        // Clean up inputs
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceNodeRef.current) {
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        if (inputContextRef.current) {
            inputContextRef.current.close();
            inputContextRef.current = null;
        }

        // Clean up outputs
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
        if (outputContextRef.current) {
            outputContextRef.current.close();
            outputContextRef.current = null;
        }

        setIsActive(false);
        setStatus('disconnected');
        nextStartTimeRef.current = 0;
    };

    const startSession = async () => {
        setErrorMsg(null);
        setStatus('connecting');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Setup Audio Contexts
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            
            const outputNode = outputContextRef.current.createGain();
            outputNode.connect(outputContextRef.current.destination);

            // Get Mic Stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                    systemInstruction: SYSTEM_INSTRUCTION,
                },
                callbacks: {
                    onopen: () => {
                        console.log('Session opened');
                        setStatus('connected');
                        setIsActive(true);

                        // Setup Input Processing
                        if (!inputContextRef.current || !streamRef.current) return;
                        
                        const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
                        sourceNodeRef.current = source;
                        
                        const scriptProcessor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
                        processorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputContextRef.current.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputContextRef.current) {
                            try {
                                const ctx = outputContextRef.current;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                                
                                const audioBuffer = await decodeAudioData(
                                    decode(base64Audio),
                                    ctx,
                                    24000,
                                    1
                                );

                                const source = ctx.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputNode);
                                source.addEventListener('ended', () => {
                                    sourcesRef.current.delete(source);
                                });
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                sourcesRef.current.add(source);

                            } catch (e) {
                                console.error("Error processing audio message", e);
                            }
                        }
                        
                        if (msg.serverContent?.interrupted) {
                             sourcesRef.current.forEach(s => s.stop());
                             sourcesRef.current.clear();
                             nextStartTimeRef.current = 0;
                        }
                    },
                    onclose: () => {
                        console.log('Session closed');
                        stopSession();
                    },
                    onerror: (e) => {
                        console.error('Session error', e);
                        setErrorMsg("Error de conexión. Intenta de nuevo.");
                        stopSession();
                    }
                }
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (e) {
            console.error(e);
            setErrorMsg("No se pudo iniciar el audio. Verifica los permisos.");
            setStatus('disconnected');
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopSession();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-[70vh] space-y-8">
            <header className="text-center">
                <h2 className="text-2xl font-bold text-gray-700">Chat de Voz</h2>
                <p className="text-gray-500">Conversa y practica en tiempo real</p>
            </header>

            <NeuCard className="w-64 h-64 flex items-center justify-center rounded-full relative">
                <div className={`absolute inset-0 rounded-full transition-all duration-700 ${status === 'connected' ? 'animate-pulse bg-neu-accent/10' : ''}`} />
                {status === 'connecting' && <LoaderPulse />}
                {status === 'connected' && <VoiceVisualizer />}
                {status === 'disconnected' && <Radio size={64} className="text-gray-400" />}
            </NeuCard>

            <div className="flex flex-col items-center space-y-4">
                <p className="text-sm font-semibold text-gray-500 min-h-[20px]">
                    {status === 'connecting' && "Conectando..."}
                    {status === 'connected' && "Escuchando..."}
                    {status === 'disconnected' && "Toca para empezar"}
                    {errorMsg && <span className="text-red-500 block">{errorMsg}</span>}
                </p>

                <NeuButton 
                    onClick={isActive ? stopSession : startSession} 
                    active={isActive}
                    className="w-20 h-20 rounded-full flex items-center justify-center !p-0"
                >
                    {isActive ? <MicOff size={32} /> : <Mic size={32} />}
                </NeuButton>
            </div>
        </div>
    );
};

const LoaderPulse = () => (
    <div className="absolute w-full h-full rounded-full border-4 border-neu-accent/30 animate-spin border-t-neu-accent" />
);

const VoiceVisualizer = () => {
    // Simulated visualizer for UI feedback since actual audio analysis requires more complex AudioNode setup
    return (
        <div className="flex items-center space-x-1 h-12">
            {[1,2,3,4,5].map(i => (
                <div 
                    key={i} 
                    className="w-2 bg-neu-accent rounded-full animate-bounce" 
                    style={{ 
                        height: '100%', 
                        animationDuration: `${0.5 + Math.random() * 0.5}s`,
                        animationDelay: `${Math.random() * 0.2}s`
                    }} 
                />
            ))}
        </div>
    );
};

export default VoiceChat;