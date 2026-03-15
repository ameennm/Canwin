import { Award, Shield, Crown, Gem, Star } from 'lucide-react';

// Level configuration for Bronze, Silver, Gold, Diamond, Pearl
const levelConfig = {
    'Super Admin': { icon: Shield, class: 'badge-admin' },
    'Platinum': { icon: Crown, class: 'badge-gold' },
    'SDO': { icon: Gem, class: 'badge-diamond' },
    'SOP': { icon: Star, class: 'badge-pearl' },
    'SO': { icon: Shield, class: 'badge-silver' },
    'JSO': { icon: Award, class: 'badge-bronze' },
};

export default function LevelBadge({ level, size = 'md' }) {
    const config = levelConfig[level] || levelConfig.Bronze;
    const Icon = config.icon;

    const sizeClasses = {
        xs: 'text-xs py-0.5 px-1.5',
        sm: 'text-xs py-1 px-2',
        md: 'text-sm py-1.5 px-3',
    };
    const iconSizes = {
        xs: 'w-2.5 h-2.5',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
    };

    return (
        <span className={`badge ${config.class} ${sizeClasses[size] || sizeClasses.md}`}>
            <Icon className={iconSizes[size] || iconSizes.md} />
            {level}
        </span>
    );
}
