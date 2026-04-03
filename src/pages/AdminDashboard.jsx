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
        name: '', description: '', points: 10, 
        level_1_payout: 0, level_2_payout: 0, level_3_payout: 0, level_4_payout: 0, level_5_payout: 0,
        price: 0, is_active: true,
        comm_jso: 0, comm_so: 0, comm_sop: 0, comm_sdo: 0, comm_platinum: 0
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
    // New Edit States
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [editUserForm, setEditUserForm] = useState({ id: '', name: '', phone: '', email: '', rank: '', status: '', password: '' });
    const [showEditAdmissionModal, setShowEditAdmissionModal] = useState(false);
    const [editAdmissionForm, setEditAdmissionForm] = useState({ id: '', student_name: '', student_phone: '', course_id: '' });
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
                api.courses.list({ admin: true }),
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

    const handleEditUser = (promoter) => {
        setEditUserForm({
            id: promoter.id,
            name: promoter.name,
            phone: promoter.phone,
            email: promoter.email || '',
            rank: promoter.rank,
            status: promoter.status,
            password: ''
        });
        setShowEditUserModal(true);
    };

    const handleSaveUserEdit = async () => {
        if (!editUserForm.name || !editUserForm.phone) {
            showToast('Name and Phone are required', 'error');
            return;
        }
        setActionLoading('user-edit');
        try {
            await api.admin.updateUser(editUserForm.id, {
                name: editUserForm.name,
                phone: editUserForm.phone,
                email: editUserForm.email,
                rank: editUserForm.rank,
                status: editUserForm.status,
                password: editUserForm.password || undefined
            });
            showToast('User updated successfully');
            setShowEditUserModal(false);
            setSelectedPromoter(null);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Error updating user', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleEditAdmission = (admission) => {
        setEditAdmissionForm({
            id: admission.id,
            student_name: admission.student_name,
            student_phone: admission.student_phone,
            course_id: admission.course_id
        });
        setShowEditAdmissionModal(true);
    };

    const handleSaveAdmissionEdit = async () => {
        setActionLoading('admission-edit');
        try {
            await api.admin.updateAdmission(editAdmissionForm.id, {
                student_name: editAdmissionForm.student_name,
                student_phone: editAdmissionForm.student_phone,
                course_id: editAdmissionForm.course_id
            });
            showToast('Admission updated successfully');
            setShowEditAdmissionModal(false);
            setSelectedStudent(null);
            fetchData();
        } catch (err) {
            showToast(err.message || 'Error updating admission', 'error');
        } finally {
            setActionLoading(null);
        }
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

    const handleToggleBonusStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setActionLoading(`bonus-toggle-${id}`);
        try {
            await api.bonuses.update(id, { status: newStatus });
            showToast('Bonus status updated!');
            fetchData();
        } catch (err) {
            showToast('Failed to update bonus status', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteBonus = async (id) => {
        if (!confirm('Are you sure you want to delete this bonus campaign?')) return;
        setActionLoading(`bonus-del-${id}`);
        try {
            await api.bonuses.delete(id);
            showToast('Bonus campaign deleted!');
            fetchData();
        } catch (err) {
            showToast('Failed to delete bonus', 'error');
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
            showToast(`Admission ${referralId} verified successfully!`);
            // Industrial Standard: Immediate local state sync + background refetch
            setPendingReferrals(prev => prev.filter(r => r.id !== referralId));
            await fetchData();
        } catch (err) { 
            showToast(err.message || 'Failed to verify', 'error'); 
        }
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
                level_1_payout: parseFloat(courseForm.level_1_payout) || 0,
                level_2_payout: parseFloat(courseForm.level_2_payout) || 0,
                level_3_payout: parseFloat(courseForm.level_3_payout) || 0,
                level_4_payout: parseFloat(courseForm.level_4_payout) || 0,
                level_5_payout: parseFloat(courseForm.level_5_payout) || 0,
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
            setCourseForm({ 
                name: '', description: '', points: 10, 
                level_1_payout: 0, level_2_payout: 0, level_3_payout: 0, level_4_payout: 0, level_5_payout: 0, 
                price: 0, is_active: true, comm_jso: 0, comm_so: 0, comm_sop: 0, comm_sdo: 0, comm_platinum: 0 
            });
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
                        { id: 'promoters', icon: Megaphone, label: 'Promoters', badge: allPromoters.filter(p => p.status === 'active' || p.status === 'approved' || p.rank === 'Super Admin').length },
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
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${course.price > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                                                        {course.price > 0 ? `₹${course.price}` : 'Free'}
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
                        {filterPromoters(allPromoters.filter(p => p.status === 'active' || p.status === 'approved' || p.rank === 'Super Admin')).length === 0 ? (
                            <div className="card text-center py-8"><Megaphone className="w-10 h-10 text-teal-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No promoters found</p></div>
                        ) : (
                            <div className="cards-grid">
                                {filterPromoters(allPromoters.filter(p => p.status === 'active' || p.status === 'approved' || p.rank === 'Super Admin')).map(p => {
                                    const referrer = getReferrerName(p);
                                    return (
                                        <div key={p.id} className="card cursor-pointer hover:border-teal-500/30 transition-all group" onClick={() => fetchPromoterDetails(p)}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-500/10">
                                                        <User className="w-5 h-5 text-teal-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                                                        <p className="text-xs font-mono text-teal-400">{p.referral_code}</p>
                                                    </div>
                                                </div>
                                                <LevelBadge level={p.rank} size="sm" />
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 py-3 border-y border-white/5 my-2">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Points</p>
                                                    <p className="font-bold text-amber-400">{p.total_points || 0}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Team Size</p>
                                                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{p.team_size || 0}</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                    {referrer ? (
                                                        <><Link2 className="w-3 h-3" /> {referrer.referral_code}</>
                                                    ) : 'Direct'}
                                                </span>
                                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        </div>
                                    );
                                })}
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
                            <div className="cards-grid">
                                {filterStudents(allStudents).map(s => (
                                    <div key={s.id} className="card cursor-pointer hover:border-purple-500/30 transition-all group" onClick={() => fetchStudentDetails(s)}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{s.student_name}</h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.student_phone}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${s.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                {s.status}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-2 mb-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Course</span>
                                                <span className="text-xs px-2 py-0.5 rounded font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {s.course_name}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Referred By</span>
                                                <span className="text-xs font-semibold text-teal-400">{s.admitted_by_name}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</span>
                                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                ))}
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
                                            <span className="badge text-xs bg-amber-500/20 text-amber-400">Pending</span>
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
                        <button onClick={() => { setEditingCourse(null); setCourseForm({ name: '', description: '', points: 10, level_1_payout: 0, level_2_payout: 0, level_3_payout: 0, level_4_payout: 0, level_5_payout: 0, price: 0, is_active: true, comm_jso: 0, comm_so: 0, comm_sop: 0, comm_sdo: 0, comm_platinum: 0 }); setShowCourseModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-5 h-5" />Add Course</button>
                        <div className="cards-grid">
                            {courses.map(c => (
                                <div key={c.id} className="card hover:border-teal-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>{c.name}</h4>
                                        <span className={`badge text-xs ${c.price > 0 ? 'badge-paid' : 'badge-free'}`}>
                                            {c.price > 0 ? `₹${c.price}` : 'Free'}
                                        </span>
                                    </div>
                                    <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{c.description || 'No description'}</p>

                                    <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-lg text-xs" style={{ background: 'var(--hover-bg)' }}>
                                        <div><span style={{ color: 'var(--text-muted)' }}>L1 Payout:</span> <span className="text-green-400 font-bold ml-1">₹{c.level_1_payout || 0}</span></div>
                                        <div><span style={{ color: 'var(--text-muted)' }}>Reward:</span> <span className="text-teal-400 font-bold ml-1">{c.points} pts</span></div>
                                    </div>

                                    {(c.comm_jso > 0 || c.comm_so > 0) && (
                                        <div className="flex flex-wrap gap-1 mb-3 text-[10px]">
                                            {c.comm_jso > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">JSO:₹{c.comm_jso}</span>}
                                            {c.comm_so > 0 && <span className="text-amber-400 bg-amber-500/10 px-1 rounded">SO:₹{c.comm_so}</span>}
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs font-semibold ${c.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                                            {c.status === 'active' ? 'ACTIVE' : c.schedule_status === 'closed' ? 'CLOSED' : 'INACTIVE'}
                                        </span>
                                        <div className="flex gap-2 items-center">
                                            <button onClick={() => { 
                                                setEditingCourse(c); 
                                                setCourseForm({ 
                                                    name: c.name, 
                                                    description: c.description || '', 
                                                    points: c.points || 10, 
                                                    level_1_payout: c.level_1_payout || 0,
                                                    level_2_payout: c.level_2_payout || 0,
                                                    level_3_payout: c.level_3_payout || 0,
                                                    level_4_payout: c.level_4_payout || 0,
                                                    level_5_payout: c.level_5_payout || 0,
                                                    price: c.price || 0, 
                                                    is_active: c.status === 'active',
                                                    comm_jso: c.comm_jso || 0,
                                                    comm_so: c.comm_so || 0,
                                                    comm_sop: c.comm_sop || 0,
                                                    comm_sdo: c.comm_sdo || 0,
                                                    comm_platinum: c.comm_platinum || 0
                                                }); 
                                                setShowCourseModal(true); 
                                            }} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'var(--text-secondary)' }}><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteCourse(c.id, c.name)} disabled={actionLoading === `del-c-${c.id}`} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400" style={{ color: 'var(--text-secondary)' }}>
                                                {actionLoading === `del-c-${c.id}` ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
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
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                                                            b.status === 'active' && isActive ? 'bg-green-500/20 text-green-400' :
                                                            b.status === 'active' && isUpcoming ? 'bg-blue-500/20 text-blue-400' :
                                                            b.status === 'inactive' ? 'bg-gray-500/20 text-gray-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {b.status === 'inactive' ? 'Deactivated' : (isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Expired')}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleToggleBonusStatus(b.id || b.bonus_id, b.status)}
                                                            disabled={actionLoading === `bonus-toggle-${b.id || b.bonus_id}`}
                                                            className="p-1 rounded hover:bg-white/5"
                                                            title={b.status === 'active' ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {actionLoading === `bonus-toggle-${b.id || b.bonus_id}` ? <Spinner size="sm" /> : 
                                                                (b.status === 'active' ? <RefreshCw className="w-3 h-3 text-amber-400" /> : <RefreshCw className="w-3 h-3 text-green-400" />)}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteBonus(b.id || b.bonus_id)}
                                                            disabled={actionLoading === `bonus-del-${b.id || b.bonus_id}`}
                                                            className="p-1 rounded hover:bg-red-500/10 text-red-400"
                                                            title="Delete Campaign"
                                                        >
                                                            {actionLoading === `bonus-del-${b.id || b.bonus_id}` ? <Spinner size="sm" /> : <Trash2 className="w-3 h-3" />}
                                                        </button>
                                                    </div>
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
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Wallet className="w-5 h-5 text-teal-400" />Withdrawal Requests</h3>
                        </div>
                        {withdrawals.length === 0 ? (
                            <div className="card text-center py-8"><Clock className="w-10 h-10 text-teal-400 mx-auto mb-3" /><p style={{ color: 'var(--text-secondary)' }}>No withdrawal requests found</p></div>
                        ) : (
                            <div className="cards-grid">
                                {withdrawals.map(w => (
                                    <div key={w.id} className="card">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{w.user_name}</h3>
                                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{w.user_phone}</p>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                w.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                                w.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                                                w.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                                'bg-amber-500/20 text-amber-400'
                                            }`}>
                                                {w.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center py-3 border-y border-white/5 my-2">
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount Requested</span>
                                            <span className="text-lg font-bold text-emerald-500">₹{w.amount}</span>
                                        </div>

                                        <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>Requested: {formatDate(w.created_at)}</p>

                                        <div className="flex gap-2">
                                            {w.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleUpdateWithdrawal(w.id, 'approved')} disabled={actionLoading === `wd-${w.id}`} className="btn-primary py-2 text-xs flex-1">Approve</button>
                                                    <button onClick={() => handleUpdateWithdrawal(w.id, 'rejected')} disabled={actionLoading === `wd-${w.id}`} className="btn-secondary py-2 text-xs border-red-500/30 text-red-400">Reject</button>
                                                </>
                                            )}
                                            {w.status === 'approved' && (
                                                <button onClick={() => handleUpdateWithdrawal(w.id, 'paid')} disabled={actionLoading === `wd-${w.id}`} className="btn-success py-2 text-xs flex-1">Mark as PAID</button>
                                            )}
                                            {w.status === 'paid' && (
                                                <div className="text-center w-full py-2 text-[10px] font-bold text-green-400 bg-green-500/10 rounded-lg">TRANSACTION SETTLED</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Student Details Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
                    <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Student Details</h3>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleEditAdmission(selectedStudent)}
                                    className="p-2 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                                    title="Edit Student Info"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setSelectedStudent(null)} className="p-2 rounded-lg hover:bg-white/5">
                                    <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                                </button>
                            </div>
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
                                        <div className="flex justify-between"><span className="font-medium" style={{ color: 'var(--text-primary)' }}>{d.course_name}</span><span className={`badge text-xs ${d.price > 0 ? 'badge-paid' : 'badge-free'}`}>{d.price > 0 ? `Paid` : 'Free'}</span></div>
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
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleEditUser(selectedPromoter)}
                                    className="p-2 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                                    title="Edit Credentials"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setSelectedPromoter(null)} className="p-2 rounded-lg hover:bg-white/5">
                                    <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                                </button>
                            </div>
                        </div>

                        {/* Promoter Header Info */}
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
                            </div>
                        </div>

                        {/* Financial Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                                <p className="text-[10px] uppercase font-bold text-green-400 mb-1">Total Earned</p>
                                <p className="text-xl font-black text-green-400">₹{selectedPromoter.total_earnings || 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                <p className="text-[10px] uppercase font-bold text-blue-400 mb-1">Total Paid</p>
                                <p className="text-xl font-black text-blue-400">₹{selectedPromoter.total_paid || 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <p className="text-[10px] uppercase font-bold text-amber-400 mb-1">Wallet (Bal)</p>
                                <p className="text-xl font-black text-amber-400">₹{selectedPromoter.wallet_balance || 0}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                                <p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Team Size</p>
                                <p className="text-xl font-black text-purple-400">{selectedPromoter.team_size || 0}</p>
                            </div>
                        </div>

                        {/* Hierarchy Tracking */}
                        <div className="p-4 rounded-xl mb-4 border border-white/5" style={{ background: 'var(--hover-bg)' }}>
                            <h4 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                                <TrendingUp className="w-4 h-4" /> Upline Hierarchy (Lineage)
                            </h4>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold px-2 py-1 bg-white/5 rounded text-teal-400">CORE</span>
                                {(() => {
                                    try {
                                        const chain = typeof selectedPromoter.upline_chain === 'string' 
                                            ? JSON.parse(selectedPromoter.upline_chain) 
                                            : selectedPromoter.upline_chain || [];
                                        const displayChain = [...chain].reverse();
                                        return displayChain.map((uId, idx) => (
                                            <React.Fragment key={uId}>
                                                <ChevronRight className="w-3 h-3 text-white/20" />
                                                <span className="text-xs px-2 py-1 bg-white/5 rounded font-mono text-purple-400" title={`User ID: ${uId}`}>{uId}</span>
                                            </React.Fragment>
                                        ));
                                    } catch (e) { return <span className="text-xs italic text-white/40">Direct Entry</span>; }
                                })()}
                                <ChevronRight className="w-3 h-3 text-white/20" />
                                <span className="text-xs px-2 py-1 bg-teal-500/20 rounded font-bold text-teal-400 ring-1 ring-teal-500/50">{selectedPromoter.name} (YOU)</span>
                            </div>
                        </div>

                        {/* Promoters Referred by this promoter */}
                        {promoterReferredPromoters.length > 0 && (
                            <div className="mb-4">
                                <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Megaphone className="w-4 h-4 text-purple-400" /> Promoters Referred ({promoterReferredPromoters.length})
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {promoterReferredPromoters.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'var(--hover-bg)' }}>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}><User className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                                                <p className="text-xs text-teal-400">{p.referral_code || 'Pending ID'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-xs px-2 py-1 rounded ${p.status === 'active' || p.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {p.status === 'active' || p.status === 'approved' ? 'Active' : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Students Referred */}
                        <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <GraduationCap className="w-4 h-4 text-purple-400" /> Students Referred ({promoterReferrals.length})
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
                                            <span className="badge text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20">{r.course_name}</span>
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
                            <div className="grid grid-cols-1 gap-3">
                                <div><label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Course Price (₹)</label><input type="number" value={courseForm.price} onChange={e => setCourseForm({ ...courseForm, price: e.target.value })} className="input-field" placeholder="0" /></div>
                            </div>

                            {/* Payout & Points Section */}
                            <div className="p-4 rounded-xl space-y-4" style={{ background: 'var(--hover-bg)' }}>
                                <h4 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <DollarSign className="w-4 h-4 text-green-400" />
                                    Hierarchy Payouts (Flat INR)
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level 1 Payout (Direct)</label>
                                        <input type="number" value={courseForm.level_1_payout} onChange={e => setCourseForm({ ...courseForm, level_1_payout: e.target.value })} className="input-field py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Student Reward Points</label>
                                        <input type="number" step="0.5" value={courseForm.points} onChange={e => setCourseForm({ ...courseForm, points: e.target.value })} className="input-field py-2" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level 2 Payout</label><input type="number" value={courseForm.level_2_payout} onChange={e => setCourseForm({ ...courseForm, level_2_payout: e.target.value })} className="input-field py-2" /></div>
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level 3 Payout</label><input type="number" value={courseForm.level_3_payout} onChange={e => setCourseForm({ ...courseForm, level_3_payout: e.target.value })} className="input-field py-2" /></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level 4 Payout</label><input type="number" value={courseForm.level_4_payout} onChange={e => setCourseForm({ ...courseForm, level_4_payout: e.target.value })} className="input-field py-2" /></div>
                                    <div><label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Level 5 Payout</label><input type="number" value={courseForm.level_5_payout} onChange={e => setCourseForm({ ...courseForm, level_5_payout: e.target.value })} className="input-field py-2" /></div>
                                </div>
                                <p className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>These flat amounts are distributed across the 5-level referral upline chain during admission approval.</p>
                            </div>

                            {/* Rank-Based Commission (Legacy/Fallback View) */}
                            <div className="p-4 rounded-xl opacity-80" style={{ background: 'var(--hover-bg)' }}>
                                <details>
                                    <summary className="text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-muted)' }}>Rank-Based Reference Values (Optional)</summary>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                                        {[
                                            { label: 'JSO', key: 'comm_jso' },
                                            { label: 'SO', key: 'comm_so' },
                                            { label: 'SOP', key: 'comm_sop' },
                                            { label: 'SDO', key: 'comm_sdo' },
                                            { label: 'PL', key: 'comm_platinum' },
                                        ].map(({ label, key }) => (
                                            <div key={key}>
                                                <label className="block text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
                                                <input type="number" value={courseForm[key]} onChange={e => setCourseForm({ ...courseForm, [key]: e.target.value })} className="input-field py-1 text-xs" />
                                            </div>
                                        ))}
                                    </div>
                                </details>
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
                <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowBonusModal(false)}>
                    <div className="modal-content relative" style={{ maxWidth: '450px', zIndex: 100000 }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Create Bonus Campaign</h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>This bonus boosts the Level 1 (Direct) payout for the selected course during the campaign period.</p>
                        <div className="space-y-4">
                            <div className="relative" style={{ zIndex: 100001 }}>
                                <label className="block text-sm mb-1">Target Course</label>
                                <select 
                                    value={bonusForm.course_id} 
                                    onChange={e => setBonusForm({ ...bonusForm, course_id: e.target.value })} 
                                    className="input-field bg-[#1a1b2e] text-white cursor-pointer"
                                    style={{ position: 'relative', zIndex: 100002 }}
                                >
                                    <option value="">Select Course</option>
                                    {courses.map(c => <option key={c.id || c.course_id} value={c.id || c.course_id} className="bg-[#1a1b2e]">{c.name || c.course_name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm mb-1">Extra Bonus Amount (₹)</label><input type="number" value={bonusForm.bonus_amount} onChange={e => setBonusForm({ ...bonusForm, bonus_amount: e.target.value })} className="input-field" placeholder="100" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-sm mb-1">Start Date</label><input type="datetime-local" value={bonusForm.start_time} onChange={e => setBonusForm({ ...bonusForm, start_time: e.target.value })} className="input-field text-xs px-2" /></div>
                                <div><label className="block text-sm mb-1">End Date</label><input type="datetime-local" value={bonusForm.end_time} onChange={e => setBonusForm({ ...bonusForm, end_time: e.target.value })} className="input-field text-xs px-2" /></div>
                            </div>
                            <div className="relative" style={{ zIndex: 100001 }}>
                                <label className="block text-sm mb-1">Eligibility</label>
                                <select 
                                    value={bonusForm.eligible_roles} 
                                    onChange={e => setBonusForm({ ...bonusForm, eligible_roles: e.target.value })} 
                                    className="input-field bg-[#1a1b2e] text-white cursor-pointer"
                                    style={{ position: 'relative', zIndex: 100002 }}
                                >
                                    <option value="ALL" className="bg-[#1a1b2e]">ALL RANKS</option>
                                    <option value="JSO" className="bg-[#1a1b2e]">JSO ONLY</option>
                                    <option value="SO" className="bg-[#1a1b2e]">SO ONLY</option>
                                    <option value="SOP" className="bg-[#1a1b2e]">SOP ONLY</option>
                                    <option value="SDO" className="bg-[#1a1b2e]">SDO ONLY</option>
                                    <option value="Platinum" className="bg-[#1a1b2e]">Platinum ONLY</option>
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

            {/* Edit User Modal */}
            {showEditUserModal && (
                <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowEditUserModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Promoter Credentials</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm mb-1">Full Name</label><input type="text" value={editUserForm.name} onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })} className="input-field" /></div>
                            <div><label className="block text-sm mb-1">Login Phone (WhatsApp)</label><input type="text" value={editUserForm.phone} onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })} className="input-field" /></div>
                            <div><label className="block text-sm mb-1">Email</label><input type="email" value={editUserForm.email} onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })} className="input-field" /></div>
                            <div>
                                <label className="block text-sm mb-1">Update Password</label>
                                <input type="password" value={editUserForm.password} onChange={e => setEditUserForm({ ...editUserForm, password: e.target.value })} className="input-field" placeholder="Leave blank to keep current" />
                                <p className="text-[10px] mt-1 text-amber-400/60 italic">Setting a new password will immediately change their login credentials.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm mb-1">Rank</label>
                                    <select value={editUserForm.rank} onChange={e => setEditUserForm({ ...editUserForm, rank: e.target.value })} className="input-field bg-[#1a1b2e] text-white">
                                        <option value="JSO">JSO</option>
                                        <option value="SO">SO</option>
                                        <option value="SOP">SOP</option>
                                        <option value="SDO">SDO</option>
                                        <option value="Platinum">Platinum</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm mb-1">Status</label>
                                    <select value={editUserForm.status} onChange={e => setEditUserForm({ ...editUserForm, status: e.target.value })} className="input-field bg-[#1a1b2e] text-white">
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveUserEdit} disabled={actionLoading === 'user-edit'} className="btn-primary flex-1">
                                    {actionLoading === 'user-edit' ? <Spinner size="sm" /> : 'Save Changes'}
                                </button>
                                <button onClick={() => setShowEditUserModal(false)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Admission Modal */}
            {showEditAdmissionModal && (
                <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowEditAdmissionModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Edit Student Info</h3>
                        <div className="space-y-4">
                            <div><label className="block text-sm mb-1">Student Name</label><input type="text" value={editAdmissionForm.student_name} onChange={e => setEditAdmissionForm({ ...editAdmissionForm, student_name: e.target.value })} className="input-field" /></div>
                            <div><label className="block text-sm mb-1">WhatsApp Number</label><input type="text" value={editAdmissionForm.student_phone} onChange={e => setEditAdmissionForm({ ...editAdmissionForm, student_phone: e.target.value })} className="input-field" /></div>
                            <div>
                                <label className="block text-sm mb-1">Course</label>
                                <select value={editAdmissionForm.course_id} onChange={e => setEditAdmissionForm({ ...editAdmissionForm, course_id: e.target.value })} className="input-field bg-[#1a1b2e] text-white">
                                    {courses.map(c => <option key={c.id || c.course_id} value={c.id || c.course_id}>{c.name || c.course_name} (₹{c.price})</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveAdmissionEdit} disabled={actionLoading === 'admission-edit'} className="btn-primary flex-1">
                                    {actionLoading === 'admission-edit' ? <Spinner size="sm" /> : 'Save Changes'}
                                </button>
                                <button onClick={() => setShowEditAdmissionModal(false)} className="btn-secondary flex-1">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
