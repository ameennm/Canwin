import { useState, useEffect } from 'react';
import { UserPlus, Send, BookOpen } from 'lucide-react';
import { supabase, POINTS } from '../lib/supabase';
import Spinner from './Spinner';

export default function ReferralForm({ userId, onSuccess }) {
    const [form, setForm] = useState({
        studentName: '',
        studentContact: '',
        studentAadhar: '',
        courseId: ''
    });
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [error, setError] = useState('');

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
            console.error('Error:', err);
        } finally {
            setLoadingCourses(false);
        }
    };

    const formatAadhar = (value) => {
        const digits = value.replace(/\D/g, '').slice(0, 12);
        const parts = [];
        for (let i = 0; i < digits.length; i += 4) {
            parts.push(digits.slice(i, i + 4));
        }
        return parts.join(' ');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanAadhar = form.studentAadhar.replace(/\s/g, '');

        if (!form.studentName.trim() || !form.studentContact.trim() || cleanAadhar.length !== 12 || !form.courseId) {
            setError('Please fill all fields correctly');
            return;
        }

        setLoading(true);

        try {
            const { error: insertError } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: userId,
                    course_id: form.courseId,
                    student_name: form.studentName.trim(),
                    student_contact: form.studentContact.trim(),
                    student_aadhar: cleanAadhar,
                    status: 'pending',
                });

            if (insertError) throw insertError;

            setForm({ studentName: '', studentContact: '', studentAadhar: '', courseId: '' });
            onSuccess?.('Referral submitted!');
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to submit. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const selectedCourse = courses.find(c => c.id === form.courseId);

    return (
        <div className="card">
            <div className="flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-teal-400" />
                <h3 className="font-semibold text-white">Refer a Student</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                {/* Course */}
                <div>
                    <label className="block text-xs text-slate-400 mb-1">Course</label>
                    {loadingCourses ? (
                        <div className="flex justify-center py-3"><Spinner size="sm" /></div>
                    ) : (
                        <select
                            value={form.courseId}
                            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                            className="input-field text-sm"
                            disabled={loading}
                        >
                            <option value="">Select course...</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.course_type === 'paid' ? '+10' : '+2'} pts)
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Student Name</label>
                    <input
                        type="text"
                        value={form.studentName}
                        onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                        placeholder="Full name"
                        className="input-field text-sm"
                        disabled={loading}
                    />
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Contact</label>
                    <input
                        type="tel"
                        value={form.studentContact}
                        onChange={(e) => setForm({ ...form, studentContact: e.target.value })}
                        placeholder="WhatsApp number"
                        className="input-field text-sm"
                        disabled={loading}
                    />
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1">Aadhar</label>
                    <input
                        type="text"
                        value={form.studentAadhar}
                        onChange={(e) => setForm({ ...form, studentAadhar: formatAadhar(e.target.value) })}
                        placeholder="XXXX XXXX XXXX"
                        className="input-field text-sm font-mono"
                        disabled={loading}
                        maxLength={14}
                    />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3">
                    {loading ? <Spinner size="sm" /> : <><Send className="w-4 h-4" /> Submit</>}
                </button>
            </form>
        </div>
    );
}
