#!/usr/bin/env node

/**
 * Interactive Data Pipeline for Officials Updates
 * 
 * This script fetches federal officials from Congress.gov API and state officials from OpenStates API,
 * then provides interactive state-by-state confirmation before updating the Supabase database.
 * 
 * Required Environment Variables:
 * - CONGRESS_GOV_API_KEY: API key for Congress.gov API (get from https://api.congress.gov/sign-up/)
 * - OPENSTATES_API_KEY: API key for OpenStates API (get from https://openstates.org/api/)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: Email configuration for summary notifications
 * 
 * Usage: node scripts/dataPipeline/updatePipelineInteractive.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import readline from 'readline';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env.local' });

// Environment variables validation
const requiredEnvVars = [
  'CONGRESS_API_KEY',
  'OPENSTATES_API_KEY', 
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// API Configuration
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const OPENSTATES_API_BASE = 'https://v3.openstates.org';

// All 50 U.S. state postal codes
const stateCodes = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD',
  'ME', 'MI', 'MN', 'MO', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH',
  'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VA', 'VT', 'WA', 'WI', 'WV', 'WY'
];

// Get today's date for archiving
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

/**
 * Helper function to prompt user for Y/n confirmation
 */
function promptYesNo() {
  return new Promise(resolve => {
    const rl = readline.createInterface({ 
      input: process.stdin, 
      output: process.stdout 
    });
    rl.question('', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Compute MD5 checksum for an official's key fields
 */
function computeChecksum(name, party, startDate, officeIdentifier) {
  const data = `${name}|${party || ''}|${startDate || ''}|${officeIdentifier}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Ensure archive directory exists
 */
async function ensureArchiveDir() {
  const archiveDir = path.join(process.cwd(), 'archives', today);
  try {
    await fs.mkdir(archiveDir, { recursive: true });
  } catch (error) {
    console.error(`❌ Failed to create archive directory: ${error.message}`);
    throw error;
  }
  return archiveDir;
}

/**
 * Check if archive file already exists for today
 */
async function archiveFileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save JSON data to archive file
 */
async function saveToArchive(data, filePath) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`📁 Archived to: ${filePath}`);
  } catch (error) {
    console.error(`❌ Failed to save archive: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch federal officials from Congress.gov API
 */
async function fetchFederalOfficials(state) {
  const officials = [];
  const archiveDir = await ensureArchiveDir();
  
  // Fetch Senate members
  const senateFile = path.join(archiveDir, `${state}-senate.json`);
  let senateData = [];
  
  if (await archiveFileExists(senateFile)) {
    console.log(`📁 Using cached Senate data for ${state}`);
    const fileContent = await fs.readFile(senateFile, 'utf8');
    senateData = JSON.parse(fileContent);
  } else {
    console.log(`🔄 Fetching Senate members for ${state}...`);
    try {
      const response = await fetch(
        `${CONGRESS_API_BASE}/member?api_key=${process.env.CONGRESS_API_KEY}&limit=600`
      );
      
      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // Filter for current senators from this state
      senateData = data.members?.filter(member => {
        const currentTerm = member.terms?.item?.[member.terms.item.length - 1];
        return currentTerm?.chamber === 'Senate' && 
               (member.state === state || member.stateName?.includes(state));
      }) || [];
      
      await saveToArchive(senateData, senateFile);
    } catch (error) {
      console.error(`❌ Failed to fetch Senate data for ${state}: ${error.message}`);
      senateData = [];
    }
  }
  
  // Fetch House members
  const houseFile = path.join(archiveDir, `${state}-house.json`);
  let houseData = [];
  
  if (await archiveFileExists(houseFile)) {
    console.log(`📁 Using cached House data for ${state}`);
    const fileContent = await fs.readFile(houseFile, 'utf8');
    houseData = JSON.parse(fileContent);
  } else {
    console.log(`🔄 Fetching House members for ${state}...`);
    try {
      const response = await fetch(
        `${CONGRESS_API_BASE}/member?api_key=${process.env.CONGRESS_API_KEY}&limit=600`
      );
      
      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      // Filter for current representatives from this state
      houseData = data.members?.filter(member => {
        const currentTerm = member.terms?.item?.[member.terms.item.length - 1];
        return currentTerm?.chamber === 'House of Representatives' && 
               (member.state === state || member.stateName?.includes(state));
      }) || [];
      
      await saveToArchive(houseData, houseFile);
    } catch (error) {
      console.error(`❌ Failed to fetch House data for ${state}: ${error.message}`);
      houseData = [];
    }
  }
  
  // Process Senate members
  for (const member of senateData) {
    const currentTerm = member.terms?.item?.[member.terms.item.length - 1];
    officials.push({
      externalId: member.bioguideId,
      name: formatMemberName(member.name),
      party: normalizePartyName(member.partyName),
      office: 'U.S. Senator',
      state: state,
      level: 'federal',
      office_type: 'legislative',
      start_date: currentTerm?.startYear,
      end_date: currentTerm?.endYear,
      bioguide_id: member.bioguideId,
      congress_url: member.url,
      officeIdentifier: `U.S. Senator—${state}`
    });
  }
  
  // Process House members
  for (const member of houseData) {
    const currentTerm = member.terms?.item?.[member.terms.item.length - 1];
    const district = currentTerm?.district || 'At-Large';
    officials.push({
      externalId: member.bioguideId,
      name: formatMemberName(member.name),
      party: normalizePartyName(member.partyName),
      office: 'U.S. Representative',
      state: state,
      level: 'federal',
      office_type: 'legislative',
      district: district.toString(),
      start_date: currentTerm?.startYear,
      end_date: currentTerm?.endYear,
      bioguide_id: member.bioguideId,
      congress_url: member.url,
      officeIdentifier: `U.S. House—${state}-${district}`
    });
  }
  
  return officials;
}

/**
 * Fetch state officials from OpenStates API
 */
async function fetchStateOfficials(state) {
  const archiveDir = await ensureArchiveDir();
  const stateFile = path.join(archiveDir, `${state}-openstates.json`);
  let stateData = [];
  
  if (await archiveFileExists(stateFile)) {
    console.log(`📁 Using cached OpenStates data for ${state}`);
    const fileContent = await fs.readFile(stateFile, 'utf8');
    stateData = JSON.parse(fileContent);
  } else {
    console.log(`🔄 Fetching state officials for ${state}...`);
    try {
      const response = await fetch(
        `${OPENSTATES_API_BASE}/people?jurisdiction=${state.toLowerCase()}&apikey=${process.env.OPENSTATES_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`OpenStates API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      stateData = data.results || [];
      
      await saveToArchive(stateData, stateFile);
    } catch (error) {
      console.error(`❌ Failed to fetch OpenStates data for ${state}: ${error.message}`);
      stateData = [];
    }
  }
  
  const officials = [];
  
  // Process state officials
  for (const person of stateData) {
    const currentRole = person.current_role;
    if (!currentRole) continue;
    
    const district = currentRole.district ? `-${currentRole.district}` : '';
    const officeIdentifier = `${currentRole.title}—${state}${district}`;
    
    officials.push({
      externalId: person.id,
      name: person.name,
      party: person.party?.[0]?.name || person.current_role?.party,
      office: currentRole.title,
      state: state,
      level: 'state',
      office_type: currentRole.type === 'upper' || currentRole.type === 'lower' ? 'legislative' : 'executive',
      district: currentRole.district,
      start_date: currentRole.start_date,
      end_date: currentRole.end_date,
      email: person.email,
      website: person.links?.[0]?.url,
      officeIdentifier: officeIdentifier
    });
  }
  
  return officials;
}

/**
 * Helper function to format member names from "Last, First" to "First Last"
 */
function formatMemberName(name) {
  if (name && name.includes(',')) {
    const parts = name.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return `${parts[1]} ${parts[0]}`;
    }
  }
  return name;
}

/**
 * Helper function to normalize party names
 */
function normalizePartyName(partyName) {
  if (!partyName) return 'Unknown';
  
  const normalized = partyName.toLowerCase();
  if (normalized.includes('republican')) return 'Republican';
  if (normalized.includes('democratic') || normalized.includes('democrat')) return 'Democratic';
  if (normalized.includes('independent')) return 'Independent';
  
  return partyName;
}

/**
 * Compare official against existing checksum in database
 */
async function getExistingChecksum(externalId) {
  try {
    const { data, error } = await supabase
      .from('official_checksums')
      .select('*')
      .eq('official_id', externalId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error(`❌ Error fetching checksum for ${externalId}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error in getExistingChecksum for ${externalId}:`, error);
    return null;
  }
}

/**
 * Create change request in database
 */
async function enqueueChange(externalId, officeId, payload) {
  try {
    const { error } = await supabase
      .from('change_requests')
      .insert({
        external_id: externalId,
        office_id: officeId,
        payload: payload,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error(`❌ Error creating change request for ${externalId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error in enqueueChange for ${externalId}:`, error);
    throw error;
  }
}

/**
 * Update or insert checksum in database
 */
async function upsertChecksum(externalId, checksum) {
  try {
    const { error } = await supabase
      .from('official_checksums')
      .upsert({
        official_id: externalId,
        last_checksum: checksum,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'official_id'
      });
    
    if (error) {
      console.error(`❌ Error upserting checksum for ${externalId}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error in upsertChecksum for ${externalId}:`, error);
    throw error;
  }
}

/**
 * Process a single state and return diffs
 */
async function processState(state) {
  console.log(`\n🏛️ Processing ${state}...`);
  
  const stateDiffs = [];
  
  try {
    // Fetch federal officials
    const federalOfficials = await fetchFederalOfficials(state);
    console.log(`📊 Found ${federalOfficials.length} federal officials for ${state}`);
    
    // Fetch state officials
    const stateOfficials = await fetchStateOfficials(state);
    console.log(`📊 Found ${stateOfficials.length} state officials for ${state}`);
    
    // Combine all officials
    const allOfficials = [...federalOfficials, ...stateOfficials];
    
    // Process each official
    for (const official of allOfficials) {
      const newChecksum = computeChecksum(
        official.name,
        official.party,
        official.start_date,
        official.officeIdentifier
      );
      
      const existingChecksumRow = await getExistingChecksum(official.externalId);
      
      if (!existingChecksumRow) {
        // New official
        stateDiffs.push({
          externalId: official.externalId,
          officeIdentifier: official.officeIdentifier,
          isNew: true,
          diffs: {},
          fullRecord: official,
          newChecksum: newChecksum
        });
      } else if (existingChecksumRow.last_checksum !== newChecksum) {
        // Updated official - we'd need to fetch the existing record to show diffs
        // For simplicity, we'll just mark it as updated
        stateDiffs.push({
          externalId: official.externalId,
          officeIdentifier: official.officeIdentifier,
          isNew: false,
          diffs: {
            checksum: [existingChecksumRow.last_checksum, newChecksum]
          },
          fullRecord: official,
          newChecksum: newChecksum
        });
      }
    }
    
    return stateDiffs;
    
  } catch (error) {
    console.error(`❌ Error processing state ${state}:`, error.message);
    return [];
  }
}

/**
 * Apply changes for a state after user confirmation
 */
async function applyStateChanges(stateDiffs) {
  let appliedCount = 0;
  
  for (const diff of stateDiffs) {
    try {
      if (diff.isNew) {
        // Create change request for new official
        await enqueueChange(diff.externalId, null, {
          new_official: diff.fullRecord
        });
      } else {
        // Create change request for updated official
        await enqueueChange(diff.externalId, null, diff.diffs);
      }
      
      // Update checksum
      await upsertChecksum(diff.externalId, diff.newChecksum);
      appliedCount++;
      
    } catch (error) {
      console.error(`❌ Failed to apply change for ${diff.externalId}:`, error.message);
    }
  }
  
  return appliedCount;
}

/**
 * Send summary email
 */
async function sendSummaryEmail(totalChangeRequests, processedStates) {
  if (!process.env.SMTP_HOST) {
    console.log('📧 Email configuration not found, skipping summary email');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    const subject = `Officials Pipeline Summary - ${totalChangeRequests} change requests created`;
    const text = `
Interactive Officials Pipeline Completed

Summary:
- Total change requests created: ${totalChangeRequests}
- States processed: ${processedStates}
- Date: ${new Date().toISOString()}

The pipeline has completed successfully. Please review the change requests in the admin dashboard.
    `;
    
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: subject,
      text: text
    });
    
    console.log('📧 Summary email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send summary email:', error.message);
  }
}

/**
 * Main pipeline function
 */
async function runInteractivePipeline() {
  console.log('🚀 Starting Interactive Officials Data Pipeline');
  console.log(`📅 Date: ${today}`);
  console.log(`🗺️ Processing ${stateCodes.length} states\n`);
  
  let totalChangeRequests = 0;
  let processedStates = 0;
  
  for (const state of stateCodes) {
    try {
      const stateDiffs = await processState(state);
      
      if (stateDiffs.length === 0) {
        console.log(`✅ No changes found for ${state}\n`);
        continue;
      }
      
      // Display changes and prompt for confirmation
      console.log(`\n=== ${state} DRAFT CHANGES ===`);
      stateDiffs.forEach(diff => {
        if (diff.isNew) {
          console.log(`• [NEW] ${diff.fullRecord.name} → Office: ${diff.officeIdentifier} (ℹ️ party: ${diff.fullRecord.party}, start: ${diff.fullRecord.start_date})`);
        } else {
          console.log(`• [UPDATE] ID=${diff.externalId} Changes:`);
          for (const [field, [oldv, newv]] of Object.entries(diff.diffs)) {
            console.log(`    – ${field}: "${oldv}" → "${newv}"`);
          }
        }
      });
      
      console.log(`\nApply all of the above changes for state ${state}? (Y/n): `);
      const answer = await promptYesNo();
      
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== '') {
        console.log(`⏭️ Skipping all ${state} changes.\n`);
        continue;
      }
      
      // Apply changes
      console.log(`🔄 Applying changes for ${state}...`);
      const appliedCount = await applyStateChanges(stateDiffs);
      console.log(`✅ Applied ${appliedCount}/${stateDiffs.length} changes for ${state}\n`);
      
      totalChangeRequests += appliedCount;
      processedStates++;
      
    } catch (error) {
      console.error(`❌ Error processing state ${state}:`, error.message);
      console.log(`⏭️ Continuing to next state...\n`);
    }
  }
  
  console.log(`\n🎉 Pipeline completed!`);
  console.log(`📊 Total change requests created: ${totalChangeRequests}`);
  console.log(`🗺️ States processed: ${processedStates}/${stateCodes.length}`);
  
  // Send summary email
  await sendSummaryEmail(totalChangeRequests, processedStates);
  
  console.log('\n✅ All states processed. Exiting...');
}

// Run the pipeline
if (import.meta.url === `file://${process.argv[1]}`) {
  runInteractivePipeline().catch(error => {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  });
}

export { runInteractivePipeline }; 