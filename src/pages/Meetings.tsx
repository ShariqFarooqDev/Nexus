import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    Plus,
    Clock,
    Users,
    Video,
    Check,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { meetingApi, userApi, Meeting, User } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Calendar component
const Calendar: React.FC<{
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    meetings: Meeting[];
}> = ({ selectedDate, onDateSelect, meetings }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
    ).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const hasMeeting = (day: number) => {
        if (!day) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return meetings.some(m => {
            const meetingDate = new Date(m.scheduledTime);
            return meetingDate.toDateString() === date.toDateString();
        });
    };

    const isSelected = (day: number) => {
        if (!day) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date.toDateString() === selectedDate.toDateString();
    };

    const isToday = (day: number) => {
        if (!day) return false;
        const today = new Date();
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return date.toDateString() === today.toDateString();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-1">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day, index) => (
                    <button
                        key={index}
                        onClick={() => day && onDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                        disabled={!day}
                        className={`
              aspect-square p-1 text-sm rounded-lg relative
              ${!day ? 'invisible' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
              ${isSelected(day!) ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              ${isToday(day!) && !isSelected(day!) ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : ''}
              ${!isSelected(day!) && !isToday(day!) ? 'text-gray-700 dark:text-gray-300' : ''}
            `}
                    >
                        {day}
                        {hasMeeting(day!) && (
                            <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Meeting Card
const MeetingCard: React.FC<{
    meeting: Meeting;
    onRespond: (id: string, response: 'accepted' | 'rejected') => void;
    currentUserId: string;
}> = ({ meeting, onRespond, currentUserId }) => {
    const isOrganizer = meeting.organizer._id === currentUserId;
    const myParticipation = meeting.participants.find(p => p.user._id === currentUserId);
    const isPending = myParticipation?.status === 'pending';

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{meeting.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Organized by {isOrganizer ? 'You' : `${meeting.organizer.profile.firstName} ${meeting.organizer.profile.lastName}`}
                    </p>
                </div>
                <span className={`
          px-2 py-1 text-xs rounded-full
          ${meeting.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}
          ${meeting.status === 'ongoing' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
          ${meeting.status === 'completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' : ''}
          ${meeting.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : ''}
        `}>
                    {meeting.status}
                </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatDate(meeting.scheduledTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(meeting.scheduledTime)} ({meeting.duration} min)</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{meeting.participants.length} participant(s)</span>
                </div>
            </div>

            {meeting.status === 'scheduled' && (
                <div className="mt-4 flex space-x-2">
                    {isPending && !isOrganizer && (
                        <>
                            <button
                                onClick={() => onRespond(meeting._id, 'accepted')}
                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                <span>Accept</span>
                            </button>
                            <button
                                onClick={() => onRespond(meeting._id, 'rejected')}
                                className="flex-1 flex items-center justify-center space-x-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                            >
                                <X className="w-4 h-4" />
                                <span>Decline</span>
                            </button>
                        </>
                    )}
                    {meeting.roomId && (
                        <a
                            href={`/dashboard/video?room=${meeting.roomId}`}
                            className="flex-1 flex items-center justify-center space-x-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <Video className="w-4 h-4" />
                            <span>Join Meeting</span>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
};

// Schedule Meeting Modal
const ScheduleMeetingModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (data: {
        title: string;
        description: string;
        participants: string[];
        scheduledTime: string;
        duration: number;
    }) => void;
    users: User[];
}> = ({ isOpen, onClose, onSchedule, users }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        participants: [] as string[],
        date: '',
        time: '',
        duration: 30,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const scheduledTime = new Date(`${formData.date}T${formData.time}`).toISOString();

        await onSchedule({
            title: formData.title,
            description: formData.description,
            participants: formData.participants,
            scheduledTime,
            duration: formData.duration,
        });

        setLoading(false);
        onClose();
        setFormData({ title: '', description: '', participants: [], date: '', time: '', duration: 30 });
    };

    const toggleParticipant = (userId: string) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.includes(userId)
                ? prev.participants.filter(id => id !== userId)
                : [...prev.participants, userId],
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Schedule Meeting</h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Date
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Time
                            </label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Duration (minutes)
                        </label>
                        <select
                            value={formData.duration}
                            onChange={e => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Participants
                        </label>
                        <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                            {users.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                    No users available
                                </p>
                            ) : (
                                users.map(user => (
                                    <label
                                        key={user._id}
                                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.participants.includes(user._id)}
                                            onChange={() => toggleParticipant(user._id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {user.profile.firstName} {user.profile.lastName}
                                        </span>
                                        <span className="text-xs text-gray-500 capitalize">({user.role})</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formData.participants.length === 0}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Main Meetings Page
const MeetingsPage: React.FC = () => {
    const { user } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [meetingsRes, usersRes] = await Promise.all([
                meetingApi.getAll({ upcoming: true }),
                userApi.getUsers({ limit: 50 }),
            ]);

            if (meetingsRes.success && meetingsRes.data) {
                setMeetings(meetingsRes.data);
            }

            if (usersRes.success && usersRes.data) {
                // Filter out current user from participants list
                setUsers(usersRes.data.filter(u => u._id !== user?._id));
            }
        } catch (error) {
            console.error('Failed to load meetings:', error);
            toast.error('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleMeeting = async (data: {
        title: string;
        description: string;
        participants: string[];
        scheduledTime: string;
        duration: number;
    }) => {
        try {
            const response = await meetingApi.create(data);
            if (response.success && response.data) {
                setMeetings(prev => [...prev, response.data!]);
                toast.success('Meeting scheduled successfully!');
            }
        } catch (error) {
            toast.error('Failed to schedule meeting');
        }
    };

    const handleRespond = async (meetingId: string, response: 'accepted' | 'rejected') => {
        try {
            const res = await meetingApi.respond(meetingId, response);
            if (res.success) {
                toast.success(`Meeting ${response}`);
                loadData();
            }
        } catch (error) {
            toast.error('Failed to respond to meeting');
        }
    };

    const filteredMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.scheduledTime);
        const today = new Date();

        if (filter === 'upcoming') {
            return meetingDate >= today;
        } else if (filter === 'past') {
            return meetingDate < today;
        }
        return true;
    });

    const selectedDayMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.scheduledTime);
        return meetingDate.toDateString() === selectedDate.toDateString();
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meetings</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Schedule Meeting</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <div className="lg:col-span-1">
                    <Calendar
                        selectedDate={selectedDate}
                        onDateSelect={setSelectedDate}
                        meetings={meetings}
                    />

                    {/* Selected Day Meetings */}
                    <div className="mt-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        {selectedDayMeetings.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No meetings scheduled</p>
                        ) : (
                            <div className="space-y-2">
                                {selectedDayMeetings.map(meeting => (
                                    <div
                                        key={meeting._id}
                                        className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg"
                                    >
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">{meeting.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(meeting.scheduledTime).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Meetings List */}
                <div className="lg:col-span-2">
                    <div className="flex space-x-2 mb-4">
                        {(['upcoming', 'past', 'all'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    {filteredMeetings.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">No meetings found</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="mt-4 text-blue-600 hover:text-blue-700"
                            >
                                Schedule your first meeting
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredMeetings.map(meeting => (
                                <MeetingCard
                                    key={meeting._id}
                                    meeting={meeting}
                                    onRespond={handleRespond}
                                    currentUserId={user?._id || ''}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ScheduleMeetingModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSchedule={handleScheduleMeeting}
                users={users}
            />
        </div>
    );
};

export default MeetingsPage;
