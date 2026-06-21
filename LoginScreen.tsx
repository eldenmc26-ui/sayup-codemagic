// src/screens/LoginScreen.tsx
// Login con nickname + password + OTP (TOTP)

import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from './RootNavigator';
import { loginWithTOTP, loginWithPassword, loginWithBiometrics, isNicknameAvailable, type SayUpUser } from './authService';
import { COLORS } from './theme';
import { Firestore, Collections } from './firebase';

type Props = NativeStackScreenProps<AuthStackParams, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [nickname, setNickname] = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [step, setStep]         = useState<'nickname' | 'auth'>('nickname');
  const [authMethod, setAuthMethod] = useState<'totp' | 'password' | 'biometric'>('totp');
  const [customPassword, setCustomPassword] = useState('');

  const inputs = useRef<TextInput[]>([]);

  async function handleNicknameContinue() {
    const clean = nickname.trim().toLowerCase();
    if (clean.length < 3) {
      setError('Inserisci un nickname valido');
      return;
    }
    setLoading(true);
    try {
      const userQuery = await Firestore.collection(Collections.USERS)
        .where('nickname', '==', clean)
        .limit(1)
        .get();

      if (userQuery.empty) {
        setError('Non esiste un account con questo nickname');
        return;
      }

      const userData = userQuery.docs[0].data() as SayUpUser;
      const method = userData.authMethod || 'totp';
      setAuthMethod(method);
      setError('');
      setStep('auth');

      // Se il metodo è biometrico, avviamo automaticamente l'autenticazione biometrica
      if (method === 'biometric') {
        setTimeout(() => {
          handleBiometricLogin(clean);
        }, 100);
      }
    } catch (e: any) {
      setError(e.message ?? 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin(nick: string) {
    setError('');
    setLoading(true);
    try {
      await loginWithBiometrics(nick);
      navigation.replace('ProfileSetup');
    } catch (e: any) {
      setError(e.message ?? 'Autenticazione biometrica non riuscita');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin() {
    if (!customPassword.trim()) {
      setError('Inserisci la password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(nickname.trim().toLowerCase(), customPassword);
      navigation.replace('ProfileSetup');
    } catch (e: any) {
      setError(e.message ?? 'Password non corretta');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(val: string, idx: number) {
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleOtpKeyPress(key: string, idx: number) {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  async function handleLogin() {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Inserisci tutte le 6 cifre');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginWithTOTP(nickname.trim().toLowerCase(), code);
      navigation.replace('ProfileSetup');
    } catch (e: any) {
      setError(e.message ?? 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backText}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Accedi</Text>
        </View>

        <Image source={require('./assets/talksy-logo.png')} style={s.brandLogo} resizeMode="contain" />

        {/* Step indicator */}
        <View style={s.steps}>
          <View style={[s.stepDot, step === 'nickname' && s.stepDotActive]} />
          <View style={[s.stepDot, step === 'auth' && s.stepDotActive]} />
        </View>

        {/* ── STEP 1: Nickname ── */}
        {step === 'nickname' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Bentornato</Text>
            <Text style={s.sectionSubtitle}>
              Inserisci il tuo nickname per continuare.
            </Text>

            <Text style={s.label}>Nickname</Text>
            <TextInput
              style={s.input}
              placeholder="es. marco_t"
              placeholderTextColor="#aaa"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="next"
              onSubmitEditing={handleNicknameContinue}
            />

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[s.btnPrimary, loading && s.btnDisabled]}
              onPress={handleNicknameContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnText}>Continua →</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Auth (TOTP, Password o Biometrica) ── */}
        {step === 'auth' && (
          <View style={s.section}>
            {authMethod === 'totp' && (
              <>
                <Text style={s.sectionTitle}>Codice OTP</Text>
                <Text style={s.sectionSubtitle}>
                  Apri il tuo Authenticator e inserisci il codice a 6 cifre per Talksy.
                </Text>

                <View style={s.otpRow}>
                  {otp.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={r => { if (r) inputs.current[i] = r; }}
                      style={[s.otpInput, digit ? s.otpInputFilled : null]}
                      value={digit}
                      onChangeText={v => handleOtpChange(v.replace(/\D/g, ''), i)}
                      onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[s.btnPrimary, loading && s.btnDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Accedi</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {authMethod === 'password' && (
              <>
                <Text style={s.sectionTitle}>Password</Text>
                <Text style={s.sectionSubtitle}>
                  Inserisci la tua password personale per accedere.
                </Text>

                <Text style={s.label}>Password</Text>
                <TextInput
                  style={s.input}
                  secureTextEntry
                  placeholder="Password"
                  placeholderTextColor="#aaa"
                  value={customPassword}
                  onChangeText={setCustomPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[s.btnPrimary, loading && s.btnDisabled]}
                  onPress={handlePasswordLogin}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Accedi</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {authMethod === 'biometric' && (
              <>
                <Text style={s.sectionTitle}>Passkey / Biometria</Text>
                <Text style={s.sectionSubtitle}>
                  Usa l'autenticazione biometrica del dispositivo per accedere.
                </Text>

                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                  <TouchableOpacity 
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: COLORS.primarySoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: COLORS.primary,
                    }}
                    onPress={() => handleBiometricLogin(nickname.trim().toLowerCase())}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={{ fontSize: 36 }}>🛡️</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 10 }}>
                    Tocca per autenticarti
                  </Text>
                </View>

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[s.btnPrimary, loading && s.btnDisabled]}
                  onPress={() => handleBiometricLogin(nickname.trim().toLowerCase())}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Accedi con Impronta / FaceID</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={() => setStep('nickname')} style={s.linkBtn}>
              <Text style={s.linkText}>Cambia nickname</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn:     { padding: 4 },
  backText:    { fontSize: 24, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.primary },
  brandLogo: {
    width: 92,
    height: 92,
    alignSelf: 'center',
    marginBottom: 18,
  },

  steps: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center',
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.primary, width: 24 },

  section:        { gap: 16 },
  sectionTitle:   { fontSize: 22, fontWeight: '600', color: COLORS.text },
  sectionSubtitle:{ fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: -8 },

  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginTop: 8,
    backgroundColor: COLORS.surface,
  },

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginVertical: 8,
  },
  otpInput: {
    width: 44, height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  otpInputFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },

  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  linkBtn:  { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: COLORS.primary, fontSize: 14 },

  error: { color: '#e53935', fontSize: 13, marginTop: -4 },
});
