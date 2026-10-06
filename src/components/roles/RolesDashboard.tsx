import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  UserCheck,
  Upload,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  Mail,
  Clock,
  Search,
  KeyRound,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppUser, UserRole } from '../../types';
import { getPrimaryPasswordDisplay, setCustomAccessPassword } from '../../utils/authUtils';

interface RolesDashboardProps {
  users: AppUser[];
  currentUser: AppUser;
  onSelectCurrentUser: (user: AppUser) => void;
  onUpdateUsers: (users: AppUser[]) => void;
}

export const RolesDashboard: React.FC<RolesDashboardProps> = ({
  users,
  currentUser,
  onSelectCurrentUser,
  onUpdateUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('uploader');
  const [newDepartment, setNewDepartment] = useState('Almacén Central');

  // Password modification state
  const [currentPass, setCurrentPass] = useState(getPrimaryPasswordDisplay());
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassSuccess(null);
    setPassError(null);

    if (!newPass || newPass.trim().length < 4) {
      setPassError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    const ok = setCustomAccessPassword(newPass.trim());
    if (ok) {
      setCurrentPass(newPass.trim());
      setPassSuccess('¡Contraseña corporativa actualizada exitosamente! Puede usar esta clave para desbloquear el sistema.');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(null), 6000);
    } else {
      setPassError('Error al guardar la contraseña.');
    }
  };

  const handleToggleUpload = (id: string) => {
    const updated: AppUser[] = users.map((u) => {
      if (u.id === id) {
        const nextUpload = !u.canUpload;
        const nextRole: UserRole = nextUpload
          ? u.role === 'viewer'
            ? 'uploader'
            : u.role
          : 'viewer';
        return {
          ...u,
          canUpload: nextUpload,
          role: nextRole,
        };
      }
      return u;
    });
    onUpdateUsers(updated);
    const currentEdited = updated.find((u) => u.id === currentUser.id);
    if (currentEdited) onSelectCurrentUser(currentEdited);
  };

  const handleToggleEdit = (id: string) => {
    const updated = users.map((u) => (u.id === id ? { ...u, canEdit: !u.canEdit } : u));
    onUpdateUsers(updated);
  };

  const handleChangeRole = (id: string, role: UserRole) => {
    const roleTitle =
      role === 'admin'
        ? 'Auditor Líder / Administrador'
        : role === 'uploader'
        ? 'Operador de Carga Autorizado'
        : 'Visualizador de Operaciones';

    const updated = users.map((u) =>
      u.id === id
        ? {
            ...u,
            role,
            roleTitle,
            canUpload: role === 'admin' || role === 'uploader',
            canEdit: role === 'admin' || role === 'uploader',
          }
        : u
    );
    onUpdateUsers(updated);
    const currentEdited = updated.find((u) => u.id === currentUser.id);
    if (currentEdited) onSelectCurrentUser(currentEdited);
  };

  const handleAddNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      name: newName,
      email: newEmail.trim().toLowerCase(),
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
      lastLogin: 'Pre-autorizado',
      accessCount: 0,
    };

    onUpdateUsers([...users, newUser]);
    setNewName('');
    setNewEmail('');
    setShowAddForm(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id || id === 'user-1') return;
    onUpdateUsers(users.filter((u) => u.id !== id));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E4E7] rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#1A1A2E]">
            <ShieldCheck className="w-5 h-5 text-[#1F6F8B]" />
            <h2 className="text-sm font-black uppercase tracking-wide">
              Gestión de Roles y Correos Reconocidos
            </h2>
          </div>
          <p className="text-xs text-[#7A8FA6] mt-0.5">
            Registro automático de correos autorizados en el sistema. Ajuste sus roles y permisos para próximas sesiones.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E0A23A] hover:bg-[#b87d22] text-[#1A1A2E] rounded text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Ocultar Registro' : 'Registrar Nuevo Usuario'}</span>
        </button>
      </div>

      {/* Clave de Acceso Corporativa / Modificar Contraseña */}
      <div className="bg-white border border-[#E2E4E7] rounded-lg p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E4E7] pb-2 mb-3">
          <div className="flex items-center gap-2 text-[#1A1A2E]">
            <KeyRound className="w-4 h-4 text-[#E0A23A]" />
            <h3 className="text-xs font-black uppercase tracking-wide">
              Seguridad: Clave Corporativa / Modificar Contraseña
            </h3>
          </div>
          <span className="text-[11px] text-[#7A8FA6]">
            Esta clave se solicita en la barra superior para desbloquear la carga de datos masiva
          </span>
        </div>

        {passSuccess && (
          <div className="mb-3 p-2.5 bg-[#1F6F8B]/10 border border-[#1F6F8B]/30 rounded text-xs text-[#1F6F8B] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1F6F8B] shrink-0" />
            <span>{passSuccess}</span>
          </div>
        )}

        {passError && (
          <div className="mb-3 p-2.5 bg-[#191827]/10 border border-[#191827]/30 rounded text-xs text-[#191827] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#191827] shrink-0" />
            <span>{passError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-[#1A1A2E] mb-1">
              Contraseña Actual:
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                readOnly
                value={currentPass}
                className="w-full bg-[#F4F6F7] border border-[#E2E4E7] rounded px-2.5 py-1.5 text-xs font-mono text-[#1A1A2E] select-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7A8FA6] hover:text-[#1A1A2E] cursor-pointer"
                title={showPass ? 'Ocultar clave' : 'Ver clave'}
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#1F6F8B]" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1A1A2E] mb-1">
              Nueva Contraseña:
            </label>
            <input
              type="text"
              required
              placeholder="Nueva clave (mín. 4 caracteres)"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:ring-1 focus:ring-[#1F6F8B]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#1A1A2E] mb-1">
              Confirmar Nueva Contraseña:
            </label>
            <input
              type="text"
              required
              placeholder="Repetir nueva clave"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded px-2.5 py-1.5 text-xs text-[#1A1A2E] focus:ring-1 focus:ring-[#1F6F8B]"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1F6F8B] hover:bg-[#236B7A] text-white rounded text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#E0A23A]" />
              <span>Guardar Contraseña</span>
            </button>
          </div>
        </form>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddNewUser}
          className="bg-white border border-[#E2E4E7] rounded-lg p-4 shadow-sm text-xs space-y-3"
        >
          <h3 className="font-bold text-[#1A1A2E] text-xs uppercase tracking-wider">
            Pre-autorizar Nuevo Correo o Colaborador
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-[#1A1A2E] mb-1">Nombre Completo:</label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded p-2 focus:ring-1 focus:ring-[#1F6F8B] text-[#1A1A2E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1A1A2E] mb-1">Correo Electrónico:</label>
              <input
                type="email"
                required
                placeholder="usuario@stol.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded p-2 focus:ring-1 focus:ring-[#1F6F8B] text-[#1A1A2E]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1A1A2E] mb-1">Rol Inicial:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded p-2 font-semibold text-[#1A1A2E]"
              >
                <option value="viewer">Solo Visualización</option>
                <option value="uploader">Carga de Data (Suplente)</option>
                <option value="admin">Auditor Líder</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-[#1A1A2E] mb-1">Área / Departamento:</label>
              <input
                type="text"
                placeholder="Ej. Despacho / Auditoría"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                className="w-full border border-[#E2E4E7] bg-[#F4F6F7] rounded p-2 text-[#1A1A2E]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E4E7]">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 bg-[#F4F6F7] hover:bg-[#E2E4E7] text-[#1A1A2E] rounded font-semibold cursor-pointer border border-[#E2E4E7]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#E0A23A] text-[#1A1A2E] rounded font-bold hover:bg-[#b87d22] cursor-pointer"
            >
              Guardar Usuario
            </button>
          </div>
        </form>
      )}

      {/* Current Active User Switcher (For testing roles) */}
      <div className="bg-white border border-[#E2E4E7] rounded-lg p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A2E] flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#1F6F8B]" />
            Usuario Activo en Sesión:
          </span>
          <span className="text-[11px] text-[#7A8FA6]">
            Haga clic para alternar cómo ve la plataforma cada rol
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {users.map((u) => {
            const isActive = u.id === currentUser.id;
            return (
              <button
                key={u.id}
                onClick={() => onSelectCurrentUser(u)}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1F6F8B]/10 border-[#1F6F8B] ring-2 ring-[#1F6F8B]/20 shadow-xs'
                    : 'bg-white border-[#E2E4E7] hover:bg-[#F4F6F7] text-[#1A1A2E]'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="text-xs font-bold text-[#1A1A2E] truncate">{u.name}</p>
                  <p className="text-[10px] text-[#7A8FA6] truncate">{u.email}</p>
                </div>
                {isActive ? (
                  <div className="p-1 bg-[#1F6F8B] text-white rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      u.role === 'admin'
                        ? 'bg-[#E0A23A]/20 text-[#191827]'
                        : u.role === 'uploader'
                        ? 'bg-[#1F6F8B]/15 text-[#1F6F8B]'
                        : 'bg-[#E2E4E7] text-[#7A7A7A]'
                    }`}
                  >
                    {u.role === 'viewer' ? 'Lectura' : u.role === 'uploader' ? 'Carga' : 'Admin'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recognized Emails and User List Table */}
      <div className="bg-white border border-[#E2E4E7] rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#1A1A2E] uppercase tracking-wide">
              Correos y Usuarios Registrados ({filteredUsers.length})
            </h3>
          </div>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-[#7A8FA6] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#F4F6F7] border border-[#E2E4E7] rounded focus:outline-none focus:ring-1 focus:ring-[#1F6F8B] text-[#1A1A2E] w-56"
            />
          </div>
        </div>

        <div className="border border-[#E2E4E7] rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead className="bg-[#1A1A2E] text-white font-bold">
              <tr>
                <th className="p-2.5">Colaborador / Correo Reconocido</th>
                <th className="p-2.5">Área Operativa</th>
                <th className="p-2.5">Último Acceso</th>
                <th className="p-2.5">Rol en el Sistema</th>
                <th className="p-2.5 text-center">Permiso Carga</th>
                <th className="p-2.5 text-center">Permiso Edición</th>
                <th className="p-2.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E4E7]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#F4F6F7] transition-colors">
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1F6F8B]/15 text-[#1F6F8B] flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#1A1A2E]">{user.name}</p>
                        <p className="text-[10px] text-[#7A8FA6] font-mono">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5 font-medium text-[#1A1A2E]">{user.department}</td>
                  <td className="p-2.5 text-[#7A8FA6] text-[11px]">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#7A8FA6]" />
                      <span>{user.lastLogin || 'No registrado'}</span>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                      className="text-xs font-bold border border-[#E2E4E7] rounded px-2 py-1 bg-white text-[#1A1A2E] cursor-pointer focus:ring-1 focus:ring-[#1F6F8B]"
                    >
                      <option value="viewer">Solo Visualización</option>
                      <option value="uploader">Operador de Carga</option>
                      <option value="admin">Auditor Líder</option>
                    </select>
                  </td>
                  {/* Upload Permission Toggle */}
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
                          <span>Habilitado</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 text-[#7A8FA6]" />
                          <span>Bloqueado</span>
                        </>
                      )}
                    </button>
                  </td>
                  {/* Edit Permission Toggle */}
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleToggleEdit(user.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        user.canEdit
                          ? 'bg-[#E0A23A]/20 text-[#191827] border border-[#E0A23A]/40'
                          : 'bg-[#F4F6F7] text-[#7A8FA6] border border-[#E2E4E7]'
                      }`}
                    >
                      {user.canEdit ? 'Activo' : 'Inactivo'}
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
  );
};
