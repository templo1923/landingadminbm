import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
}

async function testSupabaseInsert() {
    console.log("Testing Supabase Insert via REST...");

    const testData = {
        waba_id: 'test_waba_12345',
        phone_number_id: 'test_phone_12345',
        access_token: 'test_access_token_permanent_mock',
        is_active: true
    };

    const url = `${supabaseUrl}/rest/v1/whatsapp_connections`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify(testData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Supabase insertion failed. Status:", response.status, errorText);
    } else {
        const data = await response.json();
        console.log("✅ Supabase insertion successful! Inserted data:");
        console.log(data);
    }
}

testSupabaseInsert();
