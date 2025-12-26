// Update existing images to use thumbnail URLs with Supabase image transformation
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateThumbnails() {
  console.log('Starting thumbnail URL update...');

  try {
    // Fetch all images
    const { data: images, error: fetchError } = await supabase
      .from('images')
      .select('id, view_url, thumbnail_url');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${images.length} images to process`);

    let updated = 0;
    let skipped = 0;

    for (const image of images) {
      // Check if thumbnail_url already has query parameters
      if (image.thumbnail_url && image.thumbnail_url.includes('?')) {
        console.log(`Skipping image ${image.id} - already has thumbnail params`);
        skipped++;
        continue;
      }

      // Generate new thumbnail URL from view_url
      const baseUrl = image.view_url.split('?')[0]; // Remove any existing params
      const thumbnailUrl = `${baseUrl}?width=200&height=200&resize=cover&quality=80`;

      // Update the database
      const { error: updateError } = await supabase
        .from('images')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', image.id);

      if (updateError) {
        console.error(`Error updating image ${image.id}:`, updateError);
      } else {
        console.log(`Updated image ${image.id}`);
        updated++;
      }
    }

    console.log('\n=== Update Complete ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${images.length}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateThumbnails();
