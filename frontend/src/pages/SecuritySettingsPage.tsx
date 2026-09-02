import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';
import { useToast } from '../components/Toast';

type Tab = 'mfa' | 'password' | 'recovery';

export function SecuritySettingsPage() {
  const accessToken = useAuth((state) => state.accessToken);
  const [tab, setTab] = useState<Tab>('mfa');

  if (!accessToken) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Configuración de seguridad</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">Cargando configuración de seguridad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
       <h1 className="mb-6 text-xl font-semibold text-slate-900">Configuración de seguridad</h1>

      <div className="mb-4 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTab('mfa')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'mfa'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            MFA
          </button>
          <button
            onClick={() => setTab('password')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'password'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Contraseña
          </button>
          <button
            onClick={() => setTab('recovery')}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              tab === 'recovery'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Recuperación
          </button>
        </nav>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {tab === 'mfa' && <MfaTab />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'recovery' && <RecoveryTab />}
      </div>
    </div>
  );
}

function MfaTab() {
  const accessToken = useAuth((state) => state.accessToken);
  const { showToast } = useToast();
  const [status, setStatus] = useState<{ enabled: boolean; recoveryCodesCount: number } | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableMfaCode, setDisableMfaCode] = useState('');

  const loadStatus = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await authApiClientWithEvents.getMfaStatus();
      setStatus(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSetup = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authApiClientWithEvents.setupMfa();
      setSecret(data.data.secret);
      setProvisioningUri(data.data.provisioningUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al configurar MFA';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.verifyMfaSetup(mfaCode);
      showToast('MFA habilitado correctamente', 'success');
      setSecret(null);
      setProvisioningUri(null);
      setMfaCode('');
      loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.disableMfa(disablePassword, disableMfaCode || undefined);
      showToast('MFA deshabilitado', 'success');
      setShowDisableForm(false);
      setDisablePassword('');
      setDisableMfaCode('');
      loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al deshabilitar MFA';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authApiClientWithEvents.generateRecoveryCodes();
      setRecoveryCodes(data.data.codes);
      showToast('Códigos de recuperación generados. Guárdelos ahora.', 'success');
      loadStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar los códigos de recuperación';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {status && !status.enabled && !secret && (
        <button
          onClick={handleSetup}
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Habilitar MFA
        </button>
      )}

      {secret && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-gray-700">
              Escanee este código QR con su aplicación de autenticación o ingrese el secreto manualmente:
            </p>
            <div className="rounded-md bg-gray-50 p-3">
              <code className="text-xs break-all">{secret}</code>
            </div>
            {provisioningUri && (
              <div className="mt-2">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(provisioningUri)}`}
                  alt="Código QR de MFA"
                  className="rounded-md border border-gray-200"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700">
              Ingrese el código de verificación
            </label>
            <input
              id="mfaCode"
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="123456"
            />
          </div>

          <button
            onClick={handleVerifySetup}
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Verificar y Habilitar
          </button>
        </div>
      )}

      {status?.enabled && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">MFA está habilitado para su cuenta.</p>

          <div>
            <h3 className="text-sm font-medium text-gray-900">Códigos de recuperación</h3>
            <p className="text-sm text-gray-500">
              You have {status.recoveryCodesCount} unused recovery code{status.recoveryCodesCount === 1 ? '' : 's'}.
            </p>
            <button
              onClick={handleGenerateRecoveryCodes}
              disabled={loading}
              className="mt-2 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Regenerar códigos de recuperación
            </button>
          </div>

          {recoveryCodes && (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-700">Guarde estos códigos. No se mostrarán de nuevo.</p>
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code) => (
                  <code key={code} className="rounded bg-white px-2 py-1 text-xs">
                    {code}
                  </code>
                ))}
              </div>
            </div>
          )}

          {showDisableForm ? (
            <form onSubmit={handleDisable} className="mt-4 space-y-4 rounded-md border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-medium text-red-800">Confirmar Deshabilitación de MFA</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contraseña actual</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Código MFA actual</label>
                <input
                  type="text"
                  value={disableMfaCode}
                  onChange={(e) => setDisableMfaCode(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="123456"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Deshabilitando...' : 'Confirmar Deshabilitación'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowDisableForm(false); setDisablePassword(''); setDisableMfaCode(''); }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowDisableForm(true)}
          disabled={loading}
          className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Deshabilitar MFA
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PasswordTab() {
  const accessToken = useAuth((state) => state.accessToken);
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.changePassword(currentPassword, newPassword);
      showToast('Contraseña cambiada correctamente', 'success');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar la contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
          Contraseña nueva
        </label>
        <input
          id="newPassword"
          type="password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}

function RecoveryTab() {
  const accessToken = useAuth((state) => state.accessToken);
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.requestPasswordReset(email);
      showToast('Si la cuenta existe, se enviarán las instrucciones de restablecimiento.', 'success');
      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al solicitar el restablecimiento de contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.resetPassword(token, newPassword);
      showToast('Contraseña restablecida correctamente', 'success');
      setToken('');
      setNewPassword('');
      setSent(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al restablecer la contraseña';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <form onSubmit={handleRequest} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Solicitar restablecimiento'}
        </button>
      </form>

      {sent && (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700">
              Token de restablecimiento
            </label>
            <input
              id="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Contraseña nueva
            </label>
            <input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </div>
  );
}
