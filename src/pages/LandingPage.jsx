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
            localStorage.setItem('token', data.token);
            localStorage.removeItem('canwin_admin');
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

    // Ranks and the points needed for each (see lib/server/users.js).
    const ranks = [
        { name: 'JSO', points: 'Start' },
        { name: 'SO', points: '20 pts' },
        { name: 'SOP', points: '75 pts' },
        { name: 'SDO', points: '200 pts' },
        { name: 'Platinum', points: '500 pts' },
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
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-600">
                        <span className="text-white font-bold text-2xl">C</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>CANWIN</h1>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Referral Platform</p>
                    </div>
                </div>

                {/* Hero */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Add students. <span className="text-blue-600">Earn commission.</span>
                    </h2>
                    <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                        Log in with your mobile number, or sign up with a referral code.
                    </p>
                </div>

                {/* Login/Signup Toggle */}
                <div className="flex mb-4 rounded-xl p-1" style={{ background: 'var(--hover-bg)' }}>
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${mode === 'login'
                            ? ' bg-blue-600 text-white'
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
                            ? ' bg-blue-600 text-white'
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
                <div className="card mt-4">
                    <h4 className="font-semibold mb-3 text-sm text-center" style={{ color: 'var(--text-primary)' }}>Ranks</h4>
                    <div className="grid grid-cols-5 gap-1 text-center">
                        {ranks.map((rank) => (
                            <div key={rank.name} className="py-1">
                                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{rank.name}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{rank.points}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>Every approved admission gives you points. Your rank goes up automatically.</p>
                </div>
            </div>
        </div>
    );
}
