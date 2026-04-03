import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, RefreshCw, User, UserPlus, Users, Crown,
    Star, BookOpen, Wallet
} from 'lucide-react';
import { api } from '../lib/api';
import BonusTimer from '../components/BonusTimer';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function UserDashboard({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [wallet, setWallet] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeBonus, setActiveBonus] = useState(null);
    const [showProfile, setShowProfile] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        fetchDashboardData(parsedUser.id);
    }, [navigate]);

    const fetchDashboardData = async (userId) => {
        try {
            // Fetch wallet and basic user info from our new API
            const userData = await api.wallet.get(userId);
            setWallet(userData);
            
            // Update local user state with the latest rank and other info
            setUser(prev => ({ 
               ...JSON.parse(localStorage.getItem('canwin_user') || '{}'),
               rank: userData.rank || prev?.rank 
            }));

            // Fetch active bonuses
            const bonusesRes = await api.bonuses.list();
            const bonuses = Array.isArray(bonusesRes) ? bonusesRes : [];
            if (bonuses.length > 0) {
                setActiveBonus(bonuses[0]); 
            }
        } catch (err) {
            console.error('Error:', err);
            showToast('Error loading dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass-dark sticky top-0 z-50 py-3 px-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div onClick={() => setShowProfile(true)} className="flex items-center gap-3 cursor-pointer">
                        <div className="w-10 h-10 rounded-full border-2 border-teal-500/50 bg-secondary flex items-center justify-center">
                            <User className="text-muted-foreground" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm">{user.name}</h1>
                            <p className="text-xs text-teal-400 font-mono">{user.rank}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => fetchDashboardData(user.id)} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><RefreshCw className="w-4 h-4" /></button>
                        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-4">
                {/* Active Bonus Timer */}
                <BonusTimer bonus={activeBonus} />

                {/* Rank & Points Card */}
                <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border-indigo-500/20">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Current Rank</p>
                            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{user.rank}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Total Points</p>
                            <p className="text-2xl font-black text-amber-500">{wallet.total_points || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4 border-emerald-500/20 bg-emerald-500/5">
                        <p className="text-xs text-muted-foreground">Total Earnings</p>
                        <p className="text-xl font-bold text-emerald-500">₹{wallet.total_earnings?.toLocaleString() || 0}</p>
                    </div>
                    <div className="card p-4 border-blue-500/20 bg-blue-500/5">
                        <p className="text-xs text-muted-foreground">Withdrawable</p>
                        <p className="text-xl font-bold text-blue-500">₹{wallet.withdrawable_balance?.toLocaleString() || 0}</p>
                    </div>
                    <div className="card p-4 border-amber-500/20 bg-amber-500/5">
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="text-xl font-bold text-amber-500">₹{wallet.pending_balance?.toLocaleString() || 0}</p>
                    </div>
                </div>

                {/* Referral Link Card */}
                <div className="card">
                    <h3 className="font-bold flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-amber-500" /> My Referral Link</h3>
                    <div className="bg-secondary p-3 rounded-lg font-mono text-sm break-all select-all flex justify-between items-center">
                        <span>{user.referral_code}</span>
                        <p className="text-[10px] text-muted-foreground">COPY</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/add-student')} className="btn-primary py-4 flex flex-col items-center gap-2">
                        <UserPlus className="w-6 h-6" />
                        <span>Direct Admission</span>
                    </button>
                    <button onClick={() => navigate('/my-admissions')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                        <span>My Admissions</span>
                    </button>
                    <button onClick={() => navigate('/my-team')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <Users className="w-6 h-6 text-teal-400" />
                        <span>My Team</span>
                    </button>
                    <button onClick={() => navigate('/withdraw')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <Wallet className="w-6 h-6 text-amber-500" />
                        <span>Withdraw</span>
                    </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="card text-center py-5 border-teal-500/10 hover:border-teal-500/30 transition-all">
                        <Users className="w-6 h-6 mx-auto mb-2 text-teal-400" />
                        <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-white">{wallet.team_size || 0}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">My Team</p>
                    </div>
                    <div className="card text-center py-5 border-amber-500/10 hover:border-amber-500/30 transition-all">
                        <BookOpen className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                        <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-white">{wallet.total_admissions || 0}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Admissions</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
