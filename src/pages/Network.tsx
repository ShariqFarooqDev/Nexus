import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Filter,
    UserPlus,
    MessageSquare,
    Briefcase,
    TrendingUp,
    MapPin,
    Loader2,
    X,
} from 'lucide-react';
import { userApi, User } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

// User Card Component
const UserCard: React.FC<{
    user: User;
    onConnect: (userId: string) => void;
    onMessage: (userId: string) => void;
}> = ({ user, onConnect, onMessage }) => {
    const isInvestor = user.role === 'investor';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    {user.profile.avatar ? (
                        <img src={user.profile.avatar} alt="" className="w-16 h-16 rounded-full object-cover" />
                    ) : (
                        <span className="text-2xl text-white font-bold">
                            {user.profile.firstName?.charAt(0)}
                            {user.profile.lastName?.charAt(0)}
                        </span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {user.profile.firstName} {user.profile.lastName}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${isInvestor
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {isInvestor ? 'Investor' : 'Entrepreneur'}
                        </span>
                    </div>

                    {user.profile.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {user.profile.bio}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                        {user.profile.industry && (
                            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {user.profile.industry}
                            </span>
                        )}
                        {user.profile.location && (
                            <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <MapPin className="w-3 h-3 mr-1" />
                                {user.profile.location}
                            </span>
                        )}
                    </div>

                    {isInvestor && user.profile.investmentRange && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            Investment Range: ${user.profile.investmentRange.min?.toLocaleString()} - ${user.profile.investmentRange.max?.toLocaleString()}
                        </p>
                    )}

                    {!isInvestor && user.profile.startupName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Startup: {user.profile.startupName} ({user.profile.startupStage || 'Early Stage'})
                        </p>
                    )}
                </div>
            </div>

            <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => onConnect(user._id)}
                    className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Connect</span>
                </button>
                <button
                    onClick={() => onMessage(user._id)}
                    className="flex-1 flex items-center justify-center space-x-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                </button>
            </div>
        </div>
    );
};

// Filter Modal
const FilterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    filters: { role: string; industry: string };
    onApply: (filters: { role: string; industry: string }) => void;
}> = ({ isOpen, onClose, filters, onApply }) => {
    const [localFilters, setLocalFilters] = useState(filters);

    const industries = [
        'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
        'Real Estate', 'Manufacturing', 'Energy', 'Media', 'Agriculture'
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Users</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            User Type
                        </label>
                        <select
                            value={localFilters.role}
                            onChange={e => setLocalFilters(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Types</option>
                            <option value="investor">Investors</option>
                            <option value="entrepreneur">Entrepreneurs</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Industry
                        </label>
                        <select
                            value={localFilters.industry}
                            onChange={e => setLocalFilters(prev => ({ ...prev, industry: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">All Industries</option>
                            {industries.map(industry => (
                                <option key={industry} value={industry}>{industry}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            onClick={() => {
                                setLocalFilters({ role: '', industry: '' });
                                onApply({ role: '', industry: '' });
                                onClose();
                            }}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => { onApply(localFilters); onClose(); }}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Network Page
const NetworkPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ role: '', industry: '' });
    const [showFilterModal, setShowFilterModal] = useState(false);

    useEffect(() => {
        loadUsers();
    }, [filters]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await userApi.getUsers({
                role: filters.role || undefined,
                industry: filters.industry || undefined,
                limit: 50,
            });

            if (response.success && response.data) {
                setUsers(response.data.filter(u => u._id !== currentUser?._id));
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = (_userId: string) => {
        toast.success('Connection request sent!');
    };

    const handleMessage = (_userId: string) => {
        toast('Messaging feature coming soon!');
    };

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            user.profile.firstName?.toLowerCase().includes(query) ||
            user.profile.lastName?.toLowerCase().includes(query) ||
            user.profile.bio?.toLowerCase().includes(query) ||
            user.profile.industry?.toLowerCase().includes(query)
        );
    });

    const activeFiltersCount = [filters.role, filters.industry].filter(Boolean).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Network</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Discover and connect with {currentUser?.role === 'investor' ? 'entrepreneurs' : 'investors'}
                    </p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, industry, or bio..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <button
                    onClick={() => setShowFilterModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                    <Filter className="w-5 h-5" />
                    <span>Filters</span>
                    {activeFiltersCount > 0 && (
                        <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No users found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map(user => (
                        <UserCard
                            key={user._id}
                            user={user}
                            onConnect={handleConnect}
                            onMessage={handleMessage}
                        />
                    ))}
                </div>
            )}

            <FilterModal
                isOpen={showFilterModal}
                onClose={() => setShowFilterModal(false)}
                filters={filters}
                onApply={setFilters}
            />
        </div>
    );
};

export default NetworkPage;
