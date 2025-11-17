import React, { useState, useEffect } from 'react';
import { FaGear, FaBell, FaWrench, FaToggleOn, FaToggleOff, FaPaperPlane } from 'react-icons/fa6';
import * as adminService from '../../../services/adminService';
import { supabase } from '../../../services/supabase';
import { getGuardian } from '../logic-guardian';

const guardian = getGuardian();
const logger = guardian.logger;

export default function SystemSettingsTab() {
  const [settings, setSettings] = useState<adminService.SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState<'info' | 'warning' | 'success' | 'error'>('info');
  const [notifTarget, setNotifTarget] = useState<'all' | 'subscribers' | 'free_users'>('all');
  const [sendingNotif, setSendingNotif] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemSettings();
      setSettings(data);
    } catch (error) {
      logger.error('Failed to load settings', { error });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await adminService.updateSystemSettings(settings);
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      logger.error('Failed to save settings', { error });
      alert('فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert('يرجى ملء جميع الحقول');
      return;
    }

    try {
      setSendingNotif(true);
      
      // Get current user for admin ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      await adminService.sendNotification({
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        target: notifTarget,
        created_by: user.id,
      });

      alert('تم إرسال الإشعار بنجاح');
      setNotifTitle('');
      setNotifMessage('');
      setNotifType('info');
      setNotifTarget('all');
    } catch (error) {
      logger.error('Failed to send notification', { error });
      alert('فشل إرسال الإشعار');
    } finally {
      setSendingNotif(false);
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-12 text-white/60">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* System Settings Card */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-purple-400">
            <FaGear size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">إعدادات النظام</h3>
        </div>

        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium mb-1">وضع الصيانة</h4>
              <p className="text-white/60 text-sm">إيقاف التطبيق مؤقتاً للصيانة</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
              className="text-3xl"
            >
              {settings.maintenance_mode ? (
                <div className="text-green-400">
                  <FaToggleOn size={40} />
                </div>
              ) : (
                <div className="text-gray-400">
                  <FaToggleOff size={40} />
                </div>
              )}
            </button>
          </div>

          {/* Maintenance Message */}
          {settings.maintenance_mode && (
            <div>
              <label className="block text-white/80 mb-2 text-sm">رسالة الصيانة</label>
              <textarea
                value={settings.maintenance_message || ''}
                onChange={(e) => setSettings({ ...settings, maintenance_message: e.target.value })}
                placeholder="سيتم عرض هذه الرسالة للمستخدمين أثناء الصيانة..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-500 resize-none"
                rows={3}
              />
            </div>
          )}

          {/* New User Credits */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">
              رصيد المستخدمين الجدد (Credits)
            </label>
            <input
              type="number"
              min="0"
              value={settings.new_user_credits}
              onChange={(e) => setSettings({ ...settings, new_user_credits: parseInt(e.target.value) || 0 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-white/40 text-xs mt-1">
              الرصيد الذي سيحصل عليه كل مستخدم جديد عند التسجيل
            </p>
          </div>

          {/* Max Images Per Generation */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">
              الحد الأقصى للصور في كل توليد
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.max_images_per_generation}
              onChange={(e) => setSettings({ ...settings, max_images_per_generation: parseInt(e.target.value) || 1 })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            />
            <p className="text-white/40 text-xs mt-1">
              أقصى عدد من الصور يمكن توليدها في طلب واحد (1-10)
            </p>
          </div>

          {/* Enable Public Models */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium mb-1">تفعيل النماذج العامة</h4>
              <p className="text-white/60 text-sm">السماح للمستخدمين بمشاركة نماذجهم</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enable_public_models: !settings.enable_public_models })}
              className="text-3xl"
            >
              {settings.enable_public_models ? (
                <div className="text-green-400">
                  <FaToggleOn size={40} />
                </div>
              ) : (
                <div className="text-gray-400">
                  <FaToggleOff size={40} />
                </div>
              )}
            </button>
          </div>

          {/* Email Verification */}
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <h4 className="text-white font-medium mb-1">مطالبة بتأكيد البريد الإلكتروني</h4>
              <p className="text-white/60 text-sm">يطلب من المستخدمين تأكيد بريدهم الإلكتروني</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, require_email_verification: !settings.require_email_verification })}
              className="text-3xl"
            >
              {settings.require_email_verification ? (
                <div className="text-green-400">
                  <FaToggleOn size={40} />
                </div>
              ) : (
                <div className="text-gray-400">
                  <FaToggleOff size={40} />
                </div>
              )}
            </button>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaWrench size={18} />
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </div>
      </div>

      {/* Send Notification Card */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-blue-400">
            <FaBell size={24} />
          </div>
          <h3 className="text-xl font-bold text-white">إرسال إشعار للمستخدمين</h3>
        </div>

        <div className="space-y-4">
          {/* Notification Title */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">عنوان الإشعار</label>
            <input
              type="text"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="مثال: تحديث جديد متاح"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Notification Message */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">نص الإشعار</label>
            <textarea
              value={notifMessage}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="اكتب محتوى الإشعار هنا..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none"
              rows={4}
            />
          </div>

          {/* Notification Type */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">نوع الإشعار</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setNotifType('info')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifType === 'info'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                معلومة
              </button>
              <button
                onClick={() => setNotifType('success')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifType === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                نجاح
              </button>
              <button
                onClick={() => setNotifType('warning')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifType === 'warning'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                تحذير
              </button>
              <button
                onClick={() => setNotifType('error')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifType === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                خطأ
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-white/80 mb-2 text-sm">المستهدفون</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setNotifTarget('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifTarget === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setNotifTarget('subscribers')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifTarget === 'subscribers'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                المشتركون فقط
              </button>
              <button
                onClick={() => setNotifTarget('free_users')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  notifTarget === 'free_users'
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                المجانيون فقط
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendNotification}
            disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FaPaperPlane size={18} />
            {sendingNotif ? 'جاري الإرسال...' : 'إرسال الإشعار'}
          </button>
        </div>
      </div>
    </div>
  );
}
