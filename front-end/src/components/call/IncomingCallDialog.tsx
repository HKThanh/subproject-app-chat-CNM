import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneIcon, VideoIcon, PhoneOffIcon } from 'lucide-react';
import Image from 'next/image';

interface IncomingCallDialogProps {
  open: boolean;
  caller: {
    id: string;
    fullname: string;
    urlavatar: string;
  } | null;
  callType: 'audio' | 'video' | null;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  open,
  caller,
  callType,
  onAccept,
  onReject
}) => {
  if (!open || !caller) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="text-center">Cuộc gọi đến</DialogTitle>
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary animate-pulse">
            {caller.urlavatar ? (
              <Image
                src={caller.urlavatar}
                alt={caller.fullname}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-2xl">
                {caller.fullname.charAt(0)}
              </div>
            )}
          </div>
          <h3 className="text-xl font-semibold">{caller.fullname}</h3>
          <p className="text-muted-foreground">
            {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
          </p>
        </div>
        <div className="flex justify-center space-x-8 pb-4">
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14"
            onClick={onReject}
          >
            <PhoneOffIcon className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
            onClick={onAccept}
          >
            {callType === 'video' ? (
              <VideoIcon className="h-6 w-6" />
            ) : (
              <PhoneIcon className="h-6 w-6" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;