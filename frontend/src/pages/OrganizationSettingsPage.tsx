import { useState, useEffect } from 'react';
import { authApiClient } from '../lib/auth/auth.service';
import { useToast } from '../components/Toast';
import type { OrganizationResponse, OrganizationSettingResponse } from '../lib/auth/auth.service';

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
      setError(err instanceof Error ? err.message : 'Failed to load organization');
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
      showToast('Organization updated', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
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
      showToast('Settings updated', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-sm text-red-600">{error || 'Organization not found'}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSaveOrg} className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">General Information</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={org.name}
              onChange={(e) => setOrg({ ...org, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tax ID</label>
            <input
              type="text"
              value={org.taxId || ''}
              onChange={(e) => setOrg({ ...org, taxId: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={org.email || ''}
              onChange={(e) => setOrg({ ...org, email: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="text"
              value={org.phone || ''}
              onChange={(e) => setOrg({ ...org, phone: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={org.address || ''}
              onChange={(e) => setOrg({ ...org, address: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Timezone</label>
            <input
              type="text"
              value={org.timezone}
              onChange={(e) => setOrg({ ...org, timezone: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Locale</label>
            <input
              type="text"
              value={org.locale}
              onChange={(e) => setOrg({ ...org, locale: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Organization'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <div className="mt-4 space-y-4">
          {settings.map((setting) => (
            <div key={setting.key} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{setting.key}</label>
              <input
                type="text"
                value={String(setting.value)}
                onChange={(e) => {
                  const newSettings = settings.map((s) =>
                    s.key === setting.key ? { ...s, value: e.target.value } : s,
                  );
                  setSettings(newSettings);
                }}
                className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}