const pool = require('../config/database');

async function runDatabaseMigration() {
    try {
        console.log('🔄 Running database migration...');
        
        // Добавляем новые поля для Google Ads параметров
        const alterQueries = [
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS gclid TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS gclsrc TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS gbraid TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS wbraid TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS utm_source TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS utm_medium TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS utm_campaign TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS utm_term TEXT',
            'ALTER TABLE ip_tracking ADD COLUMN IF NOT EXISTS utm_content TEXT'
        ];
        
        for (const query of alterQueries) {
            try {
                await pool.query(query);
                console.log(`✅ Executed: ${query}`);
            } catch (error) {
                if (error.code === '42701') { // Column already exists
                    console.log(`⚠️  Column already exists: ${query}`);
                } else {
                    console.error(`❌ Error executing: ${query}`, error.message);
                }
            }
        }
        
        // Создаем индексы для новых полей
        const indexQueries = [
            'CREATE INDEX IF NOT EXISTS idx_ip_tracking_gclid ON ip_tracking(gclid)',
            'CREATE INDEX IF NOT EXISTS idx_ip_tracking_utm_campaign ON ip_tracking(utm_campaign)',
            'CREATE INDEX IF NOT EXISTS idx_ip_tracking_utm_source ON ip_tracking(utm_source)'
        ];
        
        for (const query of indexQueries) {
            try {
                await pool.query(query);
                console.log(`✅ Created index: ${query}`);
            } catch (error) {
                console.error(`❌ Error creating index: ${query}`, error.message);
            }
        }
        
        console.log('✅ Database migration completed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return false;
    }
}

module.exports = { runDatabaseMigration };
