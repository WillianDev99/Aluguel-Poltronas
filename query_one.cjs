const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase
            .from('rental_contracts')
            .select('content')
            .eq('rental_id', '38e23765-6e4a-4360-b8e1-9483487d8338')
            .single();

        if (error) {
            console.error('Database error:', error);
            return;
        }

        console.log('--- RAW HTML CONTENT ---');
        console.log(data.content);
        console.log('--- END RAW HTML CONTENT ---');
    } catch (err) {
        console.error('Runtime error:', err);
    }
}

run();
