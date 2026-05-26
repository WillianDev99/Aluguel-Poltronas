
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStatuses() {
    const candidates = ['Ativo', 'Inativo', 'Inadimplente', 'Pendente', 'Bloqueado', 'Cancelado', 'Desativado'];

    // Pegar um ID de cliente existente
    const { data: clients } = await supabase.from('clients').select('id, name').limit(1);
    if (!clients || clients.length === 0) {
        console.log('Nenhum cliente encontrado para teste.');
        return;
    }

    const clientId = clients[0].id;
    console.log(`Testando no cliente: ${clients[0].name} (${clientId})`);

    for (const status of candidates) {
        const { error } = await supabase
            .from('clients')
            .update({ status })
            .eq('id', clientId);

        if (error) {
            console.log(`❌ [${status}]: FALHOU - ${error.message}`);
        } else {
            console.log(`✅ [${status}]: SUCESSO!`);
            // Reverter para Ativo
            await supabase.from('clients').update({ status: 'Ativo' }).eq('id', clientId);
        }
    }
}

testStatuses();
