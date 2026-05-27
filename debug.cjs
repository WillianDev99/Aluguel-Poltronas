
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Buscando dados da tabela de veículos...');
    const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Erro ao buscar veículo:', error);
        return;
    }
    if (data && data.length > 0) {
        console.log('Colunas encontradas no veículo:', Object.keys(data[0]));
        console.log('Valores do veículo:', data[0]);
    } else {
        console.log('Nenhum veículo cadastrado na tabela de veículos para inspeção.');
    }
}

debug();
