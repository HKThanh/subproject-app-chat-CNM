import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneOffIcon } from 'lucide-react';
import Image from 'next/image';

interface OutgoingCallDialogProps {
  open: boolean;
  receiver: {
    id: string;
    fullname: string;
    urlavatar: string;
  } | null;
  callType: 'audio' | 'video' | null;
  onCancel: () => void;
}

const OutgoingCallDialog: React.FC<OutgoingCallDialogProps> = ({
  open,
  receiver,
  callType,
  onCancel
}) => {
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (open) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      setCallDuration(0);
    };
  }, [open]);

  if (!open || !receiver) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center">Đang gọi...</DialogTitle>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary animate-pulse">
            {receiver.urlavatar ? (
              <Image
                src={receiver.urlavatar}
                alt={receiver.fullname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-2xl">
                {receiver.fullname.charAt(0)}
              </div>
            )}
          </div>
          <h3 className="text-xl font-semibold">{receiver.fullname}</h3>
          <p className="text-muted-foreground">
            {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
          </p>
          <p className="text-sm">{formatDuration(callDuration)}</p>
        </div>
        <div className="flex justify-center pb-4">
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={onCancel}
          >
            <PhoneOffIcon className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OutgoingCallDialog;