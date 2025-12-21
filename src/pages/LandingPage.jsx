import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Star, Award, Shield, Crown, Sparkles, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';

export default function LandingPage({ showToast }) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanPhone = phone.trim().replace(/\s/g, '');
        if (!cleanPhone) {
            showToast('Please enter your WhatsApp number', 'error');
            return;
        }

        setLoading(true);

        try {
            const { data: user, error } = await supabase
                .from('public_users')
                .select('*')
                .eq('whatsapp_number', cleanPhone)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!user) {
                navigate('/register', { state: { phone: cleanPhone } });
            } else if (!user.is_approved) {
                navigate('/pending', { state: { user } });
            } else {
                localStorage.setItem('canwin_user', JSON.stringify(user));
                navigate('/dashboard');
            }
        } catch (err) {
            console.error('Error:', err);
            showToast('Something went wrong. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const levels = [
        { name: 'Initiator', icon: Star, points: '0-99', color: 'text-slate-400' },
        { name: 'Advocate', icon: Award, points: '100+', color: 'text-blue-400' },
        { name: 'Guardian', icon: Shield, points: '200+', color: 'text-green-400' },
        { name: 'Mentor', icon: Crown, points: '300+', color: 'text-purple-400' },
        { name: 'Luminary', icon: Sparkles, points: '400+', color: 'text-amber-400' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-6 safe-area-top safe-area-bottom">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">C</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-white">CANWIN</h1>
                        <p className="text-xs text-slate-400">Referral Platform</p>
                    </div>
                </div>

                {/* Hero */}
                <div className="text-center mb-8 fade-in">
                    <h2 className="text-3xl font-bold text-white mb-3">
                        Refer & Earn
                    </h2>
                    <p className="text-slate-400">
                        Get points for every student you refer
                    </p>

                    <div className="flex justify-center gap-4 mt-4">
                        <div className="flex items-center gap-1 text-sm">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-300">Paid: +10</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                            <Zap className="w-4 h-4 text-green-400" />
                            <span className="text-green-300">Free: +2</span>
                        </div>
                    </div>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="card mb-6 fade-in">
                    <h3 className="font-semibold text-white mb-4">Enter WhatsApp Number</h3>

                    <div className="relative mb-4">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 9876543210"
                            className="input-field pl-12"
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? <Spinner size="sm" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
                    </button>

                    <p className="text-center text-slate-500 text-sm mt-3">
                        New? You'll be redirected to register
                    </p>
                </form>

                {/* Levels - Compact */}
                <div className="card fade-in">
                    <h4 className="font-semibold text-white mb-3 text-sm text-center">Level Up With Points</h4>
                    <div className="grid grid-cols-5 gap-1 text-center">
                        {levels.map((level) => (
                            <div key={level.name} className="p-2">
                                <level.icon className={`w-5 h-5 mx-auto mb-1 ${level.color}`} />
                                <p className="text-xs text-white truncate">{level.name.slice(0, 3)}</p>
                                <p className="text-[10px] text-slate-500">{level.points}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
