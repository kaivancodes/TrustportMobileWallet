
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface SMSVerificationProps {
  phoneNumber: string;
  onVerificationComplete: (success: boolean) => void;
  onCancel: () => void;
  expectedOTP: string;
}

const SMSVerification: React.FC<SMSVerificationProps> = ({
  phoneNumber,
  onVerificationComplete,
  onCancel,
  expectedOTP
}) => {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast({
            title: "OTP Expired",
            description: "Please request a new OTP",
            variant: "destructive",
          });
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCancel, toast]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (otp === expectedOTP) {
        toast({
          title: "Verification Successful",
          description: "Your transaction has been verified",
        });
        onVerificationComplete(true);
      } else {
        toast({
          title: "Verification Failed",
          description: "Invalid OTP. Please try again.",
          variant: "destructive",
        });
        onVerificationComplete(false);
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast({
        title: "Verification Error",
        description: "An error occurred during verification",
        variant: "destructive",
      });
      onVerificationComplete(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          SMS Verification
        </h3>
        <p className="text-sm text-gray-600">
          We've sent a 6-digit verification code to{" "}
          <span className="font-semibold">{phoneNumber}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Time remaining: {formatTime(timeLeft)}
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="otp">Enter Verification Code</Label>
          <div className="flex justify-center mt-2">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        <div className="text-center bg-yellow-50 p-3 rounded-md border border-yellow-200">
          <p className="text-xs text-yellow-800">
            For demo purposes, the OTP is: <span className="font-bold">{expectedOTP}</span>
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || isVerifying}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SMSVerification;
