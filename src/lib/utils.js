export const LEVELS = {
    Bronze: { min: 0, max: 99, order: 1 },
    Silver: { min: 100, max: 249, order: 2 },
    Gold: { min: 250, max: 499, order: 3 },
    Diamond: { min: 500, max: 999, order: 4 },
    Pearl: { min: 1000, max: Infinity, order: 5 },
};

export function getLevel(totalPoints) {
    const points = totalPoints || 0;
    if (points >= 1000) return 'Pearl';
    if (points >= 500) return 'Diamond';
    if (points >= 250) return 'Gold';
    if (points >= 100) return 'Silver';
    return 'Bronze';
}

export function getLevelProgress(totalPoints) {
    const points = totalPoints || 0;
    const currentLevel = getLevel(points);
    const levelConfig = LEVELS[currentLevel];

    const thresholds = { Bronze: 100, Silver: 250, Gold: 500, Diamond: 1000, Pearl: 2000 };
    const currentThreshold = levelConfig.min;
    const nextThreshold = thresholds[currentLevel];

    const pointsInLevel = points - currentThreshold;
    const levelRange = nextThreshold - currentThreshold;
    const progress = Math.min((pointsInLevel / levelRange) * 100, 100);

    const levelNames = Object.keys(LEVELS);
    const currentIndex = levelNames.indexOf(currentLevel);
    const nextLevel = currentIndex < levelNames.length - 1
        ? levelNames[currentIndex + 1]
        : null;

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

export function validateAadhar(aadhar) {
    const cleaned = aadhar?.replace(/\s/g, '') || '';
    return /^\d{12}$/.test(cleaned);
}

export function validatePhone(phone) {
    const cleaned = phone?.replace(/\s/g, '') || '';
    return /^\+?\d{10,15}$/.test(cleaned);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
