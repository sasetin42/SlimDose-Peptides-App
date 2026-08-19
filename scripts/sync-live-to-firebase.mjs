import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  writeBatch 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../src/data');

const firebaseConfig = {
  apiKey: 'AIzaSyBYk8pxgUi5ZV10nUW91VTZ8lBGZYMJdkk',
  authDomain: 'slimdose-peptides.firebaseapp.com',
  projectId: 'slimdose-peptides',
  storageBucket: 'slimdose-peptides.firebasestorage.app',
  messagingSenderId: '1003572217504',
  appId: '1:1003572217504:web:8eebdd82710ab9fe7aabc5',
  measurementId: 'G-573TE9JRS5',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function loadTsArray(filename) {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const jsonStr = content.substring(content.indexOf('['), content.lastIndexOf(']') + 1);
  return JSON.parse(jsonStr);
}

async function uploadCollectionInBatches(colName, items, idKey = 'id') {
  if (!items || items.length === 0) return;
  console.log(`🚀 Uploading ${items.length} items to Firebase Firestore collection '${colName}'...`);
  
  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const item of items) {
    const docId = String(item[idKey] || item.id || `item_${count}`);
    const docRef = doc(db, colName, docId);
    
    // Clean item of undefined values
    const cleanItem = JSON.parse(JSON.stringify(item));
    batch.set(docRef, cleanItem, { merge: true });
    count++;
    batchCount++;

    if (batchCount >= 400) {
      await batch.commit();
      console.log(`   ✅ Committed batch of ${batchCount} items (${count}/${items.length})`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`   ✅ Committed final batch of ${batchCount} items (${count}/${items.length})`);
  }
}

async function runFirebaseSync() {
  try {
    console.log('🔥 Starting Live Data Transfer to Firebase Firestore...');

    const products = loadTsArray('liveScrapedProducts.ts');
    const orders = loadTsArray('liveScrapedOrders.ts');
    const customers = loadTsArray('liveScrapedCustomers.ts');
    const guideTopics = loadTsArray('liveScrapedGuideTopics.ts');
    const categories = loadTsArray('liveScrapedCategories.ts');
    const paymentMethods = loadTsArray('liveScrapedPaymentMethods.ts');
    const promoCodes = loadTsArray('liveScrapedPromoCodes.ts');

    // 1. Upload Products
    await uploadCollectionInBatches('products', products);

    // 2. Upload Product Variations
    const variations = products.flatMap(p => p.variations || []);
    await uploadCollectionInBatches('product_variations', variations);

    // 3. Upload Categories
    await uploadCollectionInBatches('categories', categories);

    // 4. Upload Orders
    await uploadCollectionInBatches('orders', orders);

    // 5. Upload Customers
    await uploadCollectionInBatches('customers', customers);

    // 6. Upload Guide Topics (Articles)
    await uploadCollectionInBatches('guide_topics', guideTopics);

    // 7. Upload Payment Methods
    await uploadCollectionInBatches('payment_methods', paymentMethods);

    // 8. Upload Promo Codes
    await uploadCollectionInBatches('promo_codes', promoCodes);

    console.log('\n🎉 SUCCESS! All Live Data fully transferred to Firebase Firestore!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during Firebase Firestore transfer:', err);
    process.exit(1);
  }
}

runFirebaseSync();
