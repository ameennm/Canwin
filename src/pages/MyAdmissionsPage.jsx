import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {ArrowLeft, BookOpen, Search, User} from 'lucide-react';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function MyAdmissionsPage({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [admissions, setAdmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchAdmissions(JSON.parse(storedUser).id);
    }, [navigate]);

    const fetchAdmissions = async (userId) => {
        try {
            const data = await api.admissions.list();
            setAdmissions(data || []);
        } catch (err) {
            console.error('Error:', err);
            showToast('Error loading admissions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const filterAdmissions = (list) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(a => a.student_name?.toLowerCase().includes(q) || a.student_phone?.includes(q) || a.course_name?.toLowerCase().includes(q));
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
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>My Admissions</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Track your referred students</p>
                    </div>
                </div>

                {/* Search */}
                <div className="card mb-4">
                    <div className="relative">
                        <Search className="input-icon" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by student or course..."
                            className="input-field input-with-icon"
                        />
                    </div>
                </div>

                {/* Card List (Mobile-First) */}
                {filterAdmissions(admissions).length === 0 ? (
                    <div className="card text-center py-10">
                        <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No admissions found</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start referring students to see them here.</p>
                    </div>
                ) : (
                    <div className="cards-grid">
                        {filterAdmissions(admissions).map(a => (
                            <div key={a.id} className="card hover:border-teal-500/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{a.student_name}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.student_phone}</p>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                        a.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                        a.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                        'bg-amber-500/20 text-amber-400'
                                    }`}>
                                        {a.status.toUpperCase()}
                                    </span>
                                </div>
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Course</span>
                                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.course_name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reward</span>
                                        <span className="text-sm font-bold text-teal-400">+{a.points_earned || 0} Points</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Date</span>
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(a.created_at)}</span>
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
