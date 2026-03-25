import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Users, BookOpen, BarChart3, Wallet, Settings, 
    CheckCircle, XCircle, Clock, Search, Plus, 
    ArrowUpRight, ArrowDownRight, TrendingUp,
    Shield, LogOut, ChevronRight, Filter, Download,
    RefreshCw, Megaphone, GraduationCap, Zap, DollarSign, Gift, X,
    UserCheck, Award, Trophy, Link2, User, Trash2, Edit2, Phone, CreditCard, Star
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/utils';
import ThemeToggle from '../components/ThemeToggle';
import Spinner from '../components/Spinner';
import LevelBadge from '../components/LevelBadge';

export default function AdminDashboard({ showToast }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    const [pendingPromoters, setPendingPromoters] = useState([]);
    const [allPromoters, setAllPromoters] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [pendingReferrals, setPendingReferrals] = useState([]);
    const [courses, setCourses] = useState([]);
    const [stats, setStats] = useState({ totalPromoters: 0, totalStudents: 0, totalPoints: 0, revenue: 0 });
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [monthlyData, setMonthlyData] = useState([]);
    const [monthlyTopPromoters, setMonthlyTopPromoters] = useState([]);
    const [courseAnalytics, setCourseAnalytics] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedPromoter, setSelectedPromoter] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [studentDetails, setStudentDetails] = useState([]);
    const [promoterReferrals, setPromoterReferrals] = useState([]);
    const [promoterReferredPromoters, setPromoterReferredPromoters] = useState([]);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({ 
        name: '', description: '', course_type: 'paid', points: 10, 
        promoter_referral_points: 50, second_level_points: 5, price: 0, is_active: true 
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', whatsapp_number: '', total_points: 0, is_approved: false });
    const [withdrawals, setWithdrawals] = useState([]);
    const [bonuses, setBonuses] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', phone: '', email: '', password: '', rank: 'JSO' });
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [bonusForm, setBonusForm] = useState({ course_id: '', bonus_amount: 0, start_time: '', end_time: '', eligible_roles: 'ALL' });
    const [specialOffers, setSpecialOffers] = useState([]);
    const [showOfferModal, setShowOfferModal] = useState(false);
    const [offerForm, setOfferForm] = useState({ course_id: '', valid_until: '', jso_amount: 0, so_amount: 0, sop_amount: 0, sdo_amount: 0, platinum_amount: 0 });

    const getMonthName = (monthIndex) => {
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
    };

    useEffect(() => {
        const admin = localStorage.getItem('canwin_admin');
        if (!admin) { navigate('/adminlogin'); return; }
        fetchData();
    }, [navigate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                courseData,
                statsData,
                promoterData,
                studentData,
                referralData,
                withdrawalsData,
                bonusesData,
                offersData
            ] = await Promise.all([
                api.courses.list(),
                api.admin.getStats(),
                api.admin.getPromoters(),
                api.admin.getStudents(),
                api.admin.getReferrals(),
                api.admin.getWithdrawals(),
                api.bonuses.list(),
                api.admin.offers.list()
            ]);

            setCourses(courseData || []);
            setStats(statsData || { totalPromoters: 0, totalStudents: 0, totalPoints: 0, revenue: 0 });
            setAllPromoters(promoterData || []);
            setAllStudents(studentData || []);
            setPendingPromoters((promoterData || []).filter(p => p.status === 'pending'));
            setPendingReferrals((referralData || []).filter(r => r.status === 'pending'));
            setWithdrawals(withdrawalsData || []);
            setBonuses(bonusesData || []);
            setSpecialOffers(offersData || []);

            fetchMonthlyData();
        } catch (err) {
            console.error('Error loading admin data:', err);
            showToast('Error loading admin data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyData = async () => {
        try {
            const now = new Date();
            const monthlyStats = [];
            // Mock data for now until API is updated
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthlyStats.push({ month: getMonthName(date.getMonth()), year: date.getFullYear(), paid: 0, free: 0, total: 0 });
            }
            setMonthlyData(monthlyStats);
        } catch (err) { console.error('Error fetching monthly data:', err); }
    };

    const fetchMonthlyTopPromoters = async (monthStr) => {
        try {
            // Placeholder for month-specific data
            // const monthData = await api.admin.getMonthlyStats(monthStr);
            setMonthlyTopPromoters([]);
        } catch (err) { console.error('Error fetching monthly top promoters:', err); }
    };

    const fetchCourseAnalytics = async (monthStr) => {
        try {
            // Placeholder for course analytics
            // const analytics = await api.admin.getCourseAnalytics(monthStr);
            setCourseAnalytics([]);
        } catch (err) { console.error('Error fetching course analytics:', err); }
    };

    const fetchStudentDetails = async (student) => {
        setSelectedStudent(student);
        setLoadingDetails(true);
        try {
            setStudentDetails([]);
        } catch (err) { showToast('Error loading details', 'error'); }
        finally { setLoadingDetails(false); }
    };

    const fetchPromoterDetails = async (promoter) => {
        setSelectedPromoter(promoter);
        setLoadingDetails(true);
        try {
            // Fetch students referred by this promoter
            setPromoterReferrals([]);

            // Fetch promoters referred by this promoter
            setPromoterReferredPromoters([]);
        } catch (err) { showToast('Error loading details', 'error'); }
        finally { setLoadingDetails(false); }
    };

    const handleApproveUser = async (userId) => {
        setActionLoading(userId);
        try {
            await api.admin.approveUser(userId);
            showToast('Promoter approved!');
            fetchData();
        } catch (err) { showToast('Failed to approve', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleUpdateWithdrawal = async (id, status) => {
        if (!confirm(`Are you sure you want to ${status} this withdrawal?`)) return;
        setActionLoading(`wd-${id}`);
        try {
            await api.admin.updateWithdrawal(id, status);
            showToast(`Withdrawal ${status}!`);
            fetchData();
        } catch (err) { showToast('Failed to update withdrawal', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleSaveUser = async () => {
        if (!newUserForm.name || !newUserForm.phone || !newUserForm.password) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setActionLoading('user-save');
        try {
            // New dedicated admin user creation endpoint
            await api.admin.users.create({
                name: newUserForm.name,
                phone: newUserForm.phone,
                email: newUserForm.email,
                password: newUserForm.password,
                rank: newUserForm.rank,
                upline_referral_code: newUserForm.upline_referral_code // Optional
            });
            showToast('User created successfully!');
            setShowUserModal(false);
            setNewUserForm({ name: '', phone: '', email: '', password: '', rank: 'JSO', upline_referral_code: '' });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to create user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveBonus = async () => {
        if (!bonusForm.course_id || !bonusForm.bonus_amount || !bonusForm.start_time || !bonusForm.end_time) {
            showToast('Please fill all fields', 'error');
            return;
        }
        setActionLoading('bonus-save');
        try {
            await api.bonuses.create(bonusForm);
            showToast('Bonus campaign created!');
            setShowBonusModal(false);
            setBonusForm({ course_id: '', bonus_amount: 0, start_time: '', end_time: '', eligible_roles: 'ALL' });
            fetchData();
        } catch (err) {
            showToast('Failed to create bonus', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSaveOffer = async () => {
        if (!offerForm.course_id || !offerForm.valid_until) {
            showToast('Please select a course and set validity', 'error');
            return;
        }
        setActionLoading('offer-save');
        try {
            await api.admin.offers.create(offerForm);
            showToast('Special offer created!');
            setShowOfferModal(false);
            setOfferForm({ course_id: '', valid_until: '', jso_amount: 0, so_amount: 0, sop_amount: 0, sdo_amount: 0, platinum_amount: 0 });
            fetchData();
        } catch (err) {
            showToast(err.message || 'Failed to create offer', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteOffer = async (id) => {
        if (!confirm('Cancel this offer?')) return;
        setActionLoading(`del-offer-${id}`);
        try {
            await api.admin.offers.delete(id);
            showToast('Offer cancelled');
            fetchData();
        } catch (err) { showToast('Failed to cancel offer', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleVerifyReferral = async (referralId) => {
        setActionLoading(referralId);
        try {
            await api.admin.admissions.approve(referralId);
            showToast('Admission approved and commissions distributed!');
            fetchData();
        } catch (err) { 
            showToast(err.message || 'Failed to approve', 'error'); 
        }
        finally { setActionLoading(null); }
    };

    const handleEditUser = (user) => {
        setEditingUser(user.id);
        setEditForm({ full_name: user.full_name, whatsapp_number: user.whatsapp_number, total_points: user.total_points || 0, is_approved: user.is_approved });
    };

    const handleUpdateUser = async (userId) => {
        setActionLoading(userId);
        try {
            // Placeholder: update user endpoint
            // await api.admin.updateUser(userId, { ...editForm });
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
            await api.admin.deleteUser(userId);
            showToast('Deleted!');
            fetchData();
        } catch (err) { showToast('Failed to delete', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleSaveCourse = async () => {
        if (!courseForm.name) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        setActionLoading('course');
        try {
            const courseData = {
                course_name: courseForm.name,
                price: parseFloat(courseForm.price) || 0,
                points: parseFloat(courseForm.points) || undefined,
                commission_pool_percentage: 30,
                admission_start_date: courseForm.admission_start_date || null,
                admission_end_date: courseForm.admission_end_date || null,
                course_start_date: courseForm.course_start_date || null,
                comm_jso: parseFloat(courseForm.comm_jso) || 0,
                comm_so: parseFloat(courseForm.comm_so) || 0,
                comm_sop: parseFloat(courseForm.comm_sop) || 0,
                comm_sdo: parseFloat(courseForm.comm_sdo) || 0,
                comm_platinum: parseFloat(courseForm.comm_platinum) || 0,
                status: courseForm.is_active ? 'active' : 'inactive'
            };
            if (editingCourse) {
                await api.courses.update(editingCourse.id, courseData);
            } else {
                await api.courses.create(courseData);
            }
            showToast('Course saved!');
            setShowCourseModal(false);
            setEditingCourse(null);
            setCourseForm({ name: '', description: '', course_type: 'free', points: 10, price: 0, is_active: true, admission_start_date: '', admission_end_date: '', course_start_date: '', comm_jso: 0, comm_so: 0, comm_sop: 0, comm_sdo: 0, comm_platinum: 0 });
            fetchData();
        } catch (err) { showToast('Failed to save course', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleDeleteCourse = async (id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        setActionLoading(`del-c-${id}`);
        try {
            await api.courses.delete(id);
            showToast('Deleted!');
            fetchData();
        } catch (err) { showToast('Course has referrals attached', 'error'); }
        finally { setActionLoading(null); }
    };

    const handleLogout = () => { localStorage.removeItem('canwin_admin'); navigate('/adminlogin'); };

    const filterPromoters = (list) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(u => u.name?.toLowerCase().includes(q) || u.phone?.includes(q) || u.referral_code?.toLowerCase().includes(q));
    };

    const filterStudents = (list) => {
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(s => s.student_name?.toLowerCase().includes(q) || s.student_phone?.includes(q));
    };

    // Get referrer name for a promoter
    const getReferrerName = (promoter) => {
        if (!promoter.upline_chain || promoter.upline_chain.length === 0) return null;
        const referrerId = promoter.upline_chain[0].id;
        const referrer = allPromoters.find(p => p.id === referrerId);
        return referrer ? { name: referrer.name, referral_code: referrer.referral_code } : { name: 'Unknown', referral_code: undefined };
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <div className="card text-center p-3"><Megaphone className="w-5 h-5 text-teal-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalPromoters}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Promoters</p></div>
                    <div className="card text-center p-3"><GraduationCap className="w-5 h-5 text-purple-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalStudents}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Students</p></div>
                    <div className="card text-center p-3"><DollarSign className="w-5 h-5 text-green-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{Math.round(stats.revenue)}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Revenue</p></div>
                    <div className="card text-center p-3 hidden sm:block"><Award className="w-5 h-5 text-amber-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{Math.round(stats.commissions)}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Commissions</p></div>
                    <div className="card text-center p-3 hidden sm:block"><Zap className="w-5 h-5 text-blue-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>₹{Math.round(stats.profit)}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Profit</p></div>
                    <div className="card text-center p-3 hidden sm:block"><Star className="w-5 h-5 text-indigo-400 mx-auto mb-1" /><p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.paidReferrals}</p><p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Paid Ref</p></div>
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
                        { id: 'promoters', icon: Megaphone, label: 'Promoters', badge: allPromoters.filter(p => p.status === 'approved').length },
                        { id: 'students', icon: GraduationCap, label: 'Students', badge: stats.totalStudents },
                        { id: 'finance', icon: DollarSign, label: 'Finance', badge: withdrawals.filter(w => w.status === 'pending').length, highlight: withdrawals.some(w => w.status === 'pending') },
                        { id: 'approvals', icon: UserCheck, label: 'Approvals', badge: pendingPromoters.length, highlight: pendingPromoters.length > 0 },
                        { id: 'referrals', icon: Award, label: 'Referrals', badge: pendingReferrals.length, highlight: pendingReferrals.length > 0 },
                        { id: 'bonuses', icon: Gift, label: 'Bonuses' },
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
                                                <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                                                <p className="text-xs text-teal-400">{p.referral_code} • {p.count} referrals</p>
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
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-teal-400">{course.admissions}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>sold</p>
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
                        <div className="flex justify-between items-center">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click on a promoter to see their students and who they referred.</p>
                            <button onClick={() => setShowUserModal(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Create User
                            </button>
                        </div>
                        {filterPromoters(allPromoters.filter(p => p.status === 'approved')).length === 0 ? (
                            <div className="card text-center py-8"><Megaphone className="w-10 h-10 text-teal-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No promoters found</p></div>
                        ) : (
                            <div className="table-container card p-0 overflow-hidden">
                                <table className="data-table">
                                    <thead><tr><th>Promoter</th><th>ID</th><th>Referred By</th><th>Points</th><th>Team</th><th>Level</th><th></th></tr></thead>
                                    <tbody>
                                        {filterPromoters(allPromoters.filter(p => p.status === 'approved')).map(p => {
                                            const referrer = getReferrerName(p);
                                            return (
                                                <tr key={p.id} className="cursor-pointer" onClick={() => fetchPromoterDetails(p)}>
                                                    <td><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></div><span className="font-medium">{p.name}</span></div></td>
                                                    <td><span className="text-teal-400 font-mono text-sm">{p.referral_code}</span></td>
                                                    <td>
                                                        {referrer ? (
                                                            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                                                                <Link2 className="w-3 h-3 inline mr-1" />{referrer.referral_code || referrer.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Direct</span>
                                                        )}
                                                    </td>
                                                    <td className="font-semibold text-amber-400">{p.total_points || 0}</td>
                                                    <td>
                                                        <span className="text-green-400">{p.direct_referrals || 0} Dir</span> / <span className="text-amber-400">{p.team_size || 0} Total</span>
                                                    </td>
                                                    <td><LevelBadge level={p.rank} size="sm" /></td>
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
                                                <td className="text-sm">{s.student_phone}</td>
                                                <td><span className={`badge text-xs ${s.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{s.course_name}</span></td>
                                                <td><span className="text-teal-400">{s.admitted_by_name}</span></td>
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
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ border: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}><User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} /></div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</h3>
                                                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.phone}</p>
                                                    {referrer && (
                                                        <p className="text-xs mt-1">
                                                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                                <Link2 className="w-3 h-3 inline mr-1" />Referred by: {referrer.referral_code || referrer.name}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => handleApproveUser(u.id)} disabled={actionLoading === u.id} className="btn-success flex-1 text-sm py-2">{actionLoading === u.id ? <Spinner size="sm" /> : 'Approve'}</button>
                                                <button onClick={() => handleDeleteUser(u.id, u.name)} disabled={actionLoading === `del-${u.id}`} className="btn-danger text-sm py-2 px-3">{actionLoading === `del-${u.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}</button>
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
                                            <div><p className="font-medium" style={{ color: 'var(--text-primary)' }}>{ref.admitted_by_name}</p><p className="text-xs text-teal-400">Admission by level ID: {ref.admitted_by_user_id}</p></div>
                                            <span className={`badge text-xs ${ref.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>Pending</span>
                                        </div>
                                        <div className="rounded-lg p-2 mt-2 text-sm" style={{ background: 'var(--hover-bg)' }}>
                                            <p style={{ color: 'var(--text-primary)' }}>{ref.student_name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{ref.student_phone}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ref.course_name}</p>
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
                        <button onClick={() => { setEditingCourse(null); setCourseForm({ name: '', description: '', course_type: 'free', points: 10, price: 0, is_active: true, admission_start_date: '', admission_end_date: '', course_start_date: '', comm_jso: 0, comm_so: 0, comm_sop: 0, comm_sdo: 0, comm_platinum: 0 }); setShowCourseModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Course</button>
                        <div className="cards-grid">
                            {courses.map(c => (
                                <div key={c.id} className="card">
                                    <div className="flex justify-between items-start mb-2"><h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h4><span className={`badge text-xs ${c.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{c.course_type === 'paid' ? `₹${c.price}` : 'Free'}</span></div>
                                    <p className="text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{c.description || 'No description'}</p>
                                    {c.course_start_date && <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}><Clock className="w-3 h-3 inline mr-1" />Starts: {formatDate(c.course_start_date)}</p>}
                                    <div className="space-y-1 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                                        <p>Student Referral: <span className="text-teal-400 font-semibold">+{c.points} pts</span></p>
                                        {(c.comm_jso > 0 || c.comm_so > 0 || c.comm_sop > 0 || c.comm_sdo > 0 || c.comm_platinum > 0) && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {c.comm_jso > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">JSO:₹{c.comm_jso}</span>}
                                                {c.comm_so > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">SO:₹{c.comm_so}</span>}
                                                {c.comm_sop > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">SOP:₹{c.comm_sop}</span>}
                                                {c.comm_sdo > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">SDO:₹{c.comm_sdo}</span>}
                                                {c.comm_platinum > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">PL:₹{c.comm_platinum}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs ${c.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{c.status === 'active' ? 'Active' : c.schedule_status === 'closed' ? 'Closed' : 'Inactive'}</span>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => { setEditingCourse(c); setCourseForm({ name: c.name, description: c.description || '', course_type: c.course_type, points: c.points || 10, price: c.price || 0, is_active: c.status === 'active', admission_start_date: c.admission_start_date || '', admission_end_date: c.admission_end_date || '', course_start_date: c.course_start_date || '', comm_jso: c.comm_jso || 0, comm_so: c.comm_so || 0, comm_sop: c.comm_sop || 0, comm_sdo: c.comm_sdo || 0, comm_platinum: c.comm_platinum || 0 }); setShowCourseModal(true); }} style={{ color: 'var(--text-secondary)' }}><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteCourse(c.id, c.name)} disabled={actionLoading === `del-c-${c.id}`} style={{ color: 'var(--text-secondary)' }}>{actionLoading === `del-c-${c.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Special Offers Sub-section */}
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Zap className="w-5 h-5 text-amber-400" /> Special Offers
                                </h3>
                                <button onClick={() => setShowOfferModal(true)} className="btn-primary py-1.5 px-3 text-sm flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Create Offer
                                </button>
                            </div>
                            {specialOffers.length === 0 ? (
                                <div className="card text-center py-6"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>No special offers created yet</p></div>
                            ) : (
                                <div className="table-container card p-0 overflow-hidden">
                                    <table className="data-table text-sm">
                                        <thead><tr><th>Course</th><th>Valid Until</th><th>JSO</th><th>SO</th><th>SOP</th><th>SDO</th><th>Platinum</th><th>Status</th><th></th></tr></thead>
                                        <tbody>
                                            {specialOffers.map(o => (
                                                <tr key={o.offer_id}>
                                                    <td className="font-medium">{o.course_name}</td>
                                                    <td>{formatDate(o.valid_until)}</td>
                                                    <td className="text-amber-400">Rs.{o.jso_amount}</td>
                                                    <td className="text-amber-400">Rs.{o.so_amount}</td>
                                                    <td className="text-amber-400">Rs.{o.sop_amount}</td>
                                                    <td className="text-amber-400">Rs.{o.sdo_amount}</td>
                                                    <td className="text-amber-400">Rs.{o.platinum_amount}</td>
                                                    <td><span className={`text-xs px-2 py-1 rounded ${o.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{o.isActive ? 'Active' : 'Inactive'}</span></td>
                                                    <td><button onClick={() => handleDeleteOffer(o.offer_id)} disabled={actionLoading === `del-offer-${o.offer_id}`} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Bonuses Tab */}
                {activeTab === 'bonuses' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Gift className="w-5 h-5 text-purple-400" />Bonus Campaigns</h3>
                            <button onClick={() => setShowBonusModal(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Create Campaign
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                                    <tr>
                                        <th className="px-4 py-3">Course</th>
                                        <th className="px-4 py-3">Bonus</th>
                                        <th className="px-4 py-3">Eligibility</th>
                                        <th className="px-4 py-3">Duration</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                                    {bonuses.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No bonus campaigns found</td></tr>
                                    ) : bonuses.map(b => {
                                        const now = new Date();
                                        const start = new Date(b.start_time);
                                        const end = new Date(b.end_time);
                                        const isActive = now >= start && now <= end;
                                        const isUpcoming = now < start;
                                        
                                        return (
                                            <tr key={b.id} className="hover:bg-white/5">
                                                <td className="px-4 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>{b.course_name}</td>
                                                <td className="px-4 py-4 font-bold text-amber-400">₹{b.bonus_amount}</td>
                                                <td className="px-4 py-4 text-xs font-semibold">{b.eligible_roles}</td>
                                                <td className="px-4 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatDate(b.start_time)} - {formatDate(b.end_time)}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                                        isActive ? 'bg-green-500/20 text-green-400' :
                                                        isUpcoming ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Expired'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {activeTab === 'finance' && (
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Wallet className="w-5 h-5 text-teal-400" />Withdrawal Requests</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>
                                    <tr>
                                        <th className="px-4 py-3">Promoter</th>
                                        <th className="px-4 py-3">Amount</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                                    {withdrawals.length === 0 ? (
                                        <tr><td colSpan="5" className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>No withdrawal requests found</td></tr>
                                    ) : withdrawals.map(w => (
                                        <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{w.user_name}</p>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.user_phone}</p>
                                            </td>
                                            <td className="px-4 py-4 font-bold text-emerald-500">₹{w.amount}</td>
                                            <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(w.created_at)}</td>
                                            <td className="px-4 py-4">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                                    w.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                                                    w.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {w.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {w.status === 'pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleUpdateWithdrawal(w.id, 'approved')} disabled={actionLoading === `wd-${w.id}`} className="w-8 h-8 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/40 flex items-center justify-center transition-colors">
                                                            {actionLoading === `wd-${w.id}` ? <Spinner size="xs" /> : <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                        <button onClick={() => handleUpdateWithdrawal(w.id, 'rejected')} disabled={actionLoading === `wd-${w.id}`} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/40 flex items-center justify-center transition-colors">
                                                            {actionLoading === `wd-${w.id}` ? <Spinner size="xs" /> : <XCircle className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                        <div className="flex justify-between"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.course_name}</span><span className={`badge text-xs ${d.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{d.course_type === 'paid' ? `Paid` : 'Free'}</span></div>
                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Referred by: <span className="text-teal-400">{d.admitted_by_name}</span></p>
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
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ border: '3px solid var(--primary)', background: 'var(--bg-secondary)' }}>
                                <User className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.name}</p>
                                <p className="text-teal-400 font-mono text-sm">{selectedPromoter.referral_code}</p>
                                <div className="flex items-center gap-3 mt-1">
                                    <LevelBadge level={selectedPromoter.rank} size="sm" />
                                    <span className="text-amber-400 font-semibold">{selectedPromoter.total_points || 0} pts</span>
                                </div>
                                {selectedPromoter.upline_chain && selectedPromoter.upline_chain.length > 0 && (
                                    <p className="text-xs mt-2">
                                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                            <Link2 className="w-3 h-3 inline mr-1" />Referred by ID: {selectedPromoter.upline_chain[0].id}
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
                                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.phone}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                <div className="flex items-center gap-2 mb-1">
                                    <CreditCard className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Role</span>
                                </div>
                                <p className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{selectedPromoter.role}</p>
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
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                                                <User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                                                <p className="text-xs text-teal-400">{p.referral_code || 'Pending ID'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs px-2 py-1 rounded ${p.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {p.status === 'approved' ? 'Active' : 'Pending'}
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
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.student_phone}</p>
                                            </div>
                                            <span className={`text-xs px-2 py-1 rounded ${r.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                                            <span className={`badge text-xs ${r.course_type === 'paid' ? 'badge-paid' : 'badge-free'}`}>{r.course_name}</span>
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
                    <div className="modal-content" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{editingCourse ? 'Edit Course' : 'Add Course'}</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Course Name</label><input type="text" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} className="input-field" placeholder="Enter course name" /></div>
                            <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label><textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} className="input-field" rows={2} placeholder="Course description" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Course Type</label><select value={courseForm.course_type} onChange={e => setCourseForm({ ...courseForm, course_type: e.target.value })} className="input-field"><option value="free">Free</option><option value="paid">Paid</option></select></div>
                                {courseForm.course_type === 'paid' && <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price (₹)</label><input type="number" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} className="input-field" placeholder="0" /></div>}
                                {!editingCourse && courseForm.course_type === 'free' && <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Price (₹)</label><input type="number" value="0" disabled className="input-field opacity-50" /></div>}
                            </div>

                            {/* Schedule Section */}
                            <div className="p-4 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Clock className="w-4 h-4 text-blue-400" />
                                    Course Schedule
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Admission Start</label><input type="datetime-local" value={courseForm.admission_start_date} onChange={e => setCourseForm({ ...courseForm, admission_start_date: e.target.value })} className="input-field" /></div>
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Admission End</label><input type="datetime-local" value={courseForm.admission_end_date} onChange={e => setCourseForm({ ...courseForm, admission_end_date: e.target.value })} className="input-field" /></div>
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Course Start</label><input type="datetime-local" value={courseForm.course_start_date} onChange={e => setCourseForm({ ...courseForm, course_start_date: e.target.value })} className="input-field" /></div>
                                </div>
                            </div>

                            {/* Points + Rank Commission Section */}
                            <div className="p-4 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    Points
                                </h4>
                                <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Student Referral Points</label><input type="number" step="0.01" value={courseForm.points} onChange={e => setCourseForm({ ...courseForm, points: e.target.value })} className="input-field" /></div>
                            </div>

                            {/* Rank-Based Commission */}
                            <div className="p-4 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    Rank-Based Commission (INR per admission)
                                </h4>
                                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Set the commission earned by the DIRECT REFER only. Upline chain splits this amount.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    {[
                                        { label: 'JSO', key: 'comm_jso' },
                                        { label: 'SO', key: 'comm_so' },
                                        { label: 'SOP', key: 'comm_sop' },
                                        { label: 'SDO', key: 'comm_sdo' },
                                        { label: 'Platinum', key: 'comm_platinum' },
                                    ].map(({ label, key }) => (
                                        <div key={key}>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>Rs</span><input type="number" step="1" min="0" value={courseForm[key]} onChange={e => setCourseForm({ ...courseForm, [key]: e.target.value })} className="input-field pl-8" placeholder="0" /></div>
                                        </div>
                                    ))}
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
            {/* Create User Modal */}
            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create New User</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm mb-1">Full Name</label><input type="text" value={newUserForm.name} onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })} className="input-field" placeholder="Full Name" /></div>
                            <div><label className="block text-sm mb-1">WhatsApp Number</label><input type="text" value={newUserForm.phone} onChange={e => setNewUserForm({ ...newUserForm, phone: e.target.value })} className="input-field" placeholder="9876543210" /></div>
                            <div><label className="block text-sm mb-1">Email</label><input type="email" value={newUserForm.email} onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })} className="input-field" placeholder="email@example.com" /></div>
                            <div><label className="block text-sm mb-1">Password</label><input type="password" value={newUserForm.password} onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })} className="input-field" placeholder="********" /></div>
                            <div><label className="block text-sm mb-1">Upline Referral Code (Optional)</label><input type="text" value={newUserForm.upline_referral_code} onChange={e => setNewUserForm({ ...newUserForm, upline_referral_code: e.target.value })} className="input-field" placeholder="e.g. JSO1005" /></div>
                            <div>
                                <label className="block text-sm mb-1">Initial Rank</label>
                                <select value={newUserForm.rank} onChange={e => setNewUserForm({ ...newUserForm, rank: e.target.value })} className="input-field">
                                    <option value="JSO">JSO</option>
                                    <option value="SO">SO</option>
                                    <option value="SOP">SOP</option>
                                    <option value="SDO">SDO</option>
                                    <option value="Platinum">Platinum</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveUser} disabled={actionLoading === 'user-save'} className="btn-primary flex-1">
                                    {actionLoading === 'user-save' ? <Spinner size="sm" /> : 'Create User'}
                                </button>
                                <button onClick={() => setShowUserModal(false)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Bonus Modal */}
            {showBonusModal && (
                <div className="modal-overlay" onClick={() => setShowBonusModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create Bonus Campaign</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">Target Course</label>
                                <select value={bonusForm.course_id} onChange={e => setBonusForm({ ...bonusForm, course_id: e.target.value })} className="input-field">
                                    <option value="">Select Course</option>
                                    {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm mb-1">Bonus Amount (₹)</label><input type="number" value={bonusForm.bonus_amount} onChange={e => setBonusForm({ ...bonusForm, bonus_amount: e.target.value })} className="input-field" placeholder="100" /></div>
                            <div><label className="block text-sm mb-1">Start Date/Time</label><input type="datetime-local" value={bonusForm.start_time} onChange={e => setBonusForm({ ...bonusForm, start_time: e.target.value })} className="input-field" /></div>
                            <div><label className="block text-sm mb-1">End Date/Time</label><input type="datetime-local" value={bonusForm.end_time} onChange={e => setBonusForm({ ...bonusForm, end_time: e.target.value })} className="input-field" /></div>
                            <div>
                                <label className="block text-sm mb-1">Eligibility</label>
                                <select value={bonusForm.eligible_roles} onChange={e => setBonusForm({ ...bonusForm, eligible_roles: e.target.value })} className="input-field">
                                    <option value="ALL">ALL RANKS</option>
                                    <option value="JSO">JSO ONLY</option>
                                    <option value="SO">SO ONLY</option>
                                    <option value="SOP">SOP ONLY</option>
                                    <option value="SDO">SDO ONLY</option>
                                    <option value="Platinum">Platinum ONLY</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveBonus} disabled={actionLoading === 'bonus-save'} className="btn-primary flex-1">
                                    {actionLoading === 'bonus-save' ? <Spinner size="sm" /> : 'Start Campaign'}
                                </button>
                                <button onClick={() => setShowBonusModal(false)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Special Offer Modal */}
            {showOfferModal && (
                <div className="modal-overlay" onClick={() => setShowOfferModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create Special Offer</h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>This amount is ADDED to the base rank commission. It only applies to admissions created during the offer period.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1">Target Course</label>
                                <select value={offerForm.course_id} onChange={e => setOfferForm({ ...offerForm, course_id: e.target.value })} className="input-field">
                                    <option value="">Select Course</option>
                                    {courses.map(c => <option key={c.id || c.course_id} value={c.id || c.course_id}>{c.name || c.course_name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm mb-1">Valid Until</label><input type="datetime-local" value={offerForm.valid_until} onChange={e => setOfferForm({ ...offerForm, valid_until: e.target.value })} className="input-field" /></div>
                            
                            <div className="p-4 rounded-xl" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Zap className="w-4 h-4 text-amber-400" />
                                    Bonus Amount Per Rank (Added on top of base)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'JSO', key: 'jso_amount' },
                                        { label: 'SO', key: 'so_amount' },
                                        { label: 'SOP', key: 'sop_amount' },
                                        { label: 'SDO', key: 'sdo_amount' },
                                        { label: 'Platinum', key: 'platinum_amount' },
                                    ].map(({ label, key }) => (
                                        <div key={key}>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label} Bonus</label>
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--text-muted)' }}>Rs</span><input type="number" step="1" min="0" value={offerForm[key]} onChange={e => setOfferForm({ ...offerForm, [key]: e.target.value })} className="input-field pl-8" placeholder="0" /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveOffer} disabled={actionLoading === 'offer-save'} className="btn-primary flex-1">
                                    {actionLoading === 'offer-save' ? <Spinner size="sm" /> : 'Create Offer'}
                                </button>
                                <button onClick={() => setShowOfferModal(false)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
