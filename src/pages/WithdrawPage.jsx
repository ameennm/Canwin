import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function WithdrawPage({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        fetchBalance(parsedUser.id);
    }, [navigate]);

    const fetchBalance = async (userId) => {
        try {
            const data = await api.wallet.get(userId);
            setBalance(data.withdrawable_balance || 0);
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

        setSubmitting(true);
        try {
            await api.wallet.withdraw(user.id, withdrawAmount);
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
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
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
                <div className="card bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Withdrawable Balance</p>
                        <h2 className="text-3xl font-black text-blue-500">₹{balance.toLocaleString()}</h2>
                    </div>
                    <Wallet className="w-10 h-10 text-blue-500/50" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Withdrawal Amount (₹) <span className="text-red-400">*</span>
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
                                step="100"
                            />
                        </div>
                        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                            Minimum withdrawal: ₹500. Withdrawals will be processed within 2-3 business days.
                        </p>
                    </div>

                    <div className="card bg-amber-500/10 border-amber-500/20 flex gap-3 text-amber-500 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>Bank and UPI details are managed externally by the admins. Please ensure your payment details are up to date with your manager.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !amount || parseFloat(amount) < 500 || parseFloat(amount) > balance}
                        className="btn-primary w-full py-4 text-lg font-bold"
                    >
                        {submitting ? <Spinner size="sm" /> : 'Submit Request'}
                    </button>
                </form>
            </div>
        </div>
    );
}
