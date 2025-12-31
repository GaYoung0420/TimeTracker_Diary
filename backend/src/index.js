import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { setupEventsAPI } from './events-api.js';
import { setupCategoriesAPI } from './categories-api.js';
import { setupTodoCategoriesAPI } from './todo-categories-api.js';
import { setupAuthAPI } from './auth-api.js';
import { setupCalendarsAPI } from './calendars-api.js';
import { requireAuth } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (works both in dev and production)
const backendDir = path.join(__dirname, '..');
const envPath = path.join(backendDir, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

// Debug: Check if env vars are loaded
console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'exists' : 'MISSING');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'exists' : 'MISSING');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// Simple in-memory cache for monthly stats (key: 'YYYY-MM')
const monthlyStatsCache = new Map();

// Google Calendar API setup
const calendar = google.calendar('v3');

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // Same-origin via Vite proxy in dev, same domain in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth Strategy
const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/auth/google/callback';
console.log('=== Google OAuth Configuration ===');
console.log('GOOGLE_CALLBACK_URL:', callbackURL);
console.log('==================================');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  },
  (accessToken, refreshToken, profile, done) => {
    // Store tokens in user object
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      accessToken,
      refreshToken
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Middleware
// In production on Render, frontend and backend are served from the same origin
// So we need to allow the deployed domain as well
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
  // Render frontend domain
  'https://timetracker-diary.onrender.com',
  // Production domain
  'https://timetrackerdiary.com',
  'http://timetrackerdiary.com'
];

// Add production domain if available
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL);
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL.replace('http://', 'https://'));
}

// Add frontend URL from environment variable
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

console.log('=== CORS Allowed Origins ===');
console.log(allowedOrigins);
console.log('============================');

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Serve static files EARLY - before any route handlers
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
console.log('=== Static File Serving Setup ===');
console.log('__dirname:', __dirname);
console.log('frontendDistPath:', frontendDistPath);

// Check if dist exists and log its contents
import('fs').then(fs => {
  try {
    const exists = fs.existsSync(frontendDistPath);
    console.log('dist folder exists:', exists);
    if (exists) {
      const files = fs.readdirSync(frontendDistPath);
      console.log('Files in dist:', files);

      // Check assets folder
      const assetsPath = path.join(frontendDistPath, 'assets');
      if (fs.existsSync(assetsPath)) {
        const assetFiles = fs.readdirSync(assetsPath);
        console.log('Files in dist/assets:', assetFiles);
      } else {
        console.log('WARNING: assets folder does not exist!');
      }
    } else {
      console.log('ERROR: dist folder does not exist at', frontendDistPath);
    }
  } catch (err) {
    console.error('Error checking dist folder:', err);
  }
  console.log('=================================');
});

app.use(express.static(frontendDistPath, {
  maxAge: '1d',
  etag: true
}));

/* ========================================
   Health & Test
   ======================================== */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TimeTracker API is running' });
});

app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('todos').select('*').limit(1);
    if (error) throw error;
    res.json({ message: 'API and Supabase connected successfully', supabaseConfigured: true });
  } catch (error) {
    res.json({ message: 'Supabase connection needs configuration', error: error.message });
  }
});

// Test Storage bucket
app.get('/api/test/storage', async (req, res) => {
  try {
    console.log('Testing Supabase Storage...');

    // List buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('Buckets list error:', bucketsError);
      return res.json({
        success: false,
        error: 'Failed to list buckets',
        details: bucketsError
      });
    }

    console.log('Available buckets:', buckets);

    // Check if diary-images bucket exists
    const diaryBucket = buckets.find(b => b.name === 'diary-images');

    // Try to upload a test file to verify upload permissions
    let uploadTest = { attempted: false };
    try {
      const testFileName = `test-${Date.now()}.txt`;
      const testContent = Buffer.from('Test upload to verify permissions');

      console.log('Attempting test upload to diary-images bucket...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('diary-images')
        .upload(testFileName, testContent, {
          contentType: 'text/plain',
          upsert: false
        });

      if (uploadError) {
        console.error('Test upload failed:', uploadError);
        uploadTest = {
          attempted: true,
          success: false,
          error: uploadError.message,
          details: uploadError
        };
      } else {
        console.log('Test upload succeeded:', uploadData);
        uploadTest = {
          attempted: true,
          success: true,
          path: uploadData.path
        };

        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('diary-images')
          .remove([testFileName]);

        if (deleteError) {
          console.warn('Failed to delete test file:', deleteError);
        } else {
          console.log('Test file cleaned up successfully');
        }
      }
    } catch (uploadErr) {
      console.error('Test upload exception:', uploadErr);
      uploadTest = {
        attempted: true,
        success: false,
        error: uploadErr.message,
        exception: true
      };
    }

    res.json({
      success: true,
      buckets: buckets.map(b => ({ name: b.name, public: b.public })),
      diaryImagesExists: !!diaryBucket,
      diaryBucketInfo: diaryBucket || null,
      uploadTest
    });
  } catch (error) {
    console.error('Storage test error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/* ========================================
   OAuth Authentication Routes
   ======================================== */
app.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    accessType: 'offline',
    prompt: 'consent'
  })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to root (frontend)
    console.log('OAuth callback - User authenticated:', req.user?.email);
    console.log('OAuth callback - Session ID:', req.sessionID);

    // Ensure session is saved before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
      }
      res.redirect('/');
    });
  }
);

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req, res) => {
  console.log('Auth check - Session ID:', req.sessionID);
  console.log('Auth check - Is authenticated:', req.isAuthenticated());
  console.log('Auth check - User:', req.user?.email);

  if (req.isAuthenticated()) {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      }
    });
  } else {
    res.json({ success: false, user: null });
  }
});

/* ========================================
   Daily Data - Batch Load
   ======================================== */
app.get('/api/daily/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.session.userId;

    const [todosResult, reflectionResult, imagesResult, routinesResult, checksResult] = await Promise.all([
      supabase.from('todos').select('*, category:categories(id, name, color)').eq('user_id', userId).eq('date', date).order('order').order('id'),
      supabase.from('reflections').select('*').eq('user_id', userId).eq('date', date).single(),
      supabase.from('images').select('*').eq('user_id', userId).eq('date', date).order('id'),
      supabase.from('routines').select('*').eq('user_id', userId).eq('active', true).order('order'),
      supabase.from('routine_checks').select('*').eq('user_id', userId).eq('date', date)
    ]);

    const routineChecks = {};
    if (checksResult.data) {
      checksResult.data.forEach(check => {
        routineChecks[check.routine_id] = check.checked;
      });
    }

    // Generate fresh signed URLs for images (valid for 1 hour)
    const imagesWithSignedUrls = await Promise.all(
      (imagesResult.data || []).map(async (image) => {
        const filePath = `${image.date}/${image.file_id}`;
        const thumbnailPath = filePath.replace(/\.([^.]+)$/, '_thumb.jpeg');

        try {
          const [viewUrlResult, thumbUrlResult] = await Promise.all([
            supabase.storage.from('diary-images').createSignedUrl(filePath, 3600),
            supabase.storage.from('diary-images').createSignedUrl(thumbnailPath, 3600)
          ]);

          return {
            ...image,
            view_url: viewUrlResult.data?.signedUrl || image.view_url,
            thumbnail_url: thumbUrlResult.data?.signedUrl || image.thumbnail_url
          };
        } catch (error) {
          console.error('Error generating signed URLs for image:', image.id, error);
          return image; // Return original if signed URL generation fails
        }
      })
    );

    res.json({
      success: true,
      data: {
        todos: todosResult.data || [],
        reflection: reflectionResult.data?.reflection_text || '',
        mood: reflectionResult.data?.mood || null,
        images: imagesWithSignedUrls,
        routines: routinesResult.data || [],
        routineChecks
      }
    });
  } catch (error) {
    console.error('Error loading daily data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Daily Data - Batch Save
   ======================================== */
app.post('/api/daily/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const { todos, mood, reflection, images } = req.body;
    const userId = req.session.userId;

    // Save Todos
    if (todos) {
      await supabase.from('todos').delete().eq('user_id', userId).eq('date', date);
      if (todos.length > 0) {
        const todosToInsert = todos.map(t => ({
          date,
          text: t.text,
          completed: t.completed,
          category_id: t.category_id || null,
          order: t.order !== undefined ? t.order : 9999,
          user_id: userId
        }));
        await supabase.from('todos').insert(todosToInsert);
      }
    }

    // Save Reflection
    if (mood !== undefined || reflection !== undefined) {
      const { error } = await supabase.from('reflections').upsert({
        date,
        mood,
        reflection_text: reflection,
        user_id: userId
      }, { onConflict: 'user_id,date' });
      if (error) throw error;
    }

    // Save Images
    if (images) {
      await supabase.from('images').delete().eq('user_id', userId).eq('date', date);
      if (images.length > 0) {
        const imagesToInsert = images.map(img => ({
          date,
          file_id: img.fileId,
          file_name: img.name,
          thumbnail_url: img.thumbnailUrl,
          view_url: img.viewUrl,
          user_id: userId
        }));
        await supabase.from('images').insert(imagesToInsert);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving daily data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Todos
   ======================================== */
app.post('/api/todos', requireAuth, async (req, res) => {
  try {
    const { date, text, category_id, todo_category_id, scheduled_time, duration } = req.body;
    const userId = req.session.userId;

    // Get the highest order for this date
    const { data: existingTodos } = await supabase
      .from('todos')
      .select('order')
      .eq('user_id', userId)
      .eq('date', date)
      .order('order', { ascending: false })
      .limit(1);

    const nextOrder = existingTodos && existingTodos.length > 0 ? existingTodos[0].order + 1 : 0;

    const { data, error } = await supabase
      .from('todos')
      .insert({
        date,
        text,
        category_id,
        todo_category_id,
        scheduled_time,
        duration,
        completed: false,
        order: nextOrder,
        user_id: userId
      })
      .select('*, category:categories(id, name, color)')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase.from('todos').update(updates).eq('id', id).eq('user_id', req.session.userId).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/todos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', req.session.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reorder Todos
app.post('/api/todos/reorder', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body;
    const userId = req.session.userId;

    // Update each todo's order
    for (const update of updates) {
      const { error } = await supabase
        .from('todos')
        .update({ order: update.order })
        .eq('id', update.id)
        .eq('user_id', userId);

      if (error) throw error;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Increment Pomodoro Count
app.post('/api/todos/:id/pomodoro', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Fetch current pomodoro count
    const { data: currentTodo, error: fetchError } = await supabase
      .from('todos')
      .select('pomodoro_count')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newCount = (currentTodo.pomodoro_count || 0) + 1;

    // Update pomodoro count
    const { data, error } = await supabase
      .from('todos')
      .update({ pomodoro_count: newCount })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Images
   ======================================== */
// Debug endpoint to check images table schema
app.get('/api/images/schema', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .limit(1);

    if (error) throw error;

    const schema = data && data.length > 0 ? Object.keys(data[0]) : [];
    res.json({ success: true, schema, sample: data[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/images/upload', requireAuth, upload.single('image'), async (req, res) => {
  try {
    console.log('=== Image Upload Request ===');
    console.log('Date:', req.body.date);
    console.log('File:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { date } = req.body;
    const file = req.file;
    const userId = req.session.userId;

    if (!file) {
      console.log('ERROR: No file in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${date}_${timestamp}.${fileExt}`;
    const filePath = `${date}/${fileName}`;
    const thumbnailFileName = `${date}_${timestamp}_thumb.jpeg`;
    const thumbnailPath = `${date}/${thumbnailFileName}`;

    console.log('Uploading to Supabase Storage:', filePath);

    // Create thumbnail using sharp (200x200, 80% quality)
    // rotate() auto-rotates based on EXIF orientation
    const thumbnailBuffer = await sharp(file.buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(200, 200, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('Thumbnail created:', thumbnailBuffer.length, 'bytes');

    // Upload original image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('diary-images')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      throw uploadError;
    }

    // Upload thumbnail
    const { data: thumbUploadData, error: thumbUploadError } = await supabase.storage
      .from('diary-images')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (thumbUploadError) {
      console.error('Thumbnail upload error:', thumbUploadError);
      // Don't throw - continue with original image
    }

    console.log('Upload successful:', uploadData);

    // Generate signed URLs (valid for 1 hour = 3600 seconds)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('diary-images')
      .createSignedUrl(filePath, 3600);

    if (signedUrlError) {
      console.error('Signed URL creation error:', signedUrlError);
      throw signedUrlError;
    }

    const { data: thumbSignedUrlData, error: thumbSignedUrlError } = await supabase.storage
      .from('diary-images')
      .createSignedUrl(thumbnailPath, 3600);

    console.log('Signed URL created:', signedUrlData.signedUrl);
    if (!thumbUploadError && !thumbSignedUrlError) {
      console.log('Thumbnail Signed URL created:', thumbSignedUrlData.signedUrl);
    }

    const thumbnailUrl = (thumbUploadError || thumbSignedUrlError)
      ? signedUrlData.signedUrl
      : thumbSignedUrlData.signedUrl;

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('images')
      .insert({
        date,
        file_id: fileName,
        file_name: file.originalname,
        thumbnail_url: thumbnailUrl,
        view_url: signedUrlData.signedUrl,
        user_id: userId
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database insert error:', dbError);
      throw dbError;
    }

    console.log('Database insert successful:', dbData.id);

    // Invalidate monthly cache for the affected month
    if (dbData && dbData.date) {
      const monthKey = dbData.date.slice(0,7); // 'YYYY-MM'
      monthlyStatsCache.delete(monthKey);
    }

    console.log('=== Image Upload Complete ===');
    res.json({ success: true, data: dbData });
  } catch (error) {
    console.error('=== Image Upload Error ===');
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.details || error.hint || 'Unknown error'
    });
  }
});

app.delete('/api/images/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    // Get image info from database
    const { data: image, error: fetchError } = await supabase
      .from('images')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Delete from storage
    const filePath = `${image.date}/${image.file_id}`;
    const { error: storageError } = await supabase.storage
      .from('diary-images')
      .remove([filePath]);

    if (storageError) console.error('Storage deletion error:', storageError);

    // Delete from database
    const { error: dbError } = await supabase
      .from('images')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) throw dbError;

    // Invalidate monthly cache for the affected month
    if (image && image.date) {
      const monthKey = image.date.slice(0,7);
      monthlyStatsCache.delete(monthKey);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Routines
   ======================================== */
app.get('/api/routines', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('routines').select('*').eq('user_id', req.session.userId).eq('active', true).order('order');
    if (error) throw error;

    // Parse weekdays JSON string to array
    const parsedData = data.map(routine => {
      let parsedWeekdays = null;
      if (routine.weekdays) {
        try {
          parsedWeekdays = JSON.parse(routine.weekdays);
        } catch (e) {
          console.error('Failed to parse weekdays for routine:', routine.id, routine.weekdays, e);
          parsedWeekdays = null;
        }
      }
      return {
        ...routine,
        weekdays: parsedWeekdays
      };
    });

    res.json({ success: true, data: parsedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/routines', requireAuth, async (req, res) => {
  try {
    const { text, emoji, order, scheduled_time, duration, weekdays, start_date, end_date } = req.body;
    const { data, error } = await supabase.from('routines').insert({
      text,
      emoji: emoji || '✓',
      active: true,
      order: order || 9999,
      scheduled_time: scheduled_time || null,
      duration: duration || 30,
      weekdays: weekdays ? JSON.stringify(weekdays) : null,
      start_date: start_date || null,
      end_date: end_date || null,
      user_id: req.session.userId
    }).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.patch('/api/routines/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Convert weekdays array to JSON string if provided
    if (updates.weekdays) {
      updates.weekdays = JSON.stringify(updates.weekdays);
    }

    const { data, error } = await supabase.from('routines').update(updates).eq('id', id).eq('user_id', req.session.userId).select().single();
    if (error) throw error;

    // Parse weekdays back to array for response
    const parsedData = {
      ...data,
      weekdays: data.weekdays ? JSON.parse(data.weekdays) : null
    };

    res.json({ success: true, data: parsedData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/routines/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('routines').update({ active: false }).eq('id', id).eq('user_id', req.session.userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/routines/reorder', requireAuth, async (req, res) => {
  try {
    const { updates } = req.body;
    const userId = req.session.userId;

    const updatePromises = updates.map(update =>
      supabase.from('routines').update({ order: update.order }).eq('id', update.id).eq('user_id', userId)
    );

    const results = await Promise.all(updatePromises);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      throw new Error('Failed to update some routines');
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Routine Checks
   ======================================== */
app.post('/api/routine-checks', requireAuth, async (req, res) => {
  try {
    const { date, routine_id, checked } = req.body;
    const userId = req.session.userId;
    const { data, error } = await supabase.from('routine_checks')
      .upsert({ date, routine_id, checked, user_id: userId }, { onConflict: 'user_id,routine_id,date' })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Google Calendar - Get Calendars
   ======================================== */
// DEPRECATED: This endpoint is replaced by /api/calendars from calendars-api.js
// which supports iCloud, Google Calendar, Outlook, and other calendar types
/*
app.get('/api/calendars', async (req, res) => {
  try {
    console.log('=== /api/calendars request ===');
    console.log('Authenticated:', req.isAuthenticated());
    console.log('User:', req.user?.email);
    console.log('Session ID:', req.sessionID);

    if (!req.isAuthenticated()) {
      console.log('User not authenticated - returning 401');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    const response = await calendar.calendarList.list({ auth: oauth2Client });

    console.log('Calendar API Response:', JSON.stringify(response.data, null, 2));

    const calendars = (response.data.items || [])
      .map(cal => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
        isSelected: true
      }));

    console.log('Returning calendars:', calendars.length);
    res.json({ success: true, calendars, timestamp: Date.now() });
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
*/

/* ========================================
   Google Calendar - Get Events for Date
   ======================================== */
app.post('/api/calendar/events', async (req, res) => {
  try {
    console.log('=== /api/calendar/events request ===');
    console.log('Authenticated:', req.isAuthenticated());
    console.log('Request body:', req.body);

    if (!req.isAuthenticated()) {
      console.log('User not authenticated - returning 401');
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { date, calendarIds } = req.body;
    // Parse date in Korea timezone (UTC+9)
    // date format: 'YYYY-MM-DD'
    const [year, month, day] = date.split('-').map(Number);

    // Create dates in Korea timezone (UTC+9)
    // Use ISO string with Korea timezone offset
    const koreaOffset = 9 * 60; // Korea is UTC+9
    const startOfDayKorea = new Date(Date.UTC(year, month - 1, day - 1, 15, 0, 0)); // 00:00 KST = 15:00 previous day UTC
    const endOfDayKorea = new Date(Date.UTC(year, month - 1, day + 1, 15, 0, 0)); // 00:00 next day KST

    console.log('Date parsing:', {
      requestedDate: date,
      startOfDayKorea: startOfDayKorea.toISOString(),
      endOfDayKorea: endOfDayKorea.toISOString()
    });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    // Target day boundaries in Korea timezone
    const targetDayStart = new Date(Date.UTC(year, month - 1, day, -9, 0, 0)); // 00:00 KST
    const targetDayEnd = new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0)); // 24:00 KST (next day 00:00)

    const calendarPromises = calendarIds.map(async (calId) => {
      try {
        // Fetch events and calendar info in parallel
        const [eventsResponse, calendarInfo] = await Promise.all([
          calendar.events.list({
            auth: oauth2Client,
            calendarId: calId,
            timeMin: startOfDayKorea.toISOString(),
            timeMax: endOfDayKorea.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: 'Asia/Seoul'
          }),
          calendar.calendarList.get({
            auth: oauth2Client,
            calendarId: calId
          })
        ]);

        return eventsResponse.data.items
          .filter(event => {
            if (!event.start.dateTime) return false; // Skip all-day events

            const eventStart = new Date(event.start.dateTime);
            const eventEnd = new Date(event.end.dateTime);

            // Include events that overlap with the target day
            return eventStart < targetDayEnd && eventEnd > targetDayStart;
          })
          .map(event => ({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          }));
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
        return [];
      }
    });

    const eventArrays = await Promise.all(calendarPromises);
    const allEvents = eventArrays.flat();

    // Debug: Log events for debugging
    console.log(`\n=== Events for ${date} ===`);
    console.log(`Target day: ${targetDayStart.toISOString()} ~ ${targetDayEnd.toISOString()}`);
    console.log(`Total events: ${allEvents.length}`);
    allEvents.forEach(event => {
      console.log(`- ${event.title}: ${event.start} ~ ${event.end} (${event.calendarName})`);
    });
    console.log('=========================\n');

    // Log first event for timezone debugging
    if (allEvents.length > 0) {
      const firstEvent = allEvents[0];
      console.log('First event timezone check:', {
        title: firstEvent.title,
        start: firstEvent.start,
        startDate: new Date(firstEvent.start).toISOString(),
        startLocalTime: new Date(firstEvent.start).toString()
      });
    }

    res.json({ success: true, events: allEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Google Calendar - Get Wake/Sleep Events
   ======================================== */
app.post('/api/calendar/wake-sleep', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { date, calendarIds } = req.body;
    // Parse date in Korea timezone
    const [year, month, day] = date.split('-').map(Number);

    // Create date ranges in Korea timezone (UTC+9)
    const startRange = new Date(Date.UTC(year, month - 1, day - 2, 15, 0, 0)); // 2 days before, 00:00 KST
    const endRange = new Date(Date.UTC(year, month - 1, day + 2, 15, 0, 0)); // 2 days after, 00:00 KST

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: req.user.accessToken
    });

    // Fetch all calendars in parallel
    const calendarPromises = calendarIds.map(async (calId) => {
      try {
        const calendarInfo = await calendar.calendarList.get({
          auth: oauth2Client,
          calendarId: calId
        });

        if (!calendarInfo.data.summary.includes('⑤')) return [];

        const response = await calendar.events.list({
          auth: oauth2Client,
          calendarId: calId,
          timeMin: startRange.toISOString(),
          timeMax: endRange.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          timeZone: 'Asia/Seoul'
        });

        return response.data.items
          .filter(event => event.start.dateTime)
          .map(event => ({
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
            calendarId: calId,
            calendarName: calendarInfo.data.summary,
            color: calendarInfo.data.backgroundColor,
            description: event.description || ''
          }));
      } catch (err) {
        console.error(`Error fetching calendar ${calId}:`, err.message);
        return [];
      }
    });

    const eventArrays = await Promise.all(calendarPromises);
    const allEvents = eventArrays.flat();

    res.json({ success: true, events: allEvents });
  } catch (error) {
    console.error('Error fetching wake/sleep events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Monthly Stats
   ======================================== */
app.post('/api/monthly/stats', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.body;
    const userId = req.session.userId;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Check cache first (user-specific cache key)
    const cacheKey = `${userId}-${year}-${String(month).padStart(2, '0')}`;
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
    const cached = monthlyStatsCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      // Add cache headers for browser caching
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      res.set('ETag', `"${cacheKey}-${cached.ts}"`);
      return res.json({ success: true, year, month, data: cached.data });
    }

    // Fetch all images for the month in a single query to avoid N DB round-trips
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const { data: images, error: imgError } = await supabase
      .from('images')
      .select('date, thumbnail_url, view_url, file_id')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (imgError) throw imgError;

    // Generate fresh signed URLs for images
    const firstImageByDate = {};
    if (images && images.length > 0) {
      // Filter to get only the first image for each date
      const uniqueImages = [];
      const seenDates = new Set();
      for (const img of images) {
        if (!seenDates.has(img.date)) {
          seenDates.add(img.date);
          uniqueImages.push(img);
        }
      }

      // Prepare paths for batch signing
      const pathsToSign = [];
      uniqueImages.forEach(img => {
        const filePath = `${img.date}/${img.file_id}`;
        const thumbnailPath = filePath.replace(/\.([^.]+)$/, '_thumb.jpeg');
        pathsToSign.push(filePath);
        pathsToSign.push(thumbnailPath);
      });

      try {
        // Batch create signed URLs
        const { data: signedUrls, error: signError } = await supabase
          .storage
          .from('diary-images')
          .createSignedUrls(pathsToSign, 3600);

        if (signError) throw signError;

        // Create a lookup map for signed URLs
        const signedUrlMap = {};
        if (signedUrls) {
          signedUrls.forEach(item => {
            // item structure: { path: string, signedUrl: string, error: string | null }
            if (item.path && item.signedUrl) {
              signedUrlMap[item.path] = item.signedUrl;
            }
          });
        }

        // Assign URLs to dates
        uniqueImages.forEach(img => {
          const filePath = `${img.date}/${img.file_id}`;
          const thumbnailPath = filePath.replace(/\.([^.]+)$/, '_thumb.jpeg');
          
          firstImageByDate[img.date] = {
            thumbnailUrl: signedUrlMap[thumbnailPath] || img.thumbnail_url,
            viewUrl: signedUrlMap[filePath] || img.view_url
          };
        });
      } catch (error) {
        console.error('Error generating signed URLs for monthly images:', error);
        
        // Fallback: Parallel individual signing
        await Promise.all(uniqueImages.map(async (img) => {
            try {
                const filePath = `${img.date}/${img.file_id}`;
                const thumbnailPath = filePath.replace(/\.([^.]+)$/, '_thumb.jpeg');

                const [viewUrlResult, thumbUrlResult] = await Promise.all([
                    supabase.storage.from('diary-images').createSignedUrl(filePath, 3600),
                    supabase.storage.from('diary-images').createSignedUrl(thumbnailPath, 3600)
                ]);

                firstImageByDate[img.date] = {
                    thumbnailUrl: thumbUrlResult.data?.signedUrl || img.thumbnail_url,
                    viewUrl: viewUrlResult.data?.signedUrl || img.view_url
                };
            } catch (e) {
                console.error('Error signing individual image:', e);
                firstImageByDate[img.date] = {
                    thumbnailUrl: img.thumbnail_url,
                    viewUrl: img.view_url
                };
            }
        }));
      }
    }

    const monthlyData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      monthlyData.push({
        date: day,
        dateKey,
        firstImage: firstImageByDate[dateKey] || null
      });
    }

    // Cache the monthly data (short TTL)
    const timestamp = Date.now();
    monthlyStatsCache.set(cacheKey, { data: monthlyData, ts: timestamp });

    // Add cache headers for browser caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.set('ETag', `"${cacheKey}-${timestamp}"`);

    res.json({ success: true, year, month, data: monthlyData });
  } catch (error) {
    console.error('Error loading monthly stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monthly Time Stats (Time Tracker Grid) - Supabase based
app.post('/api/monthly/time-stats', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.body;
    const userId = req.session.userId;

    // Check cache first (user-specific cache key)
    const cacheKey = `time-${userId}-${year}-${String(month).padStart(2, '0')}`;
    const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
    const cached = monthlyStatsCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) {
      res.set('Cache-Control', 'public, max-age=300');
      res.set('ETag', `"${cacheKey}-${cached.ts}"`);
      return res.json({ success: true, data: cached.data });
    }

    // Calculate month range
    const daysInMonth = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Fetch categories and events in parallel for better performance
    const [categoriesResult, eventsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, color')
        .eq('user_id', userId)
        .order('id'),
      supabase
        .from('events')
        .select(`
          date,
          title,
          start_time,
          end_time,
          is_sleep,
          category:categories(name, color)
        `)
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_plan', false)
        .order('date')
        .order('start_time')
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const categories = categoriesResult.data;
    const allEvents = eventsResult.data;

    console.log(`\n=== Monthly Time Stats for ${year}-${month} ===`);
    console.log(`Total actual events fetched: ${allEvents ? allEvents.length : 0}`);

    // Group events by date
    const eventsByDate = {};
    const categorySet = new Set();

    (allEvents || []).forEach(event => {
      if (!event.date || !event.start_time || !event.end_time) return;

      if (event.category) {
        categorySet.add(event.category.name);
      }

      const dateKey = event.date;

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      // Parse start and end times to detect multi-day events
      const startTime = event.start_time;
      const endTime = event.end_time;

      // Calculate actual end date: if end_time < start_time, event spans to next day
      let endDate = event.date;
      const startHour = parseInt(startTime.split(':')[0]);
      const endHour = parseInt(endTime.split(':')[0]);

      if (endHour < startHour || (endHour === startHour && endTime < startTime)) {
        // Event continues to next day
        const nextDay = new Date(event.date);
        nextDay.setDate(nextDay.getDate() + 1);
        endDate = nextDay.toISOString().split('T')[0];
      }

      // Combine date + time for frontend compatibility
      eventsByDate[dateKey].push({
        ...event,
        start: `${event.date}T${event.start_time}`,
        end: `${endDate}T${event.end_time}`
      });
    });

    // Generate data for each day
    const days = [];
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month - 1, day);
      const weekday = weekdays[date.getDay()];

      const dayEvents = eventsByDate[dateKey] || [];

      const categoryStats = {};
      const events = [];

      dayEvents.forEach(event => {
        const categoryName = event.category ? event.category.name : '기타';

        // Parse timestamps as local time (ignore timezone)
        const parseLocalTime = (isoString) => {
          if (!isoString) return new Date();
          const localIso = isoString.split(/[+Z]/)[0];
          return new Date(localIso);
        };

        const eventStart = parseLocalTime(event.start);
        const eventEnd = parseLocalTime(event.end);

        // Calculate day boundaries
        const dayStart = new Date(year, month - 1, day, 0, 0, 0);
        const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0);

        // Calculate effective time within this day
        const effectiveStart = eventStart > dayStart ? eventStart : dayStart;
        const effectiveEnd = eventEnd < dayEnd ? eventEnd : dayEnd;
        const duration = (effectiveEnd - effectiveStart) / (1000 * 60 * 60); // hours

        if (duration > 0) {
          if (!categoryStats[categoryName]) {
            categoryStats[categoryName] = 0;
          }
          categoryStats[categoryName] += duration;

          // Add event for rendering
          events.push({
            title: event.title,
            start: event.start,
            end: event.end,
            calendarName: categoryName,
            color: event.category ? event.category.color : '#9E9E9E',
            is_plan: event.is_plan,
            is_sleep: event.is_sleep || false
          });
        }
      });

      days.push({
        date: day,
        dateKey,
        weekday,
        categories: categoryStats,
        events
      });
    }

    // Build category list
    const categoryList = Array.from(categorySet).map(name => {
      const category = categories.find(c => c.name === name);
      return {
        name,
        color: category ? category.color : '#9E9E9E'
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    const resultData = { days, categories: categoryList };

    // Cache the result
    const timestamp = Date.now();
    monthlyStatsCache.set(cacheKey, { data: resultData, ts: timestamp });

    // Add cache headers
    res.set('Cache-Control', 'public, max-age=300');
    res.set('ETag', `"${cacheKey}-${timestamp}"`);

    res.json({ success: true, data: resultData });
  } catch (error) {
    console.error('Error loading monthly time stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monthly Routine & Mood Statistics
app.post('/api/monthly/routine-mood-stats', requireAuth, async (req, res) => {
  try {
    const { year, month } = req.body;
    const userId = req.session.userId;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

    // Fetch all active routines
    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('order');

    if (routinesError) throw routinesError;

    // Fetch all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (categoriesError) throw categoriesError;

    // Fetch all routine checks for the month
    const { data: routineChecks, error: checksError } = await supabase
      .from('routine_checks')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (checksError) throw checksError;

    // Fetch all reflections (mood data) for the month
    const { data: reflections, error: reflectionsError } = await supabase
      .from('reflections')
      .select('date, mood')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (reflectionsError) throw reflectionsError;

    // Fetch all events for the month
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('start_time');

    if (eventsError) throw eventsError;

    // Process routine statistics
    const routineStats = {};
    const dailyRoutineChecks = {};

    routines.forEach(routine => {
      routineStats[routine.id] = {
        id: routine.id,
        text: routine.text,
        emoji: routine.emoji,
        totalDays: 0,
        checkedDays: 0,
        percentage: 0,
        dailyStatus: {}
      };
    });

    // Build daily status for each routine
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dailyRoutineChecks[dateKey] = {};

      routines.forEach(routine => {
        routineStats[routine.id].dailyStatus[dateKey] = false;
        dailyRoutineChecks[dateKey][routine.id] = false;
      });
    }

    // Fill in actual check data
    routineChecks.forEach(check => {
      if (routineStats[check.routine_id]) {
        if (check.checked) {
          routineStats[check.routine_id].checkedDays++;
        }
        routineStats[check.routine_id].dailyStatus[check.date] = check.checked;
        dailyRoutineChecks[check.date][check.routine_id] = check.checked;
      }
    });

    // Calculate percentages (excluding future dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    Object.values(routineStats).forEach(stat => {
      // Count total days excluding future dates
      let totalDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const checkDate = new Date(year, month - 1, day);
        checkDate.setHours(0, 0, 0, 0);

        // Only count days up to today
        if (checkDate <= today) {
          totalDays++;
        }
      }

      stat.totalDays = totalDays;

      if (stat.totalDays > 0) {
        stat.percentage = Math.round((stat.checkedDays / stat.totalDays) * 100);
      }
    });

    // Process mood statistics
    const moodCounts = {
      'Good': 0,
      'SoSo': 0,
      'Bad': 0
    };
    const moodLabels = {
      'Good': '😊 Good',
      'SoSo': '😐 SoSo',
      'Bad': '😢 Bad'
    };
    const dailyMoods = {};

    reflections.forEach(ref => {
      if (ref.mood) {
        // Normalize mood value: lowercase to capitalized
        const normalizedMood = ref.mood.charAt(0).toUpperCase() + ref.mood.slice(1).toLowerCase();
        // Special case for "soso" -> "SoSo"
        const mood = normalizedMood === 'Soso' ? 'SoSo' : normalizedMood;

        moodCounts[mood] = (moodCounts[mood] || 0) + 1;
        dailyMoods[ref.date] = ref.mood; // Keep original lowercase for frontend compatibility
      }
    });

    const totalMoodEntries = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
    const moodPercentages = {};
    Object.keys(moodCounts).forEach(mood => {
      moodPercentages[mood] = totalMoodEntries > 0
        ? Math.round((moodCounts[mood] / totalMoodEntries) * 100)
        : 0;
    });

    // Group events by date
    const dailyEvents = {};
    events.forEach(event => {
      if (!dailyEvents[event.date]) {
        dailyEvents[event.date] = [];
      }
      dailyEvents[event.date].push({
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        is_plan: event.is_plan,
        category_id: event.category_id
      });
    });

    // Process category statistics
    const categoryStatsMap = {};
    const dailyCategoryStats = {}; // date -> { categoryId: minutes }

    categories.forEach(cat => {
      categoryStatsMap[cat.id] = {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        totalMinutes: 0
      };
    });

    events.forEach(event => {
      // Only count actual events (is_plan = false)
      if (event.category_id && categoryStatsMap[event.category_id] && !event.is_plan) {
        // Parse time (HH:MM:SS or HH:MM)
        const [startH, startM] = event.start_time.split(':').map(Number);
        const [endH, endM] = event.end_time.split(':').map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        let duration = endMinutes - startMinutes;
        if (duration < 0) duration += 24 * 60;

        if (duration > 0) {
          categoryStatsMap[event.category_id].totalMinutes += duration;

          // Add to daily stats
          if (!dailyCategoryStats[event.date]) {
            dailyCategoryStats[event.date] = {};
          }
          if (!dailyCategoryStats[event.date][event.category_id]) {
            dailyCategoryStats[event.date][event.category_id] = 0;
          }
          dailyCategoryStats[event.date][event.category_id] += duration;
        }
      }
    });

    const totalMinutes = Object.values(categoryStatsMap).reduce((sum, cat) => sum + cat.totalMinutes, 0);
    const categoryStats = Object.values(categoryStatsMap)
      .map(cat => ({
        ...cat,
        percentage: totalMinutes > 0 ? Math.round((cat.totalMinutes / totalMinutes) * 100) : 0
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    res.json({
      success: true,
      data: {
        routineStats: Object.values(routineStats),
        routines,
        dailyRoutineChecks,
        moodStats: {
          counts: moodCounts,
          percentages: moodPercentages,
          total: totalMoodEntries,
          labels: moodLabels
        },
        dailyMoods,
        dailyEvents,
        categoryStats,
        dailyCategoryStats
      }
    });
  } catch (error) {
    console.error('Error loading monthly routine/mood stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// Quick Actions
// ========================================

// Save Feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { date, feedback } = req.body;

    const { data, error } = await supabase
      .from('feedbacks')
      .insert({ date, feedback_text: feedback })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create 10AM Wake Event in Google Calendar
app.post('/api/calendar/create-wake', async (req, res) => {
  try {
    const { date, time } = req.body;
    const user = req.user;

    if (!user || !user.accessToken) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    // Set up OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Parse date and time
    const [hours, minutes] = time.split(':');
    const startDateTime = new Date(date);
    startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + 30); // 30 minute event

    const event = {
      summary: '기상',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'Asia/Seoul'
      },
      description: 'TimeTracker Diary - 기상 이벤트'
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    res.json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error creating wake event:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   Events API (Supabase-based)
   ======================================== */
setupEventsAPI(app, supabase, monthlyStatsCache);

/* ========================================
   Categories API (User-defined categories)
   ======================================== */
setupCategoriesAPI(app, supabase);

/* ========================================
   Todo Categories API
   ======================================== */
setupTodoCategoriesAPI(app);

/* ========================================
   Auth API (Email/Password Authentication)
   ======================================== */
setupAuthAPI(app, supabase);

/* ========================================
   Calendars API (User Calendar Subscriptions)
   ======================================== */
setupCalendarsAPI(app, supabase);

/* ========================================
   Reflection Template API
   ======================================== */
// Get user's reflection template
app.get('/api/reflection-template', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const { data, error } = await supabase
      .from('reflection_templates')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    res.json({ success: true, data: data || null });
  } catch (error) {
    console.error('Error fetching reflection template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save user's reflection template
app.post('/api/reflection-template', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { template } = req.body;

    if (!template) {
      return res.status(400).json({ success: false, error: 'Template is required' });
    }

    // Upsert the template
    const { data, error } = await supabase
      .from('reflection_templates')
      .upsert(
        { user_id: userId, template, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error saving reflection template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ========================================
   iCloud Calendar Proxy
   ======================================== */
app.get('/api/icloud-calendar/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Convert webcal:// to https://
    const httpUrl = url.replace(/^webcal:\/\//i, 'https://');

    // Validate URL
    if (!httpUrl.startsWith('https://') && !httpUrl.startsWith('http://')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch the ICS file with headers to handle compression
    const response = await fetch(httpUrl, {
      headers: {
        'Accept': 'text/calendar, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'User-Agent': 'Mozilla/5.0 (compatible; TimeTracker/1.0)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch calendar: ${response.statusText}`
      });
    }

    // Node.js fetch should automatically decompress gzip/deflate/brotli
    const icsData = await response.text();

    // Set appropriate headers
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.send(icsData);
  } catch (error) {
    console.error('Error proxying iCloud calendar:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

/* ========================================
   SPA Fallback
   ======================================== */
// SPA fallback - serve index.html for any unmatched routes
// Skip for API routes and static assets
app.get('*', (req, res, next) => {
  // Don't intercept API routes or static files
  if (req.path.startsWith('/api/') ||
      req.path.startsWith('/auth/') ||
      req.path.startsWith('/assets/') ||
      req.path.includes('.')) {
    return next();
  }
  console.log('SPA fallback for:', req.path);
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving frontend from: ${frontendDistPath}`);
});

export default app;
