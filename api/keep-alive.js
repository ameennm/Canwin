import { createClient } from '@supabase/supabase-js';

// This endpoint is called by Vercel Cron to keep Supabase free tier active
export default async function handler(request, response) {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.authorization;

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // In development or if no secret, allow the request
        if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
            return response.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        // Create Supabase client
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
        );

        // Simple query to keep connection alive
        const { data, error } = await supabase
            .from('public_users')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Supabase ping error:', error);
            return response.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        return response.status(200).json({
            success: true,
            message: 'Supabase is alive',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Keep-alive error:', err);
        return response.status(500).json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
}
