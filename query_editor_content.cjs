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

        let cleanContent = data.content;
        
        // Replace base64 images with placeholders to avoid truncation
        cleanContent = cleanContent.replace(/src="data:image\/[^"]+"/g, 'src="[BASE64_IMAGE_PLACEHOLDER]"');

        console.log('--- CLEANED SIGNATURE AREA ---');
        // Find the signature section (typically starts near the end)
        const index = cleanContent.indexOf('display: flex; justify-content: space-between;');
        if (index !== -1) {
            console.log(cleanContent.slice(index - 100));
        } else {
            console.log('Flex layout not found. Printing last 1000 chars:');
            console.log(cleanContent.slice(-1000));
        }
        console.log('--- END CLEANED SIGNATURE AREA ---');
    } catch (err) {
        console.error('Runtime error:', err);
    }
}

run();
