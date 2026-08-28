import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

async function linkCesarOrder() {
  // 1. Find Cesar's customer ID
  const custSnap = await getDocs(collection(db, 'customers'));
  let cesarCust = null;
  custSnap.docs.forEach(d => {
    const data = d.data();
    if (data.email && data.email.toLowerCase().trim() === 'cecconsulting22@gmail.com') {
      cesarCust = { id: d.id, ...data };
    }
  });
  console.log('Cesar Customer in Firestore:', cesarCust);

  // 2. Update order ZTD0l9v5JNCZNgg6gAh1 with Cesar's email, name, customer_id
  const orderRef = doc(db, 'orders', 'ZTD0l9v5JNCZNgg6gAh1');
  const updates = {
    customer_email: 'cecconsulting22@gmail.com',
    customer_name: 'Cesar Trongcoso Jr.',
    customer_id: cesarCust ? cesarCust.id : 'cust_cesar',
    updated_at: new Date().toISOString()
  };
  await updateDoc(orderRef, updates);
  console.log('Order ZTD0l9v5JNCZNgg6gAh1 successfully linked to Cesar:', updates);

  // 3. Update customer total_orders and total_spend if customer doc exists
  if (cesarCust) {
    const custRef = doc(db, 'customers', cesarCust.id);
    await updateDoc(custRef, {
      total_orders: 1,
      total_spend: 7196,
      updated_at: new Date().toISOString()
    });
    console.log('Updated Cesar customer stats: total_orders=1, total_spend=7196');
  }
}

linkCesarOrder().catch(console.error);
