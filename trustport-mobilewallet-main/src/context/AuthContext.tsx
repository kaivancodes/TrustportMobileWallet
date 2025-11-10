import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  walletId: string;
  accountNumber: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (username: string, email: string, password: string, accountNumber: string, phoneNumber: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  updateUserBalance: (newBalance: number) => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => ({ success: false, message: "Context not initialized" }),
  register: async () => ({ success: false, message: "Context not initialized" }),
  logout: () => {},
  updateUserBalance: async () => {},
  getAllUsers: async () => [],
  refreshUserData: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing stored user:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const register = async (username: string, email: string, password: string, accountNumber: string, phoneNumber: string) => {
    try {
      console.log('Starting registration process...');
      
      // Check if username already exists
      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username', '==', username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        return { success: false, message: 'Username already exists' };
      }

      // Check if email already exists
      const emailQuery = query(usersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return { success: false, message: 'Email already exists' };
      }

      // Generate wallet ID
      const walletId = `wallet_${Date.now()}`;

      // Create user document with initial balance of 1000 rupees
      const userDoc = await addDoc(usersRef, {
        username,
        email,
        password,
        accountNumber,
        phoneNumber,
        walletId,
        balance: 1000, // Initial funds of 1000 rupees
        createdAt: new Date().toISOString()
      });

      console.log('User registered successfully with initial funds:', userDoc.id);
      return { success: true, message: 'Registration successful' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return { success: false, message: "User not found" };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      if (userData.password !== password) {
        return { success: false, message: "Invalid password" };
      }

      const loggedInUser: User = {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        balance: userData.balance || 0,
        walletId: userData.walletId || "",
        accountNumber: userData.accountNumber || "",
        phoneNumber: userData.phoneNumber || "",
      };

      setUser(loggedInUser);
      setIsAuthenticated(true);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return { success: true, message: "Login successful" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "Login failed" };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("user");
  };

  const updateUserBalance = async (newBalance: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, { balance: newBalance });

      setUser({ ...user, balance: newBalance });
      localStorage.setItem("user", JSON.stringify({ ...user, balance: newBalance }));
    } catch (error) {
      console.error("Error updating balance:", error);
      throw error;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username || "",
          email: data.email || "",
          balance: data.balance || 0,
          walletId: data.walletId || "",
          accountNumber: data.accountNumber || "",
          phoneNumber: data.phoneNumber || "",
        };
      });
    } catch (error) {
      console.error("Error getting users:", error);
      return [];
    }
  };

  const refreshUserData = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.id);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const refreshedUser: User = {
          ...user,
          balance: userData.balance || 0,
          walletId: userData.walletId || "",
          accountNumber: userData.accountNumber || "",
          phoneNumber: userData.phoneNumber || "",
        };
        
        setUser(refreshedUser);
        localStorage.setItem("user", JSON.stringify(refreshedUser));
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateUserBalance,
        getAllUsers,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
