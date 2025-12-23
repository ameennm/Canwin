import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, RefreshCw, User, Zap, Gift, Award, X, Camera, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import IDCard from '../components/IDCard';
import BirthdayCard from '../components/BirthdayCard';
import ReferralForm from '../components/ReferralForm';
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
        } catch (err) {
            console.error('Error:', err);
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 300 * 1024) {
            try {
                const compressedFile = await compressImage(file);
                setNewAvatar(compressedFile);
                setAvatarPreview(URL.createObjectURL(compressedFile));
            } catch (err) {
                showToast('Image must be less than 300KB', 'error');
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
                        if (blob && blob.size <= 300 * 1024) {
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
                    // Extract filename from the URL
                    const urlParts = user.avatar_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    if (oldFileName && oldFileName.includes(user.id)) {
                        await supabase.storage
                            .from('avatars')
                            .remove([oldFileName]);
                    }
                } catch (deleteErr) {
                    // Continue even if delete fails - the new upload is more important
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
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Referrals</p>
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

                    {/* Referral Form */}
                    <ReferralForm userId={user.id} onSuccess={(msg) => { showToast(msg); handleRefresh(); }} />

                    {/* Recent Referrals */}
                    {referrals.length > 0 && (
                        <div className="card">
                            <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>Recent Referrals</h3>
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
