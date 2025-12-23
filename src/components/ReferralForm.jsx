import { useState, useEffect } from 'react';
import { UserPlus, BookOpen, Phone, CreditCard, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Spinner from './Spinner';

export default function ReferralForm({ userId, onSuccess }) {
    const [courses, setCourses] = useState([]);
    const [form, setForm] = useState({
        studentName: '',
        studentContact: '',
        studentAadhar: '',
        courseId: '',
    });
    const [loading, setLoading] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data } = await supabase
                .from('courses')
                .select('*')
                .eq('is_active', true)
                .order('name');
            setCourses(data || []);
        } catch (err) {
            console.error('Error fetching courses:', err);
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
            onSuccess && onSuccess('Please fill all fields correctly');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: userId,
                    course_id: form.courseId,
                    student_name: form.studentName.trim(),
                    student_contact: form.studentContact.trim(),
                    student_aadhar: cleanAadhar,
                    status: 'pending',
                });

            if (error) throw error;

            setForm({ studentName: '', studentContact: '', studentAadhar: '', courseId: '' });
            onSuccess && onSuccess('Referral submitted successfully!');
        } catch (err) {
            console.error('Error submitting referral:', err);
            onSuccess && onSuccess('Failed to submit referral');
        } finally {
            setLoading(false);
        }
    };

    const selectedCourse = courses.find(c => c.id === form.courseId);

    return (
        <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <UserPlus className="w-5 h-5 text-teal-400" />
                Add New Referral
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Student Name */}
                <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Student Name
                    </label>
                    <div className="relative">
                        <User className="input-icon" />
                        <input
                            type="text"
                            value={form.studentName}
                            onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                            placeholder="Enter student name"
                            className="input-field input-with-icon"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Student Contact */}
                <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Student Mobile
                    </label>
                    <div className="relative">
                        <Phone className="input-icon" />
                        <input
                            type="tel"
                            value={form.studentContact}
                            onChange={(e) => setForm({ ...form, studentContact: e.target.value })}
                            placeholder="+91 9876543210"
                            className="input-field input-with-icon"
                            disabled={loading}
                            inputMode="tel"
                        />
                    </div>
                </div>

                {/* Student Aadhar */}
                <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Student Aadhar
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
                <div>
                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Select Course
                    </label>
                    {loadingCourses ? (
                        <div className="flex items-center justify-center py-3">
                            <Spinner size="sm" />
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
                                <option value="">Choose a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.name} ({course.course_type === 'paid' ? `₹${course.price}` : 'Free'}) +{course.points}pts
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Points Preview */}
                {selectedCourse && (
                    <div
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ background: selectedCourse.course_type === 'paid' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)' }}
                    >
                        <span style={{ color: 'var(--text-secondary)' }}>Points you'll earn:</span>
                        <span
                            className="font-bold"
                            style={{ color: selectedCourse.course_type === 'paid' ? '#f59e0b' : '#22c55e' }}
                        >
                            +{selectedCourse.points} pts
                        </span>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading || loadingCourses}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                >
                    {loading ? <Spinner size="sm" /> : (
                        <>
                            <UserPlus className="w-5 h-5" />
                            Submit Referral
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
