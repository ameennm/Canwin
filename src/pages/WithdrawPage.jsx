import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Clock } from 'lucide-react';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-blue-50 text-blue-600',
    paid: 'bg-green-50 text-green-600',
    rejected: 'bg-red-50 text-red-600',
};

export default function WithdrawPage({ showToast }) {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [pending, setPending] = useState(0);
    const [history, setHistory] = useState([]);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('upi');
    const [payment, setPayment] = useState({ upi_id: '', bank_name: '', account_number: '', ifsc: '' });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        fetchWallet(JSON.parse(storedUser).id);
    }, [navigate]);

    const fetchWallet = async (userId) => {
        try {
            const data = await api.wallet.get(userId);
            setBalance(data.withdrawable_balance || 0);
            setPending(data.pending_balance || 0);
            setHistory(data.withdrawals || []);
        } catch (err) {
            console.error('Error fetching balance:', err);
            showToast('Error loading wallet balance', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const withdrawAmount = parseFloat(amount);

        if (!withdrawAmount || withdrawAmount < 500) {
            showToast('Minimum withdrawal amount is ₹500', 'error');
            return;
        }
        if (withdrawAmount > balance) {
            showToast('Insufficient withdrawable balance', 'error');
            return;
        }
        if (method === 'upi' && !payment.upi_id.includes('@')) {
            showToast('Enter your UPI ID (example: name@okaxis)', 'error');
            return;
        }
        if (method === 'bank' && (!payment.bank_name || !payment.account_number || !payment.ifsc)) {
            showToast('Enter bank name, account number and IFSC', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const details = method === 'upi'
                ? { upi_id: payment.upi_id }
                : { bank_name: payment.bank_name, account_number: payment.account_number, ifsc: payment.ifsc };
            await api.wallet.withdraw({ amount: withdrawAmount, ...details });
            showToast('Withdrawal request submitted successfully');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            console.error('Error submitting withdrawal:', err);
            showToast(err.message || 'Failed to submit withdrawal', 'error');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const field = (key, label, placeholder, extra = {}) => (
        <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{label} <span className="text-red-600">*</span></label>
            <input
                value={payment[key]}
                onChange={(e) => setPayment({ ...payment, [key]: e.target.value })}
                placeholder={placeholder}
                className="input-field"
                disabled={submitting}
                {...extra}
            />
        </div>
    );

    return (
        <div className="min-h-screen py-4 px-4 safe-area-top safe-area-bottom">
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
                        style={{ background: 'var(--hover-bg)' }}
                    >
                        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Withdraw Funds</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Request to cash out</p>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="card border-blue-200 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Withdrawable Balance</p>
                        <h2 className="text-3xl font-black text-blue-600">₹{balance.toLocaleString()}</h2>
                        {pending > 0 && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>₹{pending.toLocaleString()} waiting for payout</p>
                        )}
                    </div>
                    <Wallet className="w-10 h-10 text-blue-600/50" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Withdrawal Amount (₹) <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="500 or more"
                                className="input-field pl-10 text-lg font-bold"
                                disabled={submitting}
                                min="500"
                                max={balance}
                                step="1"
                            />
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            Minimum withdrawal: ₹500. Withdrawals will be processed within 2-3 business days.
                        </p>
                    </div>

                    <div className="card space-y-4">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pay me by</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[['upi', 'UPI'], ['bank', 'Bank transfer']].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setMethod(value)}
                                    className={method === value ? 'btn-primary py-2 text-sm' : 'btn-secondary py-2 text-sm'}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {method === 'upi'
                            ? field('upi_id', 'UPI ID', 'name@okaxis')
                            : (
                                <>
                                    {field('bank_name', 'Bank name', 'State Bank of India')}
                                    {field('account_number', 'Account number', '12345678901', { inputMode: 'numeric' })}
                                    {field('ifsc', 'IFSC code', 'SBIN0001234', { style: { textTransform: 'uppercase' } })}
                                </>
                            )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !amount || parseFloat(amount) < 500 || parseFloat(amount) > balance}
                        className="btn-primary w-full py-4 text-lg font-bold"
                    >
                        {submitting ? <Spinner size="sm" /> : 'Submit Request'}
                    </button>
                </form>

                {history.length > 0 && (
                    <div className="card mt-6">
                        <p className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Clock className="w-4 h-4" /> Recent requests
                        </p>
                        <div className="space-y-2">
                            {history.map(w => (
                                <div key={w.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>₹{Number(w.amount).toLocaleString()}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(w.created_at + 'Z').toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${STATUS_STYLES[w.status] || ''}`}>{w.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
