const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    try {
        const { data, error } = await supabase
            .from('contract_templates')
            .select('*');

        if (error) {
            console.error('Database error:', error);
            return;
        }

        console.log(`Found ${data.length} templates.`);
        for (const row of data) {
            console.log(`- Template id: ${row.id}, name: ${row.name}`);
            console.log('  Content preview (last 1500 chars):');
            console.log(row.content ? row.content.slice(-1500) : '');
            console.log('-------------------------------------------');
        }
    } catch (err) {
        console.error('Runtime error:', err);
    }
}

run();
