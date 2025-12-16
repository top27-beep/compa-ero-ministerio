import React, { useState } from 'react';
import { supabase, isConfigured } from '../services/supabaseClient';
import { NeuCard, NeuInput, NeuButton } from '../components/NeuComponents';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot_password';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      setMessage({ type: 'error', text: 'Error de configuración: Faltan las claves de Supabase en el código.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: '¡Registro exitoso! Por favor verifica tu correo electrónico si es necesario.' });
        // Optional: switch to login or stay to show message
        setTimeout(() => setMode('login'), 2000);
      } else if (mode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
             redirectTo: window.location.origin + '/#/auth?type=recovery',
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Se ha enviado un correo para restablecer tu contraseña.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Ocurrió un error inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-700 mb-2">Compañero Ministerio</h1>
          <p className="text-gray-500">Tu asistente personal para el servicio</p>
        </div>

        {!isConfigured && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertTriangle className="flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Falta Configuración:</strong>
              <p className="mt-1">
                Debes agregar tu <code>SUPABASE_URL</code> y <code>SUPABASE_ANON_KEY</code> en el archivo <code>services/supabaseClient.ts</code> para poder iniciar sesión.
              </p>
            </div>
          </div>
        )}

        <NeuCard>
          <h2 className="text-xl font-bold text-gray-700 mb-6 flex items-center gap-2">
            {mode === 'login' && <><LogIn size={20} className="text-neu-accent" /> Iniciar Sesión</>}
            {mode === 'register' && <><UserPlus size={20} className="text-neu-accent" /> Crear Cuenta</>}
            {mode === 'forgot_password' && <><KeyRound size={20} className="text-neu-accent" /> Recuperar Contraseña</>}
          </h2>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Correo Electrónico</label>
              <NeuInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                disabled={!isConfigured}
              />
            </div>

            {mode !== 'forgot_password' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Contraseña</label>
                <NeuInput
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  minLength={6}
                  disabled={!isConfigured}
                />
              </div>
            )}

            {message && (
              <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${message.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                {message.text}
              </div>
            )}

            <NeuButton disabled={loading || !isConfigured} className="w-full !mt-6 text-neu-accent">
              {loading ? <Loader2 className="animate-spin" /> : (
                mode === 'login' ? 'Entrar' : mode === 'register' ? 'Registrarse' : 'Enviar Correo'
              )}
            </NeuButton>
          </form>

          <div className="mt-6 flex flex-col space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => setMode('register')} className="text-gray-500 hover:text-neu-accent transition-colors">
                  ¿No tienes cuenta? <span className="font-bold">Regístrate</span>
                </button>
                <button type="button" onClick={() => setMode('forgot_password')} className="text-gray-400 hover:text-gray-600 text-xs">
                  Olvidé mi contraseña
                </button>
              </>
            )}
            
            {(mode === 'register' || mode === 'forgot_password') && (
              <button type="button" onClick={() => setMode('login')} className="text-gray-500 hover:text-neu-accent transition-colors">
                Volver al <span className="font-bold">Inicio de Sesión</span>
              </button>
            )}
          </div>
        </NeuCard>
      </div>
    </div>
  );
};

export default Auth;