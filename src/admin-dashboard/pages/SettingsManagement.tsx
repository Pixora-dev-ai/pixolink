import React, { useState, useEffect, useCallback } from 'react';
import { FaCog, FaSave, FaUndo, FaToggleOn, FaToggleOff, FaTools, FaCoins, FaShieldAlt, FaMoneyBillWave, FaWhatsapp, FaMobileAlt, FaUserPlus } from 'react-icons/fa';
import { getGuardian } from '../logic-guardian';
import { supabase } from '../../../services/supabase';

const guardian = getGuardian();
const logger = guardian.logger;

interface SystemSettings {
  id: string;
  maintenance_mode: boolean;
  maintenance_message: string | null;
  new_user_credits: number;
  max_images_per_generation: number;
  enable_public_models: boolean;
  require_email_verification: boolean;
  payments_whatsapp_number: string | null;
  vodafone_cash_number: string | null;
  instapay_username: string | null;
  topup_incentives_text: string | null;
  updated_at: string;
}

const SettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      logger.info('Loading system settings...');

      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('*')
        .limit(1)
        .single();

      if (fetchError) {
        logger.error('Error fetching settings', { error: fetchError });
        // If no settings exist, create default ones
        if (fetchError.code === 'PGRST116') {
          logger.info('No settings found, creating defaults...');
          await createDefaultSettings();
          return;
        }
        throw fetchError;
      }

      logger.info('System settings loaded successfully', { settings: data });
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      logger.error('Failed to load settings', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings && originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const createDefaultSettings = async () => {
    try {
      const defaultSettings = {
        maintenance_mode: false,
        maintenance_message: 'System is currently under maintenance. We will be back shortly!',
        new_user_credits: 100,
        max_images_per_generation: 4,
        enable_public_models: true,
        require_email_verification: false,
        payments_whatsapp_number: '+20 100 000 0000',
        vodafone_cash_number: '01000000000',
        instapay_username: '@pixora_payments',
        topup_incentives_text: 'Get bonus credits on your first top-up!'
      };

      const { data, error } = await supabase
        .from('system_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      setOriginalSettings(data);
      logger.info('Default settings created');
    } catch (err) {
      logger.error('Failed to create default settings', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to create settings');
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data, error: updateError } = await supabase
        .from('system_settings')
        .update({
          maintenance_mode: settings.maintenance_mode,
          maintenance_message: settings.maintenance_message,
          new_user_credits: settings.new_user_credits,
          max_images_per_generation: settings.max_images_per_generation,
          enable_public_models: settings.enable_public_models,
          require_email_verification: settings.require_email_verification,
          payments_whatsapp_number: settings.payments_whatsapp_number,
          vodafone_cash_number: settings.vodafone_cash_number,
          instapay_username: settings.instapay_username,
          topup_incentives_text: settings.topup_incentives_text,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSettings(data);
      setOriginalSettings(data);
      setSuccess('Settings saved successfully!');
      logger.info('System settings updated');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      logger.error('Failed to save settings', { error: err });
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
      setError('');
      setSuccess('');
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-blue-400 text-lg">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="text-red-400">Failed to load settings</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/20 rounded-lg">
            <FaCog size={24} color="#818cf8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">System Settings</h1>
            <p className="text-gray-400">Configure platform settings and preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaUndo size={16} /></div>
            <span>Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <div><FaSave size={16} /></div>
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
          <div className="text-green-400">{success}</div>
        </div>
      )}

      {hasChanges && !success && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <div className="text-yellow-400">You have unsaved changes</div>
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Maintenance Mode */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-600/20 rounded-lg">
              <FaTools size={20} color="#f87171" />
            </div>
            <h2 className="text-xl font-bold text-white">Maintenance Mode</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Enable Maintenance Mode</div>
                <div className="text-gray-400 text-sm">Temporarily disable access to the platform</div>
              </div>
              <button
                onClick={() => updateSetting('maintenance_mode', !settings.maintenance_mode)}
                className="flex items-center gap-2"
              >
                {settings.maintenance_mode ? (
                  <div className="text-red-400"><FaToggleOn size={32} /></div>
                ) : (
                  <div className="text-gray-500"><FaToggleOff size={32} /></div>
                )}
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Maintenance Message</label>
              <textarea
                value={settings.maintenance_message || ''}
                onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                rows={3}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="Message to display to users during maintenance..."
              />
            </div>
          </div>
        </div>

        {/* User Defaults */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <FaUserPlus size={20} color="#60a5fa" />
            </div>
            <h2 className="text-xl font-bold text-white">New User Defaults</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Starting Credits</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaCoins size={16} />
                </div>
                <input
                  type="number"
                  value={settings.new_user_credits}
                  onChange={(e) => updateSetting('new_user_credits', parseInt(e.target.value) || 0)}
                  min={0}
                  max={10000}
                  className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">Credits given to new users on signup</div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Max Images Per Generation</label>
              <input
                type="number"
                value={settings.max_images_per_generation}
                onChange={(e) => updateSetting('max_images_per_generation', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
              <div className="text-xs text-gray-500 mt-1">Maximum images users can generate at once</div>
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <FaShieldAlt size={20} color="#4ade80" />
            </div>
            <h2 className="text-xl font-bold text-white">Feature Flags</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Enable Public Models</div>
                <div className="text-gray-400 text-sm">Allow users to share their trained models publicly</div>
              </div>
              <button
                onClick={() => updateSetting('enable_public_models', !settings.enable_public_models)}
                className="flex items-center gap-2"
              >
                {settings.enable_public_models ? (
                  <div className="text-green-400"><FaToggleOn size={32} /></div>
                ) : (
                  <div className="text-gray-500"><FaToggleOff size={32} /></div>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div>
                <div className="text-white font-medium">Require Email Verification</div>
                <div className="text-gray-400 text-sm">Users must verify email before accessing features</div>
              </div>
              <button
                onClick={() => updateSetting('require_email_verification', !settings.require_email_verification)}
                className="flex items-center gap-2"
              >
                {settings.require_email_verification ? (
                  <div className="text-green-400"><FaToggleOn size={32} /></div>
                ) : (
                  <div className="text-gray-500"><FaToggleOff size={32} /></div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-600/20 rounded-lg">
              <FaMoneyBillWave size={20} color="#fbbf24" />
            </div>
            <h2 className="text-xl font-bold text-white">Payment Methods</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <FaWhatsapp size={14} />
                <span>Payments WhatsApp Number</span>
              </label>
              <input
                type="text"
                value={settings.payments_whatsapp_number || ''}
                onChange={(e) => updateSetting('payments_whatsapp_number', e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="+20 100 123 4567"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                <FaMobileAlt size={14} />
                <span>Vodafone Cash Number</span>
              </label>
              <input
                type="text"
                value={settings.vodafone_cash_number || ''}
                onChange={(e) => updateSetting('vodafone_cash_number', e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="01001234567"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Instapay Username</label>
              <input
                type="text"
                value={settings.instapay_username || ''}
                onChange={(e) => updateSetting('instapay_username', e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="@username"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Top-up Incentives Text</label>
              <textarea
                value={settings.topup_incentives_text || ''}
                onChange={(e) => updateSetting('topup_incentives_text', e.target.value)}
                rows={2}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="Promotional text for credit top-ups..."
              />
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
          <div className="text-sm text-gray-400">
            Last updated: <span className="text-white">{new Date(settings.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsManagement;
