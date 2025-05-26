'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '@/socket/useChat';
import { PhoneIcon, PhoneXMarkIcon, MicrophoneIcon } from '@heroicons/react/24/solid';
import useUserStore from '@/stores/useUserStoree';
import { Avatar, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { MicOff } from 'lucide-react';

// Component hiển thị giao diện cuộc gọi
const CallUI: React.FC = () => {
  const { user } = useUserStore();
  const { call, answerCall, endCall } = useChat(user?.id || '');
  const [isMuted, setIsMuted] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    console.log("CallUI - Trạng thái cuộc gọi:", {
      isIncomingCall: call.isIncomingCall,
      isOutgoingCall: call.isOutgoingCall,
      isCallInProgress: call.isCallInProgress,
      remoteUserId: call.remoteUserId,
      callType: call.callType
    });
    
    // Nếu có cuộc gọi đến và có ringtone đã được tạo, thử phát khi component được render
    if ((call.isIncomingCall || call.isOutgoingCall) && (window as any).currentRingtone) {
      // Thử phát âm thanh khi component được render (có thể vẫn gặp lỗi)
      (window as any).currentRingtone.play().catch(err => {
        console.log("Vẫn không thể phát âm thanh, cần tương tác người dùng:", err);
      });
    }
    
    // Dừng âm thanh khi không còn cuộc gọi
    if (!call.isIncomingCall && !call.isOutgoingCall && (window as any).currentRingtone) {
      (window as any).currentRingtone.pause();
      (window as any).currentRingtone.currentTime = 0;
    }
  }, [call]);
  // Hiển thị video stream
  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
    
    if (remoteVideoRef.current && call.remoteStream) {
      remoteVideoRef.current.srcObject = call.remoteStream;
    }
  }, [call.localStream, call.remoteStream]);
  
  // Xử lý tắt/bật mic
  const toggleMute = () => {
    if (call.localStream) {
      const audioTracks = call.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Nếu không có cuộc gọi, không hiển thị gì
  if (!call.isIncomingCall && !call.isOutgoingCall && !call.isCallInProgress) {
    return null;
  }
  
  // Hiển thị màn hình cuộc gọi đến
  if (call.isIncomingCall) {
    return (
      <IncomingCallScreen 
        callerId={call.remoteUserId || ''} 
        callType={call.callType}
        onAccept={() => answerCall(true)}
        onReject={() => answerCall(false)}
      />
    );
  }
  
  // Hiển thị màn hình cuộc gọi đi
  if (call.isOutgoingCall) {
    return (
      <OutgoingCallScreen 
        calleeId={call.remoteUserId || ''} 
        callType={call.callType}
        onCancel={endCall}
      />
    );
  }
  
  // Hiển thị màn hình cuộc gọi đang diễn ra
  return (
    <CallInProgressScreen 
      remoteUserId={call.remoteUserId || ''}
      callType={call.callType}
      localVideoRef={localVideoRef as React.RefObject<HTMLVideoElement>}
      remoteVideoRef={remoteVideoRef as React.RefObject<HTMLVideoElement>}
      isMuted={isMuted}
      onToggleMute={toggleMute}
      onEndCall={endCall}
    />
  );
};

// Component hiển thị màn hình cuộc gọi đến
interface IncomingCallScreenProps {
  callerId: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({ 
  callerId, 
  callType, 
  onAccept, 
  onReject 
}) => {
  // Tìm thông tin người gọi từ danh sách cuộc trò chuyện
  const { user } = useUserStore();
  const { conversations } = useChat(user?.id || '');
  
  const caller = conversations.find(conv => 
    !conv.isGroup && conv.otherUser?.id === callerId
  )?.otherUser;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold mb-2">Cuộc gọi đến</h2>
        <p className="text-gray-600 mb-4">
          {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} từ
        </p>
        
        <div className="flex flex-col items-center mb-6">
          <Avatar  className="w-20 h-20 mb-2">
            <AvatarImage src={caller?.urlavatar || ''} alt={caller?.fullname || 'Người gọi'}></AvatarImage>
            </Avatar> 

          <h3 className="text-lg font-medium">{caller?.fullname || 'Người gọi không xác định'}</h3>
          <p className="text-sm text-gray-500">{caller?.phone || callerId}</p>
        </div>
        
        <div className="flex justify-center space-x-6">
          <Button 
            onClick={onReject}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </Button>
          
          <Button 
            onClick={onAccept}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4"
          >
            <PhoneIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị màn hình cuộc gọi đi
interface OutgoingCallScreenProps {
  calleeId: string;
  callType: 'audio' | 'video';
  onCancel: () => void;
}

const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({ 
  calleeId, 
  callType, 
  onCancel 
}) => {
  // Tìm thông tin người nhận từ danh sách cuộc trò chuyện
  const { user } = useUserStore();
  const { conversations } = useChat(user?.id || '');
  
  const callee = conversations.find(conv => 
    !conv.isGroup && conv.otherUser?.id === calleeId
  )?.otherUser;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
        <h2 className="text-xl font-semibold mb-2">Đang gọi...</h2>
        <p className="text-gray-600 mb-4">
          {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'} đến
        </p>
        
        <div className="flex flex-col items-center mb-6">
          <Avatar  className="w-20 h-20 mb-2">
            <AvatarImage src={callee?.urlavatar || ''} alt={callee?.fullname || 'Người gọi'}></AvatarImage>
            </Avatar> 
          <h3 className="text-lg font-medium">{callee?.fullname || 'Người nhận không xác định'}</h3>
          <p className="text-sm text-gray-500">{callee?.phone || calleeId}</p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Component hiển thị màn hình cuộc gọi đang diễn ra
interface CallInProgressScreenProps {
  remoteUserId: string;
  callType: 'audio' | 'video';
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

const CallInProgressScreen: React.FC<CallInProgressScreenProps> = ({ 
  remoteUserId, 
  callType, 
  localVideoRef, 
  remoteVideoRef, 
  isMuted, 
  onToggleMute, 
  onEndCall 
}) => {
  // Tìm thông tin người dùng từ xa từ danh sách cuộc trò chuyện
  const { user } = useUserStore();
  const { conversations } = useChat(user?.id || '');
  
  const remoteUser = conversations.find(conv => 
    !conv.isGroup && conv.otherUser?.id === remoteUserId
  )?.otherUser;
  
  // Đếm thời gian cuộc gọi
  const [callDuration, setCallDuration] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Định dạng thời gian cuộc gọi
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Hiển thị video nếu là cuộc gọi video */}
      {callType === 'video' ? (
        <div className="relative flex-1">
          {/* Video từ xa (chiếm toàn màn hình) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* Video của người dùng (góc nhỏ) */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-4 right-4 w-1/4 h-auto rounded-lg border-2 border-white"
          />
        </div>
      ) : (
        // Hiển thị avatar nếu là cuộc gọi thoại
        <div className="flex-1 flex flex-col items-center justify-center">
             <Avatar  className="w-32 h-32 mb-4">
            <AvatarImage src={remoteUser?.urlavatar || ''} alt={remoteUser?.fullname || 'Người gọi'}></AvatarImage>
            </Avatar> 
          <h2 className="text-2xl font-semibold text-white mb-2">
            {remoteUser?.fullname || 'Người dùng không xác định'}
          </h2>
          <p className="text-gray-300 mb-4">{remoteUser?.phone || remoteUserId}</p>
          <p className="text-gray-400">{formatCallDuration(callDuration)}</p>
        </div>
      )}
      
      {/* Thanh điều khiển cuộc gọi */}
      <div className="bg-gray-900 p-4 flex justify-center space-x-6">
        <Button 
          onClick={onToggleMute}
          className={`${isMuted ? 'bg-red-500' : 'bg-gray-700'} hover:opacity-90 text-white rounded-full p-4`}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <MicrophoneIcon className="w-6 h-6" />
          )}
        </Button>
        
        <Button 
          onClick={onEndCall}
          className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4"
        >
          <PhoneXMarkIcon className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};

export default CallUI;