import React, { createContext, useContext, ReactNode } from 'react';
import { useCall } from '@/socket/useCall';
import IncomingCallDialog from '@/components/call/IncomingCallDialog';
import OutgoingCallDialog from '@/components/call/OutgoingCallDialog';

interface CallContextType {
  startCall: (receiverId: string, callType: 'audio' | 'video') => void;
  endCall: (callId: string, reason?: string) => void;
  isIncomingCall: boolean;
  isOutgoingCall: boolean;
  isCallInProgress: boolean;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCallContext = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: ReactNode;
  userId: string;
}

export const CallProvider: React.FC<CallProviderProps> = ({ children, userId }) => {
  const {
    isIncomingCall,
    isOutgoingCall,
    isCallInProgress,
    callId,
    callType,
    caller,
    receiver,
    roomUrl,
    startCall,
    acceptCall,
    rejectCall,
    endCall
  } = useCall(userId);

  const handleAcceptCall = () => {
    if (callId) {
      acceptCall(callId);
      
      // Mở cửa sổ Daily.co
      if (roomUrl) {
        window.open(roomUrl, '_blank', 'width=800,height=600');
      }
    }
  };

  const handleRejectCall = () => {
    if (callId) {
      rejectCall(callId);
    }
  };

  const handleEndCall = () => {
    if (callId) {
      endCall(callId);
    }
  };

  return (
    <CallContext.Provider
      value={{
        startCall,
        endCall,
        isIncomingCall,
        isOutgoingCall,
        isCallInProgress
      }}
    >
      {children}
      
      <IncomingCallDialog
        open={isIncomingCall}
        caller={caller}
        callType={callType}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
      
      <OutgoingCallDialog
        open={isOutgoingCall}
        receiver={receiver}
        callType={callType}
        onCancel={handleEndCall}
      />
    </CallContext.Provider>
  );
};