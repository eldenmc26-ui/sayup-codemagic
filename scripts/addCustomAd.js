// scripts/addCustomAd.js
// Aggiunge un annuncio sponsor personalizzato alla collection ads_custom.
//
// Prerequisiti:
//   1. Genera una chiave service account da Firebase Console
//   2. Salva il file JSON e imposta GOOGLE_APPLICATION_CREDENTIALS
//   3. Installa firebase-admin: npm install -D firebase-admin
//
// Uso:
//   node scripts/addCustomAd.js <imageUrl> <linkUrl> [title]

const admin = require('firebase-admin');

const imageUrl = process.argv[2];
const linkUrl  = process.argv[3];
const title    = process.argv[4] || 'Sponsor Talksy';

if (!imageUrl || !linkUrl) {
  console.error('❌ Specifica imageUrl e linkUrl:');
  console.error('   node scripts/addCustomAd.js <imageUrl> <linkUrl> [title]');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function main() {
  await db.collection('ads_custom').add({
    active: true,
    imageUrl,
    linkUrl,
    title,
    createdAt: Date.now(),
  });
  console.log('✅ Sponsor aggiunto con successo!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
