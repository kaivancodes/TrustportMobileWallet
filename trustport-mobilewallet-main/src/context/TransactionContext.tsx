import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Transaction {
  id: string;
  fromUser: string;
  fromUserId: string;
  toUser: string;
  toUserId: string;
  amount: number;
  type: "wallet" | "bank" | "qr";
  status: "completed" | "pending" | "failed";
  date: Date;
  description?: string;
}

interface TransactionContextType {
  transactions: Transaction[];
  sendMoney: (recipient: string, amount: number, type: "wallet" | "bank" | "qr", phoneNumber?: string) => Promise<{ success: boolean, message: string, requiresOTP?: boolean, otp?: string, requiresPIN?: boolean, smsStatus?: 'success' | 'failed' }>;
  generateOTP: () => string;
  verifyOTP: (otp: string, providedOTP: string) => boolean;
  getTransactionHistory: () => Promise<Transaction[]>;
  sendOTPViaSMS: (phoneNumber: string, otp: string) => Promise<boolean>;
  refreshTransactions: () => Promise<void>;
  processTransactionAfterVerification: (recipient: string, amount: number, type: "wallet" | "bank" | "qr") => Promise<{ success: boolean, message: string }>;
}

const TransactionContext = createContext<TransactionContextType>({
  transactions: [],
  sendMoney: async () => ({ success: false, message: "Context not initialized" }),
  generateOTP: () => "",
  verifyOTP: () => false,
  getTransactionHistory: async () => [],
  sendOTPViaSMS: async () => false,
  refreshTransactions: async () => {},
  processTransactionAfterVerification: async () => ({ success: false, message: "Context not initialized" }),
});

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { user, updateUserBalance, getAllUsers, refreshUserData } = useAuth();
  const { toast } = useToast();

  const refreshTransactions = async () => {
    if (!user) return;

    try {
      console.log('Fetching transactions for user:', user.id);
      
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      const users = await getAllUsers();
      const usersMap = new Map(users.map(u => [u.id, u]));

      const formattedTransactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Only include transactions involving the current user
        if (data.fromUserId === user.id || data.toUserId === user.id) {
          const sender = usersMap.get(data.fromUserId) || { username: 'Unknown' };
          const receiver = usersMap.get(data.toUserId) || { username: 'Unknown' };
          
          formattedTransactions.push({
            id: doc.id,
            fromUser: sender.username,
            fromUserId: data.fromUserId,
            toUser: receiver.username,
            toUserId: data.toUserId,
            amount: data.amount,
            type: data.type || "wallet",
            status: data.status || "completed",
            date: data.createdAt ? new Date(data.createdAt) : new Date(),
            description: data.description
          });
        }
      });

      console.log('Formatted transactions:', formattedTransactions);
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error('Error in refreshTransactions:', error);
      toast({
        title: "Database Error",
        description: "Failed to fetch transaction history",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User detected, refreshing transactions');
      refreshTransactions();
    }
  }, [user]);

  const findRecipientUser = async (recipient: string, type: "wallet" | "bank" | "qr") => {
    console.log(`=== FINDING RECIPIENT ===`);
    console.log(`Search term: "${recipient}"`);
    console.log(`Transaction type: ${type}`);
    
    const users = await getAllUsers();
    console.log(`Total users available: ${users.length}`);
    
    // Log all users with their account details for debugging
    users.forEach((u, index) => {
      console.log(`User ${index + 1}:`, {
        id: u.id,
        username: u.username,
        walletId: u.walletId,
        accountNumber: u.accountNumber,
        accountNumberType: typeof u.accountNumber
      });
    });

    let recipientUser;
    
    if (type === "bank") {
      console.log(`=== BANK TRANSFER LOOKUP ===`);
      console.log(`Looking for account number: "${recipient}"`);
      
      // Clean the recipient input
      const cleanRecipient = String(recipient).trim();
      console.log(`Cleaned recipient: "${cleanRecipient}"`);
      
      recipientUser = users.find(u => {
        if (!u.accountNumber) {
          console.log(`User ${u.username}: No account number`);
          return false;
        }
        
        // Convert account number to string and clean it
        const userAccountStr = String(u.accountNumber).trim();
        console.log(`User ${u.username}: account "${userAccountStr}" vs search "${cleanRecipient}"`);
        
        const matches = userAccountStr === cleanRecipient;
        console.log(`Match result: ${matches}`);
        
        return matches;
      });
    } else {
      console.log(`=== WALLET/QR TRANSFER LOOKUP ===`);
      // For wallet/qr transfers, search by username, walletId, or account number
      recipientUser = users.find(u => {
        const usernameMatch = u.username === recipient;
        const walletMatch = u.walletId === recipient;
        const accountMatch = u.accountNumber && String(u.accountNumber).trim() === String(recipient).trim();
        
        console.log(`User ${u.username}:`, {
          username: u.username,
          walletId: u.walletId,
          accountNumber: u.accountNumber,
          usernameMatch,
          walletMatch,
          accountMatch
        });
        
        return usernameMatch || walletMatch || accountMatch;
      });
    }

    if (recipientUser) {
      console.log(`=== RECIPIENT FOUND ===`);
      console.log('Found recipient:', {
        id: recipientUser.id,
        username: recipientUser.username,
        walletId: recipientUser.walletId,
        accountNumber: recipientUser.accountNumber
      });
    } else {
      console.log(`=== RECIPIENT NOT FOUND ===`);
      console.log(`No user found with ${type === 'bank' ? 'account number' : 'username/wallet ID'}: "${recipient}"`);
    }

    return recipientUser;
  };

  const sendMoney = async (
    recipient: string,
    amount: number,
    type: "wallet" | "bank" | "qr",
    phoneNumber?: string
  ): Promise<{ success: boolean; message: string; requiresOTP?: boolean; otp?: string; requiresPIN?: boolean; smsStatus?: 'success' | 'failed' }> => {
    if (!user) {
      return { success: false, message: "You must be logged in" };
    }

    try {
      console.log(`=== STARTING TRANSACTION ===`);
      console.log(`Amount: ${amount}`);
      console.log(`Recipient: "${recipient}"`);
      console.log(`Type: ${type}`);
      console.log(`Phone: ${phoneNumber}`);

      const recipientUser = await findRecipientUser(recipient, type);

      if (!recipientUser) {
        console.log(`=== TRANSACTION FAILED - RECIPIENT NOT FOUND ===`);
        return { 
          success: false, 
          message: `Recipient not found. Please check the ${type === 'bank' ? 'account number' : 'username/wallet ID'}.` 
        };
      }

      if (amount <= 0) {
        return { success: false, message: "Amount must be greater than 0" };
      }

      if (amount > user.balance) {
        return { success: false, message: "Insufficient funds" };
      }

      // Check if PIN is required for wallet transactions above ₹500
      if (type === "wallet" && amount > 500) {
        return { 
          success: true, 
          message: "PIN verification required", 
          requiresPIN: true 
        };
      }

      // Check if OTP is required (amounts above ₹5000 or net banking)
      if (amount > 5000 || type === "bank") {
        const userPhone = phoneNumber || user?.phoneNumber;
        if (!userPhone) {
          return { success: false, message: "Phone number required for verification" };
        }
        
        const otp = generateOTP();
        
        // Send OTP via SMS
        const smsResult = await sendOTPViaSMS(userPhone, otp);
        
        return { 
          success: true, 
          message: "OTP sent for verification", 
          requiresOTP: true, 
          otp: otp,
          smsStatus: smsResult ? 'success' : 'failed'
        };
      }

      // Process transaction directly for smaller amounts
      const result = await processTransaction(recipientUser, amount, type);
      return result;

    } catch (error) {
      console.error("Transaction error:", error);
      return { success: false, message: "An error occurred during the transaction" };
    }
  };

  const processTransactionAfterVerification = async (recipient: string, amount: number, type: "wallet" | "bank" | "qr") => {
    try {
      console.log(`=== PROCESSING AFTER VERIFICATION ===`);
      console.log('Recipient:', recipient);
      console.log('Amount:', amount);
      console.log('Type:', type);

      const recipientUser = await findRecipientUser(recipient, type);

      if (!recipientUser) {
        console.error('=== VERIFICATION FAILED - RECIPIENT NOT FOUND ===');
        return { success: false, message: "Recipient not found" };
      }

      const result = await processTransaction(recipientUser, amount, type);
      return result;
    } catch (error) {
      console.error("Error in processTransactionAfterVerification:", error);
      return { success: false, message: "Transaction processing failed" };
    }
  };

  const processTransaction = async (recipientUser: any, amount: number, type: "wallet" | "bank" | "qr") => {
    try {
      console.log(`=== PROCESSING TRANSACTION ===`);
      console.log('Recipient user:', recipientUser);
      console.log('Amount:', amount);
      console.log('Type:', type);

      // Update sender's balance
      await updateUserBalance(user!.balance - amount);

      // Update recipient's balance
      const recipientRef = doc(db, 'users', recipientUser.id);
      await updateDoc(recipientRef, { balance: recipientUser.balance + amount });

      // Create transaction record
      const transactionData = {
        fromUserId: user!.id,
        toUserId: recipientUser.id,
        amount: amount,
        type: type,
        status: 'completed',
        description: `${type === 'bank' ? 'Bank transfer' : 'Payment'} to ${recipientUser.username}`,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'transactions'), transactionData);

      // Refresh data
      await refreshUserData();
      await refreshTransactions();

      console.log(`=== TRANSACTION COMPLETED SUCCESSFULLY ===`);
      return { success: true, message: "Transaction completed successfully" };
    } catch (error) {
      console.error("Error in processTransaction:", error);
      return { success: false, message: "Transaction processing failed" };
    }
  };

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const verifyOTP = (otp: string, providedOTP: string): boolean => {
    return otp === providedOTP;
  };

  const sendOTPViaSMS = async (phoneNumber: string, otp: string): Promise<boolean> => {
    try {
      console.log(`Attempting to send OTP ${otp} to ${phoneNumber}`);
      
      const message = `Your TrustPort verification code is: ${otp}. Do not share this code with anyone.`;
      
      // Call the SMS API endpoint
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message,
          isEmail: false
        }),
      });

      if (!response.ok) {
        console.error('SMS API returned error status:', response.status);
        return false;
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('SMS sent successfully via Infobip');
        toast({
          title: "OTP Sent",
          description: `Verification code sent to ${phoneNumber}`,
        });
        return true;
      } else {
        console.error('SMS sending failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  };

  const getTransactionHistory = async (): Promise<Transaction[]> => {
    return transactions;
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        sendMoney,
        generateOTP,
        verifyOTP,
        getTransactionHistory,
        sendOTPViaSMS,
        refreshTransactions,
        processTransactionAfterVerification
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = () => useContext(TransactionContext);
