import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from './RootNavigator';
import { generateTOTPSecret, verifyTOTPCode, registerWithTOTP } from './authService';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from './theme';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

type Step = 'nickname' | 'qr' | 'otp';

export default function RegisterScreen({ navigation }: Props) {
  const [step, setStep]         = useState<Step>('nickname');
  const [nickname, setNickname] = useState('');
  const [qrUri, setQrUri]       = useState('');
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const inputs = useRef<TextInput[]>([]);

  async function handleNicknameContinue() {
    const clean = nickname.trim().toLowerCase();
    if (clean.length < 3) {
      setError('Il nickname deve avere almeno 3 caratteri');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setError('Solo lettere, numeri e underscore');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { qrUri: uri } = await generateTOTPSecret(clean);
      setQrUri(uri);
      setStep('qr');
    } catch (e: any) {
      setError(e.message ?? 'Errore nella generazione del QR');
    } finally {
      setLoading(false);
    }
  }

  function handleQrContinue() {
    setStep('otp');
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

  async function handleVerify() {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Inserisci tutte le 6 cifre');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const valid = await verifyTOTPCode(code);
      if (!valid) {
        setError('Codice non valido. Riprova.');
        setLoading(false);
        return;
      }
      await registerWithTOTP(nickname.trim(), { displayName: nickname.trim() });
      Alert.alert(
        '✅ Registrazione completata!',
        'Benvenuto su Talksy! Ora completa il tuo profilo.',
        [{ text: 'Inizia', onPress: () => navigation.replace('ProfileSetup') }]
      );
    } catch (e: any) {
      setError(e.message ?? 'Errore nella registrazione');
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
          <Text style={s.headerTitle}>Crea account</Text>
        </View>
        <Image source={require('./assets/talksy-logo.png')} style={s.brandLogo} resizeMode="contain" /><View style={s.steps}>
          {(['nickname', 'qr', 'otp'] as Step[]).map((s_) => (
            <View key={s_} style={[s.stepDot, step === s_ && s.stepDotActive]} />
          ))}
        </View>

        {step === 'nickname' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Scegli il tuo nickname</Text>
            <Text style={s.sectionSubtitle}>
              È il tuo identificativo su Talksy. Non potrai cambiarlo.
            </Text>
            <TextInput
              style={s.input}
              placeholder="es. marco_t"
              placeholderTextColor="#aaa"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={handleNicknameContinue}
            />
            {error ? <Text style={s.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[s.btnPrimary, loading && s.btnDisabled]}
              onPress={handleNicknameContinue}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Continua →</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {step === 'qr' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Scansiona con Google Authenticator</Text>
            <Text style={s.sectionSubtitle}>
              Apri Google Authenticator → + → Scansiona QR code
            </Text>
            <TouchableOpacity 
              style={s.qrContainer} 
              onPress={() => Linking.openURL(qrUri).catch(() => Alert.alert('Errore', 'Nessuna app di autenticazione trovata.'))}
              activeOpacity={0.8}
            >
              <QRCode value={qrUri} size={180} backgroundColor="#fff" />
              <Text style={s.qrLinkHint}>Tocca per aggiungere automaticamente</Text>
            </TouchableOpacity>

            <View style={s.infoBox}>
              <Text style={s.infoText}>
                Il QR aggiunge Talksy al tuo Authenticator.{'\n'}
                Dovrai inserire il codice ogni volta che accedi.
              </Text>
            </View>
            <TouchableOpacity style={s.btnPrimary} onPress={handleQrContinue}>
              <Text style={s.btnText}>Ho scansionato →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'otp' && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Inserisci il codice OTP</Text>
            <Text style={s.sectionSubtitle}>
              Apri il tuo Authenticator e inserisci il codice a 6 cifre per Talksy.
            </Text>
            <View style={s.otpRow}>{otp.map((digit, i) => (
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
              onPress={handleVerify}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Verifica e crea account</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('qr')} style={s.linkBtn}>
              <Text style={s.linkText}>Torna al QR code</Text>
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
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.primary, width: 24 },

  section:        { gap: 16 },
  sectionTitle:   { fontSize: 22, fontWeight: '600', color: COLORS.text },
  sectionSubtitle:{ fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },

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

  qrContainer: {
    alignSelf: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 8,
    alignItems: 'center',
  },
  qrLinkHint: { fontSize: 11, color: COLORS.primary, marginTop: 12, fontWeight: '600', textAlign: 'center' },

  infoBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 12,
    padding: 14,
  },
  infoText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20, textAlign: 'center' },

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
