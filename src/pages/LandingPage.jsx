import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LogIn, UserPlus, Phone, Lock, Eye, EyeOff, ArrowRight, Zap, Award, Shield, Crown, Gem } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function LandingPage({ showToast }) {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' or 'signup'
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        const cleanPhone = phone.trim().replace(/\s/g, '');
        if (!cleanPhone || !password) {
            showToast('Please fill all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            const data = await api.auth.login(cleanPhone, password);
            localStorage.setItem('canwin_user', JSON.stringify(data.user));
            localStorage.setItem('canwin_token', data.token);
            navigate('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            showToast(err.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        const cleanPhone = phone.trim().replace(/\s/g, '');
        if (!cleanPhone || password.length < 6 || password !== confirmPassword) {
            showToast('Invalid input or passwords do not match', 'error');
            return;
        }

        navigate('/register', { state: { phone: cleanPhone, password } });
    };

    const handleSubmit = (e) => {
        if (mode === 'login') {
            handleLogin(e);
        } else {
            handleSignup(e);
        }
    };

    const levels = [
        { name: 'Bronze', icon: Award, points: '0-99', color: 'text-amber-600' },
        { name: 'Silver', icon: Shield, points: '100+', color: 'text-slate-400' },
        { name: 'Gold', icon: Crown, points: '250+', color: 'text-yellow-400' },
        { name: 'Diamond', icon: Gem, points: '500+', color: 'text-blue-400' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-6 safe-area-top safe-area-bottom">
            {/* Theme Toggle */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">C</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>CANWIN</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Referral Platform</p>
                    </div>
                </div>

                {/* Hero */}
                <div className="text-center mb-10 fade-in">
                    <h2 className="text-4xl font-black mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Refer & <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-500">Earn Rewards</span>
                    </h2>
                    <p className="text-lg opacity-80" style={{ color: 'var(--text-secondary)' }}>
                        Join our premium network and turn your referrals into earnings.
                    </p>

                    <div className="flex justify-center gap-6 mt-6">
                        <div className="flex flex-col items-center gap-1 group">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6 text-amber-500" />
                            </div>
                            <span className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">Paid: +10</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 group">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Zap className="w-6 h-6 text-green-500" />
                            </div>
                            <span className="text-xs font-bold text-green-500/80 uppercase tracking-wider">Free: +2</span>
                        </div>
                    </div>
                </div>

                {/* Login/Signup Toggle */}
                <div className="flex mb-4 rounded-xl p-1" style={{ background: 'var(--hover-bg)' }}>
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'login'
                            ? 'bg-gradient-to-r from-teal-500 to-purple-500 text-white'
                            : ''
                            }`}
                        style={mode !== 'login' ? { color: 'var(--text-secondary)' } : {}}
                    >
                        <LogIn className="w-4 h-4" />
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'signup'
                            ? 'bg-gradient-to-r from-teal-500 to-purple-500 text-white'
                            : ''
                            }`}
                        style={mode !== 'signup' ? { color: 'var(--text-secondary)' } : {}}
                    >
                        <UserPlus className="w-4 h-4" />
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="card mb-6 fade-in">
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h3>

                    {/* Mobile Number */}
                    <div className="relative mb-4">
                        <Phone className="input-icon" />
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 9876543210"
                            className="input-field input-with-icon"
                            disabled={loading}
                            inputMode="tel"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative mb-4">
                        <Lock className="input-icon" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'login' ? 'Enter password' : 'Create password (min 6 chars)'}
                            className="input-field input-with-icon"
                            style={{ paddingRight: '48px' }}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="password-toggle"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Confirm Password - Only show in signup mode */}
                    {mode === 'signup' && (
                        <div className="relative mb-4">
                            <Lock className="input-icon" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                className="input-field input-with-icon"
                                style={{ paddingRight: '48px' }}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="password-toggle"
                            >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Spinner size="sm" />
                        ) : mode === 'login' ? (
                            <>Login <ArrowRight className="w-5 h-5" /></>
                        ) : (
                            <>Continue <ArrowRight className="w-5 h-5" /></>
                        )}
                    </button>

                    <p className="text-center text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                        {mode === 'login'
                            ? "Don't have an account? Click Sign Up above"
                            : "You'll complete registration on next page"}
                    </p>
                </form>

                {/* Levels - Compact */}
                <div className="card fade-in">
                    <h4 className="font-semibold mb-3 text-sm text-center" style={{ color: 'var(--text-primary)' }}>Level Up With Points</h4>
                    <div className="grid grid-cols-4 gap-1 text-center">
                        {levels.map((level) => (
                            <div key={level.name} className="p-2">
                                <level.icon className={`w-5 h-5 mx-auto mb-1 ${level.color}`} />
                                <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{level.name}</p>
                                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{level.points}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
