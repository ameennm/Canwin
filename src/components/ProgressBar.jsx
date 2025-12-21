import { getLevelProgress, LEVELS } from '../lib/supabase';
import { Zap } from 'lucide-react';

export default function ProgressBar({ totalPoints, currentLevel }) {
    const { progress, nextLevel, remaining } = getLevelProgress(totalPoints);

    return (
        <div>
            <div className="flex justify-between items-center mb-2 text-xs">
                <span className="text-slate-400">
                    {totalPoints % 100}/100 in level
                </span>
                <span className="text-teal-400">
                    {nextLevel ? `${remaining} to ${nextLevel}` : '🏆 Max!'}
                </span>
            </div>

            <div className="progress-container">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
        </div>
    );
}
