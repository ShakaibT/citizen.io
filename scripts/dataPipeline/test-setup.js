#!/usr/bin/env node

/**
 * Test Setup Script for Interactive Officials Data Pipeline
 * 
 * This script validates the environment setup and API connectivity
 * before running the full pipeline.
 * 
 * Usage: node scripts/dataPipeline/test-setup.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.local' });

console.log('🧪 Testing Interactive Officials Data Pipeline Setup\n');

// Test 1: Environment Variables
console.log('1️⃣ Checking environment variables...');
const requiredEnvVars = [
  'CONGRESS_API_KEY',
  'OPENSTATES_API_KEY', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

let envVarsOk = true;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`   ❌ Missing: ${envVar}`);
    envVarsOk = false;
  } else {
    console.log(`   ✅ Found: ${envVar}`);
  }
}

if (!envVarsOk) {
  console.error('\n❌ Environment variables check failed. Please check your .env.local file.');
  process.exit(1);
}

// Test 2: Supabase Connection
console.log('\n2️⃣ Testing Supabase connection...');
try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Test basic connection
  const { data, error } = await supabase
    .from('officials')
    .select('count')
    .limit(1);
  
  if (error) {
    console.error(`   ❌ Supabase connection failed: ${error.message}`);
  } else {
    console.log('   ✅ Supabase connection successful');
  }
} catch (error) {
  console.error(`   ❌ Supabase connection error: ${error.message}`);
}

// Test 3: Congress.gov API
console.log('\n3️⃣ Testing Congress.gov API...');
try {
  const response = await fetch(
    `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=1`
  );
  
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ Congress.gov API working (found ${data.members?.length || 0} members in test)`);
  } else {
    console.error(`   ❌ Congress.gov API error: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  console.error(`   ❌ Congress.gov API connection error: ${error.message}`);
}

// Test 4: OpenStates API
console.log('\n4️⃣ Testing OpenStates API...');
try {
  const response = await fetch(
    `https://v3.openstates.org/people?jurisdiction=al&apikey=${process.env.OPENSTATES_API_KEY}&per_page=1`
  );
  
  if (response.ok) {
    const data = await response.json();
    console.log(`   ✅ OpenStates API working (found ${data.results?.length || 0} people in test)`);
  } else {
    console.error(`   ❌ OpenStates API error: ${response.status} ${response.statusText}`);
  }
} catch (error) {
  console.error(`   ❌ OpenStates API connection error: ${error.message}`);
}

// Test 5: Database Tables
console.log('\n5️⃣ Checking required database tables...');
try {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Check officials table
  const { error: officialsError } = await supabase
    .from('officials')
    .select('id')
    .limit(1);
  
  if (officialsError) {
    console.error(`   ❌ officials table: ${officialsError.message}`);
  } else {
    console.log('   ✅ officials table exists');
  }
  
  // Check official_checksums table
  const { error: checksumsError } = await supabase
    .from('official_checksums')
    .select('id')
    .limit(1);
  
  if (checksumsError) {
    console.error(`   ❌ official_checksums table: ${checksumsError.message}`);
    console.log('   💡 Run the SQL commands in setup-tables.sql to create missing tables');
  } else {
    console.log('   ✅ official_checksums table exists');
  }
  
  // Check change_requests table
  const { error: changesError } = await supabase
    .from('change_requests')
    .select('id')
    .limit(1);
  
  if (changesError) {
    console.error(`   ❌ change_requests table: ${changesError.message}`);
    console.log('   💡 Run the SQL commands in setup-tables.sql to create missing tables');
  } else {
    console.log('   ✅ change_requests table exists');
  }
  
} catch (error) {
  console.error(`   ❌ Database tables check error: ${error.message}`);
}

// Test 6: Archive Directory
console.log('\n6️⃣ Checking archive directory...');
try {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const archiveDir = path.join(process.cwd(), 'archives');
  await fs.access(archiveDir);
  console.log('   ✅ Archive directory exists');
} catch (error) {
  console.error(`   ❌ Archive directory error: ${error.message}`);
}

console.log('\n🎉 Setup test completed!');
console.log('\n📝 Next steps:');
console.log('   1. Fix any ❌ issues shown above');
console.log('   2. Run: node scripts/dataPipeline/updatePipelineInteractive.js');
console.log('   3. Follow the interactive prompts for each state'); 