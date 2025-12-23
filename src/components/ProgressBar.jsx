import { getLevelProgress } from '../lib/supabase';

export default function ProgressBar({ totalPoints, currentLevel }) {
    const { progress, nextLevel, remaining, nextThreshold } = getLevelProgress(totalPoints);

    return (
        <div>
            <div className="progress-container">
                <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
            {nextLevel && (
                <div className="flex justify-between text-xs mt-2">
                    <span style={{ color: 'var(--text-muted)' }}>
                        {remaining} pts to {nextLevel}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {totalPoints} / {nextThreshold}
                    </span>
                </div>
            )}
            {!nextLevel && (
                <p className="text-xs text-center mt-2 text-teal-400">
                    🎉 Maximum level reached!
                </p>
            )}
        </div>
    );
}
