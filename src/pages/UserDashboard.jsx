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
            console.log('User data loaded, avatar_url:', userData.avatar_url);
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

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Limit to 300KB
            if (file.size > 300 * 1024) {
                showToast('Image must be less than 300KB', 'error');
                return;
            }
            setNewAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const uploadAvatar = async () => {
        if (!newAvatar || !user) return user.avatar_url;

        const fileExt = newAvatar.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, newAvatar);

            if (uploadError) {
                console.error('Avatar upload error:', uploadError);
                showToast('Photo upload failed: ' + uploadError.message, 'error');
                return user.avatar_url;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            console.error('Avatar upload error:', err);
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
                console.log('New avatar URL:', avatarUrl);
            }

            console.log('Saving profile with avatar_url:', avatarUrl);

            const { error } = await supabase
                .from('public_users')
                .update({
                    full_name: editForm.full_name,
                    dob: editForm.dob,
                    anniversary_date: editForm.anniversary_date || null,
                    avatar_url: avatarUrl,
                })
                .eq('id', user.id);

            if (error) {
                console.error('Profile update error:', error);
                throw error;
            }

            showToast('Profile updated!');
            setEditMode(false);
            setShowProfile(false);
            setNewAvatar(null);
            setAvatarPreview(null);
            fetchUserData(user.whatsapp_number);
        } catch (err) {
            console.error('Error:', err);
            showToast('Failed to update profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('canwin_user');
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
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user) return null;

    const totalReferrals = (user.paid_referrals || 0) + (user.free_referrals || 0);

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Header */}
            <header className="glass-dark" style={{ position: 'sticky', top: 0, zIndex: 50, padding: '12px 16px' }}>
                <div style={{ maxWidth: '512px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div
                        onClick={openProfile}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    >
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid rgba(20, 184, 166, 0.5)',
                            background: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User style={{ width: '20px', height: '20px', color: '#94a3b8' }} />
                            )}
                        </div>
                        <div>
                            <h1 style={{ fontWeight: 600, color: 'white', fontSize: '14px', margin: 0 }}>{user.full_name}</h1>
                            <p style={{ fontSize: '12px', color: '#14b8a6', fontFamily: 'monospace', margin: 0 }}>{user.custom_id}</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={handleRefresh} style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <RefreshCw style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                        </button>
                        <button onClick={handleLogout} style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LogOut style={{ width: '16px', height: '16px', color: '#94a3b8' }} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ maxWidth: '512px', margin: '0 auto', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isBirthday && <BirthdayCard userName={user.full_name.split(' ')[0]} avatarUrl={user.avatar_url} />}

                    {/* Quick Stats */}
                    <div className="stats-grid">
                        <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                            <Zap style={{ width: '20px', height: '20px', color: '#f59e0b', margin: '0 auto 4px' }} />
                            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>{user.total_points || 0}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Points</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                            <Users style={{ width: '20px', height: '20px', color: '#14b8a6', margin: '0 auto 4px' }} />
                            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>{totalReferrals}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Referrals</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                            <Gift style={{ width: '20px', height: '20px', color: '#22c55e', margin: '0 auto 4px' }} />
                            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>{user.free_referrals || 0}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Free</p>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '12px' }}>
                            <Award style={{ width: '20px', height: '20px', color: '#8b5cf6', margin: '0 auto 4px' }} />
                            <p style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>{user.paid_referrals || 0}</p>
                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>Paid</p>
                        </div>
                    </div>

                    {/* Level Progress */}
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Level Progress</span>
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
                            <h3 style={{ fontWeight: 600, color: 'white', marginBottom: '12px', fontSize: '14px' }}>Recent Referrals</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {referrals.slice(0, 5).map((ref) => (
                                    <div key={ref.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>{ref.student_name}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{ref.courses?.name}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            {ref.status === 'approved' && (
                                                <span style={{ fontSize: '12px', color: '#14b8a6' }}>+{ref.points_earned}</span>
                                            )}
                                            <span style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                background: ref.status === 'approved' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                color: ref.status === 'approved' ? '#22c55e' : '#f59e0b'
                                            }}>
                                                {ref.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main >

            {/* Profile Modal */}
            {
                showProfile && (
                    <div className="modal-overlay" onClick={() => !editMode && setShowProfile(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                                    {editMode ? 'Edit Profile' : 'Profile'}
                                </h3>
                                <button onClick={() => setShowProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <X style={{ width: '24px', height: '24px', color: '#94a3b8' }} />
                                </button>
                            </div>

                            {/* Avatar */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                                {editMode ? (
                                    <label style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid #14b8a6',
                                        cursor: 'pointer',
                                        position: 'relative'
                                    }}>
                                        {avatarPreview || user.avatar_url ? (
                                            <img src={avatarPreview || user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User style={{ width: '40px', height: '40px', color: '#64748b' }} />
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Camera style={{ width: '24px', height: '24px', color: 'white' }} />
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                                    </label>
                                ) : (
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        overflow: 'hidden',
                                        border: '3px solid #14b8a6'
                                    }}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <User style={{ width: '40px', height: '40px', color: '#64748b' }} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                {editMode && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Max 300KB</p>}
                            </div>

                            {/* Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {editMode ? (
                                    <>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Full Name</label>
                                            <input
                                                type="text"
                                                value={editForm.full_name}
                                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Date of Birth</label>
                                            <input
                                                type="date"
                                                value={editForm.dob}
                                                onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Anniversary</label>
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
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>Name</p>
                                            <p style={{ color: 'white', margin: 0 }}>{user.full_name}</p>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>ID</p>
                                            <p style={{ color: '#14b8a6', fontFamily: 'monospace', fontWeight: 'bold', margin: 0 }}>{user.custom_id}</p>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>WhatsApp</p>
                                            <p style={{ color: 'white', margin: 0 }}>{user.whatsapp_number}</p>
                                        </div>
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>Level</p>
                                            <LevelBadge level={user.current_level} size="sm" />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Buttons */}
                            <div style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
                                {editMode ? (
                                    <>
                                        <button onClick={handleSaveProfile} disabled={saving} className="btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            {saving ? <Spinner size="sm" /> : <><Save style={{ width: '16px', height: '16px' }} /> Save</>}
                                        </button>
                                        <button onClick={() => setEditMode(false)} className="btn-secondary" style={{ flex: 1 }}>
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => setEditMode(true)} className="btn-primary" style={{ width: '100%' }}>
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
