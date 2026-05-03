import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Image,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParams } from './RootNavigator';
import { COLORS } from './theme';

type Props = NativeStackScreenProps<AuthStackParams, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.hero}><Image source={require('./assets/talksy-logo.png')} style={styles.logo} resizeMode="contain" /><Text style={styles.title}>Talksy</Text><Text style={styles.subtitle}>Messaggi, amici e news in un posto solo.{'\n'}Semplice, pulita, sempre tua.</Text></View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnPrimaryText}>Crea account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.btnSecondaryText}>Ho già un account</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          Continuando accetti i Termini di servizio e la Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 64,
  },
  hero: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 16,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 6,
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.84)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: COLORS.black,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.36)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
  },
  terms: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
});