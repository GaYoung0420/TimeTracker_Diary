// Generate real thumbnail files for existing images using sharp
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function generateThumbnails() {
  console.log('Starting thumbnail generation...');

  try {
    // Fetch all images
    const { data: images, error: fetchError } = await supabase
      .from('images')
      .select('id, view_url, thumbnail_url, file_id, date');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${images.length} images to process`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const image of images) {
      try {
        // Check if thumbnail already exists as separate file
        if (image.thumbnail_url && image.thumbnail_url.includes('_thumb.jpeg')) {
          console.log(`Skipping image ${image.id} - already has thumbnail file`);
          skipped++;
          continue;
        }

        // Download original image
        console.log(`Processing image ${image.id}...`);
        const response = await fetch(image.view_url);
        if (!response.ok) {
          throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Create thumbnail
        const thumbnailBuffer = await sharp(buffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 80 })
          .toBuffer();

        console.log(`Thumbnail created: ${thumbnailBuffer.length} bytes`);

        // Generate thumbnail path
        const timestamp = Date.now();
        const thumbnailFileName = `${image.file_id.replace(/\.[^.]+$/, '')}_thumb_${timestamp}.jpeg`;
        const thumbnailPath = `${image.date}/${thumbnailFileName}`;

        // Upload thumbnail
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('diary-images')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get thumbnail URL
        const { data: thumbUrlData } = supabase.storage
          .from('diary-images')
          .getPublicUrl(thumbnailPath);

        // Update database
        const { error: updateError } = await supabase
          .from('images')
          .update({ thumbnail_url: thumbUrlData.publicUrl })
          .eq('id', image.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`✓ Created thumbnail for image ${image.id}`);
        created++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`✗ Failed to process image ${image.id}:`, error.message);
        failed++;
      }
    }

    console.log('\n=== Generation Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${images.length}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

generateThumbnails();
