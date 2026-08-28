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

  // Also check recent orders placed today
  const recentOrders = [];
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.created_at && (data.created_at.includes('2026-08-28') || data.created_at.includes('2026-08-27'))) {
      recentOrders.push({ id: d.id, ...data });
    }
  });
  console.log('Recent orders on 2026-08-27 or 2026-08-28:', recentOrders.map(o => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    created_at: o.created_at,
    total_price: o.total_price
  })));
}

findCesarOrders().catch(console.error);
