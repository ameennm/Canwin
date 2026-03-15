import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, User, Link2 } from 'lucide-react';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function MyTeamPage({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [teamData, setTeamData] = useState({ directReferrals: [], stats: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchTeam();
    }, [navigate]);

    const fetchTeam = async () => {
        try {
            const data = await api.team.get();
            setTeamData(data || { directReferrals: [], stats: {} });
        } catch (err) {
            console.error('Error fetching team:', err);
            showToast('Error loading team data', 'error');
        } finally {
            setLoading(false);
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

            <div className="max-w-4xl mx-auto">
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
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Team</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View your network</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="card text-center p-4">
                        <Users className="w-6 h-6 mx-auto mb-2 text-teal-400" />
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{teamData.stats?.team_size || 0}</p>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Total Team Size</p>
                    </div>
                    <div className="card text-center p-4">
                        <Link2 className="w-6 h-6 mx-auto mb-2 text-indigo-400" />
                        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{teamData.stats?.direct_referrals || 0}</p>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Direct Referrals</p>
                    </div>
                </div>

                {/* Direct Referrals */}
                <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Direct Referrals</h2>
                {(!teamData.directReferrals || teamData.directReferrals.length === 0) ? (
                    <div className="card text-center py-10">
                        <User className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No team members yet</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Share your link to grow your team.</p>
                    </div>
                ) : (
                    <div className="cards-grid">
                        {teamData.directReferrals.map(member => (
                            <div key={member.id} className="card">
                                <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{member.name}</h3>
                                        <p className="text-xs font-mono text-teal-400 mb-1">{member.rank}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Team Size: {member.team_size || 0}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-amber-500">{member.total_points || 0} pts</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
