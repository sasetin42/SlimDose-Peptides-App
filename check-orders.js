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

async function checkOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  console.log('Total Orders in Firestore:', snap.docs.length);
  snap.docs.forEach(d => {
    const data = d.data();
    console.log({
      id: d.id,
      order_number: data.order_number || data.id,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_id: data.customer_id,
      total_price: data.total_price,
      created_at: data.created_at
    });
  });
}

checkOrders().catch(console.error);
