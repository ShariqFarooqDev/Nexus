import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    Calendar,
    FileText,
    Video,
    CreditCard,
    Users,
    Settings,
    LogOut,
    Bell,
    User,
    TrendingUp,
    Briefcase,
} from 'lucide-react';

// Import actual page components
import MeetingsPage from './Meetings';
import DocumentsPage from './Documents';
import PaymentsPage from './Payments';
import VideoChatPage from './VideoChat';
import NetworkPage from './Network';
import SettingsPage from './Settings';

// Dashboard sub-pages
const DashboardHome = () => {
    const { user } = useAuth();
    const [stats, setStats] = React.useState({
        meetings: 0,
        documents: 0,
        connections: 0,
        loading: true,
    });
    const [recentActivity, setRecentActivity] = React.useState<
        Array<{ icon: React.ElementType; text: string; time: string; color: string }>
    >([]);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch all stats in parallel
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                const token = localStorage.getItem('token');
                const headers = { 'Authorization': `Bearer ${token}` };

                const [meetingsRes, docsRes, usersRes, transRes] = await Promise.all([
                    fetch(`${apiUrl}/meetings`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`${apiUrl}/documents`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`${apiUrl}/users?limit=100`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`${apiUrl}/payments/transactions`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
                ]);

                // Calculate stats
                const meetings = meetingsRes.data || [];
                const upcomingMeetings = meetings.filter(
                    (m: { scheduledTime: string }) => new Date(m.scheduledTime) > new Date()
                );
                const documents = docsRes.data || [];
                const users = usersRes.data || [];
                const transactions = transRes.data || [];

                // Count connections (users of opposite role)
                const connectionRole = user?.role === 'investor' ? 'entrepreneur' : 'investor';
                const connections = users.filter((u: { role: string }) => u.role === connectionRole);

                setStats({
                    meetings: upcomingMeetings.length,
                    documents: documents.length,
                    connections: connections.length,
                    loading: false,
                });

                // Build recent activity from real data
                const activities: Array<{ icon: React.ElementType; text: string; time: string; color: string }> = [];

                // Add recent meetings
                if (meetings.length > 0) {
                    const recentMeeting = meetings[0];
                    activities.push({
                        icon: Calendar,
                        text: `Meeting: ${recentMeeting.title}`,
                        time: new Date(recentMeeting.createdAt).toLocaleDateString(),
                        color: 'blue',
                    });
                }

                // Add recent documents
                if (documents.length > 0) {
                    const recentDoc = documents[0];
                    activities.push({
                        icon: FileText,
                        text: `Document: ${recentDoc.title}`,
                        time: new Date(recentDoc.createdAt).toLocaleDateString(),
                        color: 'green',
                    });
                }

                // Add recent transactions
                if (transactions.length > 0) {
                    const recentTrans = transactions[0];
                    activities.push({
                        icon: CreditCard,
                        text: `${recentTrans.type}: $${recentTrans.amount}`,
                        time: new Date(recentTrans.createdAt).toLocaleDateString(),
                        color: 'purple',
                    });
                }

                // If no activity, show welcome message
                if (activities.length === 0) {
                    activities.push({
                        icon: Users,
                        text: 'Welcome! Start by exploring the dashboard',
                        time: 'Just now',
                        color: 'blue',
                    });
                }

                setRecentActivity(activities);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                setStats({ meetings: 0, documents: 0, connections: 0, loading: false });
            }
        };

        fetchStats();
    }, [user?.role]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Welcome back, {user?.profile.firstName}!
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Here's what's happening with your {user?.role === 'investor' ? 'investments' : 'startup'} today.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Meetings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.loading ? '...' : stats.meetings}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Documents</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.loading ? '...' : stats.documents}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${user?.balance?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {user?.role === 'investor' ? 'Startups Connected' : 'Investors Connected'}
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats.loading ? '...' : stats.connections}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {recentActivity.length === 0 && !stats.loading ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                No recent activity. Start by scheduling a meeting or uploading a document!
                            </p>
                        ) : (
                            recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full bg-${activity.color}-100 dark:bg-${activity.color}-900/50 flex items-center justify-center`}>
                                        <activity.icon className={`w-5 h-5 text-${activity.color}-600 dark:text-${activity.color}-400`} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900 dark:text-white">{activity.text}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


// Sidebar navigation
const Sidebar: React.FC<{ role: string }> = ({ role }) => {
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Calendar, label: 'Meetings', path: '/dashboard/meetings' },
        { icon: FileText, label: 'Documents', path: '/dashboard/documents' },
        { icon: Video, label: 'Video Chat', path: '/dashboard/video' },
        { icon: CreditCard, label: 'Payments', path: '/dashboard/payments' },
        { icon: Users, label: 'Network', path: '/dashboard/network' },
        { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    ];

    return (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <Link to="/" className="flex items-center space-x-2">
                    {role === 'investor' ? (
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                    ) : (
                        <Briefcase className="w-8 h-8 text-blue-600" />
                    )}
                    <span className="text-xl font-bold text-gray-900 dark:text-white">Nexus</span>
                </Link>
                <p className="text-xs text-gray-500 mt-1 capitalize">{role} Dashboard</p>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={logout}
                    className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

// Header
const Header: React.FC = () => {
    const { user } = useAuth();

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
                <div className="flex-1" />

                <div className="flex items-center space-x-4">
                    <button className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    </button>

                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            {user?.profile.avatar ? (
                                <img src={user.profile.avatar} alt="" className="w-10 h-10 rounded-full" />
                            ) : (
                                <User className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="hidden md:block">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {user?.profile.firstName} {user?.profile.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

// Main Dashboard Layout
const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar role={user?.role || 'entrepreneur'} />

            <div className="flex-1 flex flex-col">
                <Header />

                <main className="flex-1 p-6 overflow-auto">
                    <Routes>
                        <Route index element={<DashboardHome />} />
                        <Route path="meetings" element={<MeetingsPage />} />
                        <Route path="documents" element={<DocumentsPage />} />
                        <Route path="video" element={<VideoChatPage />} />
                        <Route path="payments" element={<PaymentsPage />} />
                        <Route path="network" element={<NetworkPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
