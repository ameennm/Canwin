import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, RefreshCw, ArrowLeft, XCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function PendingPage({ showToast }) {
    const navigate = useNavigate();
    const location = useLocation();
    const user = location.state?.user;
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState('pending'); // pending, approved, rejected

    const checkStatus = async () => {
        if (!user?.whatsapp_number) {
            navigate('/');
            return;
        }

        setChecking(true);

        try {
            const { data, error } = await supabase
                .from('public_users')
                .select('*')
                .eq('whatsapp_number', user.whatsapp_number)
                .single();

            if (error) {
                // User not found - means rejected/deleted
                if (error.code === 'PGRST116') {
                    setStatus('rejected');
                    showToast?.('Your application was not approved', 'error');
                    return;
                }
                throw error;
            }

            if (data?.is_approved) {
                setStatus('approved');
                showToast?.('Your account has been approved!');
                localStorage.setItem('canwin_user', JSON.stringify(data));
                setTimeout(() => navigate('/dashboard'), 1500);
            } else {
                showToast?.('Still pending approval');
            }
        } catch (err) {
            console.error('Error:', err);
            showToast?.('Error checking status', 'error');
        } finally {
            setChecking(false);
        }
    };

    if (!user) {
        navigate('/');
        return null;
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ maxWidth: '384px', width: '100%', textAlign: 'center' }} className="fade-in">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '16px',
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft style={{ width: '20px', height: '20px', color: 'white' }} />
                </button>

                {/* Status Icon */}
                {status === 'rejected' ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <XCircle style={{ width: '40px', height: '40px', color: '#ef4444' }} />
                    </div>
                ) : status === 'approved' ? (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle style={{ width: '40px', height: '40px', color: '#22c55e' }} />
                    </div>
                ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <Clock style={{ width: '40px', height: '40px', color: '#f59e0b' }} />
                    </div>
                )}

                {/* Title */}
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                    {status === 'rejected' ? 'Application Rejected' :
                        status === 'approved' ? 'Approved!' : 'Pending Approval'}
                </h1>

                {/* Message */}
                <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                    {status === 'rejected' ? (
                        'Sorry, your application was not approved. Please contact support or try again.'
                    ) : status === 'approved' ? (
                        'Congratulations! Redirecting to dashboard...'
                    ) : (
                        <>Hi <span style={{ color: 'white', fontWeight: 500 }}>{user.full_name}</span>, your account is being reviewed.</>
                    )}
                </p>

                {/* Info Card */}
                {status !== 'approved' && (
                    <div className="card" style={{ marginBottom: '24px', textAlign: 'left' }}>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>WhatsApp</p>
                        <p style={{ color: 'white', margin: 0 }}>{user.whatsapp_number}</p>
                    </div>
                )}

                {/* Buttons */}
                {status === 'rejected' ? (
                    <button
                        onClick={() => navigate('/')}
                        className="btn-primary"
                        style={{ width: '100%' }}
                    >
                        Back to Home
                    </button>
                ) : status === 'approved' ? (
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn-success"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <CheckCircle style={{ width: '20px', height: '20px' }} /> Go to Dashboard
                    </button>
                ) : (
                    <button
                        onClick={checkStatus}
                        disabled={checking}
                        className="btn-primary"
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        {checking ? <Spinner size="sm" /> : <><RefreshCw style={{ width: '20px', height: '20px' }} /> Check Status</>}
                    </button>
                )}

                {status === 'pending' && (
                    <p style={{ color: '#64748b', fontSize: '14px', marginTop: '16px' }}>
                        You'll get access once approved
                    </p>
                )}
            </div>
        </div>
    );
}
