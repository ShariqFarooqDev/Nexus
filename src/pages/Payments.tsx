import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Send,
    RefreshCw,
    DollarSign,
    Loader2,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    XCircle,
    Filter,
} from 'lucide-react';
import { paymentApi, userApi, Transaction, User } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Transaction Row Component
const TransactionRow: React.FC<{ transaction: Transaction }> = ({ transaction }) => {
    const getIcon = () => {
        switch (transaction.type) {
            case 'deposit': return <ArrowDownLeft className="w-5 h-5 text-green-600" />;
            case 'withdraw': return <ArrowUpRight className="w-5 h-5 text-red-600" />;
            case 'transfer': return <Send className="w-5 h-5 text-blue-600" />;
            case 'refund': return <RefreshCw className="w-5 h-5 text-purple-600" />;
            default: return <DollarSign className="w-5 h-5 text-gray-600" />;
        }
    };

    const getStatusIcon = () => {
        switch (transaction.status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
            case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
            case 'processing': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
            default: return null;
        }
    };

    const getAmountColor = () => {
        if (transaction.type === 'deposit' || transaction.type === 'refund') return 'text-green-600';
        return 'text-red-600';
    };

    const getAmountPrefix = () => {
        if (transaction.type === 'deposit' || transaction.type === 'refund') return '+';
        return '-';
    };

    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td className="px-4 py-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {getIcon()}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">{transaction.type}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.description || `${transaction.type} transaction`}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </td>
            <td className="px-4 py-4">
                <div className="flex items-center space-x-1">
                    {getStatusIcon()}
                    <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                        {transaction.status}
                    </span>
                </div>
            </td>
            <td className={`px-4 py-4 font-semibold ${getAmountColor()}`}>
                {getAmountPrefix()}${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </td>
        </tr>
    );
};

// Action Modal Component
const ActionModal: React.FC<{
    isOpen: boolean;
    type: 'deposit' | 'withdraw' | 'transfer';
    users: User[];
    onClose: () => void;
    onSubmit: (data: { amount: number; recipientId?: string; description?: string }) => void;
    loading: boolean;
}> = ({ isOpen, type, users, onClose, onSubmit, loading }) => {
    const [amount, setAmount] = useState('');
    const [recipientId, setRecipientId] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        onSubmit({
            amount: amountNum,
            recipientId: type === 'transfer' ? recipientId : undefined,
            description,
        });
        setAmount('');
        setRecipientId('');
        setDescription('');
    };

    const getTitle = () => {
        switch (type) {
            case 'deposit': return 'Deposit Funds';
            case 'withdraw': return 'Withdraw Funds';
            case 'transfer': return 'Transfer Funds';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'deposit': return <ArrowDownLeft className="w-6 h-6 text-green-600" />;
            case 'withdraw': return <ArrowUpRight className="w-6 h-6 text-red-600" />;
            case 'transfer': return <Send className="w-6 h-6 text-blue-600" />;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {getIcon()}
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{getTitle()}</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Amount (USD)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="pl-10 w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="0.00"
                                min="1"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {type === 'transfer' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Recipient
                            </label>
                            <select
                                value={recipientId}
                                onChange={e => setRecipientId(e.target.value)}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                required
                            >
                                <option value="">Select a recipient</option>
                                {users.map(user => (
                                    <option key={user._id} value={user._id}>
                                        {user.profile.firstName} {user.profile.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description (optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            placeholder="Add a note..."
                        />
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex-1 py-2 text-white rounded-lg flex items-center justify-center ${type === 'deposit' ? 'bg-green-600 hover:bg-green-700' :
                                    type === 'withdraw' ? 'bg-red-600 hover:bg-red-700' :
                                        'bg-blue-600 hover:bg-blue-700'
                                } disabled:opacity-50`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Payments Page
const PaymentsPage: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
    const [typeFilter, setTypeFilter] = useState<string>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [transRes, usersRes] = await Promise.all([
                paymentApi.getTransactions(),
                userApi.getUsers({ limit: 50 }),
            ]);

            if (transRes.success && transRes.data) {
                setTransactions(transRes.data);
            }
            if (usersRes.success && usersRes.data) {
                setUsers(usersRes.data.filter(u => u._id !== user?._id));
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (data: { amount: number; recipientId?: string; description?: string }) => {
        if (!modalType) return;
        setActionLoading(true);

        try {
            let response;
            switch (modalType) {
                case 'deposit':
                    response = await paymentApi.deposit(data.amount);
                    break;
                case 'withdraw':
                    response = await paymentApi.withdraw(data.amount);
                    break;
                case 'transfer':
                    if (!data.recipientId) throw new Error('Recipient required');
                    response = await paymentApi.transfer(data.amount, data.recipientId, data.description);
                    break;
            }

            if (response?.success) {
                toast.success(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} successful!`);
                loadData();
                refreshUser();
                setModalType(null);
            }
        } catch (error) {
            toast.error(`${modalType} failed`);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredTransactions = transactions.filter(t =>
        typeFilter === 'all' || t.type === typeFilter
    );

    // Calculate stats
    const totalDeposits = transactions
        .filter(t => t.type === 'deposit' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = transactions
        .filter(t => t.type === 'withdraw' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <p className="text-blue-100 mb-1">Available Balance</p>
                <h2 className="text-4xl font-bold mb-6">
                    ${user?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </h2>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setModalType('deposit')}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                        <ArrowDownLeft className="w-5 h-5" />
                        <span>Deposit</span>
                    </button>
                    <button
                        onClick={() => setModalType('withdraw')}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                        <ArrowUpRight className="w-5 h-5" />
                        <span>Withdraw</span>
                    </button>
                    <button
                        onClick={() => setModalType('transfer')}
                        className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    >
                        <Send className="w-5 h-5" />
                        <span>Transfer</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Deposits</p>
                            <p className="text-xl font-bold text-green-600">
                                +${totalDeposits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-green-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Withdrawals</p>
                            <p className="text-xl font-bold text-red-600">
                                -${totalWithdrawals.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <TrendingDown className="w-8 h-8 text-red-600" />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Transactions</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{transactions.length}</p>
                        </div>
                        <CreditCard className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Transaction History</h3>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="text-sm rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="all">All Types</option>
                        <option value="deposit">Deposits</option>
                        <option value="withdraw">Withdrawals</option>
                        <option value="transfer">Transfers</option>
                        <option value="refund">Refunds</option>
                    </select>
                </div>

                {filteredTransactions.length === 0 ? (
                    <div className="p-8 text-center">
                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map(transaction => (
                                    <TransactionRow key={transaction._id} transaction={transaction} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ActionModal
                isOpen={modalType !== null}
                type={modalType || 'deposit'}
                users={users}
                onClose={() => setModalType(null)}
                onSubmit={handleAction}
                loading={actionLoading}
            />
        </div>
    );
};

export default PaymentsPage;
