import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    PhoneOff,
    Users,
    Copy,
    Check,
    Loader2,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Video participant component
const VideoParticipant: React.FC<{
    stream: MediaStream | null;
    name: string;
    isLocal?: boolean;
    isMuted?: boolean;
    isVideoOff?: boolean;
}> = ({ stream, name, isLocal = false, isMuted = false, isVideoOff = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video">
            {stream && !isVideoOff ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-3xl text-white font-bold">
                            {name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                </div>
            )}

            <div className="absolute bottom-3 left-3 flex items-center space-x-2">
                <span className="bg-black/50 px-2 py-1 rounded text-white text-sm">
                    {isLocal ? 'You' : name}
                </span>
                {isMuted && (
                    <span className="bg-red-500 p-1 rounded">
                        <MicOff className="w-3 h-3 text-white" />
                    </span>
                )}
            </div>
        </div>
    );
};

// Main Video Chat Page
const VideoChat: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [socket, setSocket] = useState<Socket | null>(null);
    const [roomId, setRoomId] = useState(searchParams.get('room') || '');
    const [isJoined, setIsJoined] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [copied, setCopied] = useState(false);
    const [participants, setParticipants] = useState<Map<string, { stream: MediaStream | null; name: string }>>(new Map());

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    // ICE servers configuration
    const iceServers: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
        ],
    };

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(API_URL, {
            withCredentials: true,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
        });

        newSocket.on('user-joined', async (userId: string) => {
            console.log('User joined:', userId);
            toast.success('A participant joined the call');
            await createPeerConnection(userId, true);
        });

        newSocket.on('user-left', (userId: string) => {
            console.log('User left:', userId);
            toast('A participant left the call');
            closePeerConnection(userId);
            setParticipants(prev => {
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
        });

        newSocket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
            console.log('Received offer from:', from);
            await handleOffer(offer, from);
        });

        newSocket.on('answer', async ({ answer, from }: { answer: RTCSessionDescriptionInit; from: string }) => {
            console.log('Received answer from:', from);
            const pc = peerConnectionsRef.current.get(from);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        newSocket.on('ice-candidate', async ({ candidate, from }: { candidate: RTCIceCandidateInit; from: string }) => {
            const pc = peerConnectionsRef.current.get(from);
            if (pc && candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    const createPeerConnection = async (userId: string, createOffer: boolean) => {
        const pc = new RTCPeerConnection(iceServers);

        // Add local tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    to: userId,
                });
            }
        };

        // Handle incoming streams
        pc.ontrack = (event) => {
            const [stream] = event.streams;
            setParticipants(prev => {
                const next = new Map(prev);
                next.set(userId, { stream, name: 'Participant' });
                return next;
            });
        };

        peerConnectionsRef.current.set(userId, pc);

        if (createOffer) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('offer', { offer, to: userId });
        }

        return pc;
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit, from: string) => {
        const pc = await createPeerConnection(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket?.emit('answer', { answer, to: from });
    };

    const closePeerConnection = (userId: string) => {
        const pc = peerConnectionsRef.current.get(userId);
        if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(userId);
        }
    };

    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            return stream;
        } catch (error) {
            console.error('Failed to get local stream:', error);
            toast.error('Failed to access camera/microphone');
            return null;
        }
    };

    const joinRoom = async () => {
        if (!roomId.trim()) {
            toast.error('Please enter a room ID');
            return;
        }

        setIsConnecting(true);
        const stream = await startLocalStream();

        if (stream) {
            socket?.emit('join-room', roomId);
            setIsJoined(true);
            toast.success('Joined the call');
        }

        setIsConnecting(false);
    };

    const createRoom = async () => {
        const newRoomId = Math.random().toString(36).substring(2, 9);
        setRoomId(newRoomId);

        setIsConnecting(true);
        const stream = await startLocalStream();

        if (stream) {
            socket?.emit('create-room', newRoomId);
            setIsJoined(true);
            toast.success('Room created');
        }

        setIsConnecting(false);
    };

    const leaveRoom = () => {
        // Stop local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Close all peer connections
        peerConnectionsRef.current.forEach((_, odUserId) => {
            closePeerConnection(odUserId);
        });

        socket?.emit('leave-room', roomId);
        setIsJoined(false);
        setParticipants(new Map());
        navigate('/dashboard/video');
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                socket?.emit('toggle-audio', { roomId, enabled: audioTrack.enabled });
            }
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOff(!videoTrack.enabled);
                socket?.emit('toggle-video', { roomId, enabled: videoTrack.enabled });
            }
        }
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/dashboard/video?room=${roomId}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Room link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Lobby view
    if (!isJoined) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Chat</h1>

                <div className="max-w-md mx-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                            <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>

                        <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-6">
                            Start or Join a Video Call
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Room ID
                                </label>
                                <input
                                    type="text"
                                    value={roomId}
                                    onChange={(e) => setRoomId(e.target.value)}
                                    placeholder="Enter room ID to join"
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <button
                                onClick={joinRoom}
                                disabled={isConnecting || !roomId}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isConnecting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Users className="w-5 h-5 mr-2" />
                                        Join Room
                                    </>
                                )}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                onClick={createRoom}
                                disabled={isConnecting}
                                className="w-full py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                            >
                                {isConnecting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Video className="w-5 h-5 mr-2" />
                                        Create New Room
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // In-call view
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Video Call</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Room: {roomId}
                    </p>
                </div>
                <button
                    onClick={copyRoomLink}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Local video */}
                <VideoParticipant
                    stream={localStreamRef.current}
                    name={user?.profile.firstName || 'You'}
                    isLocal
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                />

                {/* Remote participants */}
                {Array.from(participants.entries()).map(([id, { stream, name }]) => (
                    <VideoParticipant
                        key={id}
                        stream={stream}
                        name={name}
                    />
                ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4 py-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full transition-colors ${isMuted
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-colors ${isVideoOff
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>

                <button
                    onClick={leaveRoom}
                    className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                    <PhoneOff className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default VideoChat;
