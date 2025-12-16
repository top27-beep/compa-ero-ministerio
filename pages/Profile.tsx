import React from 'react';
import { NeuCard, NeuButton } from '../components/NeuComponents';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Mail, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-700">Mi Perfil</h2>
        <p className="text-gray-500 text-sm">Gestiona tu cuenta</p>
      </header>

      <NeuCard className="flex flex-col items-center py-8">
        <div className="w-24 h-24 rounded-full bg-neu-base shadow-[inset_6px_6px_12px_#c8ccd4,inset_-6px_-6px_12px_#ffffff] flex items-center justify-center text-neu-accent mb-4">
            <User size={40} />
        </div>
        
        <h3 className="text-xl font-bold text-gray-700 truncate max-w-full px-4 text-center">
            {user?.email?.split('@')[0]}
        </h3>
        <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
            <Shield size={12} /> Usuario Autenticado
        </p>
      </NeuCard>

      <NeuCard className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-neu-base shadow-[inset_2px_2px_5px_#c8ccd4,inset_-2px_-2px_5px_#ffffff]">
            <div className="p-2 rounded-full bg-gray-200 text-gray-500">
                <Mail size={18} />
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-xs text-gray-500 uppercase font-bold">Correo Electrónico</p>
                <p className="text-gray-700 truncate">{user?.email}</p>
            </div>
        </div>

        <NeuButton onClick={handleLogout} className="w-full text-red-500 hover:text-red-600 mt-4">
            <LogOut size={20} className="mr-2" /> Cerrar Sesión
        </NeuButton>
      </NeuCard>
      
      <p className="text-center text-xs text-gray-400 mt-8">
        Compañero Ministerio v1.0
      </p>
    </div>
  );
};

export default Profile;