import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Check,
  Eye,
  EyeOff,
  Upload,
  Plus,
  Trash2,
  UserCheck,
  KeyRound,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppUser, UserRole } from '../../types';
import { getPrimaryPasswordDisplay, setCustomAccessPassword } from '../../utils/authUtils';

interface RoleManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: AppUser[];
  currentUser: AppUser;
  onSelectCurrentUser: (user: AppUser) => void;
  onUpdateUsers: (users: AppUser[]) => void;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectCurrentUser,
  onUpdateUsers,
}) => {
  const [userList, setUserList] = useState<AppUser[]>(users);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('uploader');
  const [newDepartment, setNewDepartment] = useState('Almacén Central');

  // Password state
  const [currentPass, setCurrentPass] = useState(getPrimaryPasswordDisplay());
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess(null);
    setPassError(null);

    if (!newPass || newPass.trim().length < 4) {
      setPassError('La nueva clave debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden.');
      return;
    }

    const ok = setCustomAccessPassword(newPass.trim());
    if (ok) {
      setCurrentPass(newPass.trim());
      setPassSuccess('¡Contraseña corporativa actualizada con éxito!');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(null), 5000);
    } else {
      setPassError('Error al guardar la contraseña.');
    }
  };

  const handleToggleUpload = (id: string) => {
    const updated: AppUser[] = userList.map((u) => {
      if (u.id === id) {
        const nextUpload = !u.canUpload;
        const nextRole: UserRole = nextUpload ? (u.role === 'viewer' ? 'uploader' : u.role) : 'viewer';
        return {
          ...u,
          canUpload: nextUpload,
          role: nextRole,
        };
      }
      return u;
    });
    setUserList(updated);
    onUpdateUsers(updated);
    // If active user was edited, update active session too
    const currentEdited = updated.find((u) => u.id === currentUser.id);
    if (currentEdited) onSelectCurrentUser(currentEdited);
  };

  const handleToggleEdit = (id: string) => {
    const updated = userList.map((u) => (u.id === id ? { ...u, canEdit: !u.canEdit } : u));
    setUserList(updated);
    onUpdateUsers(updated);
  };

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: newName,
      email: newEmail,
      role: newRole,
      roleTitle:
        newRole === 'admin'
          ? 'Auditor Líder'
          : newRole === 'uploader'
          ? 'Operador de Carga Suplente'
          : 'Visualizador de Operaciones',
      department: newDepartment,
      canUpload: newRole === 'admin' || newRole === 'uploader',
      canEdit: newRole === 'admin' || newRole === 'uploader',
      canExport: true,
    };

    const updated = [...userList, newUser];
    setUserList(updated);
    onUpdateUsers(updated);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) return; // Prevent deleting self
    const updated = userList.filter((u) => u.id !== id);
    setUserList(updated);
    onUpdateUsers(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1A1A2E] text-white px-5 py-4 flex items-center justify-between border-b border-[#236B7A]/40">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#E0A23A]" />
            <div>
              <h2 className="text-base font-bold font-sans">Gestión de Roles y Permisos de Carga</h2>
              <p className="text-xs text-[#A7B5C5]">
                Define quiénes están en modo visualización y quiénes pueden subir data en ausencia del auditor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A7B5C5] hover:text-[#E0A23A] p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Active User Switcher Box */}
          <div className="bg-[#1F6F8B]/10 border border-[#1F6F8B]/30 rounded-lg p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#1F6F8B]" />
                Cambiar Usuario Activo para Pruebas:
              </span>
              <span className="text-[11px] text-[#7A8FA6]">
                (Simula cómo ve la plataforma cada rol)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {userList.map((u) => {
                const isActive = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelectCurrentUser(u)}
                    className={`flex items-center justify-between p-2.5 rounded border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white border-[#1F6F8B] shadow-xs ring-1 ring-[#1F6F8B]'
                        : 'bg-white/60 border-[#E2E4E7] hover:bg-white text-[#1A1A2E]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[#1A1A2E] truncate">{u.name}</p>
                      <p className="text-[10px] text-[#7A8FA6] truncate">{u.roleTitle}</p>
                    </div>
                    {isActive ? (
                      <div className="p-1 bg-[#1F6F8B] text-white rounded-full">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F4F6F7] text-[#7A8FA6] border border-[#E2E4E7]">
                        {u.role === 'viewer' ? 'Lectura' : 'Carga'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clave de Acceso Corporativa / Modificar Contraseña */}
          <div className="bg-[#F4F6F7] border border-[#E2E4E7] rounded-lg p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#E2E4E7] pb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#E0A23A]" />
                Modificar Contraseña de Desbloqueo:
              </span>
              <span className="text-[11px] text-[#7A8FA6]">
                Clave maestra para habilitar la carga
              </span>
            </div>

            {passSuccess && (
              <div className="p-2 bg-[#1F6F8B]/10 border border-[#1F6F8B]/30 rounded text-xs text-[#1F6F8B] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F8B] shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="p-2 bg-[#191827]/10 border border-[#191827]/30 rounded text-xs text-[#191827] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#191827] shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A2E] mb-0.5">Clave Actual:</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    readOnly
                    value={currentPass}
                    className="w-full bg-[#E2E4E7] border border-[#E2E4E7] rounded px-2 py-1 text-xs font-mono text-[#1A1A2E] select-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#7A8FA6] hover:text-[#1A1A2E] cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-[#1F6F8B]" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A2E] mb-0.5">Nueva Clave:</label>
                <input
                  type="text"
                  required
                  placeholder="Mín. 4 caracteres"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full bg-white border border-[#E2E4E7] rounded px-2 py-1 text-xs text-[#1A1A2E] focus:ring-1 focus:ring-[#1F6F8B]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A2E] mb-0.5">Confirmar Clave:</label>
                <input
                  type="text"
                  required
                  placeholder="Repetir clave"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full bg-white border border-[#E2E4E7] rounded px-2 py-1 text-xs text-[#1A1A2E] focus:ring-1 focus:ring-[#1F6F8B]"
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full py-1.5 px-2 bg-[#1F6F8B] hover:bg-[#236B7A] text-white rounded text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Lock className="w-3 h-3 text-[#E0A23A]" />
                  <span>Guardar Clave</span>
                </button>
              </div>
            </form>
          </div>

          {/* User List with Permission Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#1A1A2E] uppercase tracking-wide">
                Listado de Usuarios y Permisos de Carga
              </h3>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 text-xs font-semibold text-[#1F6F8B] hover:text-[#236B7A] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Ocultar Formulario' : 'Registrar Nuevo Usuario'}</span>
              </button>
            </div>

            {/* Add user sub-form */}
            {showAddForm && (
              <form onSubmit={handleAddNewUser} className="bg-[#F4F6F7] border border-[#E2E4E7] rounded p-3 text-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1A1A2E] mb-1">Nombre Completo:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Andrés Morales"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-white border border-[#E2E4E7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#1F6F8B]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A1A2E] mb-1">Correo Corporativo:</label>
                    <input
                      type="email"
                      required
                      placeholder="a.morales@stol.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-white border border-[#E2E4E7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#1F6F8B]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A1A2E] mb-1">Rol Operativo:</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full bg-white border border-[#E2E4E7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#1F6F8B]"
                    >
                      <option value="viewer">Solo Visualización (Consulta)</option>
                      <option value="uploader">Carga de Data (Suplente Auditor)</option>
                      <option value="admin">Auditor Líder (Administrador)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1A1A2E] mb-1">Área / Departamento:</label>
                    <input
                      type="text"
                      placeholder="Ej. Despacho / Auditoría"
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      className="w-full bg-white border border-[#E2E4E7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#1F6F8B]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1 bg-[#E2E4E7] text-[#1A1A2E] rounded hover:bg-[#A7B5C5] font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 bg-[#E0A23A] text-[#1A1A2E] rounded font-bold hover:bg-[#b87d22] cursor-pointer"
                  >
                    Guardar Usuario
                  </button>
                </div>
              </form>
            )}

            {/* Table of users */}
            <div className="border border-[#E2E4E7] rounded overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead className="bg-[#1A1A2E] text-white font-bold">
                  <tr>
                    <th className="p-2.5">Usuario</th>
                    <th className="p-2.5">Área / Rol</th>
                    <th className="p-2.5 text-center">Permiso Cargar Data</th>
                    <th className="p-2.5 text-center">Permiso Editar</th>
                    <th className="p-2.5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E4E7]">
                  {userList.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F4F6F7] transition-colors">
                      <td className="p-2.5 font-medium text-[#1A1A2E]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1F6F8B]/15 text-[#1F6F8B] flex items-center justify-center font-bold text-[10px]">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-[#1A1A2E]">{user.name}</p>
                            <p className="text-[10px] text-[#7A8FA6]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <p className="text-[#1A1A2E] font-semibold">{user.department}</p>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          user.role === 'admin'
                            ? 'bg-[#E0A23A]/20 text-[#191827]'
                            : user.role === 'uploader'
                            ? 'bg-[#1F6F8B]/15 text-[#1F6F8B]'
                            : 'bg-[#236B7A]/15 text-[#236B7A]'
                        }`}>
                          {user.roleTitle}
                        </span>
                      </td>
                      {/* Can Upload Toggle */}
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleToggleUpload(user.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            user.canUpload
                              ? 'bg-[#1F6F8B]/15 text-[#1F6F8B] border border-[#1F6F8B]/30 hover:bg-[#1F6F8B]/25'
                              : 'bg-[#F4F6F7] text-[#7A8FA6] border border-[#E2E4E7] hover:bg-[#E2E4E7]'
                          }`}
                        >
                          {user.canUpload ? (
                            <>
                              <Upload className="w-3 h-3 text-[#1F6F8B]" />
                              <span>Puede Cargar</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3 text-[#7A8FA6]" />
                              <span>Solo Ver</span>
                            </>
                          )}
                        </button>
                      </td>
                      {/* Can Edit Toggle */}
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => handleToggleEdit(user.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            user.canEdit
                              ? 'bg-[#E0A23A]/20 text-[#191827] border border-[#E0A23A]/40'
                              : 'bg-[#F4F6F7] text-[#7A8FA6] border border-[#E2E4E7]'
                          }`}
                        >
                          {user.canEdit ? 'Habilitado' : 'Deshabilitado'}
                        </button>
                      </td>
                      {/* Delete */}
                      <td className="p-2.5 text-center">
                        {user.id !== currentUser.id && user.id !== 'user-1' ? (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            title="Eliminar usuario"
                            className="text-[#7A8FA6] hover:text-[#191827] p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#7A8FA6] italic">Protegido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F4F6F7] px-5 py-3 border-t border-[#E2E4E7] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#E0A23A] hover:bg-[#b87d22] text-[#1A1A2E] text-xs font-bold rounded shadow-xs transition-colors cursor-pointer"
          >
            Listo y Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};
