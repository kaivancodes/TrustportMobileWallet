
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PINInputProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (success: boolean) => void;
  amount: number;
  recipient: string;
}

const PINInput: React.FC<PINInputProps> = ({
  isOpen,
  onClose,
  onVerify,
  amount,
  recipient
}) => {
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerifyPIN = async () => {
    if (pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Accept any 4-digit PIN for demo purposes
      toast({
        title: "PIN Verified",
        description: "Transaction authorized",
      });
      onVerify(true);
    } catch (error) {
      console.error("PIN verification error:", error);
      toast({
        title: "Verification Error",
        description: "An error occurred during verification",
        variant: "destructive",
      });
      onVerify(false);
    } finally {
      setIsVerifying(false);
      setPin("");
    }
  };

  const handleCancel = () => {
    setPin("");
    onClose();
    onVerify(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Enter Transaction PIN</DialogTitle>
          <DialogDescription className="text-center text-gray-500">
            Please enter your 4-digit PIN to authorize this transaction
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 p-4">
          <div className="text-center bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              Transaction: ₹{amount} to {recipient}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction PIN
              </label>
              <Input
                id="pin"
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-widest"
                autoComplete="off"
              />
            </div>

            <div className="text-center bg-yellow-50 p-3 rounded-md border border-yellow-200">
              <p className="text-xs text-yellow-800">
                For demo purposes, any 4-digit number will work
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={handleVerifyPIN}
                disabled={pin.length !== 4 || isVerifying}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isVerifying ? "Verifying..." : "Verify PIN"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isVerifying}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PINInput;
