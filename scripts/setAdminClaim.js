// scripts/setAdminClaim.js
// Assegna il custom claim { admin: true } a un utente via Firebase Admin SDK.
// Utile se vuoi gestire l'admin tramite token JWT invece che solo dal documento Firestore.
//
// Prerequisiti:
//   1. Genera una chiave service account da Firebase Console → Project Settings → Service Accounts → Generate new private key
//   2. Salva il file JSON e imposta il percorso nella variabile d'ambiente GOOGLE_APPLICATION_CREDENTIALS
//   3. Installa firebase-admin: npm install -D firebase-admin
//
// Uso:
//   node scripts/setAdminClaim.js <UID>

const admin = require('firebase-admin');

const uid = process.argv[2];
if (!uid) {
  console.error('❌ Specifica l\'UID dell\'utente:');
  console.error('   node scripts/setAdminClaim.js <UID>');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Claim { admin: true } assegnato all'utente ${uid}`);
    console.log('   L\'utente dovrà fare logout e login per vedere il nuovo token.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Errore:', err.message);
    process.exit(1);
  });

