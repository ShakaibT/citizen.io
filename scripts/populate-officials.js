#!/usr/bin/env node

const officialsData = {
  "Pennsylvania": [
    {
      "name": "Josh Shapiro",
      "office": "Governor",
      "party": "Democratic",
      "state": "PA",
      "level": "state",
      "office_type": "executive",
      "email": "governor@pa.gov",
      "website": "https://www.governor.pa.gov"
    },
    {
      "name": "Dave McCormick",
      "office": "U.S. Senator",
      "party": "Republican",
      "state": "PA",
      "level": "federal",
      "office_type": "legislative"
    },
    {
      "name": "John Fetterman",
      "office": "U.S. Senator",
      "party": "Democratic",
      "state": "PA",
      "level": "federal",
      "office_type": "legislative"
    }
  ],
  "Arizona": [
    {
      "name": "Katie Hobbs",
      "office": "Governor",
      "party": "Democratic",
      "state": "AZ",
      "level": "state",
      "office_type": "executive"
    },
    {
      "name": "Mark Kelly",
      "office": "U.S. Senator",
      "party": "Democratic",
      "state": "AZ",
      "level": "federal",
      "office_type": "legislative"
    },
    {
      "name": "Ruben Gallego",
      "office": "U.S. Senator",
      "party": "Democratic",
      "state": "AZ",
      "level": "federal",
      "office_type": "legislative"
    }
  ],
  "California": [
    {
      "name": "Gavin Newsom",
      "office": "Governor",
      "party": "Democratic",
      "state": "CA",
      "level": "state",
      "office_type": "executive"
    },
    {
      "name": "Alex Padilla",
      "office": "U.S. Senator",
      "party": "Democratic",
      "state": "CA",
      "level": "federal",
      "office_type": "legislative"
    },
    {
      "name": "Adam Schiff",
      "office": "U.S. Senator",
      "party": "Democratic",
      "state": "CA",
      "level": "federal",
      "office_type": "legislative"
    }
  ],
  "Texas": [
    {
      "name": "Greg Abbott",
      "office": "Governor",
      "party": "Republican",
      "state": "TX",
      "level": "state",
      "office_type": "executive"
    },
    {
      "name": "Ted Cruz",
      "office": "U.S. Senator",
      "party": "Republican",
      "state": "TX",
      "level": "federal",
      "office_type": "legislative"
    },
    {
      "name": "John Cornyn",
      "office": "U.S. Senator",
      "party": "Republican",
      "state": "TX",
      "level": "federal",
      "office_type": "legislative"
    }
  ],
  "Florida": [
    {
      "name": "Ron DeSantis",
      "office": "Governor",
      "party": "Republican",
      "state": "FL",
      "level": "state",
      "office_type": "executive"
    },
    {
      "name": "Marco Rubio",
      "office": "U.S. Senator",
      "party": "Republican",
      "state": "FL",
      "level": "federal",
      "office_type": "legislative"
    },
    {
      "name": "Rick Scott",
      "office": "U.S. Senator",
      "party": "Republican",
      "state": "FL",
      "level": "federal",
      "office_type": "legislative"
    }
  ]
}

async function populateOfficials() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3003'
  const authToken = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!authToken) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment')
    process.exit(1)
  }

  for (const [stateName, officials] of Object.entries(officialsData)) {
    try {
      console.log(`Adding officials for ${stateName}...`)
      
      const response = await fetch(`${baseUrl}/api/officials/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: stateName,
          officials: officials
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        console.log(`✅ Successfully added ${officials.length} officials for ${stateName}`)
      } else {
        console.error(`❌ Failed to add officials for ${stateName}:`, result.error)
      }
    } catch (error) {
      console.error(`❌ Error adding officials for ${stateName}:`, error.message)
    }
  }
}

populateOfficials().then(() => {
  console.log('🎉 Officials population complete!')
}).catch(error => {
  console.error('💥 Population failed:', error)
  process.exit(1)
}) 