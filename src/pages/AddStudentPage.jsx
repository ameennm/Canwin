import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, User, BookOpen, Search, 
    CheckCircle, AlertCircle, Send, Sparkles,
    Calendar, Phone, CreditCard, UserPlus, RefreshCw, Zap
} from 'lucide-react';
import { api } from '../lib/api';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';

export default function AddStudentPage({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({
        studentName: '',
        studentContact: '',
        courseId: '',
    });
    const [loading, setLoading] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
        fetchCourses();
    }, [navigate]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const data = await api.courses.list();
            setCourses(data || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
            showToast('Error loading courses', 'error');
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.studentName.trim() || !form.studentContact.trim() || !form.courseId) {
            showToast('Please fill all fields', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.admissions.create({
                student_name: form.studentName.trim(),
                student_phone: form.studentContact.trim(),
                course_id: form.courseId,
                admitted_by: user.id
            });

            showToast('Student enrolled successfully!');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            console.error('Error submitting admission:', err);
            showToast(err.message || 'Failed to enroll student', 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectedCourse = courses.find(c => c.id == form.courseId);

    if (loadingCourses && !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen py-4 px-4 safe-area-top safe-area-bottom">
            {/* Theme Toggle */}
            <div className="fixed top-4 right-4 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--hover-bg)' }}
                    >
                        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Add New Student</h1>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Refer a student to earn points</p>
                    </div>
                    <button
                        onClick={fetchCourses}
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'var(--hover-bg)' }}
                        disabled={loadingCourses}
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingCourses ? 'animate-spin' : ''}`} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                </div>

                {/* User Info Card */}
                <div className="card mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center"
                            style={{ border: '2px solid rgba(20, 184, 166, 0.5)', background: 'var(--bg-secondary)' }}
                        >
                            <User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                            <p className="text-xs text-teal-400 font-mono">{user.referral_code}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold text-amber-400">{user.total_points || 0}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Points</p>
                        </div>
                    </div>
                </div>

                {/* Referral Form */}
                <form onSubmit={handleSubmit} className="space-y-4 fade-in">
                    {/* Student Name */}
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Student Name <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <User className="input-icon" />
                            <input
                                type="text"
                                value={form.studentName}
                                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                                placeholder="Enter student's full name"
                                className="input-field input-with-icon"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* Student Contact */}
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Student Mobile <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Phone className="input-icon" />
                            <input
                                type="tel"
                                value={form.studentContact}
                                onChange={(e) => setForm({ ...form, studentContact: e.target.value })}
                                placeholder="+91 XXXXXXXXXX"
                                className="input-field input-with-icon"
                                disabled={loading}
                                inputMode="tel"
                            />
                        </div>
                    </div>

                    {/* Course Selection */}
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Select Course <span className="text-red-400">*</span>
                        </label>

                        {loadingCourses ? (
                            <div className="flex items-center justify-center py-4">
                                <Spinner />
                            </div>
                        ) : courses.length === 0 ? (
                            <div className="text-center py-4">
                                <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No courses available</p>
                                <button
                                    type="button"
                                    onClick={fetchCourses}
                                    className="text-teal-400 text-sm mt-2 underline"
                                >
                                    Refresh
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <BookOpen className="input-icon" />
                                <select
                                    value={form.courseId}
                                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                                    className="input-field input-with-icon"
                                    disabled={loading}
                                >
                                    <option value="">-- Select a course --</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={course.id}>
                                            {course.name} ({course.course_type === 'paid' ? `₹${course.price}` : 'Free'}) - +{course.points} pts
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Points Preview */}
                    {selectedCourse && (
                        <div
                            className="card flex items-center justify-between"
                            style={{
                                background: selectedCourse.course_type === 'paid'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(34, 197, 94, 0.15)',
                                border: `1px solid ${selectedCourse.course_type === 'paid' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <Zap className={`w-5 h-5 ${selectedCourse.course_type === 'paid' ? 'text-amber-400' : 'text-green-400'}`} />
                                <span style={{ color: 'var(--text-secondary)' }}>Points you'll earn:</span>
                            </div>
                            <span
                                className="text-xl font-bold"
                                style={{ color: selectedCourse.course_type === 'paid' ? '#f59e0b' : '#22c55e' }}
                            >
                                +{selectedCourse.points}
                            </span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || loadingCourses || !form.courseId}
                        className="btn-gold w-full flex items-center justify-center gap-2 text-lg py-4"
                    >
                        {loading ? <Spinner size="sm" /> : (
                            <>
                                <UserPlus className="w-5 h-5" />
                                Submit Student Referral
                            </>
                        )}
                    </button>

                    <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                        Referral will be reviewed by admin before points are credited
                    </p>
                </form>
            </div>
        </div>
    );
}
