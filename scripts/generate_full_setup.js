import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseDir = path.join(__dirname, '../supabase');
const migrationsDir = path.join(supabaseDir, 'migrations');

async function generateFullSetup() {
  try {
    console.log('🔄 Consolidating database schema...');
    
    // 1. Read base setup
    const baseSetupPath = path.join(supabaseDir, 'complete_database_setup.sql');
    let fullSql = fs.readFileSync(baseSetupPath, 'utf8');
    
    fullSql += '\n\n-- =============================================\n';
    fullSql += '-- STORAGE BUCKETS SETUP\n';
    fullSql += '-- =============================================\n\n';

    // Append menu-images bucket setup
    const menuImagesBucketPath = path.join(migrationsDir, '20250830082821_peaceful_cliff.sql');
    if (fs.existsSync(menuImagesBucketPath)) {
      console.log('📦 Appending menu-images bucket setup...');
      fullSql += `-- Storage Bucket: menu-images\n`;
      fullSql += fs.readFileSync(menuImagesBucketPath, 'utf8');
      fullSql += '\n\n';
    }

    // Append payment-proofs bucket setup
    const paymentProofsBucketPath = path.join(migrationsDir, '20250123000000_create_payment_proofs_bucket.sql');
    if (fs.existsSync(paymentProofsBucketPath)) {
      console.log('📦 Appending payment-proofs bucket setup...');
      fullSql += `-- Storage Bucket: payment-proofs\n`;
      fullSql += fs.readFileSync(paymentProofsBucketPath, 'utf8');
      fullSql += '\n\n';
    }

    // Create and append article-covers bucket setup
    console.log('📦 Appending article-covers bucket setup...');
    fullSql += `-- Storage Bucket: article-covers\n`;
    fullSql += `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)\n`;
    fullSql += `VALUES (\n`;
    fullSql += `  'article-covers',\n`;
    fullSql += `  'article-covers',\n`;
    fullSql += `  true,\n`;
    fullSql += `  5242880, -- 5MB limit\n`;
    fullSql += `  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']\n`;
    fullSql += `) ON CONFLICT (id) DO NOTHING;\n\n`;

    const articleCoversPoliciesPath = path.join(migrationsDir, '20250117000003_create_article_covers_bucket.sql');
    if (fs.existsSync(articleCoversPoliciesPath)) {
      fullSql += `-- Storage Policies: article-covers\n`;
      fullSql += fs.readFileSync(articleCoversPoliciesPath, 'utf8');
      fullSql += '\n\n';
    }

    fullSql += '\n\n-- =============================================\n';
    fullSql += '-- 2026 MIGRATIONS & ADDITIONAL LAYERS\n';
    fullSql += '-- =============================================\n\n';

    // 2. Read all migrations
    const migrationFiles = fs.readdirSync(migrationsDir);
    
    // Filter for files from 2026 or specifically the admin dashboard changes file
    const newMigrations = migrationFiles.filter(file => {
      return file.startsWith('2026') || file === 'admin_login_and_dashboard_changes.sql';
    });

    // Sort chronologically (alphabetical order handles timestamp prefix perfectly)
    newMigrations.sort();

    console.log('📦 Appending the following 2026 migrations in order:');
    newMigrations.forEach(file => {
      console.log(`  - ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      fullSql += `-- Migration: ${file}\n`;
      fullSql += sqlContent;
      fullSql += '\n\n';
    });

    // 3. Write output file
    const outputPath = path.join(supabaseDir, 'slimdose_full_setup.sql');
    fs.writeFileSync(outputPath, fullSql, 'utf8');
    
    console.log(`\n✅ Successfully generated unified setup script at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating consolidated script:', error);
  }
}

generateFullSetup();
