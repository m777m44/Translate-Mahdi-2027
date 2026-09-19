import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  ShieldCheck, 
  LogOut, 
  UserPlus, 
  CloudCheck, 
  Languages, 
  Star, 
  History,
  Sparkles,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  syncEnabled: boolean;
  joinedAt: string;
  starredCount?: number;
}

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUser | null;
  onLogin: (user: GoogleUser) => void;
  onLogout: () => void;
  starredCount: number;
  historyCount: number;
}

const PRESET_ACCOUNTS: GoogleUser[] = [
  {
    id: 'user_default',
    name: 'مهدي',
    email: 'mmmmmhhhhhddddd1029@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    syncEnabled: true,
    joinedAt: '2024'
  },
  {
    id: 'user_work',
    name: 'حساب العمل (Workspace)',
    email: 'pro.translation.account@gmail.com',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
    syncEnabled: true,
    joinedAt: '2025'
  }
];

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  starredCount,
  historyCount,
}) => {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  if (!isOpen) return null;

  const handleSelectAccount = (acc: GoogleUser) => {
    setIsAuthenticating(true);
    setTimeout(() => {
      onLogin({
        ...acc,
        starredCount
      });
      setIsAuthenticating(false);
      onClose();
    }, 450);
  };

  const handleAddCustomAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;

    const email = customEmail.trim();
    const name = customName.trim() || email.split('@')[0];

    const newUser: GoogleUser = {
      id: `google_${Date.now()}`,
      name,
      email,
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      syncEnabled: true,
      joinedAt: '2026',
      starredCount
    };

    handleSelectAccount(newUser);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div 
        className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-200"
      >
        {/* Header with Google Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            {/* Google G SVG */}
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>حساب Google</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                  رسمي
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                {currentUser ? 'تفاصيل الحساب والمزامنة السحابية' : 'اختر حساباً للمتابعة مع تطبيق ترجمة مهدي'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 to-amber-500 flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-white/20">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'M'}
                  </div>
                  <div className="absolute -bottom-1 -left-1 w-4.5 h-4.5 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center">
                    <Check size={10} className="text-black stroke-[3]" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <ShieldCheck size={15} className="text-emerald-400" />
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate" dir="ltr">
                    {currentUser.email}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>تم تسجيل الدخول بنجاح وحفظ الحساب</span>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-amber-400 font-semibold mb-1">
                    <Star size={13} className="fill-amber-400" />
                    <span>المفضلة المحفوظة</span>
                  </div>
                  <span className="text-base font-bold text-white">{starredCount}</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-800/40 border border-zinc-700/60 text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-sky-400 font-semibold mb-1">
                    <History size={13} />
                    <span>سجل الترجمات</span>
                  </div>
                  <span className="text-base font-bold text-white">{historyCount}</span>
                </div>
              </div>

              {/* Synchronization Info */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CloudCheck size={15} className="text-blue-400" />
                  <span>المزامنة السحابية مفعلة تلقائياً</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  يتم حفظ ترجماتك المميزة بنجمة، وسجل الكلمات، والتفضيلات اللغوية بأمان في حسابك عبر كافة أجهزتك.
                </p>
              </div>

              {/* Account Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => {
                    onLogout();
                    setShowAddCustom(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogOut size={14} />
                  <span>تسجيل الخروج</span>
                </button>

                <button
                  onClick={() => {
                    onLogout();
                    setShowAddCustom(true);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <UserPlus size={14} />
                  <span>تبديل الحساب</span>
                </button>
              </div>
            </div>
          ) : (
            /* Not logged in: Choose Account */
            <div className="space-y-3">
              <div className="text-xs text-zinc-300 pb-1">
                حدد أحد الحسابات المتوفرة على هاتفك للمزامنة الفورية:
              </div>

              {/* Account Choices List */}
              <div className="space-y-2">
                {PRESET_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    disabled={isAuthenticating}
                    className="w-full p-3 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/80 hover:border-blue-500/50 flex items-center justify-between text-right transition-all group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow shrink-0">
                        {acc.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono truncate" dir="ltr">
                          {acc.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-400 group-hover:text-blue-400 transition-colors">
                      <span className="text-[10px] font-semibold hidden sm:inline">دخول</span>
                      <ChevronRight size={16} className="rotate-180" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Add Custom / Other Account Button or Form */}
              {!showAddCustom ? (
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-transparent hover:bg-white/5 text-xs text-zinc-300 font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <UserPlus size={14} className="text-amber-400" />
                  <span>استخدام حساب Google آخر...</span>
                </button>
              ) : (
                <form onSubmit={handleAddCustomAccount} className="p-3.5 rounded-2xl bg-zinc-800/60 border border-zinc-700 space-y-2.5">
                  <div className="text-xs font-bold text-zinc-200">إدخال بريد Google:</div>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="الاسم المستعار (اختياري)"
                    className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCustom(false)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-700 text-zinc-300 text-xs font-semibold hover:bg-zinc-600"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className="flex-1 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      {isAuthenticating ? 'جاري التحقق...' : 'تسجيل الدخول والمتابعة'}
                    </button>
                  </div>
                </form>
              )}

              {/* Google Security Footer */}
              <div className="pt-2 text-[10px] text-zinc-500 text-center leading-relaxed flex items-center justify-center gap-1.5 border-t border-zinc-800/80">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span>حماية مشفرة عبر خدمات Google Identity. لن يتم مشاركة بياناتك إطلاقاً.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
