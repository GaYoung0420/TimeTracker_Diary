import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.join(__dirname, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Read migration file
const migrationPath = path.join(__dirname, 'migrations', 'create_user_calendars.sql');
const sql = fs.readFileSync(migrationPath, 'utf-8');

console.log('Migration SQL:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));
console.log('\nTo run this migration:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the SQL above');
console.log('4. Click "Run"');
console.log('\nOr use the Supabase CLI:');
console.log('supabase db execute --file migrations/create_user_calendars.sql');
