import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function PendingPage({ showToast }) {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state?.user;
    const [checking, setChecking] = useState(false);

    const checkStatus = async () => {
        if (!user?.whatsapp_number) return;

        setChecking(true);
        try {
            const { data: userData, error } = await supabase
                .from('public_users')
                .select('*')
                .eq('whatsapp_number', user.whatsapp_number)
                .single();

            if (error) throw error;

            if (userData?.is_approved) {
                localStorage.setItem('canwin_user', JSON.stringify(userData));
                showToast('Account approved!');
                navigate('/dashboard');
            } else {
                showToast('Still pending approval', 'error');
            }
        } catch (err) {
            console.error('Error checking status:', err);
            showToast('Error checking status', 'error');
        } finally {
            setChecking(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="text-center">
                    <p style={{ color: 'var(--text-secondary)' }}>No user data found</p>
                    <button onClick={() => navigate('/')} className="btn-primary mt-4">Go Home</button>
                </div>
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
                <div className="card fade-in text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-amber-400" />
                    </div>

                    {/* Content */}
                    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Pending Approval
                    </h1>
                    <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                        Your account is being reviewed by admin. This usually takes 24-48 hours.
                    </p>

                    {/* User Info */}
                    <div className="rounded-xl p-4 mb-6 text-left" style={{ background: 'var(--hover-bg)' }}>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-muted)' }}>Name</span>
                                <span style={{ color: 'var(--text-primary)' }}>{user.full_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-muted)' }}>Mobile</span>
                                <span style={{ color: 'var(--text-primary)' }}>{user.whatsapp_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                                <span className="text-amber-400 flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> Pending
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={checkStatus}
                            disabled={checking}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {checking ? <Spinner size="sm" /> : (
                                <>
                                    <RefreshCw className="w-5 h-5" />
                                    Check Status
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-secondary w-full flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            Back to Home
                        </button>
                    </div>

                    {/* Info */}
                    <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(13, 148, 136, 0.1)' }}>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-left" style={{ color: 'var(--text-secondary)' }}>
                                You will be able to login and start referring students once your account is approved.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
