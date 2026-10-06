import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, X, Lock } from 'lucide-react';
import { AppUser } from '../../types';
import { getValidAccessKeys } from '../../utils/authUtils';

interface AccessKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  onSuccess: (user: AppUser) => void;
  onRegisterUser: (newUser: AppUser) => void;
}

export const AccessKeyModal: React.FC<AccessKeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnlockWithKey = (keyToTry: string) => {
    setError(null);
    const cleanKey = keyToTry.trim().toLowerCase();
    const validKeys = getValidAccessKeys();

    if (!validKeys.includes(cleanKey)) {
      setError('Clave de acceso incorrecta. Ingrese la clave corporativa autorizada.');
      return;
    }

    const now = new Date().toLocaleString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const activeUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: cleanKey === 'stolok' ? 'Operador Autorizado' : 'Auditor Líder',
      email: cleanKey === 'stolok' ? 'stolok@stol.com' : 'cd.stol.039@gmail.com',
      role: 'uploader',
      roleTitle: 'Operador de Carga Autorizado',
      department: 'Operaciones & Auditoría',
      canUpload: true,
      canEdit: true,
      canExport: true,
      lastLogin: now,
      accessCount: 1,
    };

    setSuccessMsg('¡Clave correcta! Acceso desbloqueado para carga masiva y gestión.');
    setTimeout(() => {
      onSuccess(activeUser);
      onClose();
      setAccessKey('');
      setError(null);
      setSuccessMsg(null);
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUnlockWithKey(accessKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A1A2E] to-[#1E293B] text-white px-5 py-4 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-900 shadow-md">
              <KeyRound className="w-5 h-5 font-black" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide text-white uppercase">
                Desbloqueo de Acceso Corporativo
              </h3>
              <p className="text-[11px] text-slate-300">
                Permisos de carga de datos, edición y gestión
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-50 border-2 border-rose-300 text-rose-800 p-3 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-900 mb-1.5">
              Ingrese su Contraseña Corporativa <span className="text-amber-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="Ingrese contraseña corporativa..."
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border-2 border-slate-300 bg-slate-50 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Validar y Desbloquear</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
