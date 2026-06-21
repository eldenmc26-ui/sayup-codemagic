import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Alert, Linking,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from './RootNavigator';
import { generateTOTPSecret, verifyTOTPCode, registerWithTOTP, registerWithPassword, registerWithBiometrics } from './authService';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from './theme';

type Props = NativeStackScreenProps<AuthStackParams, 'Register'>;

type Step = 'nickname' | 'qr' | 'otp';

export default function RegisterScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('nickname');
  const [nickname, setNickname] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [altModalVisible, setAltModalVisible] = useState(false);
  const [altMethod, setAltMethod] = useState<'password' | 'biometric' | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState('');

  async function handleRegisterWithCustomPassword() {
    if (!customPassword.trim()) {
      setAltError('Inserisci una password');
      return;
    }
    if (customPassword.trim().length < 6) {
      setAltError('La password deve contenere almeno 6 caratteri');
      return;
    }
    if (customPassword !== confirmPassword) {
      setAltError('Le password non coincidono');
      return;
    }
    setAltLoading(true);
    setAltError('');
    try {
      await registerWithPassword(nickname.trim(), customPassword, { displayName: nickname.trim() });
      setAltModalVisible(false);
      navigation.replace('ProfileSetup');
    } catch (e: any) {
      setAltError(e.message ?? 'Errore nella registrazione con password');
    } finally {
      setAltLoading(false);
    }
  }

  async function handleRegisterWithBiometrics() {
    setAltLoading(true);
    setAltError('');
    try {
      await registerWithBiometrics(nickname.trim(), { displayName: nickname.trim() });
      setAltModalVisible(false);
      navigation.replace('ProfileSetup');
    } catch (e: any) {
      setAltError(e.message ?? 'Impossibile configurare l\'accesso biometrico');
    } finally {
      setAltLoading(false);
    }
  }

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
      navigation.replace('ProfileSetup');
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
            <TouchableOpacity
              style={s.altAuthLink}
              onPress={() => {
                setAltMethod(null);
                setAltError('');
                setCustomPassword('');
                setConfirmPassword('');
                setAltModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={s.altAuthLinkText}>Non hai un autenticatore? Clicca qui!</Text>
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

      <Modal
        visible={altModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAltModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Metodo Alternativo</Text>
            <Text style={s.modalSubtitle}>Scegli come proteggere il tuo account senza un autenticatore esterno:</Text>

            {altMethod === null ? (
              <View style={{ gap: 14, width: '100%' }}>
                <TouchableOpacity
                  style={s.modalOptionBtn}
                  onPress={() => setAltMethod('password')}
                  activeOpacity={0.8}
                >
                  <Text style={s.modalOptionIcon}>🔑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalOptionTitle}>Password Personale</Text>
                    <Text style={s.modalOptionDesc}>Scegli una password tradizionale per il login</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.modalOptionBtn}
                  onPress={handleRegisterWithBiometrics}
                  activeOpacity={0.8}
                  disabled={altLoading}
                >
                  <Text style={s.modalOptionIcon}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalOptionTitle}>Passkey / Biometria</Text>
                    <Text style={s.modalOptionDesc}>Usa una passkey o un metodo biometrico per il login</Text>
                  </View>
                </TouchableOpacity>

                {altLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />}
                {altError ? <Text style={s.altErrorText}>{altError}</Text> : null}

                <TouchableOpacity
                  style={[s.modalCloseBtn, { marginTop: 10 }]}
                  onPress={() => setAltModalVisible(false)}
                  disabled={altLoading}
                >
                  <Text style={s.modalCloseText}>Annulla</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {altMethod === 'password' ? (
              <View style={{ gap: 12, width: '100%' }}>
                <Text style={s.label}>Scegli Password</Text>
                <TextInput
                  style={s.input}
                  secureTextEntry
                  placeholder="Password (min. 6 caratteri)"
                  placeholderTextColor="#aaa"
                  value={customPassword}
                  onChangeText={setCustomPassword}
                  autoCapitalize="none"
                />

                <Text style={s.label}>Conferma Password</Text>
                <TextInput
                  style={s.input}
                  secureTextEntry
                  placeholder="Ripeti la password"
                  placeholderTextColor="#aaa"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />

                {altError ? <Text style={s.altErrorText}>{altError}</Text> : null}

                <TouchableOpacity
                  style={[s.btnPrimary, altLoading && s.btnDisabled]}
                  onPress={handleRegisterWithCustomPassword}
                  disabled={altLoading}
                >
                  {altLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Crea Account</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.modalCloseBtn}
                  onPress={() => setAltMethod(null)}
                  disabled={altLoading}
                >
                  <Text style={s.modalCloseText}>← Indietro</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 24,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 24, color: COLORS.primary },
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

  section: { gap: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '600', color: COLORS.text },
  sectionSubtitle: { fontSize: 14, color: COLORS.textMuted, lineHeight: 20 },
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
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },

  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: COLORS.primary, fontSize: 14 },

  error: { color: '#e53935', fontSize: 13, marginTop: -4 },

  altAuthLink: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 10,
  },
  altAuthLinkText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    gap: 12,
  },
  modalOptionIcon: {
    fontSize: 24,
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalOptionDesc: {
    fontSize: 11,
    color: COLORS.textSoft,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  altErrorText: {
    color: COLORS.danger,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
