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

                {/* List */}
                {filterAdmissions(admissions).length === 0 ? (
                    <div className="card text-center py-10">
                        <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No admissions found</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start referring students to see them here.</p>
                    </div>
                ) : (
                    <div className="table-container card p-0 overflow-hidden">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Course</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filterAdmissions(admissions).map(a => (
                                    <tr key={a.id}>
                                        <td>
                                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{a.student_name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{a.student_phone}</p>
                                        </td>
                                        <td>
                                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.course_name}</p>
                                            <p className="text-xs text-teal-400">+{a.points_earned || 0} pts</p>
                                        </td>
                                        <td>
                                            <span className={`text-xs px-2 py-1 rounded-full ${
                                                a.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                a.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {formatDate(a.created_at)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
