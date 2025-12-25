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

// Updated Level configuration with new thresholds including Pearl
// Bronze: 0-99 points
// Silver: 100-249 points
// Gold: 250-499 points
// Diamond: 500-999 points
// Pearl: 1000+ points
export const LEVELS = {
    Bronze: { min: 0, max: 99, order: 1 },
    Silver: { min: 100, max: 249, order: 2 },
    Gold: { min: 250, max: 499, order: 3 },
    Diamond: { min: 500, max: 999, order: 4 },
    Pearl: { min: 1000, max: Infinity, order: 5 },
};

/**
 * Get level name based on total points
 * @param {number} totalPoints - User's total points
 * @returns {string} Level name
 */
export function getLevel(totalPoints) {
    const points = totalPoints || 0;

    if (points >= 1000) return 'Pearl';
    if (points >= 500) return 'Diamond';
    if (points >= 250) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
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

    // Get next level threshold
    const thresholds = { Bronze: 100, Silver: 250, Gold: 500, Diamond: 1000, Pearl: 2000 };
    const currentThreshold = levelConfig.min;
    const nextThreshold = thresholds[currentLevel];

    // Points within current level
    const pointsInLevel = points - currentThreshold;
    const levelRange = nextThreshold - currentThreshold;
    const progress = Math.min((pointsInLevel / levelRange) * 100, 100);

    // Determine next level
    const levelNames = Object.keys(LEVELS);
    const currentIndex = levelNames.indexOf(currentLevel);
    const nextLevel = currentIndex < levelNames.length - 1
        ? levelNames[currentIndex + 1]
        : null;

    // Points remaining to next level
    const remaining = nextLevel ? nextThreshold - points : 0;

    return {
        progress,
        currentLevel,
        nextLevel,
        remaining,
        pointsInLevel,
        nextThreshold,
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
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Whether valid
 */
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
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
 * Validate promoter custom ID format (CNWN followed by numbers)
 * @param {string} customId - Promoter custom ID
 * @returns {boolean} Whether valid
 */
export function validatePromoterCode(customId) {
    if (!customId) return false;
    return /^CNWN\d{4,}$/i.test(customId.trim());
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

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Check if a level can refer other promoters (Silver and above)
 * @param {string} level - Current level name
 * @returns {boolean} Whether the level can refer promoters
 */
export function canReferPromoters(level) {
    const referEligibleLevels = ['Silver', 'Gold', 'Diamond', 'Pearl'];
    return referEligibleLevels.includes(level);
}

/**
 * Find promoter by their custom ID (CNWN1001, etc.)
 * Only returns promoters who are Silver level or above (eligible to refer new promoters)
 * @param {string} customId - Promoter's custom ID
 * @param {boolean} checkReferralEligibility - If true, only returns promoters who can refer other promoters
 * @returns {Object|null} Promoter data or null
 */
export async function findPromoterByCustomId(customId, checkReferralEligibility = true) {
    if (!validatePromoterCode(customId)) return null;

    const { data, error } = await supabase
        .from('public_users')
        .select('id, full_name, custom_id, is_approved, current_level, total_points')
        .eq('custom_id', customId.toUpperCase().trim())
        .eq('is_approved', true)
        .single();

    if (error || !data) return null;

    // Check if the promoter is eligible to refer other promoters (Silver+)
    if (checkReferralEligibility && !canReferPromoters(data.current_level)) {
        return { ...data, notEligible: true };
    }

    return data;
}

