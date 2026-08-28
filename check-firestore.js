import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function checkFirestore() {
  const snap = await getDocs(collection(db, 'products'));
  console.log('Total Products currently in Firestore:', snap.docs.length);
  snap.docs.slice(0, 5).forEach(d => {
    console.log(d.id, d.data().name);
  });
}

checkFirestore().catch(console.error);
