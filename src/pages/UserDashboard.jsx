import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, RefreshCw, User, UserPlus, Users, Crown,
    BookOpen, Wallet, Copy, X, KeyRound
} from 'lucide-react';
import { api, clearSession } from '../lib/api';
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
    const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
    const [savingPassword, setSavingPassword] = useState(false);

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
            const now = new Date();
            const rank = userData.rank;
            const running = bonuses.filter(b => {
                const roles = String(b.eligible_roles || 'ALL').split(',');
                return b.status === 'active' && new Date(b.start_time) <= now && new Date(b.end_time) > now
                    && (roles.includes('ALL') || roles.includes(rank));
            });
            setActiveBonus(running.sort((a, b) => b.bonus_amount - a.bonus_amount)[0] || null);
        } catch (err) {
            console.error('Error:', err);
            showToast('Error loading dashboard data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const copyReferralCode = async () => {
        try {
            await navigator.clipboard.writeText(user.referral_code);
            showToast('Referral code copied');
        } catch {
            showToast('Could not copy, please copy it manually', 'error');
        }
    };

    const changePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.next.length < 6) {
            showToast('New password must be at least 6 characters', 'error');
            return;
        }
        setSavingPassword(true);
        try {
            await api.auth.changePassword(passwordForm.current, passwordForm.next);
            showToast('Password changed');
            setPasswordForm({ current: '', next: '' });
            setShowProfile(false);
        } catch (err) {
            showToast(err.message || 'Could not change password', 'error');
        } finally {
            setSavingPassword(false);
        }
    };

    const logout = () => { clearSession(); navigate('/'); };

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
                        <div className="w-10 h-10 rounded-full border-2 border-blue-200 bg-slate-100 flex items-center justify-center">
                            <User className="text-slate-500" />
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm">{user.name}</h1>
                            <p className="text-xs text-blue-600 font-mono">{user.rank}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={() => fetchDashboardData(user.id)} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><RefreshCw className="w-4 h-4" /></button>
                        <button onClick={logout} className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto p-4 space-y-4">
                {/* Active Bonus Timer */}
                <BonusTimer bonus={activeBonus} />

                {/* Rank & Points Card */}
                <div className="card border-blue-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Current Rank</p>
                            <h2 className="text-2xl font-black text-blue-600">{user.rank}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Points</p>
                            <p className="text-2xl font-black text-amber-700">{wallet.total_points || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Wallet Balance Grid */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="card p-4 border-green-200 bg-green-50">
                        <p className="text-xs text-slate-500">Total Earnings</p>
                        <p className="text-lg font-bold text-green-600">₹{wallet.total_earnings?.toLocaleString() || 0}</p>
                    </div>
                    <div className="card p-4 border-blue-200 bg-blue-50">
                        <p className="text-xs text-slate-500">Received</p>
                        <p className="text-lg font-bold text-blue-600">₹{(wallet.total_paid || 0).toLocaleString()}</p>
                    </div>
                    <div className="card p-4 border-amber-200 bg-amber-50">
                        <p className="text-xs text-slate-500">To receive</p>
                        <p className="text-lg font-bold text-amber-700">₹{((wallet.withdrawable_balance || 0) + (wallet.pending_balance || 0)).toLocaleString()}</p>
                    </div>
                </div>

                {!(wallet.own_admissions > 0) && (
                    <div className="card border-amber-200 bg-amber-50 text-sm text-amber-700">
                        Add your first student yourself. Until one of your own admissions is approved, you will not earn from your team's admissions.
                    </div>
                )}

                {/* Referral Link Card */}
                <div className="card">
                    <h3 className="font-bold flex items-center gap-2 mb-2"><Crown className="w-4 h-4 text-amber-700" /> My Referral Code</h3>
                    <button onClick={copyReferralCode} className="w-full bg-slate-100 p-3 rounded-lg font-mono text-sm break-all flex justify-between items-center">
                        <span>{user.referral_code}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1"><Copy className="w-3 h-3" /> COPY</span>
                    </button>
                    <p className="text-xs text-slate-500 mt-2">Share this code. New promoters enter it when they sign up and join your team.</p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/add-student')} className="btn-primary py-4 flex flex-col items-center gap-2">
                        <UserPlus className="w-6 h-6" />
                        <span>Add Student</span>
                    </button>
                    <button onClick={() => navigate('/my-admissions')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        <span>My Admissions</span>
                    </button>
                    <button onClick={() => navigate('/my-team')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <Users className="w-6 h-6 text-blue-600" />
                        <span>My Team</span>
                    </button>
                    <button onClick={() => navigate('/withdraw')} className="btn-secondary py-4 flex flex-col items-center gap-2" style={{ background: 'var(--hover-bg)' }}>
                        <Wallet className="w-6 h-6 text-amber-700" />
                        <span>Withdraw</span>
                    </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="card text-center py-5 border-blue-200 hover:border-slate-300 transition-all">
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-black text-blue-600 to-white">{wallet.team_size || 0}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">My Team</p>
                    </div>
                    <div className="card text-center py-5 border-amber-200 hover:border-slate-300 transition-all">
                        <BookOpen className="w-6 h-6 mx-auto mb-2 text-amber-700" />
                        <p className="text-2xl font-black text-blue-600 to-white">{wallet.total_admissions || 0}</p>
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Admissions</p>
                    </div>
                </div>
            </main>

            {showProfile && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={() => setShowProfile(false)}>
                    <div className="card w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{user.name}</h3>
                                <p className="text-sm text-blue-600 font-mono">{user.rank} · {user.referral_code}</p>
                            </div>
                            <button onClick={() => setShowProfile(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={changePassword} className="space-y-3">
                            <p className="text-sm font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" /> Change password</p>
                            <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({ ...passwordForm, current: e.target.value })} placeholder="Current password" className="input-field" />
                            <input type="password" value={passwordForm.next} onChange={e => setPasswordForm({ ...passwordForm, next: e.target.value })} placeholder="New password (min 6 characters)" className="input-field" />
                            <button type="submit" disabled={savingPassword} className="btn-primary w-full">{savingPassword ? <Spinner size="sm" /> : 'Update password'}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
