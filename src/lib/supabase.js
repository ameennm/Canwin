import { createClient } from '@supabase/supabase-js';

// Environment validation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

// Create Supabase client with security options
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    global: {
        headers: {
            'X-Client-Info': 'canwin-referral-platform',
        },
    },
});

// Level configuration with point thresholds
export const LEVELS = {
    Initiator: { min: 0, max: 99, order: 1 },
    Advocate: { min: 100, max: 199, order: 2 },
    Guardian: { min: 200, max: 299, order: 3 },
    Mentor: { min: 300, max: 399, order: 4 },
    Luminary: { min: 400, max: Infinity, order: 5 },
};

// Points per referral type
export const POINTS = {
    paid: 10,
    free: 2,
};

/**
 * Get level name based on total points
 * @param {number} totalPoints - User's total points
 * @returns {string} Level name
 */
export function getLevel(totalPoints) {
    const points = totalPoints || 0;

    if (points >= 400) return 'Luminary';
    if (points >= 300) return 'Mentor';
    if (points >= 200) return 'Guardian';
    if (points >= 100) return 'Advocate';
    return 'Initiator';
}

/**
 * Calculate progress within current level
 * @param {number} totalPoints - User's total points
 * @returns {Object} Progress info with percentage, next level, and remaining points
 */
export function getLevelProgress(totalPoints) {
    const points = totalPoints || 0;
    const currentLevel = getLevel(points);
    const levelConfig = LEVELS[currentLevel];

    // Points within current level (0-99 range)
    const pointsInLevel = points % 100;
    const progress = Math.min(pointsInLevel, 100);

    // Determine next level
    const levelNames = Object.keys(LEVELS);
    const currentIndex = levelNames.indexOf(currentLevel);
    const nextLevel = currentIndex < levelNames.length - 1
        ? levelNames[currentIndex + 1]
        : null;

    // Points remaining to next level
    const remaining = nextLevel ? 100 - pointsInLevel : 0;

    return {
        progress,
        currentLevel,
        nextLevel,
        remaining,
        pointsInLevel,
    };
}

/**
 * Format points display
 * @param {number} points - Points value
 * @returns {string} Formatted points string
 */
export function formatPoints(points) {
    return `${points || 0} pts`;
}

/**
 * Get month name from month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name abbreviation
 */
export function getMonthName(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex] || '';
}

/**
 * Validate Aadhar number format
 * @param {string} aadhar - Aadhar number (12 digits)
 * @returns {boolean} Whether valid
 */
export function validateAadhar(aadhar) {
    const cleaned = aadhar?.replace(/\s/g, '') || '';
    return /^\d{12}$/.test(cleaned);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number
 * @returns {boolean} Whether valid
 */
export function validatePhone(phone) {
    const cleaned = phone?.replace(/\s/g, '') || '';
    return /^\+?\d{10,15}$/.test(cleaned);
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}
