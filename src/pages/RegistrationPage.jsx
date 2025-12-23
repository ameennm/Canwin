import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Camera, User, ArrowLeft, Upload, Heart, AlertCircle, CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function RegistrationPage({ showToast }) {
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone || '';
    const passwordHash = location.state?.passwordHash || '';

    const [form, setForm] = useState({
        fullName: '',
        aadharNumber: '',
        dob: '',
        anniversaryDate: '',
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarError, setAvatarError] = useState(false);
    const [loading, setLoading] = useState(false);

    // Improved image handling for mobile
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setAvatarError(false);

        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 300 * 1024) {
            try {
                const compressedFile = await compressImage(file);
                setAvatar(compressedFile);
                setAvatarPreview(URL.createObjectURL(compressedFile));
                showToast('Image compressed successfully');
            } catch (err) {
                showToast('Image must be less than 300KB. Please choose a smaller image.', 'error');
                return;
            }
        } else {
            setAvatar(file);
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
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            canvas.toBlob(
                                (blob2) => {
                                    if (blob2 && blob2.size <= 300 * 1024) {
                                        const compressedFile = new File([blob2], file.name, {
                                            type: 'image/jpeg',
                                            lastModified: Date.now(),
                                        });
                                        resolve(compressedFile);
                                    } else {
                                        reject(new Error('Cannot compress image enough'));
                                    }
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

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
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

        const fileExt = avatar.name.split('.').pop() || 'jpg';
        const fileName = `${userId}-${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, avatar, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                console.log('Avatar upload error:', uploadError.message);
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            return publicUrl;
        } catch (err) {
            console.log('Avatar upload error:', err);
            throw err;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate avatar is required
        if (!avatar) {
            setAvatarError(true);
            showToast('Please upload your photo', 'error');
            return;
        }

        const cleanAadhar = form.aadharNumber.replace(/\s/g, '');
        if (!form.fullName.trim() || !form.dob || cleanAadhar.length !== 12) {
            showToast('Please fill in all required fields correctly', 'error');
            return;
        }

        if (!phone || !passwordHash) {
            showToast('Session expired. Please start again.', 'error');
            navigate('/');
            return;
        }

        setLoading(true);

        try {
            const tempId = crypto.randomUUID();

            // Upload avatar (required)
            let avatarUrl = null;
            try {
                avatarUrl = await uploadAvatar(tempId);
            } catch (uploadErr) {
                showToast('Failed to upload photo. Please try again.', 'error');
                setLoading(false);
                return;
            }

            // Create user in public_users table
            const { data: newUser, error: insertError } = await supabase
                .from('public_users')
                .insert({
                    full_name: form.fullName.trim(),
                    whatsapp_number: phone,
                    aadhar_number: cleanAadhar,
                    dob: form.dob,
                    anniversary_date: form.anniversaryDate || null,
                    avatar_url: avatarUrl,
                    password_hash: passwordHash,
                    is_approved: false,
                    total_points: 0,
                    paid_referrals: 0,
                    free_referrals: 0,
                    current_level: 'Bronze',
                })
                .select()
                .single();

            if (insertError) {
                if (insertError.code === '23505') {
                    if (insertError.message?.includes('aadhar')) {
                        showToast('This Aadhar number is already registered', 'error');
                    } else {
                        showToast('This mobile number is already registered', 'error');
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

    // Open native date picker
    const openDatePicker = (inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.showPicker && input.showPicker();
            input.focus();
            input.click();
        }
    };

    return (
        <div className="min-h-screen py-4 px-4 safe-area-top safe-area-bottom flex items-start justify-center">
            {/* Theme Toggle */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-md w-full">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--hover-bg)' }}
                    >
                        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Complete Registration</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Join CanWin</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 fade-in">
                    {/* Avatar Upload - Required */}
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <label
                            className={`avatar-upload ${avatarError ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
                            style={{ cursor: 'pointer' }}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                                    <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
                                </div>
                            )}
                            <div className="avatar-upload-overlay">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </label>
                        <div className="text-center">
                            <p className="text-sm" style={{ color: avatarError ? '#ef4444' : 'var(--text-secondary)' }}>
                                {avatarError ? (
                                    <span className="flex items-center justify-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        Photo is required
                                    </span>
                                ) : (
                                    'Tap to upload photo *'
                                )}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Max 300KB (auto-compressed)</p>
                        </div>
                    </div>

                    {/* Phone Display */}
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>Mobile Number</label>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{phone}</div>
                    </div>

                    {/* Full Name */}
                    <div>
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                            inputMode="numeric"
                        />
                    </div>

                    {/* Date of Birth - With calendar button */}
                    <div>
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Date of Birth <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                id="dob-input"
                                type="date"
                                value={form.dob}
                                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                                className="input-field date-input"
                                disabled={loading}
                                max={new Date().toISOString().split('T')[0]}
                            />
                            <button
                                type="button"
                                onClick={() => openDatePicker('dob-input')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <CalendarDays className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Anniversary (Optional) */}
                    <div>
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-1">
                                <Heart className="w-4 h-4 text-pink-400" />
                                Anniversary (Optional)
                            </span>
                        </label>
                        <div className="relative">
                            <input
                                id="anniversary-input"
                                type="date"
                                value={form.anniversaryDate}
                                onChange={(e) => setForm({ ...form, anniversaryDate: e.target.value })}
                                className="input-field date-input"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => openDatePicker('anniversary-input')}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                <CalendarDays className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Spinner size="sm" /> : <><Upload className="w-5 h-5" /> Complete Registration</>}
                    </button>

                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Your account will be reviewed by admin
                    </p>
                </form>
            </div>
        </div>
    );
}
