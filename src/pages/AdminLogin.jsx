import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminLogin({ showToast }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/admin/dashboard');
            }
        } catch (err) {
            console.error('Session check error:', err);
        } finally {
            setCheckingSession(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.email || !form.password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            });

            if (error) throw error;

            showToast('Login successful!');
            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            showToast(err.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Theme Toggle */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-md w-full">
                <div className="card fade-in">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Login</h1>
                        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Access the management dashboard</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="input-icon" />
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="admin@canwin.com"
                                    className="input-field input-with-icon"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
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
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? (
                                <Spinner size="sm" />
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                        Only authorized administrators can access this area
                    </p>
                </div>
            </div>
        </div>
    );
}
