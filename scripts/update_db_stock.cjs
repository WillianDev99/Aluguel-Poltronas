const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jqkujyqinviwpkbdabya.supabase.co';
const supabaseKey = 'sb_publishable_9jlSxG1qTi_ojq4yW21CaQ_UmAAlROd';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('Iniciando migração do estoque de poltronas...');

    // 1. Buscar todos os veículos existentes
    const { data: vehicles, error: vehError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: true });

    if (vehError) {
        console.error('Erro ao buscar veículos:', vehError);
        return;
    }

    console.log(`Encontrados ${vehicles.length} veículos no banco.`);

    if (vehicles.length < 5) {
        console.error('Erro: O banco possui menos de 5 veículos. A migração necessita de pelo menos 5 registros para atualizar.');
        return;
    }

    // Identificar os IDs das 5 primeiras poltronas que manteremos
    const targetVehicles = vehicles.slice(0, 5);
    const targetIds = targetVehicles.map(v => v.id);

    console.log('IDs das 5 poltronas que serão mantidas:', targetIds);

    // 2. Atualizar as 5 poltronas para o modelo único
    const updatePromises = targetVehicles.map(async (v, index) => {
        const plate = `PL-00${index + 1}`;
        const payload = {
            brand: 'PÓS LEVE',
            model: 'Poltrona Motorizada Premium - Sistema Lift',
            year: 2026,
            category: 'Premium',
            color: 'Marrom Escuro / Bege',
            transmission: 'Automático',
            default_security_deposit: 400,
            default_insurance_value: 50,
            daily_rate: 15,
            status: 'Disponível',
            plate: plate,
            image_url: 'comfortcare_hero.png', // Aponta para o asset local correspondente
            km: 0,
            passengers: 1,
            doors: 0
        };

        console.log(`Atualizando veículo ID ${v.id} para placa ${plate}...`);
        const { error } = await supabase
            .from('vehicles')
            .update(payload)
            .eq('id', v.id);

        if (error) {
            console.error(`Erro ao atualizar veículo ${v.id}:`, error);
            throw error;
        }
    });

    try {
        await Promise.all(updatePromises);
        console.log('✅ As 5 poltronas de estoque foram atualizadas com sucesso.');
    } catch (err) {
        console.error('Falha ao atualizar as poltronas.', err);
        return;
    }

    // 3. Atualizar reservas de veículos extras para apontar para um veículo válido
    if (vehicles.length > 5) {
        const extraVehicles = vehicles.slice(5);
        const extraIds = extraVehicles.map(v => v.id);
        console.log(`Identificados ${extraVehicles.length} veículos extras para remoção:`, extraIds);

        // Mapear reservas que apontam para esses veículos extras
        const { data: reservations, error: resError } = await supabase
            .from('reservations')
            .select('id, vehicle_id')
            .in('vehicle_id', extraIds);

        if (resError) {
            console.error('Erro ao buscar reservas dos veículos extras:', resError);
            return;
        }

        if (reservations && reservations.length > 0) {
            console.log(`Reassociando ${reservations.length} reservas órfãs para a primeira poltrona válida...`);
            const fallbackId = targetIds[0];

            const reassignPromises = reservations.map(async (r) => {
                const { error } = await supabase
                    .from('reservations')
                    .update({ vehicle_id: fallbackId })
                    .eq('id', r.id);

                if (error) {
                    console.error(`Erro ao reassociar reserva ${r.id}:`, error);
                    throw error;
                }
            });

            try {
                await Promise.all(reassignPromises);
                console.log('✅ Reservas órfãs reassociadas com sucesso.');
            } catch (err) {
                console.error('Falha ao reassociar reservas.', err);
                return;
            }
        }

        // 4. Deletar os veículos extras
        console.log('Removendo veículos extras do banco de dados...');
        const deletePromises = extraIds.map(async (id) => {
            const { error } = await supabase
                .from('vehicles')
                .delete()
                .eq('id', id);

            if (error) {
                console.error(`Erro ao deletar veículo extra ${id}:`, error);
                throw error;
            }
        });

        try {
            await Promise.all(deletePromises);
            console.log('✅ Veículos extras removidos com sucesso.');
        } catch (err) {
            console.error('Falha ao remover veículos extras.', err);
            return;
        }
    }

    console.log('🎉 Migração concluída com sucesso!');
}

runMigration();
