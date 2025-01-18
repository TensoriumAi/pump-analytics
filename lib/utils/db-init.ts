import { db } from '../db';

let dbInitialized = false;

async function migrateDatabase() {
  const currentVersion = db.verno;
  console.log('🔄 Current database version:', currentVersion);

  // Check if we need to migrate data
  if (currentVersion < 3) {
    console.log('📦 Starting database migration...');
    
    // Backup existing data
    const orders = await db.orders.toArray();
    console.log(`📋 Backing up ${orders.length} orders...`);

    // Clear and rebuild orders table with new schema
    await db.orders.clear();
    
    // Reinsert with new schema structure
    for (const order of orders) {
      await db.orders.add({
        ...order,
        // Add default values for new fields
        bondingCurveKey: order.bondingCurveKey || '',
        marketCapSol: order.marketCapSol || 0,
        newTokenBalance: order.newTokenBalance || 0,
        tokenAmount: order.tokenAmount || 0,
        vSolInBondingCurve: order.vSolInBondingCurve || 0,
        vTokensInBondingCurve: order.vTokensInBondingCurve || 0
      });
    }
    
    console.log('✅ Database migration completed');
  }
}

export async function ensureDatabaseReady() {
  if (dbInitialized) return;
  
  try {
    await db.open();
    await migrateDatabase();
    dbInitialized = true;
    console.log('✅ Database initialized and ready');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function clearDatabase() {
  try {
    await db.orders.clear();
    await db.tokens.clear();
    await db.subscriptions.clear();
    await db.settings.clear();
    console.log('🧹 Database cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
} 