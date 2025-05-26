import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSocketContext } from './SocketContext';
import { toast } from 'sonner';

// Định nghĩa các kiểu dữ liệu
export interface CallState {
    isIncomingCall: boolean;
    isOutgoingCall: boolean;
    isCallInProgress: boolean;
    callType: 'audio' | 'video' | null;
    callId: string | null;
    roomUrl: string | null;
    caller: {
        id: string;
        fullname: string;
        urlavatar: string;
    } | null;
    receiver: {
        id: string;
        fullname: string;
        urlavatar: string;
    } | null;
    callStatus: 'ringing' | 'active' | 'ended' | 'rejected' | 'missed' | null;
}

// Trạng thái ban đầu
const initialCallState: CallState = {
    isIncomingCall: false,
    isOutgoingCall: false,
    isCallInProgress: false,
    callType: null,
    callId: null,
    roomUrl: null,
    caller: null,
    receiver: null,
    callStatus: null
};

// Định nghĩa các action types
type CallAction =
    | { type: 'INCOMING_CALL', payload: any }
    | { type: 'OUTGOING_CALL', payload: any }
    | { type: 'CALL_ACCEPTED', payload: any }
    | { type: 'CALL_REJECTED', payload: any }
    | { type: 'CALL_ENDED', payload?: any }
    | { type: 'CALL_TIMEOUT', payload?: any }
    | { type: 'RESET_CALL' };

// Reducer để xử lý các action
const callReducer = (state: CallState, action: CallAction): CallState => {
    switch (action.type) {
        case 'INCOMING_CALL':
            return {
                ...state,
                isIncomingCall: true,
                callType: action.payload.callType,
                callId: action.payload.callId,
                roomUrl: action.payload.roomUrl,
                caller: action.payload.caller,
                receiver: action.payload.receiver,
                callStatus: 'ringing'
            };
        case 'OUTGOING_CALL':
            return {
                ...state,
                isOutgoingCall: true,
                callType: action.payload.call.callType,
                callId: action.payload.call.idCall,
                roomUrl: action.payload.roomUrl,
                caller: action.payload.caller,
                receiver: action.payload.receiver,
                callStatus: 'ringing'
            };
        case 'CALL_ACCEPTED':
            return {
                ...state,
                isIncomingCall: false,
                isOutgoingCall: false,
                isCallInProgress: true,
                callStatus: 'active'
            };
        case 'CALL_REJECTED':
            return {
                ...state,
                isIncomingCall: false,
                isOutgoingCall: false,
                isCallInProgress: false,
                callStatus: 'rejected'
            };
        case 'CALL_ENDED':
            return {
                ...state,
                isIncomingCall: false,
                isOutgoingCall: false,
                isCallInProgress: false,
                callStatus: 'ended'
            };
        case 'CALL_TIMEOUT':
            return {
                ...state,
                isIncomingCall: false,
                isOutgoingCall: false,
                isCallInProgress: false,
                callStatus: 'missed'
            };
        case 'RESET_CALL':
            return initialCallState;
        default:
            return state;
    }
};

export const useCall = (userId: string) => {
    const { socket } = useSocketContext();
    const [state, dispatch] = useReducer(callReducer, initialCallState);
    const [callTimeout, setCallTimeout] = useState<NodeJS.Timeout | null>(null);
    const ringtoneRef = useRef<HTMLAudioElement | null>(null);
    // Khởi tạo đối tượng Audio cho chuông
    useEffect(() => {
        ringtoneRef.current = new Audio('/sounds/ringtone.wav');
        ringtoneRef.current.loop = true;

        return () => {
            if (ringtoneRef.current) {
                ringtoneRef.current.pause();
                ringtoneRef.current = null;
            }
        };
    }, []);
    // Xử lý cuộc gọi đến
    const handleIncomingCall = useCallback((data: any) => {
        console.log('Incoming call:', data);
        dispatch({ type: 'INCOMING_CALL', payload: data });
        // Phát âm thanh chuông
        if (ringtoneRef.current) {
            ringtoneRef.current.play().catch(err => {
                console.error('Không thể phát âm thanh chuông:', err);
            });
        }

        // Tự động từ chối cuộc gọi sau 30 giây nếu không phản hồi
        const timeout = setTimeout(() => {
            if (state.isIncomingCall && state.callId) {
                rejectCall(state.callId);
                dispatch({ type: 'CALL_TIMEOUT' });
                toast.info('Người nhận không trả lời');

                // Dừng âm thanh chuông
                if (ringtoneRef.current) {
                    ringtoneRef.current.pause();
                    ringtoneRef.current.currentTime = 0;
                }
            }
        }, 30000);

        setCallTimeout(timeout);
    }, [state.isIncomingCall, state.callId]);

    // Xử lý khi cuộc gọi đi được khởi tạo
    const handleCallInitiated = useCallback((data: any) => {
        console.log('Call initiated:', data);
        if (data.success) {
            dispatch({ type: 'OUTGOING_CALL', payload: data });
        } else {
            toast.error(data.message || 'Không thể thực hiện cuộc gọi');
        }
    }, []);

    // Xử lý khi cuộc gọi được chấp nhận (cho người gọi )
    const handleCallAccepted = useCallback((data: any) => {
        console.log('Call accepted:', data);
        dispatch({ type: 'CALL_ACCEPTED', payload: data });

        // Mở cửa sổ Daily.co
        if (data.roomUrl) {
            window.open(data.roomUrl, '_blank', 'width=800,height=600');
        }
    }, []);

    // Xử lý khi cuộc gọi bị từ chối
    const handleCallRejected = useCallback((data: any) => {
        console.log('Call rejected:', data);
        dispatch({ type: 'CALL_REJECTED', payload: data });
        toast.info('Cuộc gọi đã bị từ chối');
    }, []);

    // Xử lý khi cuộc gọi kết thúc
    const handleCallEnded = useCallback((data: any) => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        console.log('Call ended:', data);
        dispatch({ type: 'CALL_ENDED', payload: data });
        toast.info('Cuộc gọi đã kết thúc');
    }, []);
    // handler cho sự kiện call_auto_ended
    const handleCallAutoEnded = useCallback((data: any) => {
        console.log('Call auto ended:', data);
        dispatch({ type: 'CALL_ENDED', payload: data });
        toast.info(data.message || 'Cuộc gọi đã tự động kết thúc do chỉ còn một người trong phòng');
    }, []);
    // Xử lý lỗi cuộc gọi
    const handleCallError = useCallback((data: any) => {
        toast.error(data.message || 'Đã xảy ra lỗi trong cuộc gọi');
        dispatch({ type: 'RESET_CALL' });
    }, []);

    // Khởi tạo cuộc gọi
    const startCall = useCallback((receiverId: string, callType: 'audio' | 'video' = 'video') => {
        if (!socket)
            toast.error('Không có socket');
        if (!userId)
            toast.error('Không có userId');
        if (!socket || !userId) {
            toast.error('Không thể thực hiện cuộc gọi. Vui lòng thử lại sau.');
            return;
        }

        socket.emit('initiate_call', {
            IDCaller: userId,
            IDReceiver: receiverId,
            callType
        });
    }, [socket, userId]);

    // Chấp nhận cuộc gọi
    const acceptCall = useCallback((callId: string) => {
        if (!socket || !userId || !callId) {
            toast.error('Không thể chấp nhận cuộc gọi. Vui lòng thử lại sau.');
            return;
        }

        // Xóa timeout nếu có
        if (callTimeout) {
            clearTimeout(callTimeout);
            setCallTimeout(null);
        }
        // Dừng âm thanh chuông
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }

        socket.emit('accept_call', {
            callId,
            userId
        });
    }, [socket, userId, callTimeout]);

    // Từ chối cuộc gọi
    const rejectCall = useCallback((callId: string) => {
        if (!socket || !userId || !callId) {
            return;
        }

        // Xóa timeout nếu có
        if (callTimeout) {
            clearTimeout(callTimeout);
            setCallTimeout(null);
        }
        // Dừng âm thanh chuông
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        socket.emit('reject_call', {
            callId,
            userId
        });

        dispatch({ type: 'CALL_REJECTED' });
    }, [socket, userId, callTimeout]);

    // Kết thúc cuộc gọi
    const endCall = useCallback((callId: string, reason: string = 'normal') => {
        if (!socket || !userId || !callId) {
            return;
        }
        // Dừng âm thanh chuông nếu đang phát
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        console.log('End call in handle:', callId, reason);
        socket.emit('end_call', {
            callId,
            userId,
            reason
        });

        dispatch({ type: 'CALL_ENDED' });
    }, [socket, userId]);
    // Xử lý khi người nhận chấp nhận cuộc gọi (cho người nhận)
    const handleCallAcceptedConfirmed = useCallback((data: any) => {
        console.log('Call accepted confirmed (receiver):', data);
        dispatch({ type: 'CALL_ACCEPTED', payload: data });
        // Dừng âm thanh chuông nếu đang phát
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        // Mở cửa sổ Daily.co cho người nhận
        if (data.roomUrl) {
            // Sử dụng roomUrl từ data thay vì state
            window.open(data.roomUrl, '_blank', 'width=800,height=600');
        } else {
            toast.error('Không tìm thấy URL phòng gọi');
        }
    }, []);
    // Đăng ký các event listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('incoming_call', handleIncomingCall);
        socket.on('call_initiated', handleCallInitiated);
        socket.on('call_accepted_confirmed', handleCallAcceptedConfirmed); // Thêm sự kiện cho người nhận
        socket.on('call_accepted', handleCallAccepted);
        socket.on('call_rejected', handleCallRejected);
        socket.on('call_ended', handleCallEnded);
        socket.on('call_auto_ended', handleCallAutoEnded);
        socket.on('call_error', handleCallError);

        return () => {
            socket.off('incoming_call', handleIncomingCall);
            socket.off('call_initiated', handleCallInitiated);
            socket.off('call_accepted', handleCallAccepted);
            socket.off('call_rejected', handleCallRejected);
            socket.off('call_ended', handleCallEnded);
            socket.off('call_auto_ended', handleCallAutoEnded);
            socket.off('call_error', handleCallError);

            // Xóa timeout khi unmount
            if (callTimeout) {
                clearTimeout(callTimeout);
            }
        };
    }, [
        socket,
        handleIncomingCall,
        handleCallInitiated,
        handleCallAccepted,
        handleCallRejected,
        handleCallEnded,
        handleCallError,
        callTimeout
    ]);

    // Cleanup khi component unmount
    useEffect(() => {
        return () => {
            console.log('Cleaning up call state');
            if (state.callId && (state.isOutgoingCall || state.isCallInProgress)) {
                endCall(state.callId);
            }
        };
    }, []);
    return {
        ...state,
        startCall,
        acceptCall,
        rejectCall,
        endCall
    };
};