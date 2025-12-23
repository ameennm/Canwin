import { User, Award, Gem, Shield, Crown, Phone, Calendar, CreditCard } from 'lucide-react';

export default function IDCard({ user }) {
    const levelIcons = {
        Bronze: Award,
        Silver: Shield,
        Gold: Crown,
        Diamond: Gem,
        // Backwards compatibility
        Initiator: Award,
        Advocate: Shield,
        Guardian: Crown,
        Mentor: Gem,
        Luminary: Gem,
    };

    const levelColors = {
        Bronze: 'from-amber-600 to-amber-800',
        Silver: 'from-slate-400 to-slate-600',
        Gold: 'from-yellow-400 to-amber-500',
        Diamond: 'from-blue-400 to-blue-600',
        // Backwards compatibility
        Initiator: 'from-amber-600 to-amber-800',
        Advocate: 'from-slate-400 to-slate-600',
        Guardian: 'from-yellow-400 to-amber-500',
        Mentor: 'from-blue-400 to-blue-600',
        Luminary: 'from-purple-400 to-purple-600',
    };

    const LevelIcon = levelIcons[user.current_level] || Award;
    const gradientClass = levelColors[user.current_level] || 'from-amber-600 to-amber-800';

    const formatDOB = (dob) => {
        if (!dob) return '';
        const date = new Date(dob);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="id-card fade-in">
            {/* Header gradient */}
            <div className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-r ${gradientClass} rounded-t-[14px] opacity-20`} />

            {/* Content */}
            <div className="relative">
                {/* Top Row */}
                <div className="flex items-start justify-between mb-4">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold">C</span>
                        </div>
                        <div>
                            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>CANWIN</p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Member Card</p>
                        </div>
                    </div>

                    {/* Level Badge */}
                    <div className={`bg-gradient-to-r ${gradientClass} px-3 py-1 rounded-full flex items-center gap-1`}>
                        <LevelIcon className="w-4 h-4 text-white" />
                        <span className="text-white text-xs font-semibold">{user.current_level}</span>
                    </div>
                </div>

                {/* Avatar & Info */}
                <div className="flex gap-4">
                    {/* Avatar */}
                    <div
                        className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0"
                        style={{ border: '3px solid var(--primary)' }}
                    >
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                                <User className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate" style={{ color: 'var(--text-primary)' }}>
                            {user.full_name}
                        </h3>
                        <p className="text-teal-400 font-mono font-bold text-sm mb-2">
                            {user.custom_id || 'Pending'}
                        </p>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                                <Phone className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{user.whatsapp_number}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>{formatDOB(user.dob)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="text-center">
                        <p className="font-bold text-teal-400">{user.total_points || 0}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Points</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-amber-400">{user.paid_referrals || 0}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Paid</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-green-400">{user.free_referrals || 0}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Free</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
