"use client";

import { useCallback, useEffect, useState, useMemo, useReducer, useRef } from "react";
import { useSocketContext } from "./SocketContext";
import throttle from 'lodash/throttle';

export interface Message {
  idMessage: string;
  idSender: string;
  idReceiver?: string;
  idConversation: string;
  type: "text" | "file" | "image" | "video" | "document";
  content: string;
  dateTime: string;
  isRead: boolean;
  isRemove?: boolean;
  isRecall?: boolean;
  isFoward?: boolean; // Trường mới cho tin nhắn chuyển tiếp
  isReply?: boolean; // Trường mới cho tin nhắn reply
  idMessageReply?: string; // ID của tin nhắn gốc khi chuyển tiếp
  isOwn?: boolean; // Đánh dấu tin nhắn của người dùng hiện tại
  senderInfo?: {
    id?: string;
    fullname?: string;
    avatar?: string;
    phone?: string;
    status?: string;
  };
  receiverInfo?: {
    id?: string;
    fullname?: string;
    avatar?: string;
    phone?: string;
    status?: string;
  };
  reactions?: {
    [key: string]: {
      reaction: string;
      totalCount: number;
      userReactions: Array<{
        user: {
          userId: string;
          fullname: string;
          urlavatar?: string;
        };
        count: number;
      }>;
    };
  };
}

export interface Conversation {
  idConversation: string;
  idSender: string;
  idReceiver: string;
  listImage: string[];
  listFile: string[];
  listVideo: string[];
  latestMessage: {
    content: string;
    dateTime: string;
    isRead: boolean;
    idReceiver?: string;
    idSender?: string;
    type: "text" | "file" | "image" | "video" | "document";
    isRemove?: boolean;
    isRecall?: boolean;
    isReply?: boolean;
  };
  isGroup: boolean;
  groupName: string,
  groupAvatar: string,
  owner: {
    id: string;
    fullname: string;
    urlavatar?: string;
    phone?: string;
    email?: string;
    bio?: string;
    birthday?: string;
    coverPhoto?: string;
  }
  coOwners: Array<{
    id: string;
    fullname: string;
    urlavatar?: string;
  }>
  groupMembers?: string[];
  regularMembers: Array<{
    id: string;
    fullname: string;
    urlavatar?: string;
    phone?: string;
    bio?: string,
    birthday?: string,
    coverPhoto?: string;
    email?: string;
    status?: string;
  }>
  lastChange: string;
  unreadCount?: number;
  otherUser?: {
    fullname?: string;
    id?: string;
    urlavatar?: string;
    phone?: string;
    status?: string;
    isOnline?: boolean;
  };
  rules: {
    IDOwner: string;
    listIDCoOwner: string[];
  };
}
// interface cho trạng thái cuộc gọi
export interface CallState {
  isIncomingCall: boolean; // đánh dấu khi có cuộc gọi đến
  isOutgoingCall: boolean; //đánh dấu khi đang thực hiện cuộc gọi đi
  isCallInProgress: boolean; //đánh dấu khi cuộc gọi đang diễn ra
  callType: 'audio' | 'video';// loại cuộc gọi
  remoteUserId: string | null;// ID của người dùng được gọi
  remoteSocketId: string | null;//id socket của người dùng được gọi
  localStream: MediaStream | null; // luồng media của người dùng hiện tại
  remoteStream: MediaStream | null; // luồng media của người dùng được gọi
  callLogId: string | null; // ID của cuộc gọi trong cơ sở dữ liệu
}
type ChatState = {
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  olderMessages: Record<string, Message[]>; // lưu tin nhắn cũ
  loading: boolean;
  error: string | null;
  unreadMessages: Message[];
  isUserConnected: boolean;
  loadingMoreMessages: boolean;
  hasMoreMessages: { [conversationId: string]: boolean };
  call: CallState;
};

type ChatAction =
  | { type: 'SET_CONVERSATIONS', payload: Conversation[] }
  | { type: 'SET_MESSAGES', payload: { conversationId: string, messages: Message[] } }
  | { type: 'UPDATE_MESSAGE', payload: { conversationId: string, messageId: string, updates: Partial<Message> } }
  | { type: 'ADD_MESSAGE', payload: { conversationId: string, message: Message } }
  | { type: 'SET_LOADING', payload: boolean }
  | { type: 'SET_ERROR', payload: string | null }
  | { type: 'SET_UNREAD_MESSAGES', payload: Message[] }
  | { type: 'SET_USER_CONNECTED', payload: boolean }
  | { type: 'UPDATE_USER_STATUS', payload: { userId: string, isOnline: boolean } }
  | { type: 'MARK_MESSAGES_READ', payload: { conversationId: string, messageIds: string[] } }
  | { type: 'UPDATE_CONVERSATION', payload: { conversationId: string, updates: Partial<Conversation> } }
  | { type: 'FORWARD_MESSAGE_SUCCESS', payload: { results: Array<{ conversationId: string, message: Message }> } }
  | { type: 'UPDATE_CONVERSATION_LATEST_MESSAGE', payload: { conversationId: string, latestMessage: Message } }
  | { type: 'ADD_GROUP_CONVERSATION', payload: Conversation }
  | { type: 'UPDATE_GROUP_MEMBERS', payload: { conversationId: string, members: Array<any> } }
  | { type: 'REMOVE_CONVERSATION', payload: { conversationId: string } }
  | { type: 'LOAD_MORE_MESSAGES_REQUEST' }
  | { type: 'LOAD_MORE_MESSAGES', payload: { conversationId: string, messages: Message[], hasMore: boolean } }
  | { type: 'LOAD_MORE_MESSAGES_ERROR', payload: string }
  | { type: 'UPDATE_MESSAGE_REACTIONS', payload: { conversationId: string, messageId: string, reactions: any } }
  | { type: 'LOAD_MORE_MESSAGES_ERROR', payload: string }
  | { type: 'CALL_INCOMING', payload: { remoteUserId: string, remoteSocketId: string, callType: 'audio' | 'video', callLogId?: string | null } } // xử lý khi có cuộc gọi đến
  | { type: 'CALL_OUTGOING', payload: { remoteUserId: string, remoteSocketId: string, callType: 'audio' | 'video', callLogId?: string | null } } // xử lý khi đang thực hiện cuộc gọi đi
  | { type: 'CALL_ACCEPTED', payload: { callLogId: string } } // xử lý khi cuộc gọi được chấp nhận
  | { type: 'CALL_REJECTED' } // xử lý khi cuộc gọi bị từ chối
  | { type: 'CALL_ENDED' } // xử lý khi cuộc gọi kết thúc
  | { type: 'SET_LOCAL_STREAM', payload: MediaStream } // thiết lập luồng media của người dùng hiện tại
  | { type: 'SET_REMOTE_STREAM', payload: MediaStream } // thiết lập luồng media của người dùng được gọi
  | { type: 'RESET_CALL_STATE' }; // đặt trạng thái cuộc gọi về ban đầu
;

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return { ...state, conversations: action.payload };

    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.conversationId]: action.payload.messages
        }
      };

    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      const messageExists = existingMessages.some(msg => msg.idMessage === message.idMessage);
      if (messageExists) {
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, message],
        },
      };
    }
    case 'ADD_MESSAGE': {
      const { conversationId, message } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      const messageExists = existingMessages.some(msg => msg.idMessage === message.idMessage);
      if (messageExists) {
        return state;
      }

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: [...existingMessages, message],
        },
      };
    }

    case 'UPDATE_MESSAGE': {
      const { conversationId, messageId, updates } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: existingMessages.map(msg =>
            msg.idMessage === messageId ? { ...msg, ...updates } : msg
          )
        }
      };
    }
    case 'FORWARD_MESSAGE_SUCCESS': {
      const { results } = action.payload;
      const newMessages = { ...state.messages };

      results.forEach(({ conversationId, message }) => {
        if (!newMessages[conversationId]) {
          newMessages[conversationId] = [];
        }
        newMessages[conversationId] = [...newMessages[conversationId], message];
      });

      return {
        ...state,
        messages: newMessages
      };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_UNREAD_MESSAGES':
      return { ...state, unreadMessages: action.payload };

    case 'SET_USER_CONNECTED':
      return { ...state, isUserConnected: action.payload };

    case 'UPDATE_USER_STATUS': {
      const { userId, isOnline } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv => {
          if (conv.otherUser?.id === userId) {
            return {
              ...conv,
              otherUser: {
                ...conv.otherUser,
                isOnline
              }
            };
          }
          return conv;
        })
      };
    }

    case 'MARK_MESSAGES_READ': {
      const { conversationId, messageIds } = action.payload;
      const existingMessages = state.messages[conversationId] || [];

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: existingMessages.map(msg =>
            messageIds.includes(msg.idMessage) ? { ...msg, isRead: true } : msg
          )
        },
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      };
    }

    case 'UPDATE_CONVERSATION': {
      const { conversationId, updates } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId ? { ...conv, ...updates } : conv
        )
      };
    }
    case 'UPDATE_CONVERSATION_LATEST_MESSAGE': {
      const { conversationId, latestMessage } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId
            ? { ...conv, latestMessage }
            : conv
        )
      };
    }
    case 'ADD_GROUP_CONVERSATION': {
      // Check if conversation already exists
      const existingConversation = state.conversations.find(
        conv => conv.idConversation === action.payload.idConversation
      );

      if (existingConversation) {
        // Update existing conversation
        return {
          ...state,
          conversations: state.conversations.map(conv =>
            conv.idConversation === action.payload.idConversation
              ? { ...conv, ...action.payload }
              : conv
          )
        };
      } else {
        // Add new conversation
        return {
          ...state,
          conversations: [...state.conversations, action.payload]
        };
      }
    }
    case 'UPDATE_GROUP_MEMBERS': {
      const { conversationId, members } = action.payload;

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.idConversation === conversationId
            ? {
              ...conv,
              regularMembers: members,
              groupMembers: members.map(member => member.id)
            }
            : conv
        )
      };
    }
    case 'REMOVE_CONVERSATION': {
      return {
        ...state,
        conversations: state.conversations.filter(
          conversation => conversation.idConversation !== action.payload.conversationId
        )
      };
    }
    case 'LOAD_MORE_MESSAGES_REQUEST': {
      return {
        ...state,
        loadingMoreMessages: true,
      };
    }
    case 'LOAD_MORE_MESSAGES': {
      const { conversationId, messages, hasMore } = action.payload;
      const existingOlderMessages = state.olderMessages[conversationId] || [];

      const existingMessageIds = new Set([
        ...(state.messages[conversationId] || []).map(msg => msg.idMessage),
        ...existingOlderMessages.map(msg => msg.idMessage),
      ]);
      const newMessages = messages.filter(msg => !existingMessageIds.has(msg.idMessage));

      const updatedOlderMessages = [...newMessages, ...existingOlderMessages].sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();
        return timeA - timeB;
      });

      return {
        ...state,
        olderMessages: {
          ...state.olderMessages,
          [conversationId]: updatedOlderMessages,
        },
        loadingMoreMessages: false,
        hasMoreMessages: {
          ...state.hasMoreMessages,
          [conversationId]: hasMore,
        },
      };
    }
    case 'LOAD_MORE_MESSAGES_ERROR': {
      return {
        ...state,
        loadingMoreMessages: false,
        error: action.payload,
      };
    }
    case 'UPDATE_MESSAGE_REACTIONS': {
      const { conversationId, messageId, reactions } = action.payload;
      const existingMessages = state.messages[conversationId] || [];
      const olderMessages = state.olderMessages[conversationId] || [];

      // Cập nhật trong messages hiện tại
      const updatedMessages = existingMessages.map(msg =>
        msg.idMessage === messageId ? { ...msg, reactions } : msg
      );

      // Cập nhật trong olderMessages
      const updatedOlderMessages = olderMessages.map(msg =>
        msg.idMessage === messageId ? { ...msg, reactions } : msg
      );

      return {
        ...state,
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages
        },
        olderMessages: {
          ...state.olderMessages,
          [conversationId]: updatedOlderMessages
        }
      };
    }
    case 'CALL_INCOMING': {
      return {
        ...state,
        call: {
          ...state.call,
          isIncomingCall: true,
          isOutgoingCall: false,
          isCallInProgress: false,
          callType: action.payload.callType,
          remoteUserId: action.payload.remoteUserId,
          remoteSocketId: action.payload.remoteSocketId,
          callLogId: action.payload.callLogId || null
        }
      };
    }

    case 'CALL_OUTGOING': {
      return {
        ...state,
        call: {
          ...state.call,
          isIncomingCall: false,
          isOutgoingCall: true,
          isCallInProgress: false,
          callType: action.payload.callType,
          remoteUserId: action.payload.remoteUserId,
          remoteSocketId: action.payload.remoteSocketId
        }
      };
    }

    case 'CALL_ACCEPTED': {
      return {
        ...state,
        call: {
          ...state.call,
          isIncomingCall: false,
          isOutgoingCall: false,
          isCallInProgress: true,
          callLogId: action.payload.callLogId
        }
      };
    }

    case 'CALL_REJECTED': {
      return {
        ...state,
        call: {
          ...initialCallState
        }
      };
    }

    case 'CALL_ENDED': {
      return {
        ...state,
        call: {
          ...initialCallState
        }
      };
    }

    case 'SET_LOCAL_STREAM': {
      return {
        ...state,
        call: {
          ...state.call,
          localStream: action.payload
        }
      };
    }

    case 'SET_REMOTE_STREAM': {
      return {
        ...state,
        call: {
          ...state.call,
          remoteStream: action.payload
        }
      };
    }

    case 'RESET_CALL_STATE': {
      // Đóng các stream nếu có
      if (state.call.localStream) {
        state.call.localStream.getTracks().forEach(track => track.stop());
      }

      return {
        ...state,
        call: {
          ...initialCallState
        }
      };
    }
    default:
      return state;
  }
};
const initialCallState: CallState = {
  isIncomingCall: false,
  isOutgoingCall: false,
  isCallInProgress: false,
  callType: 'audio',
  remoteUserId: null,
  remoteSocketId: null,
  localStream: null,
  remoteStream: null,
  callLogId: null
};
export const useChat = (userId: string) => {

  const { socket, isConnected } = useSocketContext();
  const [state, dispatch] = useReducer(chatReducer, {
    conversations: [],
    messages: {},
    olderMessages: {},
    loading: false,
    error: null,
    unreadMessages: [],
    isUserConnected: false,
    loadingMoreMessages: false,
    hasMoreMessages: {},
    call: initialCallState
  });

  const { conversations, messages, loading, error, unreadMessages, isUserConnected } = state;

  // Kiểm tra userId hợp lệ
  const isValidUserId = userId && userId.trim().length > 0;

  // Log userId để debug 
  useEffect(() => {
    console.log("useChat hook initialized with userId:", userId);
    console.log("isValidUserId:", isValidUserId);
    console.log("socket:", !!socket);
    console.log("isConnected:", isConnected);
  }, [userId, isValidUserId, socket, isConnected]);

  // Biến lưu trữ kết nối WebRTC
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  // Khởi tạo kết nối WebRTC
  const initializePeerConnection = useCallback(() => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
          urls: 'turn:relay1.expressturn.com:3480',
          username: '174783613924561113',
          credential: 'AHAByUn/KA+N63fjtQq7p/rhZrk='
        }
      ],
      iceCandidatePoolSize: 10
    };
  
    const pc = new RTCPeerConnection(configuration);
    console.log("Kết nối WebRTC đã được khởi tạo.");
  
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && state.call.remoteSocketId) {
        socket.emit('webRTC-signaling', {
          connectedUserSocketId: state.call.remoteSocketId,
          signaling: {
            type: 'ICE_CANDIDATE',
            candidate: event.candidate
          }
        });
      }
    };
  
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        dispatch({ type: 'CALL_ENDED' });
        socket?.emit('end-call', {
          connectedUserSocketId: state.call.remoteSocketId,
          callLogId: state.call.callLogId
        });
      }
    };
  
    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", pc.iceGatheringState);
    };
  
    pc.ontrack = (event) => {
      if (event.streams.length > 0) {
        dispatch({ type: 'SET_REMOTE_STREAM', payload: event.streams[0] });
      }
    };
  
    // Đóng kết nối cũ nếu tồn tại
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    peerConnection.current = pc;
    return pc;
  }, [socket, state.call.remoteSocketId]);

  // Hàm bắt đầu cuộc gọi
  const startCall = useCallback(async (receiverId: string, callType: 'audio' | 'video' = 'audio') => {
  if (!socket || !isConnected || !userId) {
    console.error("Không thể bắt đầu cuộc gọi: Socket chưa kết nối hoặc chưa đăng nhập");
    return;
  }

  try {
    // Kiểm tra quyền
    const micPermission = await navigator.permissions.query({ name: 'microphone' });
    const camPermission = callType === 'video' ? await navigator.permissions.query({ name: 'camera' }) : { state: 'granted' };
    if (micPermission.state === 'denied') {
      throw new Error('Quyền truy cập microphone bị từ chối.');
    }
    if (callType === 'video' && camPermission.state === 'denied') {
      throw new Error('Quyền truy cập camera bị từ chối.');
    }

    const constraints = { audio: true, video: callType === 'video' };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });

    socket.emit('pre-offer-single', {
      IDCaller: userId,
      IDCallee: receiverId,
      callType
    });

    dispatch({
      type: 'CALL_OUTGOING',
      payload: {
        remoteUserId: receiverId,
        remoteSocketId: '',
        callType
      }
    });

    // Thêm timeout cho cuộc gọi
    const timeout = setTimeout(() => {
      if (!state.call.isCallInProgress) {
        socket.emit('end-call', {
          connectedUserSocketId: state.call.remoteSocketId,
          callLogId: state.call.callLogId
        });
        dispatch({ type: 'CALL_ENDED' });
      }
    }, 30000); // Hủy sau 30 giây nếu không được trả lời

    return () => clearTimeout(timeout);
  } catch (error) {
    console.error("Lỗi khi bắt đầu cuộc gọi:", error);
    import('sonner').then(({ toast }) => {
      toast.error(error.message, { duration: 5000 });
    });
    dispatch({ type: 'RESET_CALL_STATE' });
  }
}, [socket, isConnected, userId, state.call]);

  // Hàm trả lời cuộc gọi
  const answerCall = useCallback(async (accept: boolean) => {
    if (!socket || !state.call.isIncomingCall || !state.call.remoteUserId || !state.call.remoteSocketId) {
      console.error("Không thể trả lời cuộc gọi: Không có cuộc gọi đến hoặc thiếu thông tin");
      return;
    }
  
    if (!accept) {
      socket.emit('pre-offer-single-answer', {
        IDCaller: state.call.remoteUserId,
        socketIDCaller: state.call.remoteSocketId,
        IDCallee: userId,
        socketIDCallee: socket.id,
        preOfferAnswer: 'CALL_REJECTED',
        callLogId: state.call.callLogId
      });
      dispatch({ type: 'CALL_REJECTED' });
      return;
    }
  
    try {
      const micPermission = await navigator.permissions.query({ name: 'microphone' });
      const camPermission = state.call.callType === 'video' ? await navigator.permissions.query({ name: 'camera' }) : { state: 'granted' };
      if (micPermission.state === 'denied') {
        throw new Error('Quyền truy cập microphone bị từ chối.');
      }
      if (state.call.callType === 'video' && camPermission.state === 'denied') {
        throw new Error('Quyền truy cập camera bị từ chối.');
      }
  
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: state.call.callType === 'video'
      });
      dispatch({ type: 'SET_LOCAL_STREAM', payload: stream });
  
      const pc = initializePeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
  
      socket.emit('pre-offer-single-answer', {
        IDCaller: state.call.remoteUserId,
        socketIDCaller: state.call.remoteSocketId,
        IDCallee: userId,
        socketIDCallee: socket.id,
        preOfferAnswer: 'CALL_ACCEPTED',
        callLogId: state.call.callLogId
      });
  
      dispatch({
        type: 'CALL_ACCEPTED',
        payload: { callLogId: state.call.callLogId || '' }
      });
    } catch (error) {
      console.error("Lỗi khi trả lời cuộc gọi:", error);
      import('sonner').then(({ toast }) => {
        toast.error(error.message, { duration: 5000 });
      });
      socket.emit('pre-offer-single-answer', {
        IDCaller: state.call.remoteUserId,
        socketIDCaller: state.call.remoteSocketId,
        IDCallee: userId,
        socketIDCallee: socket.id,
        preOfferAnswer: 'CALL_UNAVAILABLE',
        callLogId: state.call.callLogId
      });
      dispatch({ type: 'RESET_CALL_STATE' });
    }
  }, [socket, state.call, userId]);

  // Hàm kết thúc cuộc gọi
  const endCall = useCallback(() => {
    if (!socket || !state.call.remoteSocketId) {
      console.error("Không thể kết thúc cuộc gọi: Socket chưa kết nối hoặc không có cuộc gọi");
      return;
    }

    socket.emit('end-call', {
      connectedUserSocketId: state.call.remoteSocketId,
      callLogId: state.call.callLogId
    });

    // Đóng kết nối WebRTC
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    dispatch({ type: 'CALL_ENDED' });
  }, [socket, state.call]);
  // Xử lý các sự kiện WebRTC
  useEffect(() => {
    if (!socket) return;

    // Xử lý yêu cầu cuộc gọi đến
    const handlePreOfferSingle = (data: any) => {
      console.log("Nhận yêu cầu cuộc gọi:", data);
      const { IDCaller, socketIDCaller, callType, callLogId } = data;

      // Cập nhật trạng thái cuộc gọi đến
      dispatch({
        type: 'CALL_INCOMING',
        payload: {
          remoteUserId: IDCaller,
          remoteSocketId: socketIDCaller,
          callType,
          callLogId
        }
      });

      // Phát âm thanh thông báo cuộc gọi đến nếu cần
      const ringtone = new Audio('/sounds/ringtone.wav');
      ringtone.loop = true;
      // ringtone.play().catch(err => console.error("Không thể phát âm thanh:", err));

      // Lưu ringtone để có thể dừng khi cần
      (window as any).currentRingtone = ringtone;
      if (navigator.vibrate) {
        navigator.vibrate([300, 100, 300]);
      }
    };

    // Xử lý phản hồi cuộc gọi
    const handlePreOfferSingleAnswer = (data: any) => {
      console.log("Nhận phản hồi cuộc gọi:", data);
      const { preOfferAnswer, callLogId } = data;

      if (preOfferAnswer === 'CALL_ACCEPTED') {
        dispatch({
          type: 'CALL_ACCEPTED',
          payload: { callLogId: callLogId || '' }
        });

        // Khởi tạo kết nối WebRTC
        const pc = initializePeerConnection();

        // Thêm local stream vào kết nối
        if (state.call.localStream) {
          state.call.localStream.getTracks().forEach(track => {
            pc.addTrack(track, state.call.localStream!);
          });
        }

        // Tạo và gửi offer
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('webRTC-signaling', {
              connectedUserSocketId: data.socketIDCallee,
              signaling: {
                type: 'OFFER',
                offer: pc.localDescription
              }
            });
          })
          .catch(error => {
            console.error("Lỗi khi tạo offer:", error);
            endCall();
          });
      }
      else if (preOfferAnswer === 'CALLEE_NOT_FOUND' ||
        preOfferAnswer === 'CALL_REJECTED' ||
        preOfferAnswer === 'CALL_UNAVAILABLE' ||
        preOfferAnswer === 'CALLER_NOT_FOUND') {
        // Hiển thị thông báo tương ứng
        let message = "Cuộc gọi không thành công";

        if (preOfferAnswer === 'CALLEE_NOT_FOUND') {
          message = "Người dùng không trực tuyến";
        } else if (preOfferAnswer === 'CALL_REJECTED') {
          message = "Cuộc gọi bị từ chối";
        } else if (preOfferAnswer === 'CALL_UNAVAILABLE') {
          message = "Người dùng không thể trả lời lúc này";
        } else if (preOfferAnswer === 'CALLER_NOT_FOUND') {
          message = "Người gọi không còn trực tuyến";
        }

        console.log(message);

        // Hiển thị thông báo cho người dùng
        if (typeof window !== 'undefined') {
          import('sonner').then(({ toast }) => {
            toast.error(message, { duration: 3000 });
          });
        }

        dispatch({ type: 'CALL_REJECTED' });
      }
    };

    // Xử lý tín hiệu WebRTC
    const handleWebRTCSignaling = (data: any) => {
      console.log("Nhận tín hiệu WebRTC:", data);
      const { signaling } = data;

      if (!peerConnection.current) {
        initializePeerConnection();
      }

      const pc = peerConnection.current;
      if (!pc) return;

      switch (signaling.type) {
        case 'OFFER':
          // Xử lý offer
          pc.setRemoteDescription(new RTCSessionDescription(signaling.offer))
            .then(() => {
              // Thêm local stream vào kết nối
              if (state.call.localStream) {
                state.call.localStream.getTracks().forEach(track => {
                  pc.addTrack(track, state.call.localStream!);
                });
              }

              return pc.createAnswer();
            })
            .then(answer => pc.setLocalDescription(answer))
            .then(() => {
              socket.emit('webRTC-signaling', {
                connectedUserSocketId: data.from,
                signaling: {
                  type: 'ANSWER',
                  answer: pc.localDescription
                }
              });
            })
            .catch(error => {
              console.error("Lỗi khi xử lý offer:", error);
              endCall();
            });
          break;

        case 'ANSWER':
          // Xử lý answer
          pc.setRemoteDescription(new RTCSessionDescription(signaling.answer))
            .catch(error => {
              console.error("Lỗi khi xử lý answer:", error);
              endCall();
            });
          break;

        case 'ICE_CANDIDATE':
          // Xử lý ICE candidate
          pc.addIceCandidate(new RTCIceCandidate(signaling.candidate))
            .catch(error => {
              console.error("Lỗi khi thêm ICE candidate:", error);
            });
          break;
      }
    };

    // Xử lý kết thúc cuộc gọi
    const handleEndCall = (data: any) => {
      console.log("Nhận thông báo kết thúc cuộc gọi:", data);

      // Đóng kết nối WebRTC
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      dispatch({ type: 'CALL_ENDED' });

      // Hiển thị thông báo
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.info("Cuộc gọi đã kết thúc", { duration: 3000 });
        });
      }
    };

    // Đăng ký các event listener
    socket.on('pre-offer-single', handlePreOfferSingle);
    socket.on('pre-offer-single-answer', handlePreOfferSingleAnswer);
    socket.on('webRTC-signaling', handleWebRTCSignaling);
    socket.on('end-call', handleEndCall);

    // Hủy đăng ký khi component unmount
    return () => {
      socket.off('pre-offer-single', handlePreOfferSingle);
      socket.off('pre-offer-single-answer', handlePreOfferSingleAnswer);
      socket.off('webRTC-signaling', handleWebRTCSignaling);
      socket.off('end-call', handleEndCall);
      // Dừng ringtone nếu có
      if ((window as any).currentRingtone) {
        (window as any).currentRingtone.pause();
        (window as any).currentRingtone = null;
      }
      // Đóng kết nối và stream nếu có
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }

      if (state.call.localStream) {
        state.call.localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, state.call, userId, endCall, initializePeerConnection]);
  //xử lý gộp tin nhắn cũ và mới
  const combinedMessages = useCallback((conversationId: string) => {
    if (!conversationId) return [];

    const older = state.olderMessages[conversationId] || [];
    const recent = state.messages[conversationId] || [];

    // Gộp và sắp xếp tin nhắn theo thời gian tăng dần
    const combined = [...older, ...recent].sort((a, b) => {
      const timeA = new Date(a.dateTime).getTime();
      const timeB = new Date(b.dateTime).getTime();
      return timeA - timeB;
    });

    // Loại bỏ tin nhắn trùng lặp (giữ lại tin nhắn đầu tiên)
    // Đồng thời đảm bảo thuộc tính isOwn được thiết lập đúng
    const uniqueMessageIds = new Set<string>();
    const uniqueMessages = combined.filter(message => {
      if (uniqueMessageIds.has(message.idMessage)) {
        return false;
      }
      uniqueMessageIds.add(message.idMessage);

      // Đảm bảo thuộc tính isOwn được thiết lập đúng
      if (message.idSender === userId) {
        message.isOwn = true;
      } else {
        message.isOwn = false;
      }

      return true;
    });
    return uniqueMessages;
  }, [state.olderMessages, state.messages, userId]);
  // Xử lý phản hồi tải cuộc trò chuyện - tối ưu dependencies
  const handleLoadConversationsResponse = useCallback((data: {
    Items: Conversation[];
    LastEvaluatedKey: number;
  }) => {
    console.log("Nhận danh sách cuộc trò chuyện:", data);
    dispatch({ type: 'SET_CONVERSATIONS', payload: data.Items });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []); // Không cần dependencies vì dispatch luôn ổn định

  // Xử lý lỗi chung - tối ưu dependencies
  const handleError = useCallback((data: { message: string; error: string }) => {
    console.error("Lỗi socket:", data);
    dispatch({ type: 'SET_ERROR', payload: `Lỗi: ${data.message}` });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []); // Không cần dependencies vì dispatch luôn ổn định

  // Tải danh sách cuộc trò chuyện - tối ưu dependencies
  const loadConversations = useCallback(() => {
    console.log("=== loadConversations được gọi ===>");

    // Nếu đang loading, không gọi lại
    if (loading) {
      console.log("Đang loading, bỏ qua yêu cầu tải cuộc trò chuyện mới");
      return;
    }

    // Kiểm tra điều kiện kết nối
    if (!socket) {
      console.log("Không thể tải cuộc trò chuyện: Socket chưa được khởi tạo");
      return;
    }

    if (!isConnected) {
      console.log("Không thể tải cuộc trò chuyện: Socket chưa kết nối");
      return;
    }

    if (!isValidUserId) {
      console.log("Không thể tải cuộc trò chuyện: userId không hợp lệ");
      dispatch({ type: 'SET_ERROR', payload: "Không thể tải cuộc trò chuyện: Thiếu thông tin người dùng" });
      return;
    }

    // Kiểm tra người dùng đã kết nối chưa
    if (!isUserConnected) {
      console.log("Người dùng chưa kết nối, tự động kết nối trước khi tải cuộc trò chuyện");
      // Tự động thiết lập kết nối người dùng
      socket.emit("new_user_connect", { id: userId });
      // Đặt isUserConnected = true để tiếp tục
      dispatch({ type: 'SET_USER_CONNECTED', payload: true });
      // Không return để tiếp tục tải cuộc trò chuyện
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    console.log("Tải danh sách cuộc trò chuyện cho người dùng:", userId);
    socket.emit("load_conversations", {
      IDUser: userId,
      lastEvaluatedKey: 0,
    });
    // Đồng thời tải cuộc trò chuyện nhóm
    console.log("Tải danh sách cuộc trò chuyện nhóm cho người dùng:", userId);
    socket.emit("load_group_conversations", {
      IDUser: userId,
      lastEvaluatedKey: 0,
    });
    // Timeout để tránh trạng thái loading vô hạn
    const timeoutId = setTimeout(() => {
      console.log("Timeout khi tải cuộc trò chuyện");
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: "Không thể tải cuộc trò chuyện: Hết thời gian chờ. Vui lòng thử lại sau." });
    }, 10000); // 10 giây timeout

    return () => {
      clearTimeout(timeoutId);
    };
  }, [socket, isConnected, userId, isValidUserId, isUserConnected]);
  // Xử lý phản hồi tải cuộc trò chuyện nhóm
  const loadMoreMessages = useCallback((conversationId: string, lastMessageId: string) => {
    if (!socket || !isConnected || state.loadingMoreMessages) return;

    dispatch({ type: 'LOAD_MORE_MESSAGES_REQUEST' });

    socket.emit('load_messages', {
      IDConversation: conversationId,
      lastMessageId,
      limit: 20
    });
  }, [socket, isConnected, state.loadingMoreMessages]);
  useEffect(() => {
    if (!socket) return;
    const handleLoadMessagesResponse = (data: any) => {
      if (data.messages && data.conversationId) {
        dispatch({
          type: 'LOAD_MORE_MESSAGES',
          payload: {
            conversationId: data.conversationId,
            messages: data.messages,
            hasMore: data.hasMore
          }
        });
      } else {
        dispatch({
          type: 'LOAD_MORE_MESSAGES_ERROR',
          payload: 'Failed to load more messages'
        });
      }
    };

    socket.on('load_messages_response', handleLoadMessagesResponse);

    return () => {
      socket.off('load_messages_response', handleLoadMessagesResponse);
    };
  }, [socket]);
  const handleLoadGroupConversationsResponse = useCallback((data: {
    Items: Conversation[];
    LastEvaluatedKey: number;
  }) => {
    console.log("Nhận danh sách cuộc trò chuyện nhóm:", data);

    // Xử lý tin nhắn mới nhất đã bị xóa
    if (data.Items && Array.isArray(data.Items)) {
      const processedItems = data.Items.map(conversation => {
        // Kiểm tra nếu tin nhắn mới nhất đã bị xóa hoặc thu hồi
        if (conversation.latestMessage) {
          if (conversation.latestMessage.isRemove) {
            // Nếu tin nhắn đã bị xóa, thay đổi nội dung hiển thị
            return {
              ...conversation,
              latestMessage: {
                ...conversation.latestMessage,
                content: "Tin nhắn đã bị xóa",
                preview: "Tin nhắn đã bị xóa"
              }
            };
          } else if (conversation.latestMessage.isRecall) {
            // Nếu tin nhắn đã bị thu hồi, thay đổi nội dung hiển thị
            return {
              ...conversation,
              latestMessage: {
                ...conversation.latestMessage,
                content: "Tin nhắn đã được thu hồi",
                preview: "Tin nhắn đã được thu hồi"
              }
            };
          }
        }
        return conversation;
      });

      // Kết hợp cuộc trò chuyện nhóm với cuộc trò chuyện hiện có
      dispatch({
        type: 'SET_CONVERSATIONS',
        payload: [...state.conversations, ...processedItems].filter((conv, index, self) =>
          // Loại bỏ các cuộc trò chuyện trùng lặp
          index === self.findIndex(c => c.idConversation === conv.idConversation)
        )
      });
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, [state.conversations]); // Phụ thuộc vào state.conversations để luôn có danh sách mới nhất // Phụ thuộc vào state.conversations để luôn có danh sách mới nhất
  const createGroupConversation = useCallback((
    groupName: string,
    groupMembers: string[],
    groupAvatar?: string
  ) => {
    if (!socket || !userId) {
      console.error("Cannot create group: Socket not connected or user not logged in");
      return;
    }

    console.log("Creating group conversation:", {
      groupName,
      groupMembers,
      groupAvatar
    });

    socket.emit("create_group_conversation", {
      IDOwner: userId,
      groupName,
      groupMembers,
      groupAvatarUrl: groupAvatar || ""
    });
  }, [socket, userId]);
  //xử lý phản hồi thêm thành viên vào nhóm
  const addMembersToGroup = useCallback((
    conversationId: string,
    newMembers: string[]
  ) => {
    if (!socket || !userId) {
      console.error("Cannot add members: Socket not connected or user not authenticated");
      return;
    }

    socket.emit("add_member_to_group", {
      IDConversation: conversationId,
      IDUser: userId,
      newGroupMembers: newMembers
    });
  }, [socket, userId]);
  //xử lý phản hồi thêm thành viên vào nhóm
  const handleAddMemberToGroupResponse = useCallback((data: any) => {
    // console.log("Add member to group response (new_group_conversation):", data);

    if (data.success && data.conversation) {
      // Get the updated conversation data
      const updatedConversation = data.conversation;

      // Find the current conversation in state to merge with existing data
      const currentConversation = state.conversations.find(
        c => c.idConversation === updatedConversation.idConversation
      );

      if (!currentConversation) {
        // This is a new conversation for this user (they were just added to it)
        // console.log("New conversation received - user was added to a new group");
        // console.log("data.owner ", data.owner)
        // console.log("data.members ", data.members)
        // Format the conversation data properly for our state
        const newConversation: Conversation = {
          ...updatedConversation,
          // Ensure all required fields are present
          listImage: updatedConversation.listImage || [],
          listFile: updatedConversation.listFile || [],
          listVideo: updatedConversation.listVideo || [],
          regularMembers: data.members || [],
          // Ensure we have the owner information
          owner: data.owner || {
            id: data.owner?.id || updatedConversation.rules?.IDOwner,
            fullname: data.owner?.fullname || "Group Owner"
          },
          // Ensure we have coOwners information
          coOwners: data.coOwners ||
            (updatedConversation.rules?.listIDCoOwner || []).map((id: string) => {
              return { id, fullname: "Co-Owner" };
            }),
          // Set default latestMessage if not provided

          latestMessage: updatedConversation.latestMessage || {
            content: data.systemMessage?.content || "You were added to this group",
            dateTime: data.systemMessage?.dateTime || new Date().toISOString(),
            isRead: false,
            type: "text"
          }
        };

        // Add the new conversation to state
        dispatch({
          type: 'ADD_GROUP_CONVERSATION',
          payload: newConversation
        });

        // If there's a system message, add it to the conversation
        if (data.systemMessage) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId: updatedConversation.idConversation,
              message: {
                ...data.systemMessage,
                isOwn: false
              }
            }
          });
        }

        return;
      }

      // Get the complete list of members from the updated conversation
      const updatedMemberIds = updatedConversation.groupMembers || [];

      // Get the complete member details by combining existing members with new members
      const existingMemberDetails = currentConversation.regularMembers || [];

      // Get new member details from the response
      // Try different properties where the backend might send the new member data
      const newMembersDetails = data.newMembers || data.members || [];

      // Create a map of existing members for quick lookup
      const memberMap = new Map();
      existingMemberDetails.forEach(member => {
        memberMap.set(member.id, member);
      });

      // Add new members to the map
      newMembersDetails.forEach((member: any) => {
        memberMap.set(member.id, member);
      });

      // Convert map back to array to get complete regularMembers list
      const updatedRegularMembers = Array.from(memberMap.values());

      console.log("Updated regular members:", updatedRegularMembers);
      console.log("Updated member IDs:", updatedMemberIds);

      // Update the conversation with all necessary fields
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: updatedConversation.idConversation,
          updates: {
            // Include all the fields that might be updated
            groupMembers: updatedMemberIds,
            regularMembers: updatedRegularMembers,
            // Preserve other important fields from the updated conversation
            rules: updatedConversation.rules || currentConversation.rules,
            lastChange: updatedConversation.lastChange || currentConversation.lastChange
          }
        }
      });

      // If there's a system message, add it to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            latestMessage: data.systemMessage
          }
        });
      }
    }
    else if (data.status === "deleted") {
      console.log("Group deleted notification:", data);
      if (data.conversationId) {
        // Remove the conversation from the list
        dispatch({
          type: 'REMOVE_CONVERSATION',
          payload: {
            conversationId: data.conversationId
          }
        });

        // Show notification
        if (typeof window !== 'undefined') {
          import('sonner').then(({ toast }) => {
            toast.info(data.message || "Nhóm đã bị xóa bởi trưởng nhóm", {
              duration: 5000
            });
          });
        }
      }
    }
  }, [dispatch, state.conversations]);

  // Handler for message_from_server event (for the user who added members)
  const handleAddMemberToGroupResponseOnOwner = useCallback((data: any) => {
    console.log("Add member to group response (message_from_server):", data);


    if (data.success && data.message === "Nhóm đã được xóa thành công!") {
      console.log("Group deleted notification:", data);
      // If the group was successfully deleted, remove it from the conversations list
      dispatch({
        type: 'REMOVE_CONVERSATION',
        payload: {
          conversationId: data.conversationId || data.IDConversation
        }
      });

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success(data.message || "Nhóm đã được xóa thành cônggg");
        });
      }
    }


    else if (data.success && data.conversation && data.message === "Thay đổi chủ nhóm thành công") {
      console.log("Owner change response:", data);
      // Get the updated conversation data
      const updatedConversation = data.conversation;

      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === updatedConversation.idConversation
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", updatedConversation.idConversation);
        return;
      }

      // Get the new owner details
      const newOwner = data.newOwner || {
        id: updatedConversation.rules.IDOwner,
        fullname: data.newOwnerName || "New Owner"
      };
      // Get the old owner details
      const oldOwnerId = currentConversation.owner?.id;
      const oldOwner = currentConversation.regularMembers.find(m => m.id === oldOwnerId) || currentConversation.owner;

      // Create updated regularMembers array that includes the old owner
      let updatedRegularMembers = [...currentConversation.regularMembers];

      // If old owner is not already in regularMembers, add them
      if (oldOwner && !updatedRegularMembers.some(m => m.id === oldOwnerId)) {
        updatedRegularMembers.push({
          id: oldOwner.id,
          fullname: oldOwner.fullname,
          urlavatar: oldOwner.urlavatar || "",
          phone: oldOwner.phone || "",
          email: oldOwner.email || ""
        });
      }
      // Update the conversation with all necessary fields
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: updatedConversation.idConversation,
          updates: {
            // Update owner and rules
            owner: newOwner,
            rules: updatedConversation.rules,
            // Update regularMembers to include the old owner
            regularMembers: updatedRegularMembers,
            // Update coOwners if available
            coOwners: updatedConversation.coOwners ||
              (updatedConversation.rules.listIDCoOwner || []).map((id: string) => {
                const member = currentConversation.regularMembers.find(m => m.id === id);
                return member ? {
                  id: member.id,
                  fullname: member.fullname,
                  urlavatar: member.urlavatar
                } : { id, fullname: "Unknown", urlavatar: "" };
              }),
            // Preserve other important fields
            lastChange: updatedConversation.lastChange || currentConversation.lastChange
          }
        }
      });

      // If there's a system message, add it to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: data.systemMessage.type || "text",
              idSender: data.systemMessage.idSender || "system"
            },
          }
        });
      }

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success("Đã chuyển quyền trưởng nhóm thành công");
        });
      }
    }
    else if (data.success && data.conversation) {
      // Get the updated conversation data
      const updatedConversation = data.conversation;

      // Find the current conversation in state to merge with existing data
      const currentConversation = state.conversations.find(
        c => c.idConversation === updatedConversation.idConversation
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", updatedConversation.idConversation);
        return;
      }

      // Get the complete list of members from the updated conversation
      const updatedMemberIds = updatedConversation.groupMembers || [];

      // Get the complete member details by combining existing members with new members
      const existingMemberDetails = currentConversation.regularMembers || [];

      // Get new member details from the response - check multiple possible properties
      const newMembersDetails = data.newMembers || data.members || [];

      console.log("New members details:", newMembersDetails);
      console.log("Existing members details:", existingMemberDetails);

      // Create a map of existing members for quick lookup
      const memberMap = new Map();
      existingMemberDetails.forEach(member => {
        if (member && member.id) {
          memberMap.set(member.id, member);
        }
      });

      // Add new members to the map
      newMembersDetails.forEach((member: any) => {
        if (member && member.id) {
          // Ensure the member object has the correct structure
          const formattedMember = {
            id: member.id,
            fullname: member.fullname || member.name || "",
            urlavatar: member.urlavatar || member.avatar || "",
            phone: member.phone || "",
            email: member.email || "",
            status: member.status || "active"
          };
          memberMap.set(member.id, formattedMember);
        }
      });

      // Convert map back to array to get complete regularMembers list
      const updatedRegularMembers = Array.from(memberMap.values());

      console.log("Updated regular members:", updatedRegularMembers);
      console.log("Updated member IDs:", updatedMemberIds);

      // Update the conversation with all necessary fields
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: updatedConversation.idConversation,
          updates: {
            // Include all the fields that might be updated
            groupMembers: updatedMemberIds,
            regularMembers: updatedRegularMembers,
            // Preserve other important fields from the updated conversation
            rules: updatedConversation.rules || currentConversation.rules,
            lastChange: updatedConversation.lastChange || currentConversation.lastChange
          }
        }
      });

      // If there's a system message, add it to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            latestMessage: {
              idMessage: `system-${Date.now()}`,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: data.systemMessage.type || "text",
              idSender: data.systemMessage.idSender || "system"
            },
          }
        });
      }

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success("Đã thêm thành viên vào nhóm");
        });
      }
    }
    else if (!data.success) {
      // Show error message
      console.error("Failed to add members:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể thêm thành viên");
        });
      }
    }
  }, [dispatch, state.conversations]);
  // after the addMembersToGroup function
  const removeMembersFromGroup = useCallback((
    conversationId: string,
    membersToRemove: string[]
  ) => {
    if (!socket || !userId) {
      console.error("Cannot remove members: Socket not connected or user not authenticated");
      return;
    }
    console.log("check remove member in useChat>> ", conversationId, membersToRemove);

    socket.emit("remove_member_from_group", {
      IDConversation: conversationId,
      IDUser: userId,
      groupMembers: membersToRemove
    });
  }, [socket, userId]);

  // Add handler for remove member response
  const handleRemoveMemberResponse = useCallback((data: any) => {
    console.log("Remove member from group response:", data);

    if (data.success && data.conversation) {
      // Get the updated conversation data
      const updatedConversation = data.conversation;

      // Find the current conversation in state to access existing member details
      const currentConversation = state.conversations.find(
        c => c.idConversation === updatedConversation.idConversation
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", updatedConversation.idConversation);
        return;
      }

      // Get the updated member IDs from the conversation
      const updatedMemberIds = updatedConversation.groupMembers || [];

      // Filter the existing regularMembers to keep only those still in the group
      const updatedRegularMembers = currentConversation.regularMembers.filter(
        member => updatedMemberIds.includes(member.id)
      );

      // Update coOwners based on the updated rules
      const updatedCoOwners = currentConversation.coOwners?.filter(
        coOwner => updatedConversation.rules?.listIDCoOwner?.includes(coOwner.id)
      ) || [];

      // Create a proper latestMessage object from the system message if available
      let latestMessageUpdate = currentConversation.latestMessage;

      // Create a system message if one wasn't provided
      if (!data.systemMessage && data.removedMembers) {
        const removedNames = data.removedMembers
          .map((user: any) => user.fullname || user.id)
          .join(", ");

        // Create a synthetic system message
        const syntheticMessage: Message = {
          idMessage: `temp-${Date.now()}`, // Generate a temporary ID using timestamp
          idSender: "system",
          idConversation: updatedConversation.idConversation,
          type: "text",
          content: `Bạn đã xóa ${removedNames} khỏi nhóm`,
          dateTime: new Date().toISOString(),
          isRead: false,
          isOwn: false
        };

        // message to the conversation
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            message: syntheticMessage
          }
        });

        // Update latest message
        latestMessageUpdate = {
          content: syntheticMessage.content,
          dateTime: syntheticMessage.dateTime,
          isRead: false,
          type: syntheticMessage.type,
          idSender: syntheticMessage.idSender
        };
      } else if (data.systemMessage) {
        // Use the provided system message
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: updatedConversation.idConversation,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        latestMessageUpdate = {
          content: data.systemMessage.content,
          dateTime: data.systemMessage.dateTime,
          isRead: false,
          type: data.systemMessage.type || "text",
          idSender: data.systemMessage.idSender,
          idReceiver: data.systemMessage.idReceiver
        };
      }

      // Update the conversation with all necessary fields
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: updatedConversation.idConversation,
          updates: {
            // Include all the fields that might be updated
            groupMembers: updatedMemberIds,
            regularMembers: updatedRegularMembers,
            rules: updatedConversation.rules,
            coOwners: updatedCoOwners,
            // Update the latest message directly in the conversation update
            latestMessage: latestMessageUpdate,
            // Preserve other important fields
            owner: currentConversation.owner,
            lastChange: updatedConversation.lastChange || currentConversation.lastChange
          }
        }
      });

      // Show success toast
      if (typeof window !== 'undefined') {
        // Using dynamic import to avoid SSR issues
        import('sonner').then(({ toast }) => {
          toast.success("Đã xóa thành viên khỏi nhóm");
        });
      }
    } else if (!data.success) {
      // Show error message
      console.error("Failed to remove member:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể xóa thành viên");
        });
      }
    }
  }, [dispatch, state.conversations]);
  const handleMemberRemovedNotification = useCallback((data: any) => {
    console.log("Member removed notification:", data);
    if (data.newOwner || data.oldOwner) {
      console.log("Member change owner notification");
      return;
    }
    if (data.success && data.conversationId) {
      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }

      // Add the system message to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: data.systemMessage
          }
        });
      }
      // Update the conversation members list
      if (data.removedMembers && Array.isArray(data.removedMembers)) {
        const removedIds = data.removedMembers.map((member: any) => member.id);

        // Filter out removed members from regularMembers
        const updatedRegularMembers = currentConversation.regularMembers.filter(
          member => !removedIds.includes(member.id)
        );

        // Filter out removed members from groupMembers
        const updatedGroupMembers = (currentConversation.groupMembers || []).filter(
          memberId => !removedIds.includes(memberId)
        );

        // Update the conversation
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId: data.conversationId,
            updates: {
              regularMembers: updatedRegularMembers,
              groupMembers: updatedGroupMembers
            }
          }
        });
      }

      // Show notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.info(data.message || "Thành viên đã bị xóa khỏi nhóm");
        });
      }
    }
  }, [dispatch, state.conversations]);

  const handleRemovedFromGroup = useCallback((data: any) => {
    console.log("Removed from group:", data);

    if (data.success && data.conversationId) {
      // Find the conversation in state
      const conversation = state.conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!conversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }

      // Show notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Bạn đã bị xóa khỏi nhóm", {
            duration: 5000
          });
        });
      }

      // Remove the conversation from the list or mark it as inactive
      // Option 1: Remove the conversation
      dispatch({
        type: 'SET_CONVERSATIONS',
        payload: state.conversations.filter(c => c.idConversation !== data.conversationId)
      });

      // Option 2 (alternative): Mark the conversation as inactive but keep it in history
      // dispatch({
      //   type: 'UPDATE_CONVERSATION',
      //   payload: {
      //     conversationId: data.conversationId,
      //     updates: {
      //       isActive: false,
      //       leftAt: new Date().toISOString()
      //     }
      //   }
      // });
    }
  }, [dispatch, state.conversations]);
  // handler for leave group response
  const handleLeaveGroupResponse = useCallback((data: any) => {
    console.log("Leave group response:", data);

    if (data.success) {
      // If successfully left the group, remove the conversation from state
      dispatch({
        type: 'REMOVE_CONVERSATION',
        payload: {
          conversationId: data.conversationId
        }
      });

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success("Đã rời khỏi nhóm");
        });
      }
    } else {
      // Show error message
      console.error("Failed to leave group:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể rời khỏi nhóm");
        });
      }
    }
  }, [dispatch]);
  // handler for member left group event
  const handleMemberLeftGroup = useCallback((data: any) => {
    console.log("Member left group notification:", data);

    if (!data.conversationId || !data.userId || !data.message) {
      console.error("Invalid member_left_group data:", data);
      return;
    }

    // Add the system message to the conversation
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        conversationId: data.conversationId,
        message: {
          ...data.message,
          isOwn: false,
          type: "system"
        }
      }
    });

    // Find the current conversation
    const currentConversation = conversations.find(c => c.idConversation === data.conversationId);

    if (!currentConversation) {
      console.error("Cannot find conversation in currentConversation:", currentConversation);
      console.error("Cannot find conversation in state:", data.conversationId);
      return;
    }

    // Filter out the leaving user from regularMembers
    const updatedRegularMembers = (currentConversation.regularMembers || [])
      .filter(member => member.id !== data.userId);

    // Filter out the leaving user from groupMembers
    const updatedGroupMembers = (currentConversation.groupMembers || [])
      .filter(memberId => memberId !== data.userId);

    // Filter out the leaving user from coOwners
    const updatedCoOwners = (currentConversation.coOwners || [])
      .filter(coOwner => coOwner.id !== data.userId);

    // Create updated rules object with the user removed from listIDCoOwner
    const updatedRules = {
      ...currentConversation.rules,
      listIDCoOwner: (currentConversation.rules?.listIDCoOwner || [])
        .filter(coOwnerId => coOwnerId !== data.userId)
    };

    // Create a proper latestMessage object from the system message
    const latestMessage = {
      content: data.message.content,
      dateTime: data.message.dateTime,
      isRead: false,
      type: "system",
      idSender: data.message.idSender || "system",
      idReceiver: data.message.idReceiver
    };

    // Update the conversation with all member-related fields
    dispatch({
      type: 'UPDATE_CONVERSATION',
      payload: {
        conversationId: data.conversationId,
        updates: {
          regularMembers: updatedRegularMembers,
          groupMembers: updatedGroupMembers,
          coOwners: updatedCoOwners,
          rules: updatedRules,
          latestMessage: latestMessage,
          lastChange: new Date().toISOString()
        }
      }
    });
  }, [dispatch, conversations]);
  // Add handler for member promotion events
  const handleMemberPromoted = useCallback((data: any) => {
    console.log("Member promoted notification:", data);

    if (!data.conversationId || !data.promotedMember || !data.systemMessage) {
      console.error("Invalid member_promoted_notification data:", data);
      return;
    }

    // Find the current conversation
    const currentConversation = conversations.find(c => c.idConversation === data.conversationId);

    if (!currentConversation) {
      console.error("Cannot find conversation in state:", data.conversationId);
      return;
    }

    // Add the system message to the conversation
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        conversationId: data.conversationId,
        message: {
          ...data.systemMessage,
          isOwn: false,
          type: "system"
        }
      }
    });

    // Update the conversation with the new coOwner
    const promotedMemberId = data.promotedMember;

    // Find the member in regularMembers to get their details
    const promotedMember = currentConversation.regularMembers.find(
      member => member.id === promotedMemberId
    );

    if (!promotedMember) {
      console.error("Cannot find promoted member in regularMembers:", promotedMemberId);
      return;
    }

    // Check if the member is already a co-owner to prevent duplicates
    const isAlreadyCoOwner = (currentConversation.coOwners || []).some(
      coOwner => coOwner.id === promotedMemberId
    );

    // Create updated coOwners array with the new coOwner (only if not already a co-owner)
    const updatedCoOwners = isAlreadyCoOwner
      ? [...(currentConversation.coOwners || [])]
      : [
        ...(currentConversation.coOwners || []),
        {
          id: promotedMember.id,
          fullname: promotedMember.fullname,
          urlavatar: promotedMember.urlavatar
        }
      ];

    // Check if the member ID is already in the listIDCoOwner
    const isIdAlreadyInList = (currentConversation.rules?.listIDCoOwner || []).includes(promotedMemberId);

    // Create updated rules with the new coOwner ID (only if not already in the list)
    const updatedRules = {
      ...currentConversation.rules,
      listIDCoOwner: isIdAlreadyInList
        ? [...(currentConversation.rules?.listIDCoOwner || [])]
        : [...(currentConversation.rules?.listIDCoOwner || []), promotedMemberId]
    };

    // Update the conversation
    dispatch({
      type: 'UPDATE_CONVERSATION',
      payload: {
        conversationId: data.conversationId,
        updates: {
          coOwners: updatedCoOwners,
          rules: updatedRules,
          lastChange: new Date().toISOString()
        }
      }
    });

    // Update the latest message in the conversation
    dispatch({
      type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
      payload: {
        conversationId: data.conversationId,
        latestMessage: {
          content: data.systemMessage.content,
          dateTime: data.systemMessage.dateTime,
          isRead: false,
          type: "system"
        }
      }
    });
  }, [dispatch, conversations]);

  // Add handler for promotion response (for the user who initiated the promotion)
  const handlePromoteMemberResponse = useCallback((data: any) => {
    console.log("Promote member response:", data);

    if (data.success) {
      // If we have the conversation and member data, update immediately
      if (data.conversationId && data.memberId && data.systemMessage) {
        // Find the conversation
        const conversation = conversations.find(c => c.idConversation === data.conversationId);

        if (!conversation) {
          console.error("Cannot find conversation in state:", data.conversationId);
          return;
        }

        // Find the member in regularMembers to get their details
        const promotedMember = conversation.regularMembers.find(
          member => member.id === data.memberId
        );

        if (!promotedMember) {
          console.error("Cannot find promoted member in regularMembers:", data.memberId);
          return;
        }

        // Add the system message to the conversation
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Check if the member is already a co-owner to prevent duplicates
        const isAlreadyCoOwner = (conversation.coOwners || []).some(
          coOwner => coOwner.id === data.memberId
        );

        // Create updated coOwners array with the new coOwner (only if not already a co-owner)
        const updatedCoOwners = isAlreadyCoOwner
          ? [...(conversation.coOwners || [])]
          : [
            ...(conversation.coOwners || []),
            {
              id: promotedMember.id,
              fullname: promotedMember.fullname,
              urlavatar: promotedMember.urlavatar || ""
            }
          ];

        // Check if the member ID is already in the listIDCoOwner
        const isIdAlreadyInList = (conversation.rules?.listIDCoOwner || []).includes(data.memberId);

        // Create updated rules with the new coOwner ID (only if not already in the list)
        const updatedRules = {
          ...conversation.rules,
          listIDCoOwner: isIdAlreadyInList
            ? [...(conversation.rules?.listIDCoOwner || [])]
            : [...(conversation.rules?.listIDCoOwner || []), data.memberId]
        };

        // Update the conversation
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId: data.conversationId,
            updates: {
              coOwners: updatedCoOwners,
              rules: updatedRules,
              lastChange: new Date().toISOString()
            }
          }
        });

        // Update the latest message in the conversation
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: "system",
              idSender: "system"
            }
          }
        });
      }

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success("Thăng cấp thành viên thành công");
        });
      }
    } else {
      console.error("Error promoting member:", data.message);

      // Show error toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể thăng cấp thành viên");
        });
      }
    }
  }, [dispatch, conversations]);

  // Add handler for when the current user is promoted
  const handleCurrentUserPromoted = useCallback((data: any) => {
    console.log("Current user promoted:", data);

    if (!data.conversationId) {
      console.error("Invalid member_promoted data:", data);
      return;
    }

    // Find the conversation
    const conversation = conversations.find(c => c.idConversation === data.conversationId);

    if (!conversation) {
      console.error("Cannot find conversation in state:", data.conversationId);
      return;
    }

    // Update the conversation with the current user as coOwner
    if (userId) {
      // Find the current user in regularMembers
      const currentUserInfo = conversation.regularMembers.find(
        member => member.id === userId
      );

      if (!currentUserInfo) {
        console.error("Cannot find current user in regularMembers");
        return;
      }

      // Check if the current user is already a co-owner to prevent duplicates
      const isAlreadyCoOwner = (conversation.coOwners || []).some(
        coOwner => coOwner.id === userId
      );

      // Create updated coOwners array with the current user (only if not already a co-owner)
      const updatedCoOwners = isAlreadyCoOwner
        ? [...(conversation.coOwners || [])]
        : [
          ...(conversation.coOwners || []),
          {
            id: currentUserInfo.id,
            fullname: currentUserInfo.fullname,
            urlavatar: currentUserInfo.urlavatar
          }
        ];

      const isIdAlreadyInList = (conversation.rules?.listIDCoOwner || []).includes(userId);

      // Create updated rules with the current user ID (only if not already in the list)
      const updatedRules = {
        ...conversation.rules,
        listIDCoOwner: isIdAlreadyInList
          ? [...(conversation.rules?.listIDCoOwner || [])]
          : [...(conversation.rules?.listIDCoOwner || []), userId]
      };


      // Update the conversation
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversationId,
          updates: {
            coOwners: updatedCoOwners,
            rules: updatedRules,
            lastChange: new Date().toISOString()
          }
        }
      });

      // Show toast notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success("Bạn đã được thăng cấp làm phó nhóm");
        });
      }
    }
  }, [dispatch, conversations, userId]);
  const handleGroupDeletedResponse = useCallback((data: any) => {
    console.log("Group deleted response:", data);

    if (data.success) {
      // If the group was successfully deleted, remove it from the conversations list
      dispatch({
        type: 'REMOVE_CONVERSATION',
        payload: {
          conversationId: data.conversationId || data.IDConversation
        }
      });

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success(data.message || "Nhóm đã được xóa thành cônggg");
        });
      }
    } else {
      // Show error message
      console.error("Failed to delete group:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể xóa nhóm");
        });
      }
    }
  }, [dispatch, conversations]);

  // handler for group deleted notification (for other members)
  const handleGroupDeletedNotification = useCallback((data: any) => {
    console.log("Group deleted notification:", data);

    if (data.conversationId) {
      // Remove the conversation from the list
      dispatch({
        type: 'REMOVE_CONVERSATION',
        payload: {
          conversationId: data.conversationId
        }
      });

      // Show notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.info(data.message || "Nhóm đã bị xóa bởi trưởng nhóm", {
            duration: 5000
          });
        });
      }
    }
  }, [dispatch, conversations]);

  // handler for owner change notification (for new owner)
  const handleOwnerChangeNotification = useCallback((data: any) => {
    console.log("Owner change notification:", data);

    if (data.success && data.conversation) {
      const updatedConversation = data.conversation;
      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === data.conversation.idConversation
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", data.conversation);
        return;
      }
      // Get the new owner details from the data
      const newOwner = data.newOwner || {
        id: data.conversation?.rules?.IDOwner,
        fullname: "Unknown User"
      };
      // Get the old owner details
      const oldOwnerId = currentConversation.owner?.id;
      const oldOwner = currentConversation.regularMembers.find(m => m.id === oldOwnerId) || currentConversation.owner;

      // Create updated regularMembers array that includes the old owner
      let updatedRegularMembers = [...currentConversation.regularMembers];

      // If old owner is not already in regularMembers, add them
      if (oldOwner && !updatedRegularMembers.some(m => m.id === oldOwnerId)) {
        updatedRegularMembers.push({
          id: oldOwner.id,
          fullname: oldOwner.fullname,
          urlavatar: oldOwner.urlavatar || "",
          phone: oldOwner.phone || "",
          email: oldOwner.email || ""
        });
      }
      // Update the conversation with the new owner
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversation.idConversation,
          updates: {
            // Update owner and rules
            owner: newOwner,
            rules: updatedConversation.rules,
            // Update regularMembers to include the old owner
            regularMembers: updatedRegularMembers,
            // Update coOwners if available
            coOwners: updatedConversation.coOwners ||
              (updatedConversation.rules.listIDCoOwner || []).map(id => {
                const member = currentConversation.regularMembers.find(m => m.id === id);
                return member ? {
                  id: member.id,
                  fullname: member.fullname,
                  urlavatar: member.urlavatar
                } : { id, fullname: "Unknown", urlavatar: "" };
              }),
            // Preserve other important fields
            lastChange: updatedConversation.lastChange || currentConversation.lastChange
          }
        }
      });

      // Add the system message to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversation.idConversation,
            message: {
              ...data.systemMessage,
              isOwn: false
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversation.idConversation,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: data.systemMessage.type || "text",
              idSender: data.systemMessage.idSender || "system"
            },
          }
        });
      }

      // Show notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.info(data.message || "Nhóm đã có trưởng nhóm mới", {
            duration: 5000
          });
        });
      }
    }
  }, [dispatch, state.conversations]);
  // handler for owner change notification (for RegularMember)
  const handleGroupOwnerChangedNotification = useCallback((data: any) => {
    console.log("Group owner changed notification:", data);

    if (data.success && data.conversationId) {
      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }

      // Add the system message to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: "system",
              idSender: "system"
            }
          }
        });
      }

      // Update the conversation with the new owner
      if (data.newOwner) {
        const oldOwnerId = currentConversation.owner?.id;
        const oldOwner = currentConversation.owner;

        // Create updated regularMembers array that includes the old owner if needed
        let updatedRegularMembers = [...currentConversation.regularMembers];

        // If old owner exists and is not already in regularMembers, add them
        if (oldOwner && !updatedRegularMembers.some(m => m.id === oldOwnerId)) {
          updatedRegularMembers.push({
            id: oldOwner.id,
            fullname: oldOwner.fullname,
            urlavatar: oldOwner.urlavatar || "",
          });
        }

        // If new owner is in regularMembers, remove them
        updatedRegularMembers = updatedRegularMembers.filter(
          member => member.id !== data.newOwner.id
        );

        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId: data.conversationId,
            updates: {
              owner: data.newOwner,
              regularMembers: updatedRegularMembers,
              rules: {
                ...currentConversation.rules,
                IDOwner: data.newOwner.id
              },
              lastChange: new Date().toISOString()
            }
          }
        });
      }
    }
  }, [dispatch, state.conversations]);
  const changeGroupOwner = useCallback((
    conversationId: string,
    newOwnerId: string
  ) => {
    if (!socket || !userId) {
      console.error("Cannot change owner: Socket not connected or user not authenticated");
      return;
    }

    socket.emit("change_owner_group", {
      IDConversation: conversationId,
      IDUser: userId,
      IDNewOwner: newOwnerId
    });
  }, [socket, userId]);
  // handler for member demoted response
  const handleDemoteMemberResponse = useCallback((data: any) => {
    console.log("Demote member response:", data);

    if (data.success) {
      if (data.conversationId && data.memberId && data.systemMessage) {
        // Find the conversation
        const conversation = conversations.find(
          c => c.idConversation === data.conversationId
        );
        if (!conversation) {
          console.error("Cannot find conversation in state:", data.conversationId);
          return;
        }

        // Add the system message to the conversation
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Create updated coOwners array without the demoted member
        const updatedCoOwners = (conversation.coOwners || []).filter(
          coOwner => coOwner.id !== data.memberId
        );
        console.log("Updated coOwners:", updatedCoOwners);

        // Create updated rules without the demoted member ID
        const updatedRules = {
          ...conversation.rules,
          listIDCoOwner: (conversation.rules?.listIDCoOwner || []).filter(
            id => id !== data.memberId
          )
        };
        console.log("Updated rules:", updatedRules);
        // Find the demoted member in coOwners to ensure we have their complete info
        // Find the demoted member in coOwners to ensure we have their complete info
        const demotedMember = conversation.coOwners?.find(
          coOwner => coOwner.id === data.memberId
        );

        // Update the regularMembers list to ensure the demoted member is included
        let updatedRegularMembers = [...conversation.regularMembers];

        // Check if the demoted member is already in regularMembers
        const memberExists = updatedRegularMembers.some(member => member.id === data.memberId);

        // If not in regularMembers and we have their info from coOwners, add them
        if (!memberExists && demotedMember) {
          updatedRegularMembers.push({
            id: demotedMember.id,
            fullname: demotedMember.fullname,
            urlavatar: demotedMember.urlavatar || "",
          });
        }

        // Update the conversation
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId: data.conversationId,
            updates: {
              coOwners: updatedCoOwners,
              regularMembers: updatedRegularMembers,
              rules: updatedRules,
              lastChange: new Date().toISOString()
            }
          }
        });

        // Update the latest message in the conversation
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage || `system-${Date.now()}`,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime || new Date().toISOString(),
              isRead: false,
              type: "system",
              idSender: "system"
            }
          }
        });
      }
      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success(data.message || "Đã thu hồi quyền quản trị viên thành công");
        });
      }
    } else {
      // Show error message
      console.error("Failed to demote member:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể thu hồi quyền quản trị viên");
        });
      }
    }
  }, [conversations, dispatch]);

  // handler for member demoted notification (for the demoted member)
  const handleMemberDemoted = useCallback((data: any) => {
    console.log("Member demoted notification:", data);

    if (data.conversationId) {
      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }
      // Add the system message to the conversation
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          conversationId: data.conversationId,
          message: {
            ...data.systemMessage,
            isOwn: false,
            type: "system"
          }
        }
      });
      // Find the current user in the members list to ensure we have the correct data
      let currentUserInfo = currentConversation.regularMembers.find(
        member => member.id === userId
      );

      // If not found in regularMembers, check in coOwners
      if (!currentUserInfo) {
        currentUserInfo = currentConversation.coOwners?.find(
          coOwner => coOwner.id === userId
        );
      }

      // If not found in coOwners, check if user is the owner
      if (!currentUserInfo && currentConversation.owner?.id === userId) {
        currentUserInfo = currentConversation.owner;
      }

      // If still not found, use default info
      if (!currentUserInfo) {
        currentUserInfo = {
          id: userId,
          fullname: "Current User",
          urlavatar: ""
        };
      }
      // Update the conversation with the new co-owners list
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversationId,
          updates: {
            coOwners: (currentConversation.coOwners || []).filter(
              coOwner => coOwner.id !== userId
            ),
            regularMembers: [
              ...currentConversation.regularMembers.filter(member => member.id !== userId),
              currentUserInfo
            ],
            rules: {
              ...currentConversation.rules,
              listIDCoOwner: (currentConversation.rules?.listIDCoOwner || []).filter(
                id => id !== userId
              )
            },
            lastChange: new Date().toISOString()
          }
        }
      });
      // Update the latest message in the conversation
      dispatch({
        type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
        payload: {
          conversationId: data.conversationId,
          latestMessage: {
            idMessage: data.systemMessage.idMessage || `system-${Date.now()}`,
            idConversation: data.systemMessage.idConversation,
            content: data.systemMessage.content,
            dateTime: data.systemMessage.dateTime || new Date().toISOString(),
            isRead: false,
            type: "system",
            idSender: "system"
          }
        }
      });

      // Show notification
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.info(data.message || "Bạn đã bị thu hồi quyền quản trị viên", {
            duration: 5000
          });
        });
      }
    }
  }, [dispatch, state.conversations, userId]);

  // handler for member demoted notification (for other members)
  const handleMemberDemotedNotification = useCallback((data: any) => {
    console.log("Member demoted notification for others:", data);

    if (data.conversationId && data.demotedMember) {
      // Find the current conversation in state
      const currentConversation = state.conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!currentConversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }
      let demotedMemberInfo;

      // If the backend provided the demoted member info, use it
      if (data.demotedMemberInfo) {
        demotedMemberInfo = data.demotedMemberInfo;
      } else {
        // Otherwise, try to find it in the current conversation
        demotedMemberInfo = currentConversation.coOwners?.find(
          coOwner => coOwner.id === data.demotedMember
        );
      }

      if (!demotedMemberInfo) {
        console.error("Cannot find demoted member info:", data.demotedMember);
        return;
      }

      // Create updated regularMembers array with the demoted member
      const isAlreadyRegularMember = (currentConversation.regularMembers || []).some(
        member => member.id === data.demotedMember
      );

      const updatedRegularMembers = isAlreadyRegularMember
        ? [...currentConversation.regularMembers]
        : [
          ...currentConversation.regularMembers,
          {
            id: demotedMemberInfo.id,
            fullname: demotedMemberInfo.fullname,
            urlavatar: demotedMemberInfo.urlavatar || ""
          }
        ];

      // Use the updated rules from the notification if available
      const updatedRules = data.updatedRules || {
        ...currentConversation.rules,
        listIDCoOwner: (currentConversation.rules?.listIDCoOwner || []).filter(
          id => id !== data.demotedMember
        )
      };
      // Update the conversation with the new co-owners list
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversationId,
          updates: {
            coOwners: (currentConversation.coOwners || []).filter(
              coOwner => coOwner.id !== data.demotedMember
            ),
            regularMembers: updatedRegularMembers,
            rules: updatedRules,
            lastChange: new Date().toISOString()
          }
        }
      });

      // Add the system message to the conversation
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Update the conversation's latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: data.systemMessage.type || "text",
              idSender: data.systemMessage.idSender || "system"
            },
          }
        });
      }
    }
  }, [dispatch, state.conversations]);

  // function to demote a member
  const demoteMember = useCallback((
    conversationId: string,
    memberToDemote: string
  ) => {
    if (!socket || !userId) {
      console.error("Cannot demote member: Socket not connected or user not authenticated");
      return;
    }

    socket.emit("demote_member", {
      IDConversation: conversationId,
      IDUser: userId,
      IDMemberToDemote: memberToDemote
    });
  }, [socket, userId]);

  // handler for group info updates
  const handleUpdateGroupInfoResponse = useCallback((data: any) => {
    console.log("Update group info response:", data);

    if (data.success) {
      // Find the conversation in state
      const conversation = conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!conversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }

      // Update the conversation with new info
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversationId,
          updates: {
            groupName: data.updates.groupName || conversation.groupName,
            groupAvatar: data.updates.groupAvatar || conversation.groupAvatar,
            lastChange: new Date().toISOString()
          }
        }
      });

      // Add the system message if provided
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Update latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: "system",
              idSender: "system"
            }
          }
        });
      }

      // Show success toast
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.success(data.message || "Cập nhật thông tin nhóm thành công");
        });
      }
    } else {
      // Show error message
      console.error("Failed to update group info:", data.message);
      if (typeof window !== 'undefined') {
        import('sonner').then(({ toast }) => {
          toast.error(data.message || "Không thể cập nhật thông tin nhóm");
        });
      }
    }
  }, [dispatch, conversations]);

  // handler for group info update notification (for other members)
  const handleGroupInfoUpdated = useCallback((data: any) => {
    console.log("Group info updated notification:", data);

    if (data.conversationId) {
      // Find the conversation in state
      const conversation = conversations.find(
        c => c.idConversation === data.conversationId
      );

      if (!conversation) {
        console.error("Cannot find conversation in state:", data.conversationId);
        return;
      }

      // Update the conversation with new info
      dispatch({
        type: 'UPDATE_CONVERSATION',
        payload: {
          conversationId: data.conversationId,
          updates: {
            groupName: data.updates.groupName || conversation.groupName,
            groupAvatar: data.updates.groupAvatar || conversation.groupAvatar,
            lastChange: new Date().toISOString()
          }
        }
      });

      // Add the system message if provided
      if (data.systemMessage) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            message: {
              ...data.systemMessage,
              isOwn: false,
              type: "system"
            }
          }
        });

        // Update latest message
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: data.systemMessage.idMessage,
              idConversation: data.systemMessage.idConversation,
              content: data.systemMessage.content,
              dateTime: data.systemMessage.dateTime,
              isRead: false,
              type: "system",
              idSender: "system"
            }
          }
        });
      }
    }
  }, [dispatch, conversations]);
  //xử lý reply message
  const replyMessage = useCallback(
    (conversationId: string, messageId: string, text: string, type: string = "text", fileUrl?: string) => {
      if (!socket) return;
      console.log("Sending reply message...", conversationId, messageId, text, type, fileUrl);
      const conversation = conversations.find(
        (conv) => conv.idConversation === conversationId
      );

      if (!conversation) return;

      const receiverId = conversation.isGroup
        ? ""
        : conversation.idSender === userId
          ? conversation.idReceiver
          : conversation.idSender;

      socket.emit("reply_message", {
        IDSender: userId,
        IDReceiver: receiverId,
        IDConversation: conversationId,
        IDMessageReply: messageId,
        textMessage: text,
        type: type,
        fileUrl: fileUrl
      });
    },
    [socket, userId, conversations]
  );
  // const handleReceiveMessage = useCallback((message: Message) => {
  //   // Xử lý tin nhắn nhận được, bao gồm cả tin nhắn reply
  //   if (!message || !message.idConversation) {
  //     console.error("Tin nhắn không hợp lệ:", message);
  //     return;
  //   }

  //   const conversationId = message.idConversation;
  //   const conversationMessages = state.messages[conversationId] || [];

  //   // Kiểm tra xem tin nhắn đã tồn tại chưa
  //   const messageExists = conversationMessages.some(
  //     (msg) => msg.idMessage === message.idMessage
  //   );

  //   if (messageExists) return;

  //   // Thêm trường isOwn để xác định tin nhắn của người dùng hiện tại
  //   const newMessage = {
  //     ...message,
  //     isOwn: message.idSender === userId,
  //   };

  //   // Sử dụng dispatch để cập nhật state
  //   dispatch({
  //     type: 'ADD_MESSAGE',
  //     payload: {
  //       conversationId,
  //       message: newMessage
  //     }
  //   });

  //   // Cập nhật thông tin cuộc trò chuyện nếu cần
  //   if (!newMessage.isOwn) {
  //     dispatch({
  //       type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
  //       payload: {
  //         conversationId,
  //         latestMessage: {
  //           idMessage: `system-${Date.now()}`,
  //           idConversation: message.idConversation,
  //           content: message.content,
  //           dateTime: message.dateTime,
  //           isRead: false,
  //           type: message.type || "text",
  //           idSender: message.idSender,
  //           idReceiver: message.idReceiver,
  //           isReply: message.isReply
  //         }
  //       }
  //     });
  //   }
  // }, [dispatch, state.messages, userId]);
  // Thêm hàm xử lý reaction
  const addReaction = useCallback((messageId: string, reaction: string) => {
    if (!socket || !isConnected) return;

    console.log(`Thêm reaction ${reaction} cho tin nhắn ${messageId}`);
    socket.emit('add_reaction', {
      IDUser: userId,
      IDMessage: messageId,
      reaction,
      count: 1
    });
  }, [socket, isConnected, userId]);
  const handleMessageReactionUpdated = (data: any) => {
    console.log("Nhận cập nhật reaction:", data);
    const { messageId, reactions } = data;

    // Tìm conversation chứa tin nhắn này
    let targetConversationId = null;

    // Tìm trong messages hiện tại
    for (const [conversationId, messages] of Object.entries(state.messages)) {
      const found = messages.find(msg => msg.idMessage === messageId);
      if (found) {
        targetConversationId = conversationId;
        break;
      }
    }

    // Nếu không tìm thấy trong messages hiện tại, tìm trong olderMessages
    if (!targetConversationId) {
      for (const [conversationId, messages] of Object.entries(state.olderMessages)) {
        const found = messages.find(msg => msg.idMessage === messageId);
        if (found) {
          targetConversationId = conversationId;
          break;
        }
      }
    }

    if (targetConversationId) {
      dispatch({
        type: 'UPDATE_MESSAGE_REACTIONS',
        payload: {
          conversationId: targetConversationId,
          messageId,
          reactions
        }
      });
    }
  };
  // Gộp các useEffect đăng ký sự kiện socket
  useEffect(() => {
    if (!socket) return;

    // Đăng ký lắng nghe các sự kiện
    socket.on('message_reaction_updated', handleMessageReactionUpdated);
    socket.on("load_conversations_response", handleLoadConversationsResponse);
    socket.on("load_group_conversations_response", handleLoadGroupConversationsResponse);
    socket.on("new_group_conversation", handleAddMemberToGroupResponse);
    socket.on("message_from_server", handleAddMemberToGroupResponseOnOwner);
    socket.on("remove_member_response", handleRemoveMemberResponse);
    socket.on("member_removed_notification", handleMemberRemovedNotification);
    socket.on("removed_from_group", handleRemovedFromGroup);
    socket.on("leave_group_response", handleLeaveGroupResponse);
    socket.on("member_left_group", handleMemberLeftGroup);
    // Register the event listeners for member promotion
    socket.on("member_promoted_notification", handleMemberPromoted);
    socket.on("promote_member_response", handlePromoteMemberResponse);
    socket.on("member_promoted", handleCurrentUserPromoted);
    // Add these new event listeners for owner change
    socket.on("new_group_owner_noti", handleOwnerChangeNotification);
    socket.on("group_owner_changed_notification", handleGroupOwnerChangedNotification);

    // Add these new event listeners for demote member
    socket.on("demote_member_response", handleDemoteMemberResponse);
    socket.on("member_demoted", handleMemberDemoted);
    socket.on("member_demoted_notification", handleMemberDemotedNotification);

    // Add these new event listeners for group info update
    socket.on("update_group_info_response", handleUpdateGroupInfoResponse);
    socket.on("group_info_updated", handleGroupInfoUpdated);
    socket.on("error", handleError);
    const handleGroupConversationCreated = (data: any) => {
      console.log("Group conversation creation response:", data);

      if (data.success && data.conversation) {
        console.log("Members from backend:", data.members);
        console.log("Owner from backend:", data.owner);
        // Enhance the conversation object with members information
        const enhancedConversation: Conversation = {
          ...data.conversation,
          owner: data.owner,
          isGroup: true,
          groupMembers: Array.isArray(data.members) ? data.members : [],
          regularMembers: data.members || [],
          // Set default values for any missing fields
          lastChange: data.conversation.lastChange || new Date().toISOString(),
          unreadCount: 0,
          // Make sure rules exist
          rules: data.conversation.rules || {
            IDOwner: userId,
            listIDCoOwner: []
          }
        };
        console.log("check member in enhancedConversation: ", enhancedConversation.groupMembers)
        console.log("check data member is respose>> ", data.members);

        // Add the new group conversation to state
        dispatch({
          type: 'ADD_GROUP_CONVERSATION',
          payload: enhancedConversation
        });

        // Automatically load messages for this conversation
        loadMessages(data.conversation.idConversation);

        // Show success notification
        console.log("Group created successfully:", data.message);
      } else {
        // Handle error
        console.error("Failed to create group:", data.message);
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to create group: ${data.message}`
        });
      }
    };
    socket.on("create_group_conversation_response", handleGroupConversationCreated);
    const handleGroupMessageResponse = (data: any) => {
      console.log("Group message response received:", data);

      // Process the response similar to regular messages
      let message: Message;
      let conversationId: string;

      if (data.conversationId && data.message) {
        message = data.message;
        conversationId = data.conversationId;
      } else if (data.idConversation) {
        message = data;
        conversationId = data.idConversation;
      } else {
        console.error("Invalid group message response format:", data);
        return;
      }
      const conversation = conversations.find(conv => conv.idConversation === conversationId);

      // Find sender information
      let senderInfo = null;
      if (message.idSender && conversation) {
        // Look for sender in the members list
        const sender = conversation.regularMembers?.find(member => member.id === message.idSender);
        if (sender) {
          senderInfo = {
            id: sender.id,
            fullname: sender.fullname,
            avatar: sender.urlavatar
          };
        } else if (conversation.owner?.id === message.idSender) {
          // Check if sender is the owner
          senderInfo = {
            id: conversation.owner.id,
            fullname: conversation.owner.fullname,
            avatar: conversation.owner.urlavatar
          };
        }
      }
      // Check if this is the current user's message
      const isOwnMessage = message.idSender === userId;
      // Enhance the message with additional properties
      const enhancedMessage = {
        ...message,
        isOwn: isOwnMessage,
        dateTime: message.dateTime || new Date().toISOString(),
        senderInfo: senderInfo || message.senderInfo
      };

      // Find and replace any temporary message
      const conversationMessages = messages[conversationId] || [];
      const tempMessageIndex = conversationMessages.findIndex(msg =>
        msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
      );

      if (tempMessageIndex !== -1) {
        // Replace the temporary message
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId,
            messageId: conversationMessages[tempMessageIndex].idMessage,
            updates: enhancedMessage
          }
        });
      } else {
        // Add as a new message
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId,
            message: enhancedMessage
          }
        });
      }

      // Update the conversation's latest message
      dispatch({
        type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
        payload: {
          conversationId,
          latestMessage: {
            content: message.content,
            dateTime: message.dateTime || new Date().toISOString(),
            isRead: false,
            type: message.type,
            idSender: message.idSender,
            idReceiver: message.idReceiver
          }
        }
      });
    };

    socket.on("group_message_response", handleGroupMessageResponse);
    socket.on("receive_group_message", handleGroupMessageResponse);
    // Xử lý phản hồi tải tin nhắn
    const handleLoadMessagesResponseDirect = (data: any) => {
      console.log("Received load_messages_response directly:", data);
      handleLoadMessagesResponse(data);
    };

    socket.on("load_messages_response", handleLoadMessagesResponseDirect);

    // Xử lý tin nhắn nhận được từ người khác
    const handleReceiveMessage = (data: any) => {
      console.log("Nhận tin nhắn mới (raw):", JSON.stringify(data, null, 2));

      try {
        // Xử lý cấu trúc dữ liệu
        let message: Message;
        let conversationId: string;

        // Kiểm tra cấu trúc dữ liệu
        if (!data) {
          console.error("Tin nhắn nhận được rỗng");
          return;
        }

        // Xử lý các trường hợp cấu trúc dữ liệu khác nhau
        if (data.conversationId && data.message) {
          // Trường hợp data là { conversationId, message }
          message = data.message;
          conversationId = data.conversationId;
        } else if (data.idConversation) {
          // Trường hợp data là Message trực tiếp
          message = data;
          conversationId = data.idConversation;
        } else {
          console.error("Tin nhắn nhận được không hợp lệ:", data);
          return;
        }

        // Kiểm tra xem tin nhắn có phải của người dùng hiện tại không
        const isOwnMessage = message.idSender === userId;

        // Đảm bảo tin nhắn có đầy đủ thông tin
        const enhancedMessage = {
          ...message,
          isOwn: isOwnMessage,
          dateTime: message.dateTime || new Date().toISOString()
        };

        if (isOwnMessage) {
          // Tìm và thay thế tin nhắn tạm thời
          const conversationMessages = messages[conversationId] || [];
          const tempMessageIndex = conversationMessages.findIndex((msg: Message) =>
            msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
          );

          if (tempMessageIndex !== -1) {
            // Thay thế tin nhắn tạm thời
            const updatedMessages = [...conversationMessages];
            updatedMessages[tempMessageIndex] = enhancedMessage;

            dispatch({
              type: 'SET_MESSAGES',
              payload: {
                conversationId,
                messages: updatedMessages
              }
            });
          } else {
            // Thêm tin nhắn mới nếu không tìm thấy tin nhắn tạm thời
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                conversationId,
                message: enhancedMessage
              }
            });
          }
        } else {
          // Thêm tin nhắn mới từ người khác
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId,
              message: enhancedMessage
            }
          });

          // Cập nhật thông tin cuộc trò chuyện
          dispatch({
            type: 'UPDATE_CONVERSATION',
            payload: {
              conversationId,
              updates: {
                latestMessage: {
                  content: message.content,
                  dateTime: message.dateTime,
                  isRead: false,
                  idReceiver: message.idReceiver,
                  idSender: message.idSender,
                  isReply: message.isReply,
                  type: message.type
                },
                lastChange: message.dateTime,
                unreadCount: ((conversations.find(c => c.idConversation === conversationId)?.unreadCount) || 0) + 1
              }
            }
          });

          // Phát âm thanh thông báo
          try {
            const audio = new Audio('/sounds/nodification.wav');
            audio.play();
          } catch (error) {
            console.error("Không thể phát âm thanh thông báo:", error);
          }
        }
      } catch (error) {
        console.error("Lỗi khi xử lý tin nhắn nhận được:", error);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    // Xử lý phản hồi gửi tin nhắn thành công
    const handleSendMessageSuccess = (data: any) => {
      console.log("Phản hồi gửi tin nhắn thành công (raw):", data);

      // Kiểm tra cấu trúc dữ liệu phản hồi
      if (!data) {
        console.error("Phản hồi gửi tin nhắn rỗng");
        return;
      }

      // Xử lý cấu trúc phản hồi mới từ backend
      let message: Message;
      let conversationId: string;

      // Kiểm tra cấu trúc phản hồi
      if (data.conversationId && data.message) {
        // Cấu trúc mới: { conversationId, message }
        message = data.message;
        conversationId = data.conversationId;
      } else if (data.idConversation) {
        // Cấu trúc cũ: Message trực tiếp
        message = data;
        conversationId = data.idConversation;
      } else {
        console.error("Phản hồi gửi tin nhắn không hợp lệ:", data);
        return;
      }

      // Đảm bảo tin nhắn có đầy đủ thông tin
      const enhancedMessage = {
        ...message,
        isOwn: true,
        dateTime: message.dateTime || new Date().toISOString()
      };

      // Tìm tin nhắn tạm thời để thay thế
      const conversationMessages = messages[conversationId] || [];
      const tempMessageIndex = conversationMessages.findIndex(msg =>
        msg && msg.idMessage && msg.idMessage.startsWith('temp-') && msg.content === message.content
      );

      if (tempMessageIndex !== -1) {
        // Thay thế tin nhắn tạm thời
        const updatedMessages = [...conversationMessages];
        updatedMessages[tempMessageIndex] = enhancedMessage;

        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            conversationId,
            messages: updatedMessages
          }
        });
      } else {
        // Thêm tin nhắn mới nếu không tìm thấy tin nhắn tạm thời
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            conversationId,
            message: enhancedMessage
          }
        });
      }
      // Update conversation with new file/image lists if available
      if (data.conversationUpdates) {
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId,
            updates: {
              listImage: data.conversationUpdates.listImage,
              listFile: data.conversationUpdates.listFile,
              listVideo: data.conversationUpdates.listVideo,
              lastChange: data.conversationUpdates.lastChange
            }
          }
        });
      }
    };

    socket.on("send_message_success", handleSendMessageSuccess);
    //handler for conversation updates
    const handleConversationUpdated = (data: any) => {
      console.log("Conversation updated:", data);

      if (data.conversationId && data.updates) {
        dispatch({
          type: 'UPDATE_CONVERSATION',
          payload: {
            conversationId: data.conversationId,
            updates: {
              listImage: data.updates.listImage,
              listFile: data.updates.listFile,
              listVideo: data.updates.listVideo,
              lastChange: data.updates.lastChange
            }
          }
        });
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: data.systemMessage
          }
        });
      }
    };

    // Xử lý sự kiện cập nhật cuộc trò chuyện
    socket.on("conversation_updated", handleConversationUpdated);
    // Xử lý sự kiện xóa tin nhắn thành công
    const handleDeleteMessageSuccess = (data: { messageId: string, updatedMessage: Message }) => {
      console.log("Tin nhắn đã được xóa:", data);
  
      if (data.updatedMessage && data.updatedMessage.idConversation) {
        const conversationId = data.updatedMessage.idConversation;
        
        // Cập nhật tin nhắn trong state
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: conversationId,
            messageId: data.messageId,
            updates: { isRemove: true }
          }
        });
        
        // Kiểm tra xem tin nhắn bị xóa có phải là tin nhắn mới nhất không
        const conversation = state.conversations.find(conv => conv.idConversation === conversationId);
        if (conversation && conversation.latestMessage && conversation.latestMessage.idMessage === data.messageId) {
          // Tìm tin nhắn mới nhất tiếp theo (không bị xóa)
          const conversationMessages = state.messages[conversationId] || [];
          const nextLatestMessage = conversationMessages
            .filter(msg => msg.idMessage !== data.messageId && !msg.isRemove)
            .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];
          
          // Cập nhật tin nhắn mới nhất của cuộc trò chuyện
          if (nextLatestMessage) {
            dispatch({
              type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
              payload: {
                conversationId: conversationId,
                latestMessage: nextLatestMessage
              }
            });
          } else {
            // Nếu không còn tin nhắn nào, đặt latestMessage thành null hoặc tin nhắn trống
            dispatch({
              type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
              payload: {
                conversationId: conversationId,
                latestMessage: {
                  idMessage: `system-${Date.now()}`,
                  idSender: 'system',
                  idConversation: conversationId,
                  type: 'text',
                  content: "Không có tin nhắn",
                  dateTime: new Date().toISOString(),
                  isRead: true
                }
              }
            });
          }
        }
      }
    };

    socket.on("delete_message_success", handleDeleteMessageSuccess);

    // Xử lý sự kiện chuyển tiếp tin nhắn thành công
    const handleForwardMessageSuccess = (data: {
      success: boolean,
      results: Array<{
        conversationId: string,
        message: Message
      }>
    }) => {
      console.log("Tin nhắn đã được chuyển tiếp:", data);

      if (data.success && data.results && data.results.length > 0) {
        data.results.forEach(result => {
          const { conversationId, message } = result;

          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId,
              message: { ...message, isOwn: message.idSender === userId }
            }
          });
        });
      }
    };

    socket.on("forward_message_success", handleForwardMessageSuccess);

    // Lắng nghe sự kiện kết nối thành công
    const handleConnectionSuccess = (data: any) => {
      console.log("Kết nối socket thành công:", data);
      dispatch({ type: 'SET_USER_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Tự động tải danh sách cuộc trò chuyện sau khi kết nối thành công
      loadConversations();
    };

    socket.on("connection_success", handleConnectionSuccess);

    // Lắng nghe lỗi kết nối
    const handleConnectionError = (data: any) => {
      console.error("Lỗi kết nối socket:", data);
      dispatch({ type: 'SET_ERROR', payload: `Lỗi kết nối: ${data.message || 'Không xác định'}` });
    };

    socket.on("connection_error", handleConnectionError);

    // Lắng nghe tin nhắn chưa đọc
    const handleUnreadMessages = (data: { messages: Message[]; count: number }) => {
      console.log(`Nhận ${data.count} tin nhắn chưa đọc`);
      dispatch({ type: 'SET_UNREAD_MESSAGES', payload: data.messages });
    };

    socket.on("unread_messages", handleUnreadMessages);

    // Xử lý phản hồi trạng thái từ server
    const handleUsersStatus = (data: { statuses: Record<string, boolean> }) => {

      if (!data?.statuses) {
        console.error('Dữ liệu trạng thái không hợp lệ:', data);
        return;
      }

      // Cập nhật trạng thái cho từng người dùng
      Object.entries(data.statuses).forEach(([userId, isOnline]) => {
        dispatch({
          type: 'UPDATE_USER_STATUS',
          payload: { userId, isOnline: Boolean(isOnline) }
        });
      });
    };
    socket.on("receive_message", handleReceiveMessage);
    socket.on('users_status', handleUsersStatus);

    return () => {
      // Hủy đăng ký tất cả sự kiện khi unmount
      socket.off('message_reaction_updated', handleMessageReactionUpdated);
      socket.off("load_conversations_response", handleLoadConversationsResponse);
      socket.off("load_group_conversations_response", handleLoadGroupConversationsResponse);
      socket.off("error", handleError);
      socket.off("load_messages_response", handleLoadMessagesResponseDirect);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("send_message_success", handleSendMessageSuccess);
      socket.off("delete_message_success", handleDeleteMessageSuccess);
      socket.off("forward_message_success", handleForwardMessageSuccess);
      socket.off("connection_success", handleConnectionSuccess);
      socket.off("connection_error", handleConnectionError);
      socket.off("unread_messages", handleUnreadMessages);
      socket.off('users_status', handleUsersStatus);
      socket.off("create_group_conversation_response", handleGroupConversationCreated);
      socket.off("group_message_response", handleGroupMessageResponse);
      socket.off("receive_group_message", handleGroupMessageResponse);
      socket.off("new_group_conversation", handleAddMemberToGroupResponse);
      socket.off("message_from_server", handleAddMemberToGroupResponseOnOwner);
      socket.off("remove_member_response", handleRemoveMemberResponse);
      socket.off("member_removed_notification", handleMemberRemovedNotification);
      socket.off("removed_from_group", handleRemovedFromGroup);
      socket.off("leave_group_response", handleLeaveGroupResponse);
      socket.off("member_left_group", handleMemberLeftGroup);
      // Unregister the event listeners for member promotion
      socket.off("member_promoted_notification", handleMemberPromoted);
      socket.off("promote_member_response", handlePromoteMemberResponse);
      socket.off("member_promoted", handleCurrentUserPromoted);

      socket.off("new_group_owner_noti", handleOwnerChangeNotification);
      socket.off("group_owner_changed_notification", handleGroupOwnerChangedNotification);

      // Unregister the event listeners for member demotion
      socket.off("demote_member_response", handleDemoteMemberResponse);
      socket.off("member_demoted", handleMemberDemoted);
      socket.off("member_demoted_notification", handleMemberDemotedNotification);

      // Unregister the event listeners for change info group
      socket.off("update_group_info_response", handleUpdateGroupInfoResponse);
      socket.off("group_info_updated", handleGroupInfoUpdated);

      socket.off("receive_message", handleReceiveMessage);
      socket.offAny();
    };
  }, [socket, userId, messages, conversations, loadConversations, handleGroupDeletedResponse, handleGroupDeletedNotification,
    handleDemoteMemberResponse, handleMemberDemoted, handleMemberDemotedNotification]);

  // Kết nối người dùng khi socket sẵn sàng
  useEffect(() => {
    // Reset trạng thái khi userId thay đổi
    dispatch({ type: 'SET_USER_CONNECTED', payload: false });

    // Kiểm tra điều kiện kết nối
    if (!socket) {
      console.log("Socket chưa sẵn sàng");
      return;
    }

    if (!isValidUserId) {
      console.log("userId không hợp lệ:", userId);
      dispatch({ type: 'SET_ERROR', payload: "Không thể kết nối: Thiếu thông tin người dùng" });
      return;
    }

    console.log("Đăng ký người dùng online:", userId, "Socket ID:", socket.id, "Socket connected:", socket.connected);

    // Thử kết nối lại nếu socket đã được khởi tạo nhưng chưa kết nối
    if (!socket.connected) {
      console.log("Socket đã được khởi tạo nhưng chưa kết nối, thử kết nối lại...");
      socket.connect();

      // Đợi socket kết nối trước khi gửi sự kiện
      socket.on('connect', () => {
        console.log("Socket đã kết nối, gửi sự kiện new_user_connect");
        socket.emit("new_user_connect", { id: userId });
      });

      return;
    }

    // Gửi sự kiện kết nối người dùng nếu socket đã kết nối
    console.log("Socket đã kết nối, gửi sự kiện new_user_connect ngay lập tức");
    socket.emit("new_user_connect", { id: userId });
  }, [socket, isConnected, userId, isValidUserId]); // Loại bỏ loadConversations từ dependencies

  // Xử lý phản hồi tải tin nhắn - tối ưu dependencies
  const handleLoadMessagesResponse = useCallback((data: any) => {
    console.log("Phản hồi tải tin nhắn (raw):", JSON.stringify(data, null, 2));

    try {
      // Kiểm tra cấu trúc dữ liệu phản hồi
      if (!data) {
        console.error("Phản hồi tải tin nhắn rỗng");
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Xử lý cấu trúc phản hồi
      let messages: Message[] = [];
      let conversationId: string = "";

      // Kiểm tra cấu trúc phản hồi
      if (data.messages && data.conversationId) {
        // Cấu trúc mới: { messages, conversationId }
        messages = data.messages;
        conversationId = data.conversationId;
      } else if (data.messages && data.idConversation) {
        // Cấu trúc cũ: { messages, idConversation }
        messages = data.messages;
        conversationId = data.idConversation;
      } else {
        console.error("Phản hồi tải tin nhắn không hợp lệ:", data);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      console.log(`Nhận ${messages.length} tin nhắn cho cuộc trò chuyện ${conversationId}`);

      if (messages.length === 0) {
        console.log(`Không có tin nhắn nào cho cuộc trò chuyện ${conversationId}`);
        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            conversationId,
            messages: []
          }
        });
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      // Sắp xếp tin nhắn theo thời gian
      const sortedMessages = [...messages].sort((a, b) => {
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });

      // Đánh dấu tin nhắn của người dùng hiện tại
      const enhancedMessages = sortedMessages.map(msg => ({
        ...msg,
        isOwn: msg.idSender === userId
      }));

      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          conversationId,
          messages: enhancedMessages
        }
      });
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error("Lỗi khi xử lý phản hồi tải tin nhắn:", error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [userId]); // Chỉ phụ thuộc vào userId

  // Tải tin nhắn của một cuộc trò chuyện - tối ưu dependencies
  const loadMessages = useCallback(
    (idConversation: string) => {
      if (!socket) {
        console.log("Không thể tải tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      console.log(`Tải tin nhắn cho cuộc trò chuyện ${idConversation}, socket ID: ${socket.id}, socket connected: ${socket.connected}`);

      // Xóa tin nhắn hiện tại của cuộc trò chuyện này (nếu có)
      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          conversationId: idConversation,
          messages: []
        }
      });

      // Đảm bảo socket đã kết nối trước khi gửi sự kiện
      if (!socket.connected) {
        console.log("Socket chưa kết nối, thử kết nối lại trước khi tải tin nhắn");
        socket.connect();
      }

      // Gửi yêu cầu tải tin nhắn
      socket.emit("load_messages", {
        IDConversation: idConversation,
        lastMessageId: null,
        limit: 50,
      });

      const timeoutId = setTimeout(() => {
        console.log(`Timeout khi tải tin nhắn cho cuộc trò chuyện ${idConversation}`);
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_ERROR', payload: "Không thể tải tin nhắn: Hết thời gian chờ. Vui lòng thử lại sau." });
      }, 10000);

      return () => {
        clearTimeout(timeoutId);
      };
    },
    [socket] // Chỉ phụ thuộc vào socket
  );
  // Gửi tin nhắn - tối ưu dependencies
  const sendMessage = useCallback(
    (idConversation: string, text: string, type: "text" | "image" | "video" | "document" | "file" = "text", fileUrl?: string) => {
      if (!socket) {
        console.log("Không thể gửi tin nhắn: Socket chưa sẵn sàng");
        return;
      }

      console.log(`Gửi tin nhắn đến cuộc trò chuyện ${idConversation}: ${text}, type: ${type}`);

      // Tìm thông tin người nhận từ cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === idConversation
      );

      if (!conversation) {
        console.error("Không tìm thấy cuộc trò chuyện");
        return;
      }

      // Xác định người nhận
      const receiverId = conversation.idSender === userId
        ? conversation.idReceiver
        : conversation.idSender;

      // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
      const tempMessage: Message = {
        idMessage: `temp-${Date.now()}`,
        idSender: userId,
        idConversation: idConversation,
        type: type,
        content: type === "text" ? text : (fileUrl || ""),
        dateTime: new Date().toISOString(),
        isRead: false,
        isOwn: true,
        senderInfo: {
          id: userId
        }
      };

      // Cập nhật danh sách tin nhắn với tin nhắn tạm thời
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          conversationId: idConversation,
          message: tempMessage
        }
      });

      // Chuẩn bị payload dựa trên loại tin nhắn
      const payload: any = {
        IDSender: userId,
        IDConversation: idConversation,
        type: type
      };

      // For direct messages, add the receiver ID
      if (!conversation.isGroup) {
        payload.IDReceiver = receiverId;
      }

      // Nếu là tin nhắn văn bản
      if (type === "text") {
        payload.textMessage = text;
      }
      // Nếu là file
      else if (fileUrl) {
        payload.fileUrl = fileUrl;
        payload.textMessage = text || "Gửi một tệp đính kèm";
      }

      // Emit the appropriate event based on conversation type
      if (conversation.isGroup) {
        console.log("Sending group message:", payload);
        socket.emit("send_group_message", payload);
      } else {
        console.log("Sending direct message:", payload);
        socket.emit("send_message", payload);
      }

      // After sending the message, listen for the success response
      const successEvent = conversation.isGroup ? "group_message_response" : "send_message_success";
      socket.once(successEvent, (response) => {
        console.log(`${successEvent} received:`, response);

        // Extract the message and conversation ID from the response
        const responseMessage = response.message || response;
        const responseConversationId = response.conversationId || response.idConversation;

        if (responseMessage && responseConversationId) {
          // Update messages state
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              conversationId: responseConversationId,
              message: responseMessage
            }
          });

          // Also update the conversation with the latest message
          dispatch({
            type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
            payload: {
              conversationId: responseConversationId,
              latestMessage: responseMessage
            }
          });
        }
      });
    },
    [socket, conversations, userId, dispatch]
  );

  // Đánh dấu tin nhắn đã đọc - tối ưu dependencies
  const markMessagesAsRead = useCallback(
    (messageIds: string[], idConversation: string) => {
      if (!socket) {
        console.log("Không thể đánh dấu đã đọc: Socket chưa sẵn sàng");
        return;
      }

      if (!messageIds.length) {
        return;
      }

      // Tìm thông tin cuộc trò chuyện
      const conversation = conversations.find(
        (conv) => conv.idConversation === idConversation
      );

      if (!conversation) {
        console.error("Không tìm thấy cuộc trò chuyện");
        return;
      }

      console.log(`Đánh dấu ${messageIds.length} tin nhắn đã đọc trong cuộc trò chuyện ${idConversation}`);

      // Gửi yêu cầu đánh dấu đã đọc
      socket.emit("mark_messages_read", {
        conversationId: idConversation,
        receiverId: userId,
      });

      // Cập nhật trạng thái tin nhắn trong state
      dispatch({
        type: 'MARK_MESSAGES_READ',
        payload: {
          conversationId: idConversation,
          messageIds
        }
      });
    },
    [socket, conversations, userId, dispatch]
  );
  // forwardMessage function 
  const forwardMessage = useCallback((messageId: string, targetConversations: string[]) => {
    if (!socket) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    socket.emit('forward_message', {
      IDMessageDetail: messageId,
      targetConversations,
      IDSender: userId
    });

    socket.once('forward_message_success', (response) => {
      if (response.success) {
        // First dispatch the forwarded messages
        dispatch({ type: 'FORWARD_MESSAGE_SUCCESS', payload: response });
        console.log("Tin nhắn đã được chuyển tiếp thành công");

        // Then update each conversation's latest message
        response.results.forEach((result: { conversationId: string, message: Message }) => {
          const { conversationId, message } = result;
          dispatch({
            type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
            payload: {
              conversationId: conversationId,
              latestMessage: message
            }
          });
        });
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    });

    socket.once('error', (error) => {
      console.error('Forward message error:', error);
      console.log('Không thể chuyển tiếp tin nhắn');
      dispatch({ type: 'SET_LOADING', payload: false });
    });
  }, [socket, userId]);
  // Xóa tin nhắn - tối ưu dependencies
  const deleteMessage = useCallback(
    (messageId: string, idConversation: string) => {
      if (!socket) {
        console.log("Không thể xóa tin nhắn: Chưa sẵn sàng");
        return;
      }

      console.log(`Xóa tin nhắn ${messageId} trong cuộc trò chuyện ${idConversation}`);

      // Gửi yêu cầu xóa tin nhắn
      socket.emit("delete_message", {
        idMessage: messageId,
        idSender: userId,
      });

      // Cập nhật trạng thái tin nhắn trong state ngay lập tức (optimistic update)
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: {
          conversationId: idConversation,
          messageId,
          updates: { isRemove: true }
        }
      });
    },
    [socket, userId, dispatch]
  );
  const recallMessage = useCallback((messageId: string, conversationId: string) => {
    if (!socket || !isConnected || !isValidUserId) {
      console.log("Không thể thu hồi tin nhắn: Socket chưa kết nối hoặc userId không hợp lệ");
      return;
    }

    console.log(`Đang thu hồi tin nhắn ${messageId} trong cuộc trò chuyện ${conversationId}`);

    // Gửi yêu cầu thu hồi tin nhắn đến server
    socket.emit("recall_message", {
      idMessage: messageId,
      idConversation: conversationId,
    });

    // Cập nhật UI ngay lập tức (optimistic update)
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: {
        conversationId,
        messageId,
        updates: {
          isRecall: true,
          content: "Tin nhắn đã được thu hồi"
        }
      }
    });

  }, [socket, isConnected, isValidUserId, userId]);
  // Thêm xử lý sự kiện recall_message_success và message_recalled
  useEffect(() => {
    if (!socket) return;

    // Xử lý phản hồi thu hồi tin nhắn thành công
    const handleRecallMessageSuccess = (data: any) => {
      console.log("Nhận phản hồi thu hồi tin nhắn:", data);

      if (data.success) {
        // Cập nhật tin nhắn trong state đã được thực hiện trong optimistic update
        console.log(`Tin nhắn ${data.messageId} đã được thu hồi thành công`);
        if (data.conversationId && data.isLatestMessage) {
          dispatch({
            type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
            payload: {
              conversationId: data.conversationId,
              latestMessage: {
                idMessage: `recall-${Date.now()}`,
                idConversation: data.conversationId,
                content: "Tin nhắn đã được thu hồi",
                dateTime: new Date().toISOString(),
                isRead: true,
                idSender: userId,
                isRecall: true,
                type: "text"
              }
            }
          });
        }
      } else {
        console.error("Lỗi khi thu hồi tin nhắn:", data.error);
        // Khôi phục trạng thái tin nhắn nếu thu hồi thất bại
        if (data.messageId && data.conversationId) {
          // Khôi phục tin nhắn về trạng thái ban đầu
          const conversationMessages = messages[data.conversationId] || [];
          const originalMessage = conversationMessages.find(msg => msg.idMessage === data.messageId);
          
          if (originalMessage) {
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                conversationId: data.conversationId,
                messageId: data.messageId,
                updates: {
                  isRecall: false,
                  content: originalMessage.content
                }
              }
            });
          }
        }
      }
    };

    socket.on("recall_message_success", handleRecallMessageSuccess);

    // Xử lý thông báo tin nhắn bị thu hồi từ người khác
    const handleMessageRecalled = (data: any) => {
      console.log("Nhận thông báo tin nhắn bị thu hồi:", data);
      if (!data.messageId || !data.conversationId) {
        console.error("Invalid message recall data:", data);
        return;
      }
      if (data.updatedMessage && data.updatedMessage.idConversation) {
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: {
            conversationId: data.updatedMessage.idConversation,
            messageId: data.messageId,
            updates: {
              isRecall: true,
              content: "Tin nhắn đã được thu hồi"
            }
          }
        });
      }
      // Cập nhật tin nhắn mới nhất nếu tin nhắn bị thu hồi là tin nhắn mới nhất
      if (data.isLatestMessage) {
        dispatch({
          type: 'UPDATE_CONVERSATION_LATEST_MESSAGE',
          payload: {
            conversationId: data.conversationId,
            latestMessage: {
              idMessage: `recall-${Date.now()}`,
              idConversation: data.conversationId,
              content: "Tin nhắn đã được thu hồi",
              dateTime: new Date().toISOString(),
              isRead: true,
              idSender: data.senderId || "",
              isRecall: true,
              type: "text"
            }
          }
        });
      }
    };

    socket.on("message_recalled", handleMessageRecalled);

    return () => {
      socket.off("recall_message_success", handleRecallMessageSuccess);
      socket.off("message_recalled", handleMessageRecalled);
    };
  }, [socket]);
  // Tối ưu hóa userIds bằng useMemo
  const userIds = useMemo(() =>
    conversations
      .map(conv => conv.otherUser?.id)
      .filter((id): id is string => Boolean(id)),
    [conversations]
  );

  // Tối ưu hóa việc kiểm tra trạng thái người dùng
  useEffect(() => {
    if (!socket || userIds.length === 0) return;

    // Tạo phiên bản throttled của hàm kiểm tra trạng thái
    const throttledCheckStatus = throttle(() => {
      socket.emit('check_users_status', { userIds });
    }, 3000);

    // Xử lý phản hồi trạng thái từ server
    const handleUsersStatus = (data: { statuses: Record<string, boolean> }) => {

      if (!data?.statuses) {
        console.error('Dữ liệu trạng thái không hợp lệ:', data);
        return;
      }

      // Cập nhật trạng thái cho từng người dùng
      Object.entries(data.statuses).forEach(([userId, isOnline]) => {
        dispatch({
          type: 'UPDATE_USER_STATUS',
          payload: { userId, isOnline: Boolean(isOnline) }
        });
      });
    };

    // Đăng ký lắng nghe sự kiện
    socket.on('users_status', handleUsersStatus);

    // Kiểm tra trạng thái lần đầu khi mount
    throttledCheckStatus();

    // Thiết lập interval để kiểm tra định kỳ (60 giây)
    const intervalId = setInterval(throttledCheckStatus, 60000);

    return () => {
      socket.off('users_status', handleUsersStatus);
      clearInterval(intervalId);
      throttledCheckStatus.cancel();
    };
  }, [socket, userIds, dispatch]);
  // Trả về các giá trị và hàm
  return {
    conversations,
    messages,
    loading,
    error,
    unreadMessages,
    loadingMoreMessages: state.loadingMoreMessages,
    hasMoreMessages: state.hasMoreMessages,
    call: state.call,
    startCall,
    answerCall,
    endCall,
    loadMoreMessages,
    combinedMessages,
    loadConversations,
    loadMessages,
    sendMessage,
    recallMessage,
    markMessagesAsRead,
    deleteMessage,
    forwardMessage,
    createGroupConversation,
    addMembersToGroup,
    removeMembersFromGroup,
    changeGroupOwner,
    demoteMember,
    replyMessage,
    addReaction,

  };
};
