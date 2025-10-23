#!/usr/bin/env node

require('dotenv').config();
const { runDatabaseMigration } = require('./migrations/migrate');
const pool = require('./config/database');

async function main() {
    try {
        console.log('🚀 Starting manual database migration...');
        
        const success = await runDatabaseMigration();
        
        if (success) {
            console.log('✅ Migration completed successfully!');
        } else {
            console.log('❌ Migration failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
