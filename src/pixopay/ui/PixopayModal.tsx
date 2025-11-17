import React, { useState, useRef } from 'react';
import { FaXmark, FaMoneyBill, FaWhatsapp, FaCreditCard, FaImage, FaCopy, FaCheck, FaCircleInfo } from 'react-icons/fa6';
import { supabase, storage, tables, ensureAuthHeadersHydrated } from '../../services/supabase';
import { logger } from '../../utils/logger';

// Credit conversion rate: 1 EGP = 10 Credits
const CREDITS_PER_EGP = 10;

interface PixopayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = 'instapay' | 'vf_cash';

interface PaymentAccount {
  name: string;
  id: string;
  logo: string;
  paymentLink: string;
  qrCode: string;
}

const PAYMENT_ACCOUNTS: Record<PaymentMethod, PaymentAccount> = {
  instapay: {
    name: 'InstaPay',
    id: 'mamdouhaboammar@instapay',
    logo: '/PixoPay Configurations/instapaylogo/InstaPay-logobase.net.svg',
    paymentLink: 'https://ipn.eg/S/mamdouhaboammar/instapay/9f7zdO',
    qrCode: '/PixoPay Configurations/Instapay QR.jpeg'
  },
  vf_cash: {
    name: 'Vodafone Cash',
    id: '01092677269',
    logo: '/PixoPay Configurations/vf-cash-removebg-preview.png',
    paymentLink: 'http://vf.eg/vfcash?id=mt&qrId=Oittmo',
    qrCode: '/PixoPay Configurations/VF Cash QR.jpeg'
  }
};

const PixopayModal: React.FC<PixopayModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('instapay');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedAccount = PAYMENT_ACCOUNTS[paymentMethod];

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy to clipboard', { error: err });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('الرجاء اختيار صورة صالحة');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
        return;
      }

      setScreenshot(file);
      setError('');
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const amountNum = parseInt(amount);
      if (isNaN(amountNum) || amountNum < 10 || amountNum > 100000) {
        setError('المبلغ يجب أن يكون بين 10 و 100,000 جنيه');
        return;
      }

      const creditsAmount = amountNum * CREDITS_PER_EGP;

      if (!screenshot) {
        setError('الرجاء رفع صورة إثبات الدفع');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('يجب تسجيل الدخول أولاً');
        return;
      }

      let screenshotUrl = null;
      if (screenshot) {
        // Ensure Storage client has Authorization header pre-hydrated to satisfy storage-js validation
        await ensureAuthHeadersHydrated();
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        // Explicitly attach headers on the bucket client to satisfy @supabase/storage-js internal fetch pre-validation
        const bucket = storage.paymentProofs();
        try {
          const { data: session } = await supabase.auth.getSession();
          const token = session?.session?.access_token || null;
          if (token) {
            const bearer = `Bearer ${token}`;
            // @ts-ignore - headers is supported by storage-js client instance in runtime
            bucket.headers = { ...(bucket as any).headers, authorization: bearer, Authorization: bearer, apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) };
          }
        } catch {/* ignore */}
        const { data: uploadData, error: uploadError } = await bucket.upload(fileName, screenshot);

        if (uploadError) throw uploadError;

        const { data: urlData } = storage
          .paymentProofs()
          .getPublicUrl(uploadData.path);
        
        screenshotUrl = urlData.publicUrl;
      }

      const { error: insertError } = await tables
        .manual_payments()
        .insert({
          user_id: user.id,
          payment_method: paymentMethod,
          amount: amountNum,
          credits_amount: creditsAmount,
          screenshot_url: screenshotUrl,
          whatsapp_sent: false,
          status: 'pending'
        });

      if (insertError) throw insertError;

      logger.info('Payment request submitted', { method: paymentMethod, amount: amountNum });
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setAmount('');
      setScreenshot(null);
      setScreenshotPreview('');
      setError('');
    } catch (err) {
      logger.error('Failed to submit payment request', { error: err });
      setError(err instanceof Error ? err.message : 'فشل إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `مرحباً! أود شحن رصيد بقيمة ${amount} جنيه عبر ${selectedAccount.name}`
    );
    window.open(`https://wa.me/201092677269?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[95vw] sm:max-w-lg bg-gray-800/60 rounded-2xl shadow-xl overflow-hidden backdrop-blur-md border border-gray-700 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <FaMoneyBill size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">شحن الرصيد</h2>
              <p className="text-gray-400 text-sm">أضف رصيد إلى حسابك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700/50 backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <FaXmark size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Special Offer Banner */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/40 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-300 mb-1">
              <FaCircleInfo size={16} />
              <span className="font-semibold text-sm">نظام التحويل</span>
            </div>
            <p className="text-gray-300 text-sm">
              كل 1 جنيه = {CREDITS_PER_EGP} كريديت
              {amount && parseInt(amount) >= 10 && (
                <span className="block mt-1 text-purple-300 font-semibold">
                  {parseInt(amount)} جنيه = {parseInt(amount) * CREDITS_PER_EGP} كريديت
                </span>
              )}
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-white font-semibold mb-2">
              المبلغ (جنيه مصري)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="أدخل المبلغ (الحد الأدنى 10 جنيه)"
              className="w-full rounded-lg border border-gray-600 bg-gray-700/60 backdrop-blur-sm px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="10"
              max="100000"
            />
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-white font-semibold mb-2">
              طريقة الدفع
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('instapay')}
                className={`p-4 rounded-lg border-2 transition-all backdrop-blur-sm ${
                  paymentMethod === 'instapay'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-600 bg-gray-700/60 hover:border-gray-500'
                }`}
              >
                <img 
                  src={PAYMENT_ACCOUNTS.instapay.logo} 
                  alt="InstaPay"
                  className="h-8 mx-auto mb-2"
                />
                <div className="text-white text-sm font-medium">InstaPay</div>
              </button>
              <button
                onClick={() => setPaymentMethod('vf_cash')}
                className={`p-4 rounded-lg border-2 transition-all backdrop-blur-sm ${
                  paymentMethod === 'vf_cash'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-600 bg-gray-700/60 hover:border-gray-500'
                }`}
              >
                <img 
                  src={PAYMENT_ACCOUNTS.vf_cash.logo} 
                  alt="Vodafone Cash"
                  className="h-8 mx-auto mb-2"
                />
                <div className="text-white text-sm font-medium">Vodafone Cash</div>
              </button>
            </div>
          </div>

          {/* Payment Instructions */}
          <div className="bg-gray-700/40 backdrop-blur-sm rounded-lg p-4 space-y-3 border border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">حساب {selectedAccount.name}:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono">{selectedAccount.id}</span>
                <button
                  onClick={() => handleCopy(selectedAccount.id)}
                  className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                >
                  {copied ? (
                    <FaCheck size={12} className="text-green-400" />
                  ) : (
                    <FaCopy size={12} className="text-gray-300" />
                  )}
                </button>
              </div>
            </div>
            
            {/* QR Code */}
            <div className="bg-white rounded-lg p-2 max-h-72 overflow-hidden">
              <img 
                src={selectedAccount.qrCode} 
                alt="QR Code" 
                className="w-full h-auto max-h-72 object-contain"
              />
            </div>

            <div className="text-gray-400 text-xs space-y-1">
              <p>1. افتح تطبيق {selectedAccount.name}</p>
              <p>2. قم بتحويل المبلغ المحدد</p>
              <p>3. التقط صورة لإثبات التحويل</p>
              <p>4. ارفع الصورة أدناه</p>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-white font-semibold mb-2">
              إثبات الدفع
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative">
                <img 
                  src={screenshotPreview} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg border border-gray-600"
                />
                <button
                  onClick={() => {
                    setScreenshot(null);
                    setScreenshotPreview('');
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <FaXmark size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-purple-500 hover:bg-gray-700/30 transition-all backdrop-blur-sm"
              >
                <FaImage size={32} className="mx-auto mb-2 text-gray-400" />
                <div className="text-gray-300 text-sm">انقر لرفع صورة إثبات الدفع</div>
                <div className="text-gray-500 text-xs mt-1">PNG, JPG (أقصى حجم 5MB)</div>
              </button>
            )}
          </div>

          {/* WhatsApp Button */}
          <button
            onClick={handleWhatsApp}
            className="w-full p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <FaWhatsapp size={20} />
            <span>تواصل عبر واتساب</span>
          </button>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-semibold transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !amount || !screenshot}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <FaCreditCard size={16} />
                <span>إرسال الطلب</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PixopayModal;
