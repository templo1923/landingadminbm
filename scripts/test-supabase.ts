import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase env vars in .env.local");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseInsert() {
    console.log("Testing Supabase Insert...");

    const testData = {
        user_id: null, // Since we don't have auth yet, user_id can be null if your SQL allows it (it does, since it's just a foreign key, but wait: is it nullable? Yes, default is nullable unless NOT NULL is specified. Wait, the SQL definition says `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`. If it's nullable, we can insert NULL).
        waba_id: 'test_waba_12345',
        phone_number_id: 'test_phone_12345',
        access_token: 'test_access_token_permanent_mock',
        is_active: true
    };

    const { data, error } = await supabaseAdmin
        .from('whatsapp_connections')
        .upsert(testData, { onConflict: 'waba_id, phone_number_id' })
        .select();

    if (error) {
        console.error("❌ Supabase insertion failed:", error);
    } else {
        console.log("✅ Supabase insertion successful! Inserted data:");
        console.log(data);
    }
}

testSupabaseInsert();
