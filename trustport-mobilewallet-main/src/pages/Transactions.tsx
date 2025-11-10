
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTransaction, Transaction } from "@/context/TransactionContext";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { SearchIcon, Filter, IndianRupee, ClipboardCopy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Transactions: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { transactions, refreshTransactions } = useTransaction();
  const navigate = useNavigate();
  const { toast } = useToast();
  

  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      refreshTransactions();
    }
  }, [isAuthenticated, navigate, refreshTransactions]);

  useEffect(() => {
    if (user && transactions.length > 0) {
      let userTransactions = transactions.filter(txn => 
        txn.fromUserId === user.id || txn.toUserId === user.id
      );
      
      let filtered = [...userTransactions];

      if (searchQuery) {
        filtered = filtered.filter(
          (txn) =>
            txn.toUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.fromUser.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      if (typeFilter !== "all") {
        filtered = filtered.filter((txn) => txn.type === typeFilter);
      }

      if (dateFilter !== "all") {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        filtered = filtered.filter((txn) => {
          const txnDate = new Date(txn.date);
          switch (dateFilter) {
            case "today":
              return txnDate >= today;
            case "yesterday":
              return txnDate >= yesterday && txnDate < today;
            case "week":
              return txnDate >= lastWeek;
            case "month":
              return txnDate >= lastMonth;
            default:
              return true;
          }
        });
      }

      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions([]);
    }
  }, [transactions, searchQuery, typeFilter, dateFilter, user]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "wallet":
        return "Wallet Transfer";
      case "bank":
        return "Bank Transfer";
      case "qr":
        return "QR Payment";
      default:
        return type;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Transaction ID copied to clipboard",
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Transaction History</h1>
          
          <div className="mb-6 space-y-4">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-500 mb-1">
                  Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="wallet">Wallet Transfer</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="qr">QR Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-500 mb-1">
                  Date
                </label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("all");
                    setDateFilter("all");
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
          
          <Card className="overflow-hidden">
            {filteredTransactions.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {transaction.fromUser === user.username
                            ? `To: ${transaction.toUser}`
                            : `From: ${transaction.fromUser}`}
                        </p>
                        
                        <div className="text-xs text-gray-500 mt-1 flex items-center">
                          <span className="flex items-center gap-1">
                            Transaction ID: 
                            <span className="font-mono">{transaction.id.substring(4, 12)}</span>
                            <button 
                              onClick={() => copyToClipboard(transaction.id)}
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              <ClipboardCopy className="h-3 w-3" />
                            </button>
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                          <span>{formatDate(transaction.date)}</span>
                          <span>•</span>
                          <span>{getTransactionTypeLabel(transaction.type)}</span>
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs">
                            {transaction.status}
                          </span>
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 mt-1">{transaction.description}</p>
                        )}
                      </div>
                      <div className={`font-semibold flex items-center ${
                        transaction.fromUser === user.username ? "text-red-500" : "text-green-500"
                      }`}>
                        {transaction.fromUser === user.username ? "-" : "+"}
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>No transactions found</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
