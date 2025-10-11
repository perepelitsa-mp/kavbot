'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import InputMask from 'react-input-mask';
import { api } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface AuthDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthDialog({ onOpenChange, onSuccess }: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: (cleanPhone: string) => api.login(cleanPhone, password),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ошибка входа');
    },
  });

  const registerMutation = useMutation({
    mutationFn: (cleanPhone: string) => api.register(cleanPhone, password, firstName, lastName),
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Очищаем номер телефона от маски
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length !== 11) {
      setError('Введите корректный номер телефона');
      return;
    }

    if (mode === 'login') {
      loginMutation.mutate(cleanPhone);
    } else {
      if (!firstName.trim()) {
        setError('Укажите имя');
        return;
      }
      registerMutation.mutate(cleanPhone);
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-75 blur-xl" />
          <div className="relative rounded-2xl bg-white p-8 shadow-2xl">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              {mode === 'login' ? 'Вход' : 'Регистрация'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Номер телефона
                </label>
                <InputMask
                  mask="+7 (999) 999-99-99"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                >
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      type="tel"
                      placeholder="+7 (999) 999-99-99"
                      className="bg-slate-50"
                    />
                  )}
                </InputMask>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Пароль
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-slate-50"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Имя <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Иван"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Фамилия
                    </label>
                    <Input
                      type="text"
                      placeholder="Иванов"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-slate-50"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                        required
                      />
                      <span className="text-xs text-slate-600 leading-relaxed">
                        Я подтверждаю ознакомление и даю{' '}
                        <a
                          href="/consent"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Согласие
                        </a>
                        {' '}на обработку моих персональных данных в порядке и на условиях, указанных в{' '}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 underline font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Политике конфиденциальности
                        </a>
                        <span className="text-rose-500">*</span>
                      </span>
                    </label>
                  </div>
                </>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || (mode === 'register' && !consentAccepted)}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : mode === 'login' ? (
                  'Войти'
                ) : (
                  'Зарегистрироваться'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                  setConsentAccepted(false);
                }}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                {mode === 'login'
                  ? 'Нет аккаунта? Зарегистрироваться'
                  : 'Уже есть аккаунт? Войти'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
