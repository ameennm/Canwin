import { Star, Award, Shield, Crown, Sparkles } from 'lucide-react';

const levelConfig = {
    Initiator: { icon: Star, class: 'badge-initiator' },
    Advocate: { icon: Award, class: 'badge-advocate' },
    Guardian: { icon: Shield, class: 'badge-guardian' },
    Mentor: { icon: Crown, class: 'badge-mentor' },
    Luminary: { icon: Sparkles, class: 'badge-luminary' },
};

export default function LevelBadge({ level, size = 'md' }) {
    const config = levelConfig[level] || levelConfig.Initiator;
    const Icon = config.icon;

    const sizeClass = size === 'sm' ? 'text-xs py-1 px-2' : 'text-sm py-1.5 px-3';
    const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

    return (
        <span className={`badge ${config.class} ${sizeClass}`}>
            <Icon className={iconSize} />
            {level}
        </span>
    );
}
