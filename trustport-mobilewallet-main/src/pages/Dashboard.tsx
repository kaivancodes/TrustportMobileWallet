import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext"; // Assuming AuthContext provides user, isAuthenticated, refreshUserData
import { useTransaction } from "@/context/TransactionContext"; // Assuming TransactionContext provides transactions, refreshTransactions
import { Button } from "@/components/ui/button"; // Assuming shadcn-ui Button
import { Card, CardContent } from "@/components/ui/card"; // Assuming shadcn-ui Card
import { Clipboard, Send, History, BadgeIndianRupee, RefreshCw, Phone } from "lucide-react"; // Assuming lucide-react icons
import { useToast } from "@/hooks/use-toast"; // Assuming shadcn-ui toast hook
import Navbar from "@/components/Navbar"; // Assuming a Navbar component

// Define the expected structure of a Transaction object for clarity
// This should match the structure provided by your TransactionContext
interface Transaction {
    id: string;
    amount: number;
    type: string; // e.g., 'transfer'
    date: string | Date; // Assuming date is a string or Date object
    fromUser: string; // Username or identifier of the sender
    toUser: string; // Username or identifier of the receiver
    // Add other transaction properties if they exist (e.g., description, status)
}

// Define the expected structure of the user object from AuthContext
interface AuthUser {
    username: string;
    walletId: string;
    accountNumber: string;
    phoneNumber: string;
    balance: number;
    // Add other user properties if they exist
}

const Dashboard: React.FC = () => {
    // Consume contexts and hooks
    const { user, isAuthenticated, refreshUserData } = useAuth();
    const { transactions, refreshTransactions } = useTransaction();
    const navigate = useNavigate();
    const { toast } = useToast();

    // State for managing the refreshing indicator
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Effect to redirect to login if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            console.log("User not authenticated, navigating to login.");
            navigate("/login");
        }
    }, [isAuthenticated, navigate]); // Depend on isAuthenticated and navigate

    // Memoize the recent transactions calculation
    // This avoids recalculating and updating state on every render if transactions haven't changed
    const recentTransactions: Transaction[] = useMemo(() => {
        console.log("Recalculating recent transactions.");
        // Sort transactions by date in descending order and take the top 5
        // Assuming transactions are not already sorted or need re-sorting
        const sortedTransactions = [...transactions].sort((a, b) => {
             const dateA = new Date(a.date).getTime();
             const dateB = new Date(b.date).getTime();
             return dateB - dateA; // Descending order
        });
        return sortedTransactions.slice(0, 5);
    }, [transactions]); // Depend only on the transactions array

    // Memoize the date formatting function
    const formatDate = useCallback((date: string | Date): string => {
        if (!date) return ''; // Handle null or undefined date
        try {
             return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
             });
        } catch (error) {
            console.error("Error formatting date:", date, error);
            return 'Invalid Date'; // Handle invalid date strings
        }
    }, []); // No dependencies, function is pure

    // Handler for copying Wallet ID to clipboard
    const copyWalletId = useCallback(() => {
        if (user?.walletId) {
            navigator.clipboard.writeText(user.walletId)
                .then(() => {
                    toast({
                        title: "Copied!",
                        description: "Wallet ID copied to clipboard",
                    });
                    console.log("Wallet ID copied:", user.walletId);
                })
                .catch(err => {
                    console.error("Failed to copy Wallet ID:", err);
                    toast({
                        title: "Copy Failed",
                        description: "Could not copy Wallet ID to clipboard.",
                        variant: "destructive"
                    });
                });
        } else {
             console.warn("Attempted to copy Wallet ID, but user or walletId is missing.");
        }
    }, [user?.walletId, toast]); // Depend on user.walletId and toast

    // Handler for copying Account Number to clipboard
    const copyAccountNumber = useCallback(() => {
        if (user?.accountNumber) {
            navigator.clipboard.writeText(user.accountNumber)
                 .then(() => {
                    toast({
                        title: "Copied!",
                        description: "Account number copied to clipboard",
                    });
                    console.log("Account number copied:", user.accountNumber);
                 })
                 .catch(err => {
                    console.error("Failed to copy Account Number:", err);
                    toast({
                        title: "Copy Failed",
                        description: "Could not copy Account Number to clipboard.",
                        variant: "destructive"
                    });
                 });
        } else {
             console.warn("Attempted to copy Account Number, but user or accountNumber is missing.");
        }
    }, [user?.accountNumber, toast]); // Depend on user.accountNumber and toast

    // Handler for refreshing user data and transactions
    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        console.log("Starting data refresh.");
        try {
            // Use Promise.all to wait for both refresh operations to complete
            await Promise.all([
                refreshUserData(),
                refreshTransactions()
            ]);
            toast({
                title: "Refreshed",
                description: "Account details updated successfully",
            });
            console.log("Data refresh completed successfully.");
        } catch (error) {
            console.error("Error during data refresh:", error);
            toast({
                title: "Refresh Failed",
                description: "Could not update account details.",
                variant: "destructive"
            });
        } finally {
            // Ensure isRefreshing is set to false after promises resolve or reject
            setIsRefreshing(false);
            console.log("Refresh state set to false.");
        }
    }, [refreshUserData, refreshTransactions, toast]); // Depend on refresh functions and toast

    // Display a loading state or null if user data is not yet available
    if (!user) {
        // You might want a loading spinner or skeleton screen here
        console.log("User data not available, rendering null or loading state.");
        return <div>Loading...</div>; // Or a proper loading component
    }

    // Render the dashboard UI
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar component */}
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
                <div className="py-4">
                    {/* Dashboard Header */}
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
                        {/* Refresh Button */}
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            disabled={isRefreshing}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>

                    {/* Balance Card */}
                    <Card className="bg-wallet-green text-white mb-8">
                        <CardContent className="pt-6">
                            <h2 className="text-xl font-semibold mb-2">Your Balance</h2>
                            <p className="text-5xl font-bold mb-4 flex items-center">
                                {/* Indian Rupee Icon */}
                                <BadgeIndianRupee className="h-8 w-8 mr-1" />
                                {/* Display balance formatted to 2 decimal places */}
                                {user.balance.toFixed(2)}
                            </p>
                            <div className="space-y-2">
                                {/* Wallet ID */}
                                <div className="flex items-center">
                                    <p>Wallet ID: {user.walletId}</p>
                                    {/* Copy Wallet ID Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-2 text-white hover:text-white hover:bg-green-600"
                                        onClick={copyWalletId}
                                        aria-label="Copy Wallet ID" // Accessibility
                                    >
                                        <Clipboard className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* Account Number */}
                                <div className="flex items-center">
                                    <p>Account Number: {user.accountNumber}</p>
                                    {/* Copy Account Number Button */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="ml-2 text-white hover:text-white hover:bg-green-600"
                                        onClick={copyAccountNumber}
                                        aria-label="Copy Account Number" // Accessibility
                                    >
                                        <Clipboard className="h-4 w-4" />
                                    </Button>
                                </div>
                                {/* Phone Number */}
                                <div className="flex items-center">
                                    <p>Phone: {user.phoneNumber}</p>
                                    <Phone className="h-4 w-4 ml-2" aria-label="Phone Icon" /> {/* Accessibility */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        {/* Send Money Button */}
                        <Button
                            className="h-14 bg-wallet-blue hover:bg-blue-600 text-white"
                            onClick={() => navigate("/send-money")}
                        >
                            <Send className="mr-2 h-5 w-5" /> Send Money
                        </Button>
                        {/* Transaction History Button */}
                        <Button
                            className="h-14 bg-wallet-green hover:bg-green-600 text-white"
                            onClick={() => navigate("/transactions")}
                        >
                            <History className="mr-2 h-5 w-5" /> Transaction History
                        </Button>
                    </div>

                    {/* Recent Transactions Section */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Recent Transactions</h2>
                        {/* View All Transactions Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/transactions")}
                            className="text-gray-600 hover:text-gray-800" // Improved hover state
                        >
                            View All
                        </Button>
                    </div>

                    {/* Recent Transactions List */}
                    <div className="bg-white rounded-lg shadow">
                        {recentTransactions.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                                {recentTransactions.map((transaction) => (
                                    <div key={transaction.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            {/* Transaction Counterparty */}
                                            <p className="font-medium">
                                                {/* Determine if transaction is outgoing or incoming */}
                                                {transaction.fromUser === user.username
                                                    ? `To: ${transaction.toUser}`
                                                    : `From: ${transaction.fromUser}`}
                                            </p>
                                            {/* Transaction Date and Type */}
                                            <p className="text-sm text-gray-500">
                                                {formatDate(transaction.date)} • {transaction.type.toUpperCase()}
                                            </p>
                                        </div>
                                        {/* Transaction Amount */}
                                        <div className={`font-semibold ${
                                            transaction.fromUser === user.username ? "text-red-500" : "text-green-500"
                                        }`}>
                                            {/* Display +/- sign based on transaction direction */}
                                            {transaction.fromUser === user.username ? "-" : "+"}
                                            ₹{transaction.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Message when no recent transactions
                            <div className="p-8 text-center text-gray-500">
                                <p>No recent transactions</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
