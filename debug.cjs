const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    console.log('Buscando todas as reservas...');
    const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('id, vehicle_id, pickup_date, return_date, status');

    if (resError) {
        console.error('Erro ao buscar reservas:', resError);
        return;
    }
    console.log(`Total de reservas: ${reservations.length}`);
    reservations.forEach(r => {
        console.log(`- ID: ${r.id}, VehicleID: ${r.vehicle_id}, Pickup: ${r.pickup_date}, Return: ${r.return_date}, Status: ${r.status}`);
    });
}

debug();
