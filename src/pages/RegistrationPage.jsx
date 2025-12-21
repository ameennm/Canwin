import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, User, Calendar, ArrowLeft, Upload, Heart, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function RegistrationPage({ showToast }) {
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone || '';

    const [form, setForm] = useState({
        fullName: '',
        aadharNumber: '',
        dob: '',
        anniversaryDate: '',
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 300 * 1024) {
                showToast('Image must be less than 300KB', 'error');
                return;
            }
            setAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const formatAadhar = (value) => {
        const digits = value.replace(/\D/g, '');
        const limited = digits.slice(0, 12);
        const parts = [];
        for (let i = 0; i < limited.length; i += 4) {
            parts.push(limited.slice(i, i + 4));
        }
        return parts.join(' ');
    };

    const handleAadharChange = (e) => {
        const formatted = formatAadhar(e.target.value);
        setForm({ ...form, aadharNumber: formatted });
    };

    const uploadAvatar = async (userId) => {
        if (!avatar) return null;

        const fileExt = avatar.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatar);

            if (uploadError) {
                console.log('Avatar upload skipped:', uploadError.message);
                return null; // Continue without avatar if bucket doesn't exist
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            console.log('Avatar upload error:', err);
            return null; // Continue without avatar
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanAadhar = form.aadharNumber.replace(/\s/g, '');
        if (!form.fullName.trim() || !form.dob || cleanAadhar.length !== 12) {
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        if (!phone) {
            showToast('WhatsApp number is missing', 'error');
            navigate('/');
            return;
        }

        setLoading(true);

        try {
            const tempId = crypto.randomUUID();

            // Try to upload avatar (will fail gracefully if bucket doesn't exist)
            let avatarUrl = null;
            if (avatar) {
                avatarUrl = await uploadAvatar(tempId);
            }

            // Insert user with the new schema fields
            const { data: newUser, error: insertError } = await supabase
                .from('public_users')
                .insert({
                    full_name: form.fullName.trim(),
                    whatsapp_number: phone,
                    aadhar_number: cleanAadhar,
                    dob: form.dob,
                    anniversary_date: form.anniversaryDate || null,
                    avatar_url: avatarUrl,
                    is_approved: false,
                    total_points: 0,
                    paid_referrals: 0,
                    free_referrals: 0,
                    current_level: 'Initiator',
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    if (insertError.message?.includes('aadhar')) {
                        showToast('This Aadhar number is already registered', 'error');
                    } else {
                        showToast('This WhatsApp number is already registered', 'error');
                    }
                    return;
                }
                throw insertError;
            }

            showToast('Registration successful!');
            navigate('/pending', { state: { user: newUser } });
        } catch (err) {
            console.error('Registration error:', err);
            showToast(err.message || 'Registration failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-4 px-4 safe-area-top safe-area-bottom flex items-start justify-center">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Create Account</h1>
                        <p className="text-sm text-slate-400">Join CanWin</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 fade-in">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <label className="avatar-upload">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                    <User className="w-10 h-10 text-slate-500" />
                                </div>
                            )}
                            <div className="avatar-upload-overlay">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </label>
                        <p className="text-slate-400 text-sm">Tap to upload photo</p>
                    </div>

                    {/* Phone Display */}
                    <div className="card">
                        <label className="block text-sm text-slate-400 mb-2">WhatsApp Number</label>
                        <div className="text-white font-medium">{phone}</div>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            placeholder="Enter your full name"
                            className="input-field"
                            disabled={loading}
                        />
                    </div>

                    {/* Aadhar Number */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Aadhar Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.aadharNumber}
                            onChange={handleAadharChange}
                            placeholder="XXXX XXXX XXXX"
                            className="input-field font-mono"
                            disabled={loading}
                            maxLength={14}
                        />
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            Date of Birth <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={form.dob}
                            onChange={(e) => setForm({ ...form, dob: e.target.value })}
                            className="input-field"
                            disabled={loading}
                        />
                    </div>

                    {/* Anniversary (Optional) */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-pink-400" />
                                Anniversary (Optional)
                            </span>
                        </label>
                        <input
                            type="date"
                            value={form.anniversaryDate}
                            onChange={(e) => setForm({ ...form, anniversaryDate: e.target.value })}
                            className="input-field"
                            disabled={loading}
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Spinner size="sm" /> : <><Upload className="w-5 h-5" /> Register</>}
                    </button>

                    <p className="text-center text-slate-500 text-sm">
                        Your account will be reviewed by admin
                    </p>
                </form>
            </div>
        </div>
    );
}
