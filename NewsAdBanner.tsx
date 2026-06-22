import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const bannerUnitId =
  __DEV__
    ? TestIds.BANNER
    : 'ca-app-pub-4696380411829532/4879158283';

export default function NewsAdBanner() {
  return (
    <View style={s.wrapper}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdFailedToLoad={(error) => {
          console.warn('[AdMob] Banner ad failed to load:', error);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
