import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
// --- SETUP ---
// 1. Download your Firebase service account key JSON file.
// 2. Rename it to 'serviceAccountKey.json' and place it in the same directory as this script.
import serviceAccount from './aicesales-53099-firebase-adminsdk-fbsvc-06f8eec1e6.json' with { type: 'json' };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('Firebase Admin SDK initialized.');

// This will hold the mapping from old Firebase ID to new Supabase UUID
const idMaps = {
    toko: new Map(),
    produk: new Map(),
};

/**
 * Converts an array of objects to a CSV string.
 * @param {Array<Object>} data The array of objects to convert.
 * @returns {string} The CSV formatted string.
 */
function toCsv(data) {
    if (!data || data.length === 0) {
        return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(',')); // Header row

    for (const row of data) {
        const values = headers.map(header => {
            let value = row[header] === null || row[header] === undefined ? '' : row[header];

            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            
            const stringValue = String(value).replace(/"/g, '""'); // Escape double quotes
            return `"${stringValue}"`; // Always wrap in quotes to handle commas and newlines
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
}

/**
 * Migrates a Firestore collection to a Supabase-compatible format.
 * @param {string} collectionName The name of the Firestore collection.
 * @param {string} outputFileName The name of the output JSON file.
 * @param {boolean} buildIdMap Whether to build an ID map for this collection.
 */
async function migrateCollection(collectionName, outputFileName, buildIdMap = false) {
    try {
        console.log(`Starting migration for collection: '${collectionName}'...`);
        const collectionRef = db.collection(collectionName);
        const snapshot = await collectionRef.get();

        if (snapshot.empty) {
            console.log(`Collection '${collectionName}' is empty. Nothing to migrate.`);
            return;
        }

        const supabaseData = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const newId = uuidv4(); // Generate a new UUID for Supabase
            const oldId = doc.id;

            if (buildIdMap) {
                idMaps[collectionName].set(oldId, newId);
            }

            const transformedData = {
                ...data,
                id: newId, // Kunci utama baru untuk Supabase
            };

            // Handle Firebase Timestamp objects
            for (const key in transformedData) {
                if (transformedData[key] instanceof admin.firestore.Timestamp) {
                    transformedData[key] = transformedData[key].toDate().toISOString();
                }
            }

            // --- RELATIONSHIP MIGRATION ---
            if (collectionName === 'kunjungan' || collectionName === 'orders') {
                // Update tokoId
                if (transformedData.tokoId && idMaps.toko.has(transformedData.tokoId)) {
                    transformedData.tokoId = idMaps.toko.get(transformedData.tokoId);
                }
            }

            if (collectionName === 'orders') {
                // Update productId within the items array
                if (Array.isArray(transformedData.items)) {
                    transformedData.items = transformedData.items.map((item) => {
                        if (item.productId && idMaps.produk.has(item.productId)) {
                            return {
                                ...item,
                                productId: idMaps.produk.get(item.productId),
                            };
                        }
                        return item;
                    });
                }
            }

            // Special handling for 'kunjungan' which might contain old order data
            if (collectionName === 'kunjungan') {
                // We assume `kunjungan` should not contain order items after the data model change.
                // This cleans it up during migration.
                if (transformedData.items) {
                    transformedData.items = [];
                }
                if (transformedData.total) {
                    transformedData.total = 0;
                }
            }

            supabaseData.push(transformedData);
        }

        const csvData = toCsv(supabaseData);
        fs.writeFileSync(outputFileName, csvData);
        console.log(`✅ Sukses! Migrasi ${supabaseData.length} dokumen dari '${collectionName}' ke '${outputFileName}'.`);
    } catch (error) {
        console.error(`❌ Error migrating collection '${collectionName}':`, error);
    }
}

/**
 * Main function to run all migrations.
 */
async function runMigration() {
    console.log('--- Starting Data Migration ---');

    // 1. Migrate base tables and build ID maps
    console.log('\nStep 1: Migrating base collections and building ID maps...');
    await migrateCollection('toko', 'toko_supabase.csv', true);
    await migrateCollection('produk', 'produk_supabase.csv', true);

    // 2. Migrate relational tables using the ID maps
    console.log('\nLangkah 2: Migrasi koleksi relasional...');
    await migrateCollection('kunjungan', 'kunjungan_supabase.csv');
    await migrateCollection('orders', 'orders_supabase.csv');

    // You can add more collections here if needed, e.g., 'config'

    console.log('--- Data Migration Finished ---');
    process.exit(0);
}

// Run the script
runMigration();
