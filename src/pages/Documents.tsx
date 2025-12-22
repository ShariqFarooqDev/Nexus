import React, { useState, useEffect, useRef } from 'react';
import {
    FileText,
    Upload,
    Share2,
    Download,
    Trash2,
    Edit3,
    Eye,
    Loader2,
    Search,
    Filter,
    MoreVertical,
    CheckCircle,
    Clock,
    X,
} from 'lucide-react';
import { documentApi, userApi, Document, User } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// File type icons
const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    return '📁';
};

// Format file size
const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Document Card Component
const DocumentCard: React.FC<{
    document: Document;
    onView: (doc: Document) => void;
    onShare: (doc: Document) => void;
    onSign: (doc: Document) => void;
    onDelete: (id: string) => void;
    isOwner: boolean;
}> = ({ document, onView, onShare, onSign, onDelete, isOwner }) => {
    const [showMenu, setShowMenu] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
            case 'pending_signature': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'signed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'archived': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <span className="text-3xl">{getFileIcon(document.fileType)}</span>
                    <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                            {document.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(document.fileSize)} • {new Date(document.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                        <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            <button
                                onClick={() => { onView(document); setShowMenu(false); }}
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                            </button>
                            <a
                                href={document.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                            </a>
                            {isOwner && (
                                <>
                                    <button
                                        onClick={() => { onShare(document); setShowMenu(false); }}
                                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span>Share</span>
                                    </button>
                                    <button
                                        onClick={() => { onDelete(document._id); setShowMenu(false); }}
                                        className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>Delete</span>
                                    </button>
                                </>
                            )}
                            {document.status !== 'signed' && document.status !== 'archived' && (
                                <button
                                    onClick={() => { onSign(document); setShowMenu(false); }}
                                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Sign</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(document.status)}`}>
                    {document.status.replace('_', ' ')}
                </span>

                <div className="flex items-center space-x-1">
                    {document.signatures.length > 0 && (
                        <div className="flex items-center text-xs text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {document.signatures.length} signed
                        </div>
                    )}
                    {document.sharedWith.length > 0 && (
                        <div className="flex -space-x-2">
                            {document.sharedWith.slice(0, 3).map((share, idx) => (
                                <div
                                    key={idx}
                                    className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white"
                                >
                                    {share.user.profile?.firstName?.[0] || '?'}
                                </div>
                            ))}
                            {document.sharedWith.length > 3 && (
                                <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs">
                                    +{document.sharedWith.length - 3}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Upload Modal
const UploadModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: File, title: string, description: string) => void;
}> = ({ isOpen, onClose, onUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        await onUpload(file, title, description);
        setLoading(false);
        setFile(null);
        setTitle('');
        setDescription('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Document</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />

                        {file ? (
                            <div className="flex items-center justify-center space-x-3">
                                <span className="text-4xl">{getFileIcon(file.type)}</span>
                                <div className="text-left">
                                    <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400 mb-2">
                                    Drag and drop your file here, or{' '}
                                    <button
                                        type="button"
                                        onClick={() => inputRef.current?.click()}
                                        className="text-blue-600 hover:text-blue-700"
                                    >
                                        browse
                                    </button>
                                </p>
                                <p className="text-xs text-gray-400">
                                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)
                                </p>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            rows={3}
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
                            disabled={!file || loading}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Share Modal
const ShareModal: React.FC<{
    isOpen: boolean;
    document: Document | null;
    users: User[];
    onClose: () => void;
    onShare: (docId: string, userId: string, permission: 'view' | 'edit' | 'sign') => void;
}> = ({ isOpen, document, users, onClose, onShare }) => {
    const [selectedUser, setSelectedUser] = useState('');
    const [permission, setPermission] = useState<'view' | 'edit' | 'sign'>('view');
    const [loading, setLoading] = useState(false);

    const handleShare = async () => {
        if (!document || !selectedUser) return;
        setLoading(true);
        await onShare(document._id, selectedUser, permission);
        setLoading(false);
        setSelectedUser('');
        onClose();
    };

    if (!isOpen || !document) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Share "{document.title}"
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Share with
                        </label>
                        <select
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">Select a user</option>
                            {users.map(user => (
                                <option key={user._id} value={user._id}>
                                    {user.profile.firstName} {user.profile.lastName} ({user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Permission
                        </label>
                        <select
                            value={permission}
                            onChange={e => setPermission(e.target.value as 'view' | 'edit' | 'sign')}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="view">View only</option>
                            <option value="edit">Can edit</option>
                            <option value="sign">Can sign</option>
                        </select>
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={!selectedUser || loading}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Share'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Signature Modal - E-Sign Canvas
const SignatureModal: React.FC<{
    isOpen: boolean;
    document: Document | null;
    onClose: () => void;
    onSign: (docId: string, signatureData: string) => void;
}> = ({ isOpen, document, onClose, onSign }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [loading, setLoading] = useState(false);

    // Initialize canvas
    useEffect(() => {
        if (isOpen && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = '#1e40af';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }
        }
    }, [isOpen]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if ('touches' in e) {
            const touch = e.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const coords = getCoordinates(e);
        if (!coords) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            setIsDrawing(true);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;

        const coords = getCoordinates(e);
        if (!coords) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            setHasSignature(true);
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
        }
    };

    const handleSubmit = async () => {
        if (!document || !hasSignature || !canvasRef.current) return;

        setLoading(true);
        const signatureData = canvasRef.current.toDataURL('image/png');
        await onSign(document._id, signatureData);
        setLoading(false);
        clearSignature();
        onClose();
    };

    if (!isOpen || !document) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sign Document</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {document.title}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Draw your signature below using your mouse or finger:
                    </div>

                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                        <canvas
                            ref={canvasRef}
                            width={400}
                            height={200}
                            className="w-full cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <button
                            type="button"
                            onClick={clearSignature}
                            className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Clear</span>
                        </button>
                        {hasSignature && (
                            <span className="text-green-600 flex items-center space-x-1">
                                <CheckCircle className="w-4 h-4" />
                                <span>Signature captured</span>
                            </span>
                        )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!hasSignature || loading}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Sign Document
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Main Documents Page
const DocumentsPage: React.FC = () => {
    const { user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [docsRes, usersRes] = await Promise.all([
                documentApi.getAll(),
                userApi.getUsers({ limit: 50 }),
            ]);

            if (docsRes.success && docsRes.data) {
                setDocuments(docsRes.data);
            }
            if (usersRes.success && usersRes.data) {
                setUsers(usersRes.data.filter(u => u._id !== user?._id));
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file: File, title: string, description: string) => {
        try {
            const response = await documentApi.upload(file, title, description);
            if (response.success && response.data) {
                setDocuments(prev => [response.data!, ...prev]);
                toast.success('Document uploaded successfully!');
            }
        } catch (error) {
            toast.error('Failed to upload document');
        }
    };

    const handleShare = async (docId: string, userId: string, permission: 'view' | 'edit' | 'sign') => {
        try {
            const response = await documentApi.share(docId, userId, permission);
            if (response.success) {
                toast.success('Document shared successfully!');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to share document');
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const response = await documentApi.delete(docId);
            if (response.success) {
                setDocuments(prev => prev.filter(d => d._id !== docId));
                toast.success('Document deleted');
            }
        } catch (error) {
            toast.error('Failed to delete document');
        }
    };

    const handleSign = (doc: Document) => {
        setSelectedDocument(doc);
        setShowSignModal(true);
    };

    const handleSignSubmit = async (docId: string, signatureData: string) => {
        try {
            const response = await documentApi.sign(docId, signatureData);
            if (response.success) {
                toast.success('Document signed successfully!');
                loadData();
            }
        } catch (error) {
            toast.error('Failed to sign document');
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Upload className="w-5 h-5" />
                    <span>Upload Document</span>
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending_signature">Pending Signature</option>
                    <option value="signed">Signed</option>
                    <option value="archived">Archived</option>
                </select>
            </div>

            {/* Documents Grid */}
            {filteredDocuments.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No documents found</p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                        Upload your first document
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocuments.map(doc => (
                        <DocumentCard
                            key={doc._id}
                            document={doc}
                            onView={() => window.open(doc.fileUrl, '_blank')}
                            onShare={() => { setSelectedDocument(doc); setShowShareModal(true); }}
                            onSign={() => handleSign(doc)}
                            onDelete={handleDelete}
                            isOwner={doc.uploadedBy._id === user?._id}
                        />
                    ))}
                </div>
            )}

            <UploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
                onUpload={handleUpload}
            />

            <ShareModal
                isOpen={showShareModal}
                document={selectedDocument}
                users={users}
                onClose={() => { setShowShareModal(false); setSelectedDocument(null); }}
                onShare={handleShare}
            />

            <SignatureModal
                isOpen={showSignModal}
                document={selectedDocument}
                onClose={() => { setShowSignModal(false); setSelectedDocument(null); }}
                onSign={handleSignSubmit}
            />
        </div>
    );
};

export default DocumentsPage;
