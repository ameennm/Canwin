import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut, Users, UserCheck, CheckCircle,
    RefreshCw, Clock, User, Phone, Calendar,
    Award, Search, X, Edit2, Save, CreditCard, Eye,
    BookOpen, Plus, TrendingUp, Zap, BarChart3,
    Gift, DollarSign, Trash2
} from 'lucide-react';
import { supabase, POINTS, getMonthName } from '../lib/supabase';
import Spinner from '../components/Spinner';
import LevelBadge from '../components/LevelBadge';

export default function AdminDashboard({ showToast }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [pendingReferrals, setPendingReferrals] = useState([]);
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalReferrals: 0,
        totalPoints: 0,
        paidReferrals: 0,
        freeReferrals: 0
    });
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
        price: 0,
        is_active: true
    });

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate('/adminlogin');
                return;
            }
            fetchData();
        } catch (err) {
            console.error('Auth check error:', err);
            navigate('/adminlogin');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch pending users
            const { data: pendingData } = await supabase
                .from('public_users')
                .select('*')
                .eq('is_approved', false)
                .order('created_at', { ascending: false });
            setPendingUsers(pendingData || []);

            // Fetch all users
            const { data: allData } = await supabase
                .from('public_users')
                .select('*')
                .order('total_points', { ascending: false });
            setAllUsers(allData || []);

            // Fetch pending referrals with user and course info
            const { data: referralsData } = await supabase
                .from('referrals')
                .select(`
          *,
          public_users:referrer_id (id, full_name, custom_id),
          courses:course_id (name, course_type, points)
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            setPendingReferrals(referralsData || []);

            // Fetch courses
            const { data: coursesData } = await supabase
                .from('courses')
                .select('*')
                .order('name');
            setCourses(coursesData || []);

            // Calculate stats
            const approvedUsers = (allData || []).filter(u => u.is_approved);
            const totalPoints = approvedUsers.reduce((sum, u) => sum + (u.total_points || 0), 0);
            const paidRefs = approvedUsers.reduce((sum, u) => sum + (u.paid_referrals || 0), 0);
            const freeRefs = approvedUsers.reduce((sum, u) => sum + (u.free_referrals || 0), 0);

            setStats({
                totalUsers: approvedUsers.length,
                totalReferrals: paidRefs + freeRefs,
                totalPoints,
                paidReferrals: paidRefs,
                freeReferrals: freeRefs
            });

            // Fetch monthly analytics (last 6 months)
            await fetchMonthlyData();

        } catch (err) {
            console.error('Error fetching data:', err);
            showToast('Error loading data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyData = async () => {
        try {
            const now = new Date();
            const monthlyStats = [];

            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

                const { data: monthRefs } = await supabase
                    .from('referrals')
                    .select('points_earned, courses:course_id(course_type)')
                    .eq('status', 'approved')
                    .gte('created_at', date.toISOString())
                    .lt('created_at', nextMonth.toISOString());

                const paidCount = (monthRefs || []).filter(r => r.courses?.course_type === 'paid').length;
                const freeCount = (monthRefs || []).filter(r => r.courses?.course_type === 'free').length;
                const totalPts = (monthRefs || []).reduce((sum, r) => sum + (r.points_earned || 0), 0);

                monthlyStats.push({
                    month: getMonthName(date.getMonth()),
                    year: date.getFullYear(),
                    paid: paidCount,
                    free: freeCount,
                    total: paidCount + freeCount,
                    points: totalPts
                });
            }

            setMonthlyData(monthlyStats);
        } catch (err) {
            console.error('Error fetching monthly data:', err);
        }
    };

    const handleApproveUser = async (userId) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('public_users')
                .update({ is_approved: true })
                .eq('id', userId);
            if (error) throw error;
            showToast('User approved successfully!');
            fetchData();
        } catch (err) {
            console.error('Error approving user:', err);
            showToast('Failed to approve user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleVerifyReferral = async (referralId) => {
        setActionLoading(referralId);
        try {
            const { error } = await supabase
                .from('referrals')
                .update({ status: 'approved' })
                .eq('id', referralId);
            if (error) throw error;
            showToast('Referral verified successfully!');
            fetchData();
        } catch (err) {
            console.error('Error verifying referral:', err);
            showToast('Failed to verify referral', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user.id);
        setEditForm({
            full_name: user.full_name,
            whatsapp_number: user.whatsapp_number,
            aadhar_number: user.aadhar_number || '',
            dob: user.dob,
            is_approved: user.is_approved,
            total_points: user.total_points || 0,
        });
    };

    const handleSaveUser = async (userId) => {
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('public_users')
                .update({
                    full_name: editForm.full_name,
                    whatsapp_number: editForm.whatsapp_number,
                    aadhar_number: editForm.aadhar_number,
                    dob: editForm.dob,
                    is_approved: editForm.is_approved,
                    total_points: parseInt(editForm.total_points) || 0,
                })
                .eq('id', userId);
            if (error) throw error;
            showToast('User updated successfully!');
            setEditingUser(null);
            fetchData();
        } catch (err) {
            console.error('Error updating user:', err);
            showToast('Failed to update user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to reject and delete ${userName}?`)) {
            return;
        }

        setActionLoading(`reject-${userId}`);
        try {
            // First delete any referrals by this user
            await supabase
                .from('referrals')
                .delete()
                .eq('referrer_id', userId);

            // Then delete the user
            const { error } = await supabase
                .from('public_users')
                .delete()
                .eq('id', userId);
            if (error) throw error;
            showToast('User rejected and deleted!');
            fetchData();
        } catch (err) {
            console.error('Error rejecting user:', err);
            showToast('Failed to reject user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`Are you sure you want to delete ${userName}? This will also delete all their referrals.`)) {
            return;
        }

        setActionLoading(`delete-${userId}`);
        try {
            // First delete all referrals by this user
            await supabase
                .from('referrals')
                .delete()
                .eq('referrer_id', userId);

            // Then delete the user
            const { error } = await supabase
                .from('public_users')
                .delete()
                .eq('id', userId);
            if (error) throw error;
            showToast('User deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Error deleting user:', err);
            showToast('Failed to delete user: ' + err.message, 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveCourse = async () => {
        setActionLoading('course');
        try {
            const courseData = {
                name: courseForm.name,
                description: courseForm.description,
                course_type: courseForm.course_type,
                points: courseForm.course_type === 'paid' ? POINTS.paid : POINTS.free,
                price: courseForm.course_type === 'paid' ? parseFloat(courseForm.price) || 0 : 0,
                is_active: courseForm.is_active
            };

            if (editingCourse) {
                const { error } = await supabase
                    .from('courses')
                    .update(courseData)
                    .eq('id', editingCourse.id);
                if (error) throw error;
                showToast('Course updated successfully!');
            } else {
                const { error } = await supabase
                    .from('courses')
                    .insert(courseData);
                if (error) throw error;
                showToast('Course created successfully!');
            }

            setShowCourseModal(false);
            setEditingCourse(null);
            setCourseForm({ name: '', description: '', course_type: 'free', price: 0, is_active: true });
            fetchData();
        } catch (err) {
            console.error('Error saving course:', err);
            showToast('Failed to save course', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteCourse = async (courseId, courseName) => {
        if (!confirm(`Are you sure you want to delete "${courseName}"? This may affect existing referrals.`)) {
            return;
        }

        setActionLoading(`delete-course-${courseId}`);
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseId);
            if (error) throw error;
            showToast('Course deleted successfully!');
            fetchData();
        } catch (err) {
            console.error('Error deleting course:', err);
            showToast('Failed to delete course. It may have referrals attached.', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const openEditCourse = (course) => {
        setEditingCourse(course);
        setCourseForm({
            name: course.name,
            description: course.description || '',
            course_type: course.course_type,
            price: course.price || 0,
            is_active: course.is_active
        });
        setShowCourseModal(true);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/adminlogin');
    };

    // Filter functions
    const filterUsers = (users) => {
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase().replace(/\s/g, '');
        return users.filter(user =>
            user.full_name?.toLowerCase().includes(query) ||
            user.whatsapp_number?.includes(query) ||
            user.aadhar_number?.includes(query) ||
            user.custom_id?.toLowerCase().includes(query)
        );
    };

    const filterReferrals = (referrals) => {
        if (!searchQuery.trim()) return referrals;
        const query = searchQuery.toLowerCase().replace(/\s/g, '');
        return referrals.filter(ref =>
            ref.student_name?.toLowerCase().includes(query) ||
            ref.student_contact?.includes(query) ||
            ref.student_aadhar?.includes(query) ||
            ref.public_users?.full_name?.toLowerCase().includes(query)
        );
    };

    const displayUsers = viewMode === 'pending' ? filterUsers(pendingUsers) : filterUsers(allUsers);
    const displayReferrals = filterReferrals(pendingReferrals);
    const maxMonthlyValue = Math.max(...monthlyData.map(d => d.total), 1);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-8 safe-area-top safe-area-bottom">
            {/* Header */}
            <header className="sticky top-0 z-50 glass-dark py-3 px-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-bold text-xl">C</span>
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="font-bold text-white text-lg">Admin Dashboard</h1>
                            <p className="text-xs text-slate-400">CanWin Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchData}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <RefreshCw className="w-5 h-5 text-slate-400" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                        >
                            <LogOut className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="card text-center p-3">
                        <Users className="w-5 h-5 text-teal-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{stats.totalUsers}</p>
                        <p className="text-xs text-slate-400">Users</p>
                    </div>
                    <div className="card text-center p-3">
                        <Award className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{stats.totalReferrals}</p>
                        <p className="text-xs text-slate-400">Referrals</p>
                    </div>
                    <div className="card text-center p-3">
                        <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{stats.totalPoints}</p>
                        <p className="text-xs text-slate-400">Points</p>
                    </div>
                    <div className="card text-center p-3">
                        <DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{stats.paidReferrals}</p>
                        <p className="text-xs text-slate-400">Paid</p>
                    </div>
                    <div className="card text-center p-3">
                        <Gift className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{stats.freeReferrals}</p>
                        <p className="text-xs text-slate-400">Free</p>
                    </div>
                    <div className="card text-center p-3">
                        <Clock className="w-5 h-5 text-red-400 mx-auto mb-1" />
                        <p className="text-xl font-bold text-white">{pendingUsers.length}</p>
                        <p className="text-xs text-slate-400">Pending</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card p-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, Aadhar, phone..."
                            className="input-field pl-10 pr-10 py-2"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="tabs-container">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Users</span>
                            {pendingUsers.length > 0 && (
                                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {pendingUsers.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`tab-button ${activeTab === 'referrals' ? 'active' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            <span className="hidden sm:inline">Referrals</span>
                            {pendingReferrals.length > 0 && (
                                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {pendingReferrals.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            <span className="hidden sm:inline">Courses</span>
                        </span>
                    </button>
                </div>

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div className="space-y-4">
                        {/* Monthly Performance Chart */}
                        <div className="card">
                            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-teal-400" />
                                Monthly Performance (Last 6 Months)
                            </h3>
                            <div className="chart-container">
                                <div className="bar-chart">
                                    {monthlyData.map((data, index) => (
                                        <div key={index} className="bar-item">
                                            <div className="flex flex-col items-center gap-1 w-full" style={{ height: '100%' }}>
                                                <span className="text-xs text-white font-semibold">{data.total}</span>
                                                <div
                                                    className="bar bg-gradient-to-t from-teal-600 to-purple-500 w-full"
                                                    style={{ height: `${(data.total / maxMonthlyValue) * 100}%`, minHeight: '4px' }}
                                                />
                                            </div>
                                            <span className="bar-label">{data.month}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Paid vs Free Breakdown */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="card">
                                <h4 className="font-semibold text-white mb-3">Paid vs Free Referrals</h4>
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Paid Courses</span>
                                            <span className="text-amber-400 font-semibold">{stats.paidReferrals}</span>
                                        </div>
                                        <div className="progress-container">
                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${stats.totalReferrals ? (stats.paidReferrals / stats.totalReferrals) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #f59e0b, #d97706)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Free Courses</span>
                                            <span className="text-green-400 font-semibold">{stats.freeReferrals}</span>
                                        </div>
                                        <div className="progress-container">
                                            <div
                                                className="progress-bar"
                                                style={{
                                                    width: `${stats.totalReferrals ? (stats.freeReferrals / stats.totalReferrals) * 100 : 0}%`,
                                                    background: 'linear-gradient(90deg, #22c55e, #16a34a)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h4 className="font-semibold text-white mb-3">Points Distribution</h4>
                                <div className="text-center py-4">
                                    <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-400">
                                        {stats.totalPoints}
                                    </p>
                                    <p className="text-slate-400 text-sm mt-1">Total Points Earned</p>
                                    <div className="flex justify-center gap-4 mt-4 text-xs">
                                        <div className="text-center">
                                            <p className="text-amber-400 font-bold">{stats.paidReferrals * 10}</p>
                                            <p className="text-slate-500">from Paid</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-green-400 font-bold">{stats.freeReferrals * 2}</p>
                                            <p className="text-slate-500">from Free</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="card">
                            <h4 className="font-semibold text-white mb-3">Top Performers</h4>
                            <div className="space-y-2">
                                {allUsers.filter(u => u.is_approved).slice(0, 5).map((user, index) => (
                                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-500 text-white' :
                                            index === 1 ? 'bg-slate-400 text-white' :
                                                index === 2 ? 'bg-amber-700 text-white' :
                                                    'bg-slate-700 text-slate-300'
                                            }`}>
                                            {index + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{user.full_name}</p>
                                            <p className="text-xs text-slate-400">{user.custom_id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-teal-400 font-bold">{user.total_points} pts</p>
                                            <LevelBadge level={user.current_level} size="sm" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setViewMode('pending')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'pending' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400'
                                    }`}
                            >
                                Pending ({pendingUsers.length})
                            </button>
                            <button
                                onClick={() => setViewMode('all')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-teal-500 text-white' : 'bg-white/5 text-slate-400'
                                    }`}
                            >
                                All Users ({allUsers.length})
                            </button>
                        </div>

                        {displayUsers.length === 0 ? (
                            <div className="card text-center py-8">
                                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                                <p className="text-slate-400">No users found</p>
                            </div>
                        ) : (
                            <div className="cards-grid">
                                {displayUsers.map((user) => (
                                    <div key={user.id} className="card">
                                        {editingUser === user.id ? (
                                            <div className="space-y-2">
                                                <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="input-field text-sm py-2" placeholder="Name" />
                                                <input type="tel" value={editForm.whatsapp_number} onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })} className="input-field text-sm py-2" placeholder="Phone" />
                                                <input type="text" value={editForm.aadhar_number} onChange={(e) => setEditForm({ ...editForm, aadhar_number: e.target.value })} className="input-field text-sm py-2" placeholder="Aadhar" />
                                                <input type="number" value={editForm.total_points} onChange={(e) => setEditForm({ ...editForm, total_points: e.target.value })} className="input-field text-sm py-2" placeholder="Points" />
                                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                                    <input type="checkbox" checked={editForm.is_approved} onChange={(e) => setEditForm({ ...editForm, is_approved: e.target.checked })} />
                                                    Approved
                                                </label>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleSaveUser(user.id)} disabled={actionLoading === user.id} className="btn-success flex-1 text-sm py-2">
                                                        {actionLoading === user.id ? <Spinner size="sm" /> : 'Save'}
                                                    </button>
                                                    <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-600 flex-shrink-0">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                                                                <User className="w-6 h-6 text-slate-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-semibold text-white truncate">{user.full_name}</h3>
                                                            {user.is_approved && <span className="text-xs text-green-400">✓</span>}
                                                        </div>
                                                        {user.custom_id && <p className="text-xs text-teal-400 font-mono">{user.custom_id}</p>}
                                                        <p className="text-xs text-slate-400 truncate">{user.whatsapp_number}</p>
                                                        {user.is_approved && (
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-xs text-amber-400">{user.total_points} pts</span>
                                                                <LevelBadge level={user.current_level} size="sm" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-3">
                                                    {!user.is_approved && (
                                                        <>
                                                            <button onClick={() => handleApproveUser(user.id)} disabled={actionLoading === user.id} className="btn-success flex-1 text-sm py-2">
                                                                {actionLoading === user.id ? <Spinner size="sm" /> : 'Approve'}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectUser(user.id, user.full_name)}
                                                                disabled={actionLoading === `reject-${user.id}`}
                                                                className="btn-danger flex-1 text-sm py-2"
                                                            >
                                                                {actionLoading === `reject-${user.id}` ? <Spinner size="sm" /> : 'Reject'}
                                                            </button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleEditUser(user)} className="btn-secondary text-sm py-2 px-3">Edit</button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                                                        disabled={actionLoading === `delete-${user.id}`}
                                                        className="btn-danger text-sm py-2 px-3"
                                                        title="Delete user"
                                                    >
                                                        {actionLoading === `delete-${user.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Referrals Tab */}
                {activeTab === 'referrals' && (
                    <div className="space-y-4">
                        {displayReferrals.length === 0 ? (
                            <div className="card text-center py-8">
                                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                                <p className="text-slate-400">No pending referrals</p>
                            </div>
                        ) : (
                            <div className="cards-grid">
                                {displayReferrals.map((ref) => (
                                    <div key={ref.id} className="card">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-white font-medium">{ref.public_users?.full_name}</p>
                                                <p className="text-xs text-teal-400">{ref.public_users?.custom_id}</p>
                                            </div>
                                            <span className={`badge text-xs ${ref.courses?.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>
                                                +{ref.courses?.points} pts
                                            </span>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-2 mt-2 text-sm">
                                            <p className="text-white">{ref.student_name}</p>
                                            <p className="text-slate-400 text-xs">{ref.student_contact}</p>
                                            <p className="text-slate-500 text-xs">{ref.courses?.name}</p>
                                        </div>
                                        <button
                                            onClick={() => handleVerifyReferral(ref.id)}
                                            disabled={actionLoading === ref.id}
                                            className="btn-success w-full mt-3 text-sm py-2"
                                        >
                                            {actionLoading === ref.id ? <Spinner size="sm" /> : 'Verify'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => { setEditingCourse(null); setCourseForm({ name: '', description: '', course_type: 'free', price: 0, is_active: true }); setShowCourseModal(true); }}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            Add Course
                        </button>

                        <div className="cards-grid">
                            {courses.map((course) => (
                                <div key={course.id} className="card">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-white">{course.name}</h4>
                                        <span className={`badge text-xs ${course.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>
                                            {course.course_type === 'paid' ? `₹${course.price}` : 'Free'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-3 line-clamp-2">{course.description || 'No description'}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-teal-400">+{course.points} points</span>
                                        <div className="flex gap-2 items-center">
                                            <span className={`text-xs px-2 py-1 rounded ${course.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {course.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                            <button onClick={() => openEditCourse(course)} className="text-slate-400 hover:text-white" title="Edit">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCourse(course.id, course.name)}
                                                disabled={actionLoading === `delete-course-${course.id}`}
                                                className="text-slate-400 hover:text-red-400"
                                                title="Delete"
                                            >
                                                {actionLoading === `delete-course-${course.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Course Modal */}
            {showCourseModal && (
                <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">
                            {editingCourse ? 'Edit Course' : 'Add New Course'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Course Name</label>
                                <input
                                    type="text"
                                    value={courseForm.name}
                                    onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                                    className="input-field"
                                    placeholder="Enter course name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={courseForm.description}
                                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Course description"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-300 mb-1">Course Type</label>
                                <select
                                    value={courseForm.course_type}
                                    onChange={(e) => setCourseForm({ ...courseForm, course_type: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="free">Free (2 points)</option>
                                    <option value="paid">Paid (10 points)</option>
                                </select>
                            </div>
                            {courseForm.course_type === 'paid' && (
                                <div>
                                    <label className="block text-sm text-slate-300 mb-1">Price (₹)</label>
                                    <input
                                        type="number"
                                        value={courseForm.price}
                                        onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                                        className="input-field"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={courseForm.is_active}
                                    onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked })}
                                />
                                Course is active
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveCourse}
                                    disabled={actionLoading === 'course'}
                                    className="btn-primary flex-1"
                                >
                                    {actionLoading === 'course' ? <Spinner size="sm" /> : 'Save Course'}
                                </button>
                                <button
                                    onClick={() => setShowCourseModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
