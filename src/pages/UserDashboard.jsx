import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, RefreshCw, User, Zap, Gift, Award, X, Camera, Save, UserPlus, Trophy, Medal, Crown, Gem, Star, Megaphone, ChevronDown } from 'lucide-react';
import { supabase, getMonthName, canReferPromoters } from '../lib/supabase';
import IDCard from '../components/IDCard';
import BirthdayCard from '../components/BirthdayCard';
import ProgressBar from '../components/ProgressBar';
import LevelBadge from '../components/LevelBadge';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function UserDashboard({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isBirthday, setIsBirthday] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [newAvatar, setNewAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [saving, setSaving] = useState(false);

    // Leaderboard state
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [showLeaderboard, setShowLeaderboard] = useState(true);

    // Referred promoters state (promoters under this user)
    const [myPromoters, setMyPromoters] = useState([]);
    const [myPromotersBonus, setMyPromotersBonus] = useState(0);
    const [showMyPromoters, setShowMyPromoters] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        fetchUserData(parsedUser.whatsapp_number);
    }, [navigate]);

    const fetchUserData = async (whatsappNumber) => {
        try {
            const { data: userData, error: userError } = await supabase
                .from('public_users')
                .select('*')
                .eq('whatsapp_number', whatsappNumber)
                .single();

            if (userError) throw userError;

            if (!userData?.is_approved) {
                navigate('/pending', { state: { user: userData } });
                return;
            }

            setUser(userData);
            setEditForm({
                full_name: userData.full_name,
                dob: userData.dob,
                anniversary_date: userData.anniversary_date || '',
            });
            localStorage.setItem('canwin_user', JSON.stringify(userData));

            const today = new Date();
            const dob = new Date(userData.dob);
            if (today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate()) {
                setIsBirthday(true);
            }

            const { data: referralData } = await supabase
                .from('referrals')
                .select(`*, courses:course_id (name, course_type, points)`)
                .eq('referrer_id', userData.id)
                .order('created_at', { ascending: false })
                .limit(10);

            setReferrals(referralData || []);

            // Fetch leaderboard
            await fetchLeaderboard(userData.id);

            // Fetch promoters under this user
            await fetchMyPromoters(userData.id);
        } catch (err) {
            console.error('Error:', err);
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaderboard = async (currentUserId) => {
        try {
            const { data: topPromoters } = await supabase
                .from('public_users')
                .select('id, full_name, custom_id, avatar_url, total_points, current_level')
                .eq('is_approved', true)
                .order('total_points', { ascending: false })
                .limit(10);

            setLeaderboard(topPromoters || []);

            // Find current user's rank
            const { data: allRanks } = await supabase
                .from('public_users')
                .select('id, total_points')
                .eq('is_approved', true)
                .order('total_points', { ascending: false });

            if (allRanks) {
                const rank = allRanks.findIndex(p => p.id === currentUserId);
                setUserRank(rank >= 0 ? rank + 1 : null);
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        }
    };

    const fetchMyPromoters = async (currentUserId) => {
        try {
            // Get promoters referred by this user
            const { data: referredPromoters } = await supabase
                .from('public_users')
                .select('id, full_name, custom_id, avatar_url, total_points, current_level, is_approved, created_at')
                .eq('referred_by', currentUserId)
                .order('total_points', { ascending: false });

            if (referredPromoters && referredPromoters.length > 0) {
                // For each referred promoter, get their approved referrals to calculate bonus
                const promotersWithStats = await Promise.all(
                    referredPromoters.map(async (promoter) => {
                        // Get referrals where this promoter is the referrer and current user got bonus
                        const { data: bonusReferrals } = await supabase
                            .from('referrals')
                            .select('second_level_points')
                            .eq('referrer_id', promoter.id)
                            .eq('second_level_referrer_id', currentUserId)
                            .eq('status', 'approved');

                        const bonusEarned = bonusReferrals?.reduce((sum, r) => sum + (r.second_level_points || 0), 0) || 0;

                        // Get count of students referred by this promoter
                        const { count: studentCount } = await supabase
                            .from('referrals')
                            .select('id', { count: 'exact', head: true })
                            .eq('referrer_id', promoter.id)
                            .eq('status', 'approved');

                        return {
                            ...promoter,
                            bonusEarned,
                            studentCount: studentCount || 0
                        };
                    })
                );

                setMyPromoters(promotersWithStats);

                // Calculate total bonus earned from all referred promoters
                const totalBonus = promotersWithStats.reduce((sum, p) => sum + p.bonusEarned, 0);
                setMyPromotersBonus(totalBonus);
            } else {
                setMyPromoters([]);
                setMyPromotersBonus(0);
            }
        } catch (err) {
            console.error('Error fetching my promoters:', err);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 100 * 1024) {
            try {
                const compressedFile = await compressImage(file);
                setNewAvatar(compressedFile);
                setAvatarPreview(URL.createObjectURL(compressedFile));
            } catch (err) {
                showToast('Image must be less than 100KB', 'error');
                return;
            }
        } else {
            setNewAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;
                const maxSize = 400;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob && blob.size <= 100 * 1024) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            canvas.toBlob(
                                (blob2) => {
                                    if (blob2) resolve(new File([blob2], file.name, { type: 'image/jpeg' }));
                                    else reject(new Error('Cannot compress'));
                                },
                                'image/jpeg',
                                0.5
                            );
                        }
                    },
                    'image/jpeg',
                    0.7
                );
            };
            img.onerror = () => reject(new Error('Failed to load'));
            img.src = URL.createObjectURL(file);
        });
    };

    const uploadAvatar = async () => {
        if (!newAvatar || !user) return user.avatar_url;

        const fileExt = newAvatar.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        try {
            // Delete old avatar if it exists
            if (user.avatar_url) {
                try {
                    const urlParts = user.avatar_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    if (oldFileName && oldFileName.includes(user.id)) {
                        await supabase.storage
                            .from('avatars')
                            .remove([oldFileName]);
                    }
                } catch (deleteErr) {
                    console.log('Old avatar delete failed:', deleteErr);
                }
            }

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, newAvatar);

            if (uploadError) {
                showToast('Photo upload failed: ' + uploadError.message, 'error');
                return user.avatar_url;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            showToast('Photo upload failed', 'error');
            return user.avatar_url;
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            let avatarUrl = user.avatar_url;
            if (newAvatar) {
                avatarUrl = await uploadAvatar();
            }

            const { error } = await supabase
                .from('public_users')
                .update({
                    full_name: editForm.full_name,
                    dob: editForm.dob,
                    anniversary_date: editForm.anniversary_date || null,
                    avatar_url: avatarUrl,
                })
                .eq('id', user.id);

            if (error) throw error;

            showToast('Profile updated!');
            setEditMode(false);
            setShowProfile(false);
            setNewAvatar(null);
            setAvatarPreview(null);
            fetchUserData(user.whatsapp_number);
        } catch (err) {
            showToast('Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        localStorage.removeItem('canwin_user');
        await supabase.auth.signOut();
        navigate('/');
    };

    const handleRefresh = () => {
        if (user?.whatsapp_number) {
            setLoading(true);
            fetchUserData(user.whatsapp_number);
        }
    };

    const openProfile = () => {
        setShowProfile(true);
        setEditMode(false);
        setNewAvatar(null);
        setAvatarPreview(null);
        setEditForm({
            full_name: user.full_name,
            dob: user.dob,
            anniversary_date: user.anniversary_date || '',
        });
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{rank}</span>;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user) return null;

    const totalReferrals = (user.paid_referrals || 0) + (user.free_referrals || 0);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="glass-dark sticky top-0 z-50 py-3 px-4">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                    <div onClick={openProfile} className="flex items-center gap-3 cursor-pointer">
                        <div
                            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ border: '2px solid rgba(20, 184, 166, 0.5)', background: 'var(--bg-secondary)' }}
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                            )}
                        </div>
                        <div>
                            <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{user.full_name}</h1>
                            <p className="text-xs text-teal-400 font-mono">{user.custom_id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button
                            onClick={handleRefresh}
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--hover-bg)' }}
                        >
                            <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: 'var(--hover-bg)' }}
                        >
                            <LogOut className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-xl mx-auto p-4">
                <div className="space-y-4">
                    {isBirthday && <BirthdayCard userName={user.full_name.split(' ')[0]} avatarUrl={user.avatar_url} />}

                    {/* Quick Stats */}
                    <div className="stats-grid">
                        <div className="card text-center p-3">
                            <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.total_points || 0}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Points</p>
                        </div>
                        <div className="card text-center p-3">
                            <Users className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalReferrals}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Students</p>
                        </div>
                        <div className="card text-center p-3">
                            <Gift className="w-5 h-5 text-green-400 mx-auto mb-1" />
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.free_referrals || 0}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Free</p>
                        </div>
                        <div className="card text-center p-3">
                            <Award className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.paid_referrals || 0}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Paid</p>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Level Progress</span>
                            <LevelBadge level={user.current_level} size="sm" />
                        </div>
                        <ProgressBar totalPoints={user.total_points || 0} currentLevel={user.current_level} />
                    </div>

                    {/* ID Card */}
                    <IDCard user={user} />

                    {/* Add New Student Button */}
                    <button
                        onClick={() => navigate('/add-student')}
                        className="btn-gold w-full flex items-center justify-center gap-3 py-4 text-lg"
                    >
                        <UserPlus className="w-6 h-6" />
                        Add New Student
                    </button>

                    {/* Refer Promoters Section - Only for Silver+ users */}
                    {canReferPromoters(user.current_level) && (
                        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(168, 85, 247, 0.05))' }}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124, 58, 237, 0.2)' }}>
                                    <Megaphone className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Refer New Promoters</h3>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Share your ID to earn bonus points</p>
                                </div>
                            </div>
                            <div className="p-3 rounded-lg font-mono text-center text-lg" style={{ background: 'var(--hover-bg)', color: 'var(--primary-light)' }}>
                                {user.custom_id}
                            </div>
                            <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                                When new promoters sign up with your code, you earn bonus points each time they refer students!
                            </p>
                        </div>
                    )}

                    {/* Leaderboard Section */}
                    <div className="card">
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => setShowLeaderboard(!showLeaderboard)}
                        >
                            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Trophy className="w-5 h-5 text-amber-400" />
                                Leaderboard
                            </h3>
                            <div className="flex items-center gap-2">
                                {userRank && (
                                    <span className="text-xs px-2 py-1 rounded-full bg-teal-500/20 text-teal-400">
                                        Your Rank: #{userRank}
                                    </span>
                                )}
                            </div>
                        </div>

                        {showLeaderboard && (
                            <div className="space-y-2 mt-4">
                                {leaderboard.length === 0 ? (
                                    <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No promoters yet</p>
                                ) : (
                                    leaderboard.map((promoter, index) => (
                                        <div
                                            key={promoter.id}
                                            className={`flex items-center gap-3 p-2 rounded-lg ${promoter.id === user.id ? 'ring-2 ring-teal-400' : ''
                                                }`}
                                            style={{
                                                background: promoter.id === user.id
                                                    ? 'rgba(20, 184, 166, 0.1)'
                                                    : 'var(--hover-bg)'
                                            }}
                                        >
                                            <div className="w-8 flex justify-center">
                                                {getRankIcon(index + 1)}
                                            </div>
                                            <div
                                                className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {promoter.avatar_url ? (
                                                    <img src={promoter.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {promoter.full_name}
                                                    {promoter.id === user.id && <span className="text-teal-400 text-xs ml-1">(You)</span>}
                                                </p>
                                                <p className="text-xs text-teal-400">{promoter.custom_id}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-amber-400">{promoter.total_points || 0}</p>
                                                <LevelBadge level={promoter.current_level} size="xs" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* My Promoters Section - Only show if user has referred promoters */}
                    {myPromoters.length > 0 && (
                        <div className="card">
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => setShowMyPromoters(!showMyPromoters)}
                            >
                                <div className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-purple-400" />
                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                        My Promoters ({myPromoters.length})
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-purple-400 font-semibold">+{myPromotersBonus} bonus pts</span>
                                    <ChevronDown
                                        className={`w-5 h-5 transition-transform ${showMyPromoters ? 'rotate-180' : ''}`}
                                        style={{ color: 'var(--text-secondary)' }}
                                    />
                                </div>
                            </div>

                            {showMyPromoters && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                        Promoters you referred. You earn bonus points when they refer students.
                                    </p>
                                    {myPromoters.map((promoter) => (
                                        <div
                                            key={promoter.id}
                                            className="flex items-center gap-3 p-3 rounded-lg"
                                            style={{ background: 'var(--hover-bg)' }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                                                style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border-color)' }}
                                            >
                                                {promoter.avatar_url ? (
                                                    <img src={promoter.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {promoter.full_name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-teal-400">{promoter.custom_id || 'Pending'}</span>
                                                    <LevelBadge level={promoter.current_level} size="xs" />
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-sm font-bold text-amber-400">{promoter.total_points || 0} pts</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    {promoter.studentCount} students
                                                </p>
                                                {promoter.bonusEarned > 0 && (
                                                    <p className="text-xs text-purple-400">+{promoter.bonusEarned} bonus</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Referrals */}
                    {referrals.length > 0 && (
                        <div className="card">
                            <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Recent Students</h3>
                            <div className="space-y-2">
                                {referrals.slice(0, 5).map((ref) => (
                                    <div
                                        key={ref.id}
                                        className="flex items-center justify-between p-2 rounded-lg"
                                        style={{ background: 'var(--hover-bg)' }}
                                    >
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{ref.student_name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ref.courses?.name}</p>
                                        </div>
                                        <div className="text-right">
                                            {ref.status === 'approved' && (
                                                <span className="text-xs text-teal-400">+{ref.points_earned}</span>
                                            )}
                                            <span
                                                className="block text-xs px-2 py-1 rounded"
                                                style={{
                                                    background: ref.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                    color: ref.status === 'approved' ? '#22c55e' : '#f59e0b'
                                                }}
                                            >
                                                {ref.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Profile Modal */}
            {showProfile && (
                <div className="modal-overlay" onClick={() => !editMode && setShowProfile(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                {editMode ? 'Edit Profile' : 'Profile'}
                            </h3>
                            <button onClick={() => setShowProfile(false)}>
                                <X className="w-6 h-6" style={{ color: 'var(--text-secondary)' }} />
                            </button>
                        </div>

                        {/* Avatar */}
                        <div className="flex flex-col items-center mb-5">
                            {editMode ? (
                                <label className="cursor-pointer relative">
                                    <div
                                        className="w-24 h-24 rounded-full overflow-hidden"
                                        style={{ border: '3px solid var(--primary)' }}
                                    >
                                        {avatarPreview || user.avatar_url ? (
                                            <img src={avatarPreview || user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                                                <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                        <Camera className="w-6 h-6 text-white" />
                                    </div>
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                            ) : (
                                <div
                                    className="w-24 h-24 rounded-full overflow-hidden"
                                    style={{ border: '3px solid var(--primary)' }}
                                >
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                                            <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    )}
                                </div>
                            )}
                            {editMode && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Max 300KB</p>}
                        </div>

                        {/* Info */}
                        <div className="space-y-3">
                            {editMode ? (
                                <>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.full_name}
                                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
                                        <input
                                            type="date"
                                            value={editForm.dob}
                                            onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>Anniversary</label>
                                        <input
                                            type="date"
                                            value={editForm.anniversary_date}
                                            onChange={(e) => setEditForm({ ...editForm, anniversary_date: e.target.value })}
                                            className="input-field"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Name</p>
                                        <p style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>ID</p>
                                        <p className="text-teal-400 font-mono font-bold">{user.custom_id}</p>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Mobile</p>
                                        <p style={{ color: 'var(--text-primary)' }}>{user.whatsapp_number}</p>
                                    </div>
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level</p>
                                        <LevelBadge level={user.current_level} size="sm" />
                                    </div>
                                    {user.referred_by_custom_id && (
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Referred By</p>
                                            <p className="text-teal-400 font-mono">{user.referred_by_custom_id}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Buttons */}
                        <div className="mt-5 flex gap-2">
                            {editMode ? (
                                <>
                                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                                        {saving ? <Spinner size="sm" /> : <><Save className="w-4 h-4" /> Save</>}
                                    </button>
                                    <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">Cancel</button>
                                </>
                            ) : (
                                <button onClick={() => setEditMode(true)} className="btn-primary w-full">Edit Profile</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
