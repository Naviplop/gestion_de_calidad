import { useState, useEffect } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import type { OrganizationResponse, OrganizationSettingResponse } from '../lib/auth/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/LoadingState';
import { PageHeader } from '../components/ui/PageHeader';
import { Icon } from '../components/ui/Icon';

export function OrganizationSettingsPage() {
  const [org, setOrg] = useState<OrganizationResponse | null>(null);
  const [settings, setSettings] = useState<OrganizationSettingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgRes, settingsRes] = await Promise.all([
        authApiClient.getOrganization(),
        authApiClient.listSettings(),
      ]);
      setOrg(orgRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la organización');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    try {
      await authApiClient.updateOrganization({
        name: org.name,
        taxId: org.taxId,
        email: org.email,
        phone: org.phone,
        address: org.address,
        timezone: org.timezone,
        locale: org.locale,
        logoUrl: org.logoUrl,
        primaryColor: org.primaryColor,
      });
      showToast('Organización actualizada', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la organización');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      for (const setting of settings) {
        data[setting.key] = setting.value;
      }
      await authApiClient.updateSettings(data);
      showToast('Configuración actualizada', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Organización" description="Información general de la organización." breadcrumbs={[{ label: 'Administración', href: '/organization' }, { label: 'Organización' }]} />
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <LoadingState message="Cargando información de la organización..." />
        </div>
      </>
    );
  }

  if (!org) {
    return (
      <>
        <PageHeader title="Organización" breadcrumbs={[{ label: 'Administración' }, { label: 'Organización' }]} />
        <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || 'Organización no encontrada'}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Organización"
        description="Información general y configuración de la organización."
        breadcrumbs={[{ label: 'Administración' }, { label: 'Organización' }]}
        actions={
          <Button onClick={handleSaveOrg} form="org-form" loading={saving} leftIcon="check">
            Guardar cambios
          </Button>
        }
      />

      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-5 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form id="org-form" onSubmit={handleSaveOrg} className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Información general</h2>
            <p className="text-xs text-slate-500">Datos básicos que identifican a la organización en el sistema.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <Input label="Nombre" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} required />
            <Input label="Identificación fiscal" value={org.taxId || ''} onChange={(e) => setOrg({ ...org, taxId: e.target.value })} />
            <Input label="Correo electrónico" type="email" value={org.email || ''} onChange={(e) => setOrg({ ...org, email: e.target.value })} />
            <Input label="Teléfono" value={org.phone || ''} onChange={(e) => setOrg({ ...org, phone: e.target.value })} />
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Dirección</label>
              <textarea
                value={org.address || ''}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
                rows={3}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <Input label="Zona horaria" value={org.timezone} onChange={(e) => setOrg({ ...org, timezone: e.target.value })} />
            <Input label="Configuración regional" value={org.locale} onChange={(e) => setOrg({ ...org, locale: e.target.value })} />
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Configuración del sistema</h2>
              <p className="text-xs text-slate-500">Parámetros operativos configurables por la organización.</p>
            </div>
            <Button onClick={handleSaveSettings} loading={saving} leftIcon="check" size="sm">Guardar</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {settings.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6 text-sm text-slate-500">
                <Icon name="cog" className="h-4 w-4 text-slate-400" />
                No hay parámetros configurados.
              </div>
            ) : (
              settings.map((setting) => (
                <div key={setting.key} className="flex items-center gap-4 px-5 py-3">
                  <label className="w-1/3 text-sm font-medium text-slate-700">{setting.key}</label>
                  <input
                    type="text"
                    value={String(setting.value)}
                    onChange={(e) => {
                      const newSettings = settings.map((s) =>
                        s.key === setting.key ? { ...s, value: e.target.value } : s,
                      );
                      setSettings(newSettings);
                    }}
                    className="h-9 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
