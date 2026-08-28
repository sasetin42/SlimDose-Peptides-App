import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBYk8pxgUi5ZV10nUW91VTZ8lBGZYMJdkk',
  authDomain: 'slimdose-peptides.firebaseapp.com',
  projectId: 'slimdose-peptides',
  storageBucket: 'slimdose-peptides.firebasestorage.app',
  messagingSenderId: '1003572217504',
  appId: '1:1003572217504:web:8eebdd82710ab9fe7aabc5',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspectRecentOrder() {
  const ref = doc(db, 'orders', 'ZTD0l9v5JNCZNgg6gAh1');
  const snap = await getDoc(ref);
  console.log('Order ZTD0l9v5JNCZNgg6gAh1:', snap.data());
}

inspectRecentOrder().catch(console.error);
