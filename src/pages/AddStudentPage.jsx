import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, BookOpen, Phone, CreditCard, User, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';

export default function AddStudentPage({ showToast }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({
        studentName: '',
        studentContact: '',
        studentAadhar: '',
        courseId: '',
    });
    const [loading, setLoading] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingUser, setLoadingUser] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('canwin_user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        const parsedUser = JSON.parse(storedUser);

        // Verify user is still valid and approved
        verifyUser(parsedUser.whatsapp_number);
    }, [navigate]);

    const verifyUser = async (whatsappNumber) => {
        try {
            const { data: userData, error } = await supabase
                .from('public_users')
                .select('*')
                .eq('whatsapp_number', whatsappNumber)
                .single();

            if (error || !userData?.is_approved) {
                localStorage.removeItem('canwin_user');
                navigate('/');
                return;
            }

            setUser(userData);
            localStorage.setItem('canwin_user', JSON.stringify(userData));
        } catch (err) {
            console.error('Error verifying user:', err);
            navigate('/');
        } finally {
            setLoadingUser(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchCourses();
        }
    }, [user]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            setCourses(data || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
            showToast('Error loading courses', 'error');
        } finally {
            setLoadingCourses(false);
        }
    };

    const formatAadhar = (value) => {
        const digits = value.replace(/\D/g, '');
        const limited = digits.slice(0, 12);
        const parts = [];
        for (let i = 0; i < limited.length; i += 4) {
            parts.push(limited.slice(i, i + 4));
        }
        return parts.join(' ');
    };

    const handleAadharChange = (e) => {
        const formatted = formatAadhar(e.target.value);
        setForm({ ...form, studentAadhar: formatted });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanAadhar = form.studentAadhar.replace(/\s/g, '');
        if (!form.studentName.trim() || !form.studentContact.trim() || cleanAadhar.length !== 12 || !form.courseId) {
            showToast('Please fill all fields correctly', 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: user.id,
                    course_id: form.courseId,
                    student_name: form.studentName.trim(),
                    student_contact: form.studentContact.trim(),
                    student_aadhar: cleanAadhar,
                    status: 'pending',
                });

            if (error) throw error;

            showToast('Student referral submitted successfully!');
            setForm({ studentName: '', studentContact: '', studentAadhar: '', courseId: '' });

            // Navigate back to dashboard after successful submission
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            console.error('Error submitting referral:', err);
            showToast('Failed to submit referral', 'error');
        } finally {
            setLoading(false);
        }
    };

    const selectedCourse = courses.find(c => c.id === form.courseId);

    if (loadingUser) {
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
                            className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
                            style={{ border: '2px solid rgba(20, 184, 166, 0.5)', background: 'var(--bg-secondary)' }}
                        >
                            {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                            <p className="text-xs text-teal-400 font-mono">{user.custom_id}</p>
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

                    {/* Student Aadhar */}
                    <div className="card">
                        <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            Student Aadhar <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <CreditCard className="input-icon" />
                            <input
                                type="text"
                                value={form.studentAadhar}
                                onChange={handleAadharChange}
                                placeholder="XXXX XXXX XXXX"
                                className="input-field input-with-icon font-mono"
                                disabled={loading}
                                maxLength={14}
                                inputMode="numeric"
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
