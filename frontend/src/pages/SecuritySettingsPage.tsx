import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApiClientWithEvents } from '../lib/auth/auth-security';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs } from '../components/ui/Tabs';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusPill } from '../components/ui/StatusPill';
import { Icon } from '../components/ui/Icon';

type Tab = 'mfa' | 'password' | 'recovery';

export function SecuritySettingsPage() {
  const accessToken = useAuth((state) => state.accessToken);
  const [tab, setTab] = useState<Tab>('mfa');

  return (
    <>
      <PageHeader
        title="Configuración de seguridad"
        description="Gestione MFA, contraseña y códigos de recuperación de su cuenta."
        breadcrumbs={[{ label: 'Sistema' }, { label: 'Seguridad' }]}
        metadata={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Icon name="shield-check" className="h-3.5 w-3.5" />
            <span>Cuenta personal</span>
          </div>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {!accessToken ? (
          <LoadingState message="Cargando configuración de seguridad..." />
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="px-5 pt-4">
              <Tabs
                tabs={[
                  { id: 'mfa', label: 'MFA' },
                  { id: 'password', label: 'Contraseña' },
                  { id: 'recovery', label: 'Recuperación' },
                ]}
                activeTab={tab}
                onChange={(t) => setTab(t as Tab)}
              />
            </div>
            <div className="p-5">
              {tab === 'mfa' && <MfaTab />}
              {tab === 'password' && <PasswordTab />}
              {tab === 'recovery' && <RecoveryTab />}
            </div>
          </div>
        )}
      </div>
    </>
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
      setError(err instanceof Error ? err.message : 'Error al configurar MFA');
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
      setError(err instanceof Error ? err.message : 'Código inválido');
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
      setError(err instanceof Error ? err.message : 'Error al deshabilitar MFA');
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
      showToast('Códigos generados. Guárdelos en un lugar seguro.', 'success');
      loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar los códigos de recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50/50 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Autenticación de dos factores</h3>
          <p className="mt-0.5 text-xs text-slate-500">Aumente la seguridad de su cuenta con TOTP.</p>
        </div>
        {status && <StatusPill status={status.enabled ? 'ENABLED' : 'DISABLED'} />}
      </div>

      {status && !status.enabled && !secret && (
        <Button onClick={handleSetup} loading={loading} leftIcon="shield-check">Habilitar MFA</Button>
      )}

      {secret && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm text-slate-700">
              Escanee el código QR con su aplicación de autenticación o ingrese el secreto manualmente:
            </p>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <code className="break-all text-xs text-slate-800">{secret}</code>
            </div>
            {provisioningUri && (
              <div className="mt-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(provisioningUri)}`}
                  alt="Código QR de MFA"
                  className="rounded-md border border-slate-200"
                />
              </div>
            )}
          </div>
          <Input id="mfaCode" label="Código de verificación" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="123456" />
          <Button onClick={handleVerifySetup} loading={loading}>Verificar y habilitar</Button>
        </div>
      )}

      {status?.enabled && (
        <div className="space-y-5">
          <p className="text-sm text-slate-700">MFA está habilitado para su cuenta.</p>

          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Códigos de recuperación</h3>
            <p className="mt-1 text-xs text-slate-500">
              Tienes {status.recoveryCodesCount} códigos de recuperación sin usar.
            </p>
            <Button onClick={handleGenerateRecoveryCodes} loading={loading} variant="secondary" size="sm" className="mt-3" leftIcon="key">
              Regenerar códigos
            </Button>
            {recoveryCodes && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-medium text-amber-800">Guarde estos códigos. No se mostrarán de nuevo.</p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {recoveryCodes.map((code) => (
                    <code key={code} className="rounded border border-amber-200 bg-white px-2 py-1 text-center text-xs font-mono text-slate-800">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showDisableForm ? (
            <form onSubmit={handleDisable} className="rounded-md border border-red-200 bg-red-50 p-4">
              <h4 className="text-sm font-semibold text-red-900">Confirmar deshabilitación de MFA</h4>
              <p className="mt-1 text-xs text-red-700">Esta acción reduce la seguridad de su cuenta.</p>
              <div className="mt-3 space-y-3">
                <Input label="Contraseña actual" type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} required />
                <Input label="Código MFA actual" value={disableMfaCode} onChange={(e) => setDisableMfaCode(e.target.value)} required placeholder="123456" />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => { setShowDisableForm(false); setDisablePassword(''); setDisableMfaCode(''); }}>
                  Cancelar
                </Button>
                <Button variant="danger" size="sm" type="submit" loading={loading}>
                  Confirmar deshabilitación
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="danger" onClick={() => setShowDisableForm(true)} disabled={loading}>
              Deshabilitar MFA
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function PasswordTab() {
  const accessToken = useAuth((state) => state.accessToken);
  const { showToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (next !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (next.length < 12) {
      setError('La nueva contraseña debe tener al menos 12 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authApiClientWithEvents.changePassword(current, next);
      showToast('Contraseña actualizada', 'success');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Input label="Contraseña actual" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      <Input label="Nueva contraseña" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={12} helperText="Mínimo 12 caracteres" />
      <Input label="Confirmar nueva contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <div className="flex justify-end">
        <Button type="submit" loading={loading}>Cambiar contraseña</Button>
      </div>
    </form>
  );
}

function RecoveryTab() {
  const accessToken = useAuth((state) => state.accessToken);
  const { showToast } = useToast();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authApiClientWithEvents.generateRecoveryCodes();
      setCodes(data.data.codes);
      showToast('Códigos generados. Guárdelos en un lugar seguro.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar códigos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <p className="text-sm text-slate-700">
        Los códigos de recuperación le permiten acceder a su cuenta si pierde el acceso a su aplicación de autenticación.
      </p>
      <Button onClick={handleGenerate} loading={loading} leftIcon="key">Generar nuevos códigos</Button>
      {codes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-semibold text-amber-900">Guarde estos códigos. No se mostrarán de nuevo.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {codes.map((code) => (
              <code key={code} className="rounded border border-amber-200 bg-white px-2.5 py-1.5 text-center text-xs font-mono text-slate-800">
                {code}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
