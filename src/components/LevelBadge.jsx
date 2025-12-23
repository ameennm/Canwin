import { Award, Shield, Crown, Gem } from 'lucide-react';

// Updated level configuration for Bronze, Silver, Gold, Diamond
const levelConfig = {
    Bronze: { icon: Award, class: 'badge-bronze' },
    Silver: { icon: Shield, class: 'badge-silver' },
    Gold: { icon: Crown, class: 'badge-gold' },
    Diamond: { icon: Gem, class: 'badge-diamond' },
    // Keep old names for backwards compatibility
    Initiator: { icon: Award, class: 'badge-bronze' },
    Advocate: { icon: Shield, class: 'badge-silver' },
    Guardian: { icon: Crown, class: 'badge-gold' },
    Mentor: { icon: Gem, class: 'badge-diamond' },
    Luminary: { icon: Gem, class: 'badge-diamond' },
};

export default function LevelBadge({ level, size = 'md' }) {
    const config = levelConfig[level] || levelConfig.Bronze;
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
