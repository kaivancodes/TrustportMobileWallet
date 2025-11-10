import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTransaction } from "@/context/TransactionContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import { ArrowLeftRight, QrCode, CreditCard, Banknote, IndianRupee, Download, AlertTriangle } from "lucide-react";
import OTPInput from "@/components/OTPInput";
import PINInput from "@/components/PINInput";
import QRCode from "react-qr-code";

const SendMoney: React.FC = () => {
  const { user, isAuthenticated, getAllUsers } = useAuth();
  const { sendMoney, generateOTP, sendOTPViaSMS, processTransactionAfterVerification } = useTransaction();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [showPINDialog, setShowPINDialog] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionType, setTransactionType] = useState<"wallet" | "bank" | "qr">("wallet");
  const [qrScanning, setQrScanning] = useState(false);
  const [myQRCode, setMyQRCode] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [walletId, setWalletId] = useState("");
  const [bankingPin, setBankingPin] = useState("");
  const [showBankingPinError, setShowBankingPinError] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<{
    recipient: string;
    amount: number;
    type: "wallet" | "bank" | "qr";
    phoneNumber: string;
    otp: string;
  } | null>(null);
  const [smsStatus, setSmsStatus] = useState<'success' | 'failed' | 'pending'>('pending');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
    // Get all users but exclude the current user
    const loadUsers = async () => {
      const users = await getAllUsers();
      setAllUsers(users.filter(u => u.id !== user?.id));
    };
    
    loadUsers();
    
    // Pre-fill wallet ID and account number if available
    if (user) {
      if (user.walletId && !walletId) {
        setWalletId(user.walletId);
      }
      if (user.accountNumber && !accountNumber) {
        setAccountNumber(user.accountNumber);
      }
    }
  }
}, [isAuthenticated, navigate, getAllUsers, user, walletId, accountNumber]);

useEffect(() => {
  // Add null check for recipient and ensure it has length property
  if (recipient && recipient.length > 0) {
    getAllUsers().then(users => {
      setFilteredUsers(
        users.filter(
          u => {
            // Add null checks for all user properties
            const username = u.username || "";
            const userWalletId = u.walletId || "";
            const userAccountNumber = u.accountNumber || "";
            
            return (
              username.toLowerCase().includes(recipient.toLowerCase()) ||
              userWalletId.toLowerCase().includes(recipient.toLowerCase()) ||
              (userAccountNumber && userAccountNumber.includes(recipient))
            );
          }
        ).slice(0, 5)
      );
    });
  } else {
    setFilteredUsers([]);
  }
}, [recipient, getAllUsers]);

  const handleTabChange = (value: string) => {
    switch (value) {
      case "manual":
        setTransactionType("wallet");
        break;
      case "scan-qr":
        setTransactionType("qr");
        setQrScanning(true);
        break;
      case "my-qr":
        setTransactionType("qr");
        setMyQRCode(true);
        break;
      case "net-banking":
        setTransactionType("bank");
        break;
      default:
        setTransactionType("wallet");
    }
  };

  const handleManualTransfer = async () => {
    if (!recipient) {
      toast({
        title: "Recipient Required",
        description: "Please enter a recipient username, wallet ID, or account number",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    
    // Check if PIN verification is required (amounts above ₹500 for wallet)
    if (amountNum > 500) {
      toast({
        title: "PIN Verification Required",
        description: `Amount above ₹500 requires PIN verification`,
      });
    }
    
    proceedWithTransaction("wallet");
  };

  const handleNetBankingTransfer = () => {
    console.log(`=== NET BANKING TRANSFER INITIATED ===`);
    
    if (!selectedBank) {
      toast({
        title: "Bank Required",
        description: "Please select a bank",
        variant: "destructive",
      });
      return;
    }

    if (!accountNumber || !accountNumber.trim()) {
      toast({
        title: "Account Number Required",
        description: "Please enter your account number",
        variant: "destructive",
      });
      return;
    }

    if (!bankingPin || bankingPin.length !== 4) {
      toast({
        title: "Banking PIN Required",
        description: "Please enter your 4-digit banking PIN",
        variant: "destructive",
      });
      return;
    }

    if (!recipientAccountNumber || !recipientAccountNumber.trim()) {
      toast({
        title: "Recipient Account Number Required",
        description: "Please enter the recipient's account number",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your phone number to receive OTP",
        variant: "destructive",
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    // Clear any previous errors
    setShowBankingPinError(false);
    
    console.log(`Form validation passed. Recipient account: "${recipientAccountNumber.trim()}"`);
    
    // Directly call proceedWithTransaction with bank type
    proceedWithTransaction("bank");
  };

  const proceedWithTransaction = async (type: "wallet" | "bank" | "qr") => {
    setIsProcessing(true);
    
    try {
      const amountNum = parseFloat(amount);
      const phoneForVerification = type === "bank" ? phoneNumber : user?.phoneNumber;
      
      // For bank transfers, use the recipient account number directly
      // For other types, use the recipient field
      const recipientToUse = type === "bank" ? recipientAccountNumber.trim() : recipient;
      
      console.log(`=== PROCEEDING WITH TRANSACTION ===`);
      console.log(`Type: ${type}`);
      console.log(`Recipient: "${recipientToUse}"`);
      console.log(`Amount: ${amountNum}`);
      console.log(`Phone: ${phoneForVerification}`);
      
      const result = await sendMoney(recipientToUse, amountNum, type, phoneForVerification);
      
      if (result.success && result.requiresPIN) {
        // Show PIN dialog for wallet transactions above ₹500
        setShowPINDialog(true);
      } else if (result.success && result.requiresOTP && result.otp) {
        // Store pending transaction for OTP verification
        setPendingTransaction({
          recipient: recipientToUse,
          amount: amountNum,
          type,
          phoneNumber: phoneForVerification || "",
          otp: result.otp
        });
        setGeneratedOTP(result.otp);
        setSmsStatus(result.smsStatus || 'pending');
        setShowOTPDialog(true);
      } else if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `₹${amount} sent successfully`,
        });
        // Clear form fields
        setRecipient("");
        setAmount("");
        setRecipientAccountNumber("");
        setBankingPin("");
        setPhoneNumber("");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        console.log(`=== TRANSACTION FAILED ===`);
        console.log(`Error: ${result.message}`);
        toast({
          title: "Transfer Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePINVerified = async (isVerified: boolean) => {
    setShowPINDialog(false);
    
    if (!isVerified) {
      setIsProcessing(false);
      return;
    }

    try {
      // After PIN verification, process the transaction
      const result = await processTransactionAfterVerification(recipient, parseFloat(amount), "wallet");
      
      if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `₹${amount} sent to ${recipient}`,
        });
        setRecipient("");
        setAmount("");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        toast({
          title: "Transfer Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOTPVerified = async (isVerified: boolean) => {
    if (!isVerified || !pendingTransaction) {
      setShowOTPDialog(false);
      setPendingTransaction(null);
      setIsProcessing(false);
      return;
    }

    setShowOTPDialog(false);
    
    try {
      // Process the actual transaction after OTP verification
      const result = await processTransactionAfterVerification(
        pendingTransaction.recipient, 
        pendingTransaction.amount, 
        pendingTransaction.type
      );
      
      if (result.success) {
        toast({
          title: "Transfer Successful",
          description: `₹${pendingTransaction.amount} sent to ${pendingTransaction.recipient}`,
        });
        setRecipient("");
        setAmount("");
        setRecipientAccountNumber("");
        setBankingPin("");
        setPhoneNumber("");
        setTimeout(() => navigate("/dashboard"), 1500);
      } else {
        toast({
          title: "Transfer Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setPendingTransaction(null);
    }
  };

  const handleResendOTP = () => {
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    
    sendOTPViaSMS(phoneNumber, newOTP).then((success) => {
      setSmsStatus(success ? 'success' : 'failed');
    });
    
    toast({
      title: "OTP Resent",
      description: "A new OTP has been sent to your phone",
    });
  };

  const handleQRScanned = (data: string) => {
    setQrScanning(false);
    setRecipient(data);
    setTransactionType("wallet");
    
    toast({
      title: "QR Code Scanned",
      description: `Recipient set to ${data}`,
    });
  };

  const simulateQRScan = () => {
    setTimeout(() => {
      const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
      const mockWalletId = randomUser ? randomUser.walletId : `WA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      handleQRScanned(mockWalletId);
    }, 2000);
  };

  const selectUser = (user: any) => {
    // Add null check for username
    setRecipient(user.username || user.walletId || user.id);
    setFilteredUsers([]);
  };

  const banks = [
    "State Bank of India (SBI)",
    "HDFC Bank",
    "ICICI Bank",
    "Punjab National Bank (PNB)",
    "Axis Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "Kotak Mahindra Bank",
    "Yes Bank",
  ];

  const handleSaveQRCode = () => {
    toast({
      title: "QR Code Saved",
      description: "Your QR code has been saved to your device",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="py-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Send Money</h1>
          
          <div className="mb-4">
            <p className="text-lg text-gray-600">Available Balance</p>
            <p className="text-3xl font-bold flex items-center">
              <IndianRupee className="h-6 w-6 mr-1" />
              {user.balance.toFixed(2)}
            </p>
          </div>
          
          <Tabs defaultValue="manual" onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 mb-8">
              <TabsTrigger value="manual" className="flex items-center justify-center">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manual Transfer</span>
              </TabsTrigger>
              <TabsTrigger value="scan-qr" className="flex items-center justify-center">
                <QrCode className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Scan QR</span>
              </TabsTrigger>
              <TabsTrigger value="my-qr" className="flex items-center justify-center">
                <QrCode className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">My QR Code</span>
              </TabsTrigger>
              <TabsTrigger value="net-banking" className="flex items-center justify-center">
                <Banknote className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Net Banking</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Manual Transfer</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient (Username, Wallet ID or Account Number)
                    </label>
                    <div className="relative">
                      <Input
                        id="recipient"
                        placeholder="Enter recipient's username, wallet ID or account number"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="w-full"
                      />
                      
                      {filteredUsers.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200">
                          {filteredUsers.map((user) => (
                            <div 
                              key={user.id}
                              onClick={() => selectUser(user)}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="font-medium">{user.username || 'Unknown User'}</div>
                              <div className="text-xs text-gray-500">
                                Wallet ID: {user.walletId || 'N/A'}
                                {user.accountNumber && ` • Account: ${user.accountNumber}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 w-full"
                      />
                    </div>
                    {parseFloat(amount) > 500 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center">
                        <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800">
                          PIN verification required for amounts above ₹500
                        </span>
                      </div>
                    )}
                    {parseFloat(amount) > 5000 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-800">
                          SMS verification also required for amounts above ₹5000
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleManualTransfer}
                    className="w-full bg-wallet-blue hover:bg-blue-600 text-white"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Send Money"}
                  </Button>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="scan-qr">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
                <div className="flex flex-col items-center justify-center space-y-4">
                  {qrScanning ? (
                    <>
                      <div className="w-64 h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                        <div className="animate-pulse">Scanning QR code...</div>
                      </div>
                      <p className="text-sm text-gray-500">
                        Position the QR code within the frame to scan
                      </p>
                      <div className="flex space-x-4">
                        <Button 
                          onClick={() => setQrScanning(false)}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={simulateQRScan}
                          className="bg-wallet-blue hover:bg-blue-600 text-white"
                        >
                          Simulate Scan
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <QrCode className="h-24 w-24 text-gray-400" />
                      <p className="text-center text-gray-600">
                        Tap the button below to scan a QR code from another user
                      </p>
                      <Button 
                        onClick={() => setQrScanning(true)}
                        className="bg-wallet-blue hover:bg-blue-600 text-white"
                      >
                        Start Scanning
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="my-qr">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">My QR Code</h2>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="font-bold mb-2 text-center">{user.username}</p>
                    <div className="w-64 h-64 mx-auto">
                      <QRCode
                        size={256}
                        value={user.walletId}
                        viewBox={`0 0 256 256`}
                        className="w-full h-full"
                      />
                    </div>
                    <p className="text-center mt-2 text-sm font-medium bg-gray-100 p-2 rounded">
                      {user.walletId}
                    </p>
                  </div>
                  <p className="text-center text-sm text-gray-600">
                    Share this QR code with others to receive payments directly to your wallet
                  </p>
                  <Button 
                    onClick={handleSaveQRCode}
                    className="bg-wallet-blue hover:bg-blue-600 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Save QR Code
                  </Button>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="net-banking">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Net Banking</h2>
                <p className="text-gray-600 mb-4">
                  Transfer money directly from your bank account
                </p>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                    <h3 className="font-medium text-blue-800 mb-2">Your Banking Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-1">
                          Select Your Bank
                        </label>
                        <select
                          id="bank"
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose your bank</option>
                          {banks.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="walletId" className="block text-sm font-medium text-gray-700 mb-1">
                          Wallet ID
                        </label>
                        <Input
                          id="walletId"
                          placeholder="Enter your wallet ID"
                          value={walletId || user?.walletId || ""}
                          onChange={(e) => setWalletId(e.target.value)}
                          className="w-full font-mono"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Your Account Number
                        </label>
                        <Input
                          id="accountNumber"
                          placeholder="Enter your account number"
                          value={accountNumber || user?.accountNumber || ""}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full font-mono"
                        />
                      </div>

                      <div>
                        <label htmlFor="bankingPin" className="block text-sm font-medium text-gray-700 mb-1">
                          Banking PIN
                        </label>
                        <Input
                          id="bankingPin"
                          type="password"
                          maxLength={4}
                          placeholder="Enter any 4-digit PIN"
                          value={bankingPin}
                          onChange={(e) => {
                            setBankingPin(e.target.value.replace(/\D/g, ''));
                            setShowBankingPinError(false);
                          }}
                          className={`w-full ${showBankingPinError ? 'border-red-500' : ''}`}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number (to receive OTP)
                        </label>
                        <Input
                          id="phoneNumber"
                          placeholder="Enter your phone number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                    <h3 className="font-medium text-green-800 mb-2">Recipient's Details</h3>
                    <div>
                      <label htmlFor="recipientAccountNumber" className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient's Account Number
                      </label>
                      <Input
                        id="recipientAccountNumber"
                        placeholder="Enter recipient's account number"
                        value={recipientAccountNumber}
                        onChange={(e) => setRecipientAccountNumber(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-500" />
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 w-full"
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleNetBankingTransfer}
                    className="w-full bg-wallet-blue hover:bg-blue-600 text-white"
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Processing..." : "Continue"}
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PINInput
        isOpen={showPINDialog}
        onClose={() => setShowPINDialog(false)}
        onVerify={handlePINVerified}
        amount={parseFloat(amount) || 0}
        recipient={recipient}
      />

      <Dialog open={showOTPDialog} onOpenChange={setShowOTPDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Verify Transaction</DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Please enter the OTP sent to your mobile number for this{" "}
              {pendingTransaction && pendingTransaction.amount > 5000 ? "high-value" : ""} transaction
            </DialogDescription>
          </DialogHeader>
          <OTPInput 
            onVerify={handleOTPVerified} 
            onResend={handleResendOTP} 
            expectedOTP={generatedOTP} 
            phoneNumber={pendingTransaction?.phoneNumber || phoneNumber}
            showDemo={false}
            smsStatus={smsStatus}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SendMoney;
