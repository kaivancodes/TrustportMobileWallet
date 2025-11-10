
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTransaction } from "@/context/TransactionContext";
import { useAuth } from "@/context/AuthContext";

interface OTPInputProps {
  onVerify: (isVerified: boolean) => void;
  onResend: () => void;
  expectedOTP: string;
  phoneNumber?: string;
  showDemo?: boolean;
  smsStatus?: 'success' | 'failed' | 'pending';
}

const OTPInput: React.FC<OTPInputProps> = ({ 
  onVerify, 
  onResend, 
  expectedOTP, 
  phoneNumber,
  showDemo = false,
  smsStatus = 'pending'
}) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { verifyOTP } = useTransaction();
  const { user } = useAuth();

  // Auto-focus when component mounts
  useEffect(() => {
    const input = document.querySelector('input[id="otp-input"]');
    if (input) {
      setTimeout(() => {
        (input as HTMLInputElement).focus();
      }, 100);
    }
  }, []);

  const handleVerify = () => {
    setIsVerifying(true);
    
    setTimeout(() => {
      const isValid = verifyOTP(otp, expectedOTP);
      
      if (isValid) {
        toast({
          title: "OTP Verified",
          description: "Your transaction is being processed",
        });
        onVerify(true);
      } else {
        toast({
          title: "Invalid OTP",
          description: "The OTP you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        onVerify(false);
      }
      
      setIsVerifying(false);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 6 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
        <p className="text-sm text-gray-700">
          Enter the 6-digit OTP sent to {phoneNumber || user?.phoneNumber}
        </p>
        {smsStatus === 'success' && (
          <p className="text-xs text-green-600 mt-1">
            SMS sent successfully
          </p>
        )}
        {smsStatus === 'failed' && (
          <p className="text-xs text-red-600 mt-1">
            SMS service unavailable - using demo mode
          </p>
        )}
      </div>
      
      <div className="mb-6">
        <Input
          id="otp-input"
          type="tel"
          inputMode="numeric"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={handleChange}
          className="text-center text-xl tracking-widest h-14 border-blue-300 focus:border-blue-500 shadow-sm"
          autoFocus
          maxLength={6}
        />
      </div>
      
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={handleVerify}
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300"
          disabled={otp.length !== 6 || isVerifying}
        >
          {isVerifying ? "Verifying..." : "Verify OTP"}
        </Button>
        
        <Button
          variant="ghost"
          onClick={onResend}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
        >
          Resend OTP
        </Button>
      </div>
      
      {(showDemo || smsStatus === 'failed') && (
        <div className="text-center mt-2 bg-yellow-50 p-2 rounded-md border border-yellow-100">
          <p className="text-xs text-yellow-800">
            For demo purposes, the OTP is: {expectedOTP}
          </p>
        </div>
      )}
    </div>
  );
};

export default OTPInput;
