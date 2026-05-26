
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Iniciando debug...');
    const { data, error } = await supabase
        .from('clients')
        .select('status')
        .limit(100);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    const statuses = [...new Set(data.map(d => d.status))];
    console.log('Status únicos no banco:', statuses);
}

debug();
