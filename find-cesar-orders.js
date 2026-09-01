import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function findCesarOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  console.log('Total Orders:', snap.docs.length);
  const matched = [];
  snap.docs.forEach(d => {
    const data = d.data();
    const email = (data.customer_email || '').toLowerCase().trim();
    const name = (data.customer_name || '').toLowerCase().trim();
    if (email.includes('cecconsulting') || name.includes('cesar') || name.includes('trongcoso')) {
      matched.push({ id: d.id, ...data });
    }
  });
  console.log('Matched Orders for Cesar / cecconsulting22@gmail.com:', matched);
}

findCesarOrders().catch(console.error);
