import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, Users, UserCheck, CheckCircle, RefreshCw, Clock, User, Phone,
    Award, Search, X, Edit2, CreditCard, BookOpen, Plus, TrendingUp, Zap,
    BarChart3, Gift, DollarSign, Trash2, ChevronRight, ArrowLeft, GraduationCap,
    Megaphone, Calendar, ChevronDown, Link2, Trophy, Crown, Medal
} from 'lucide-react';
import { supabase, getMonthName, formatDate } from '../lib/supabase';
import Spinner from '../components/Spinner';
import LevelBadge from '../components/LevelBadge';
import ThemeToggle from '../components/ThemeToggle';

export default function AdminDashboard({ showToast }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    const [pendingPromoters, setPendingPromoters] = useState([]);
    const [allPromoters, setAllPromoters] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [pendingReferrals, setPendingReferrals] = useState([]);
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({ totalPromoters: 0, totalStudents: 0, totalPoints: 0, paidReferrals: 0, freeReferrals: 0 });
    const [monthlyData, setMonthlyData] = useState([]);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [viewMode, setViewMode] = useState('pending');
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({
        name: '',
        description: '',
        course_type: 'free',
        points: 10,
        promoter_referral_points: 50,
        price: 0,
        is_active: true
    });

    // Student details modal
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetails, setStudentDetails] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Promoter details modal
    const [selectedPromoter, setSelectedPromoter] = useState(null);
    const [promoterReferrals, setPromoterReferrals] = useState([]);
    const [promoterReferredPromoters, setPromoterReferredPromoters] = useState([]);

    // Monthly analysis
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [monthlyTopPromoters, setMonthlyTopPromoters] = useState([]);
    const [courseAnalytics, setCourseAnalytics] = useState([]);

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { navigate('/adminlogin'); return; }
            fetchData();
        } catch (err) { navigate('/adminlogin'); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch pending promoters
            const { data: pendingData } = await supabase.from('public_users').select('*').eq('is_approved', false).order('created_at', { ascending: false });
            setPendingPromoters(pendingData || []);

            // Fetch all promoters with referrer info
            const { data: allData } = await supabase.from('public_users').select('*').order('total_points', { ascending: false });
            setAllPromoters(allData || []);

            // Fetch all students (from APPROVED referrals only)
            const { data: studentsData } = await supabase.from('referrals').select(`*, public_users:referrer_id (id, full_name, custom_id), courses:course_id (name, course_type, points, price)`).eq('status', 'approved').order('created_at', { ascending: false });
            setAllStudents(studentsData || []);

            // Fetch pending referrals
            const { data: referralsData } = await supabase.from('referrals').select(`*, public_users:referrer_id (id, full_name, custom_id), courses:course_id (name, course_type, points)`).eq('status', 'pending').order('created_at', { ascending: false });
            setPendingReferrals(referralsData || []);

            // Fetch courses
            const { data: coursesData } = await supabase.from('courses').select('*').order('name');
            setCourses(coursesData || []);

            // Calculate stats
            const approvedPromoters = (allData || []).filter(u => u.is_approved);
            const totalPoints = approvedPromoters.reduce((sum, u) => sum + (u.total_points || 0), 0);
            const paidRefs = approvedPromoters.reduce((sum, u) => sum + (u.paid_referrals || 0), 0);
            const freeRefs = approvedPromoters.reduce((sum, u) => sum + (u.free_referrals || 0), 0);
            const uniqueStudents = new Set((studentsData || []).map(s => s.student_aadhar)).size;

            setStats({ totalPromoters: approvedPromoters.length, totalStudents: uniqueStudents, totalPoints, paidReferrals: paidRefs, freeReferrals: freeRefs });

            await fetchMonthlyData();
            await fetchMonthlyTopPromoters(selectedMonth);
            await fetchCourseAnalytics(selectedMonth);
        } catch (err) {
            showToast('Error loading data', 'error');
        } finally { setLoading(false); }
    };

    const fetchMonthlyData = async () => {
        try {
            const now = new Date();
            const monthlyStats = [];
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
                const { data: monthRefs } = await supabase.from('referrals').select('points_earned, courses:course_id(course_type)').eq('status', 'approved').gte('created_at', date.toISOString()).lt('created_at', nextMonth.toISOString());
                const paidCount = (monthRefs || []).filter(r => r.courses?.course_type === 'paid').length;
                const freeCount = (monthRefs || []).filter(r => r.courses?.course_type === 'free').length;
                monthlyStats.push({ month: getMonthName(date.getMonth()), year: date.getFullYear(), paid: paidCount, free: freeCount, total: paidCount + freeCount });
            }
            setMonthlyData(monthlyStats);
        } catch (err) { console.error('Error fetching monthly data:', err); }
    };

    const fetchMonthlyTopPromoters = async (monthStr) => {
        try {
            const [year, month] = monthStr.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);

            const { data: monthRefs } = await supabase.from('referrals').select('referrer_id, points_earned, public_users:referrer_id(id, full_name, custom_id, avatar_url)').eq('status', 'approved').gte('created_at', startDate.toISOString()).lt('created_at', endDate.toISOString());

            const promoterMap = {};
            (monthRefs || []).forEach(ref => {
                const id = ref.referrer_id;
                if (!promoterMap[id]) {
                    promoterMap[id] = { ...ref.public_users, points: 0, count: 0 };
                }
                promoterMap[id].points += ref.points_earned || 0;
                promoterMap[id].count += 1;
            });

            const sorted = Object.values(promoterMap).sort((a, b) => b.points - a.points).slice(0, 10);
            setMonthlyTopPromoters(sorted);
        } catch (err) { console.error('Error:', err); }
    };

    const fetchCourseAnalytics = async (monthStr) => {
        try {
            const [year, month] = monthStr.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 1);

            // Get all approved referrals for the month with course info
            const { data: monthRefs } = await supabase
                .from('referrals')
                .select('course_id, points_earned, courses:course_id(id, name, course_type, points, price)')
                .eq('status', 'approved')
                .gte('created_at', startDate.toISOString())
                .lt('created_at', endDate.toISOString());

            // Group by course
            const courseMap = {};
            (monthRefs || []).forEach(ref => {
                const courseId = ref.course_id;
                if (!courseMap[courseId] && ref.courses) {
                    courseMap[courseId] = {
                        ...ref.courses,
                        admissions: 0,
                        totalPoints: 0
                    };
                }
                if (courseMap[courseId]) {
                    courseMap[courseId].admissions += 1;
                    courseMap[courseId].totalPoints += ref.points_earned || 0;
                }
            });

            const sorted = Object.values(courseMap).sort((a, b) => b.admissions - a.admissions);
            setCourseAnalytics(sorted);
        } catch (err) { console.error('Error fetching course analytics:', err); }
    };

    const fetchStudentDetails = async (student) => {
        setSelectedStudent(student);
        setLoadingDetails(true);
        try {
            const { data } = await supabase.from('referrals').select(`*, public_users:referrer_id (full_name, custom_id), courses:course_id (name, course_type, points, price)`).eq('student_aadhar', student.student_aadhar).order('created_at', { ascending: false });
            setStudentDetails(data || []);
        } catch (err) { showToast('Error loading details', 'error'); }
        finally { setLoadingDetails(false); }
    };

    const fetchPromoterDetails = async (promoter) => {
        setSelectedPromoter(promoter);
        setLoadingDetails(true);
        try {
            // Fetch students referred by this promoter
            const { data: refData } = await supabase.from('referrals').select(`*, courses:course_id (name, course_type, points, price)`).eq('referrer_id', promoter.id).order('created_at', { ascending: false });
            setPromoterReferrals(refData || []);

            // Fetch promoters referred by this promoter
            const { data: referredPromoters } = await supabase.from('public_users').select('id, full_name, custom_id, avatar_url, total_points, current_level, is_approved, created_at').eq('referred_by', promoter.id).order('created_at', { ascending: false });
            setPromoterReferredPromoters(referredPromoters || []);
        } catch (err) { showToast('Error loading details', 'error'); }
        finally { setLoadingDetails(false); }
    };

    const handleApproveUser = async (userId) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.from('public_users').update({ is_approved: true }).eq('id', userId);
            if (error) throw error;
            showToast('Promoter approved!');
            fetchData();
        } catch (err) { showToast('Failed to approve', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleVerifyReferral = async (referralId) => {
        setActionLoading(referralId);
        try {
            const { error } = await supabase.from('referrals').update({ status: 'approved' }).eq('id', referralId);
            if (error) throw error;
            showToast('Referral verified!');
            fetchData();
        } catch (err) { showToast('Failed to verify', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleEditUser = (user) => {
        setEditingUser(user.id);
        setEditForm({ full_name: user.full_name, whatsapp_number: user.whatsapp_number, total_points: user.total_points || 0, is_approved: user.is_approved });
    };

    const handleSaveUser = async (userId) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase.from('public_users').update({ full_name: editForm.full_name, whatsapp_number: editForm.whatsapp_number, total_points: parseInt(editForm.total_points) || 0, is_approved: editForm.is_approved }).eq('id', userId);
            if (error) throw error;
            showToast('Updated!');
            setEditingUser(null);
            fetchData();
        } catch (err) { showToast('Failed to update', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleDeleteUser = async (userId, name) => {
        if (!confirm(`Delete ${name}? This will delete all their referrals.`)) return;
        setActionLoading(`del-${userId}`);
        try {
            await supabase.from('referrals').delete().eq('referrer_id', userId);
            const { error } = await supabase.from('public_users').delete().eq('id', userId);
            if (error) throw error;
            showToast('Deleted!');
            fetchData();
        } catch (err) { showToast('Failed to delete', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleSaveCourse = async () => {
        setActionLoading('course');
        try {
            const courseData = {
                name: courseForm.name,
                description: courseForm.description,
                course_type: courseForm.course_type,
                points: parseFloat(courseForm.points) || 10,
                promoter_referral_points: parseFloat(courseForm.promoter_referral_points) || 50,
                price: courseForm.course_type === 'paid' ? parseFloat(courseForm.price) || 0 : 0,
                is_active: courseForm.is_active
            };
            if (editingCourse) {
                await supabase.from('courses').update(courseData).eq('id', editingCourse.id);
            } else {
                await supabase.from('courses').insert(courseData);
            }
            showToast('Course saved!');
            setShowCourseModal(false);
            setEditingCourse(null);
            setCourseForm({ name: '', description: '', course_type: 'free', points: 10, promoter_referral_points: 50, second_level_points: 5, price: 0, is_active: true });
            fetchData();
        } catch (err) { showToast('Failed to save course', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleDeleteCourse = async (id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        setActionLoading(`del-c-${id}`);
        try {
            await supabase.from('courses').delete().eq('id', id);
            showToast('Deleted!');
            fetchData();
        } catch (err) { showToast('Course has referrals attached', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleLogout = async () => { await supabase.auth.signOut(); navigate('/adminlogin'); };

    const filterPromoters = (list) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(u => u.full_name?.toLowerCase().includes(q) || u.whatsapp_number?.includes(q) || u.custom_id?.toLowerCase().includes(q));
    };

    const filterStudents = (list) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(s => s.student_name?.toLowerCase().includes(q) || s.student_contact?.includes(q) || s.student_aadhar?.includes(q));
    };

    // Get referrer name for a promoter
    const getReferrerName = (promoter) => {
        if (!promoter.referred_by) return null;
        const referrer = allPromoters.find(p => p.id === promoter.referred_by);
        return referrer ? { name: referrer.full_name, custom_id: referrer.custom_id } : { name: 'Unknown', custom_id: promoter.referred_by_custom_id };
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{rank}</span>;
    };

    const maxBarValue = Math.max(...monthlyData.map(d => d.total), 1);
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthOptions.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${getMonthName(d.getMonth())} ${d.getFullYear()}` });
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="min-h-screen pb-8 safe-area-top safe-area-bottom">
            {/* Header */}
            <header className="glass-dark sticky top-0 z-50 py-3 px-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button onClick={fetchData} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--hover-bg)' }}><RefreshCw className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /></button>
                        <button onClick={handleLogout} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--hover-bg)' }}><LogOut className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    <div className="card text-center p-3"><Megaphone className="w-5 h-5 text-teal-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalPromoters}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Promoters</p></div>
                    <div className="card text-center p-3"><GraduationCap className="w-5 h-5 text-purple-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalStudents}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Students</p></div>
                    <div className="card text-center p-3"><Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalPoints}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Points</p></div>
                    <div className="card text-center p-3 hidden sm:block"><DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.paidReferrals}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Paid</p></div>
                    <div className="card text-center p-3 hidden sm:block"><Gift className="w-5 h-5 text-blue-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.freeReferrals}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Free</p></div>
                </div>

                {/* Search */}
                <div className="card p-3">
                    <div className="relative">
                        <Search className="input-icon" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search promoters or students..." className="input-field input-with-icon" style={{ paddingRight: '40px' }} />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>}
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs-container">
                    {[
                        { id: 'analytics', icon: BarChart3, label: 'Analytics' },
                        { id: 'promoters', icon: Megaphone, label: 'Promoters', badge: allPromoters.filter(p => p.is_approved).length },
                        { id: 'students', icon: GraduationCap, label: 'Students', badge: stats.totalStudents },
                        { id: 'approvals', icon: UserCheck, label: 'Approvals', badge: pendingPromoters.length, highlight: pendingPromoters.length > 0 },
                        { id: 'referrals', icon: Award, label: 'Referrals', badge: pendingReferrals.length, highlight: pendingReferrals.length > 0 },
                        { id: 'courses', icon: BookOpen, label: 'Courses' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}>
                            <span className="flex items-center gap-2">
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {tab.badge !== undefined && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.highlight ? 'bg-amber-500 text-white' : 'bg-teal-500 text-white'}`}>{tab.badge}</span>}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-4">
                        {/* Monthly Chart */}
                        <div className="card">
                            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><TrendingUp className="w-5 h-5 text-teal-400" />Monthly Referrals (Last 6 Months)</h3>
                            <div className="chart-container">
                                <div className="bar-chart">
                                    {monthlyData.map((d, i) => (
                                        <div key={i} className="bar-item">
                                            <div className="flex flex-col items-center gap-1 w-full" style={{ height: '100%' }}>
                                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{d.total}</span>
                                                <div className="bar w-full" style={{ height: `${(d.total / maxBarValue) * 100}%`, minHeight: '4px' }} />
                                            </div>
                                            <span className="bar-label">{d.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Monthly Top Performers */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Trophy className="w-5 h-5 text-amber-400" />Top Promoters</h3>
                                <select value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); fetchMonthlyTopPromoters(e.target.value); fetchCourseAnalytics(e.target.value); }} className="input-field text-sm py-2 px-3" style={{ width: 'auto' }}>
                                    {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            {monthlyTopPromoters.length === 0 ? (
                                <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No referrals in this month</p>
                            ) : (
                                <div className="space-y-2">
                                    {monthlyTopPromoters.map((p, i) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                            <div className="w-8 flex justify-center">{getRankIcon(i + 1)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.full_name}</p>
                                                <p className="text-xs text-teal-400">{p.custom_id} • {p.count} referrals</p>
                                            </div>
                                            <span className="text-amber-400 font-bold">{p.points} pts</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Course Analytics */}
                        <div className="card">
                            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <BookOpen className="w-5 h-5 text-purple-400" />
                                Course Admissions
                                <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--hover-bg)', color: 'var(--text-muted)' }}>
                                    {monthOptions.find(m => m.value === selectedMonth)?.label}
                                </span>
                            </h3>
                            {courseAnalytics.length === 0 ? (
                                <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No admissions in this month</p>
                            ) : (
                                <div className="space-y-3">
                                    {courseAnalytics.map((course, i) => (
                                        <div key={course.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{
                                                background: i === 0 ? 'rgba(245, 158, 11, 0.2)' : i === 1 ? 'rgba(148, 163, 184, 0.2)' : i === 2 ? 'rgba(205, 127, 50, 0.2)' : 'var(--bg-secondary)',
                                                color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--text-muted)'
                                            }}>
                                                #{i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{course.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${course.course_type === 'paid' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {course.course_type === 'paid' ? `₹${course.price}` : 'Free'}
                                                    </span>
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{course.points} pts/student</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-teal-400">{course.admissions}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>admissions</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Promoters Tab */}
                {activeTab === 'promoters' && (
                    <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click on a promoter to see their students and who they referred. <Link2 className="w-4 h-4 inline" /> indicates they were referred by another promoter.</p>
                        {filterPromoters(allPromoters.filter(p => p.is_approved)).length === 0 ? (
                            <div className="card text-center py-8"><Megaphone className="w-10 h-10 text-teal-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No promoters found</p></div>
                        ) : (
                            <div className="table-container card p-0 overflow-hidden">
                                <table className="data-table">
                                    <thead><tr><th>Promoter</th><th>ID</th><th>Referred By</th><th>Points</th><th>Referrals</th><th>Level</th><th></th></tr></thead>
                                    <tbody>
                                        {filterPromoters(allPromoters.filter(p => p.is_approved)).map(p => {
                                            const referrer = getReferrerName(p);
                                            return (
                                                <tr key={p.id} className="cursor-pointer" onClick={() => fetchPromoterDetails(p)}>
                                                    <td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>{p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2" style={{ color: 'var(--text-muted)' }} />}</div><span className="font-medium">{p.full_name}</span></div></td>
                                                    <td><span className="text-teal-400 font-mono text-sm">{p.custom_id}</span></td>
                                                    <td>
                                                        {referrer ? (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                                                                <Link2 className="w-3 h-3 inline mr-1" />{referrer.custom_id || referrer.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Direct</span>
                                                        )}
                                                    </td>
                                                    <td className="font-semibold text-amber-400">{p.total_points || 0}</td>
                                                    <td>
                                                        <span className="text-green-400">{p.free_referrals || 0}F</span> / <span className="text-amber-400">{p.paid_referrals || 0}P</span>
                                                        {(p.promoter_referrals || 0) > 0 && <span className="text-purple-400 ml-1">/ {p.promoter_referrals}Pro</span>}
                                                    </td>
                                                    <td><LevelBadge level={p.current_level} size="sm" /></td>
                                                    <td><ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Students Tab */}
                {activeTab === 'students' && (
                    <div className="space-y-4">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Students are people referred to courses by promoters. Click to see details.</p>
                        {filterStudents(allStudents).length === 0 ? (
                            <div className="card text-center py-8"><GraduationCap className="w-10 h-10 text-purple-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No students found</p></div>
                        ) : (
                            <div className="table-container card p-0 overflow-hidden">
                                <table className="data-table">
                                    <thead><tr><th>Student</th><th>Contact</th><th>Course</th><th>Referred By</th><th>Date</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {filterStudents(allStudents).map(s => (
                                            <tr key={s.id} className="cursor-pointer" onClick={() => fetchStudentDetails(s)}>
                                                <td className="font-medium">{s.student_name}</td>
                                                <td className="text-sm">{s.student_contact}</td>
                                                <td><span className={`badge text-xs ${s.courses?.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{s.courses?.name}</span></td>
                                                <td><span className="text-teal-400">{s.public_users?.full_name}</span></td>
                                                <td className="text-sm">{formatDate(s.created_at)}</td>
                                                <td><span className={`text-xs px-2 py-1 rounded ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{s.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Approvals Tab */}
                {activeTab === 'approvals' && (
                    <div className="space-y-4">
                        {pendingPromoters.length === 0 ? (
                            <div className="card text-center py-8"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No pending approvals</p></div>
                        ) : (
                            <div className="cards-grid">
                                {pendingPromoters.map(u => {
                                    const referrer = getReferrerName(u);
                                    return (
                                        <div key={u.id} className="card">
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-xl overflow-hidden" style={{ border: '2px solid var(--border-color)' }}>{u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} /></div>}</div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.full_name}</h3>
                                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.whatsapp_number}</p>
                                                    {referrer && (
                                                        <p className="text-xs mt-1">
                                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                                <Link2 className="w-3 h-3 inline mr-1" />Referred by: {referrer.custom_id || referrer.name}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => handleApproveUser(u.id)} disabled={actionLoading === u.id} className="btn-success flex-1 text-sm py-2">{actionLoading === u.id ? <Spinner size="sm" /> : 'Approve'}</button>
                                                <button onClick={() => handleDeleteUser(u.id, u.full_name)} disabled={actionLoading === `del-${u.id}`} className="btn-danger text-sm py-2 px-3">{actionLoading === `del-${u.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && (
                    <div className="space-y-4">
                        {pendingReferrals.length === 0 ? (
                            <div className="card text-center py-8"><CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No pending referrals</p></div>
                        ) : (
                            <div className="cards-grid">
                                {pendingReferrals.map(ref => (
                                    <div key={ref.id} className="card">
                                        <div className="flex justify-between items-start mb-2">
                                            <div><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{ref.public_users?.full_name}</p><p className="text-xs text-teal-400">{ref.public_users?.custom_id}</p></div>
                                            <span className={`badge text-xs ${ref.courses?.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>+{ref.courses?.points} pts</span>
                                        </div>
                                        <div className="rounded-lg p-2 mt-2 text-sm" style={{ background: 'var(--hover-bg)' }}>
                                            <p style={{ color: 'var(--text-primary)' }}>{ref.student_name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ref.student_contact}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ref.courses?.name}</p>
                                        </div>
                                        <button onClick={() => handleVerifyReferral(ref.id)} disabled={actionLoading === ref.id} className="btn-success w-full mt-3 text-sm py-2">{actionLoading === ref.id ? <Spinner size="sm" /> : 'Verify'}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <div className="space-y-4">
                        <button onClick={() => { setEditingCourse(null); setCourseForm({ name: '', description: '', course_type: 'free', points: 10, promoter_referral_points: 50, second_level_points: 5, price: 0, is_active: true }); setShowCourseModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Course</button>
                        <div className="cards-grid">
                            {courses.map(c => (
                                <div key={c.id} className="card">
                                    <div className="flex justify-between items-start mb-2"><h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h4><span className={`badge text-xs ${c.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{c.course_type === 'paid' ? `₹${c.price}` : 'Free'}</span></div>
                                    <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{c.description || 'No description'}</p>
                                    <div className="space-y-1 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                        <p>Student Referral: <span className="text-teal-400 font-semibold">+{c.points} pts</span></p>
                                        <p>Promoter Referral: <span className="text-purple-400 font-semibold">+{c.promoter_referral_points || 0} pts</span></p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${c.is_active ? 'text-green-400' : 'text-red-400'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => { setEditingCourse(c); setCourseForm({ name: c.name, description: c.description || '', course_type: c.course_type, points: c.points || 10, promoter_referral_points: c.promoter_referral_points || 50, price: c.price || 0, is_active: c.is_active }); setShowCourseModal(true); }} style={{ color: 'var(--text-secondary)' }}><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteCourse(c.id, c.name)} disabled={actionLoading === `del-c-${c.id}`} style={{ color: 'var(--text-secondary)' }}>{actionLoading === `del-c-${c.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Student Details</h3>
                            <button onClick={() => setSelectedStudent(null)}><X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /></button>
                        </div>
                        <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--hover-bg)' }}>
                            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedStudent.student_name}</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedStudent.student_contact}</p>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Aadhar: {selectedStudent.student_aadhar}</p>
                        </div>
                        <h4 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Courses Enrolled ({studentDetails.length})</h4>
                        {loadingDetails ? <div className="text-center py-4"><Spinner /></div> : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {studentDetails.map(d => (
                                    <div key={d.id} className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <div className="flex justify-between"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.courses?.name}</span><span className={`badge text-xs ${d.courses?.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{d.courses?.course_type === 'paid' ? `₹${d.courses?.price}` : 'Free'}</span></div>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Referred by: <span className="text-teal-400">{d.public_users?.full_name}</span> ({d.public_users?.custom_id})</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Date: {formatDate(d.created_at)} • Status: <span className={d.status === 'approved' ? 'text-green-400' : 'text-amber-400'}>{d.status}</span></p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Promoter Details Modal */}
            {selectedPromoter && (
                <div className="modal-overlay" onClick={() => setSelectedPromoter(null)}>
                    <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Promoter Details</h3>
                            <button onClick={() => setSelectedPromoter(null)}><X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /></button>
                        </div>

                        {/* Promoter Info */}
                        <div className="flex items-center gap-4 p-4 rounded-xl mb-4" style={{ background: 'var(--hover-bg)' }}>
                            <div className="w-14 h-14 rounded-full overflow-hidden" style={{ border: '3px solid var(--primary)' }}>
                                {selectedPromoter.avatar_url ? <img src={selectedPromoter.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} /></div>}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.full_name}</p>
                                <p className="text-teal-400 font-mono text-sm">{selectedPromoter.custom_id}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <LevelBadge level={selectedPromoter.current_level} size="sm" />
                                    <span className="text-amber-400 font-semibold">{selectedPromoter.total_points || 0} pts</span>
                                </div>
                                {selectedPromoter.referred_by_custom_id && (
                                    <p className="text-xs mt-2">
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                            <Link2 className="w-3 h-3 inline mr-1" />Referred by: {selectedPromoter.referred_by_custom_id}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Contact Details */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <Phone className="w-4 h-4 text-teal-400" />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Phone</span>
                                </div>
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.whatsapp_number}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Aadhar</span>
                                </div>
                                <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.aadhar_number?.replace(/(\d{4})/g, '$1 ').trim()}</p>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <p className="font-bold text-teal-400">{promoterReferrals.length}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Students</p>
                            </div>
                            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <p className="font-bold text-green-400">{promoterReferrals.filter(r => r.status === 'approved').length}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Approved</p>
                            </div>
                            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <p className="font-bold text-amber-400">{promoterReferrals.filter(r => r.status === 'pending').length}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending</p>
                            </div>
                            <div className="text-center p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <p className="font-bold text-purple-400">{promoterReferredPromoters.length}</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Promoters</p>
                            </div>
                        </div>

                        {/* Promoters Referred by this promoter */}
                        {promoterReferredPromoters.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Megaphone className="w-4 h-4 text-purple-400" />
                                    Promoters Referred ({promoterReferredPromoters.length})
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {promoterReferredPromoters.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                            <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                                                {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2" style={{ color: 'var(--text-muted)' }} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.full_name}</p>
                                                <p className="text-xs text-teal-400">{p.custom_id || 'Pending ID'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs px-2 py-1 rounded ${p.is_approved ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {p.is_approved ? 'Active' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Students Referred */}
                        <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <GraduationCap className="w-4 h-4 text-purple-400" />
                            Students Referred ({promoterReferrals.length})
                        </h4>

                        {loadingDetails ? <div className="text-center py-4"><Spinner /></div> : promoterReferrals.length === 0 ? (
                            <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>No students referred yet</p>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {promoterReferrals.map(r => (
                                    <div key={r.id} className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.student_name}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.student_contact}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <span className={`badge text-xs ${r.courses?.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{r.courses?.name}</span>
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Course Modal */}
            {showCourseModal && (
                <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editingCourse ? 'Edit Course' : 'Add Course'}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Course Name</label><input type="text" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} className="input-field" placeholder="Enter course name" /></div>
                            <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label><textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} className="input-field" rows={2} placeholder="Course description" /></div>
                            <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Course Type</label><select value={courseForm.course_type} onChange={e => setCourseForm({ ...courseForm, course_type: e.target.value })} className="input-field"><option value="free">Free</option><option value="paid">Paid</option></select></div>
                            {courseForm.course_type === 'paid' && <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price (₹)</label><input type="number" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} className="input-field" placeholder="0" /></div>}

                            <div className="p-4 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    Points Configuration
                                </h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Student Referral Points</label>
                                        <input type="number" step="0.01" value={courseForm.points} onChange={e => setCourseForm({ ...courseForm, points: e.target.value })} className="input-field" placeholder="10.5" />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Points earned when a promoter refers a student to this course (decimals allowed)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Promoter Referral Points</label>
                                        <input type="number" step="0.01" value={courseForm.promoter_referral_points} onChange={e => setCourseForm({ ...courseForm, promoter_referral_points: e.target.value })} className="input-field" placeholder="50.5" />
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Points when a promoter refers another promoter (decimals allowed)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="course-active" checked={courseForm.is_active} onChange={e => setCourseForm({ ...courseForm, is_active: e.target.checked })} className="w-4 h-4" />
                                <label htmlFor="course-active" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active (visible to promoters)</label>
                            </div>

                            <div className="flex gap-2"><button onClick={handleSaveCourse} disabled={actionLoading === 'course'} className="btn-primary flex-1">{actionLoading === 'course' ? <Spinner size="sm" /> : 'Save Course'}</button><button onClick={() => setShowCourseModal(false)} className="btn-secondary flex-1">Cancel</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
