import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, User, Phone, CalendarDays, Heart, Users, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function RegistrationPage({ showToast }) {
    const navigate = useNavigate();
    const location = useLocation();
    const phone = location.state?.phone || '';
    const password = location.state?.password || '';

    const [form, setForm] = useState({
        fullName: '',
        referrerCode: '', 
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.fullName.trim()) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.register({
                name: form.fullName.trim(),
                phone: phone,
                password: password,
                referral_code: form.referrerCode,
            });

            showToast('Registration successful! Please wait for admin approval.');
            navigate('/');
        } catch (err) {
            console.error('Registration error:', err);
            showToast(err.message || 'Registration failed', 'error');
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
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Become a Promoter</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Join CanWin Referral Program</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 fade-in">


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



                    {/* Referrer Code (Optional) */}
                    <div className="card" style={{ background: 'rgba(20, 184, 166, 0.05)', border: '1px solid rgba(20, 184, 166, 0.2)' }}>
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-teal-400" />
                                Referrer Code (Optional)
                            </span>
                        </label>
                        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                            If another promoter referred you, enter their ID (e.g., CNWN1001)
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={form.referrerCode}
                                onChange={(e) => setForm({...form, referrerCode: e.target.value})}
                                placeholder="CNWN1001"
                                className="input-field font-mono flex-1"
                                disabled={loading}
                                style={{ textTransform: 'uppercase' }}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Spinner size="sm" /> : <><UserPlus className="w-5 h-5" /> Complete Registration</>}
                    </button>

                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Your account will be reviewed by admin
                    </p>
                </form>
            </div>
        </div>
    );
}
