
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { User, Wallet, Key, LogOut, IndianRupee } from "lucide-react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

const Profile: React.FC = () => {
  const { user, isAuthenticated, logout, getAllUsers } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user) {
      setUsername(user.username);
    }
  }, [isAuthenticated, navigate, user]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleUpdateProfile = async () => {
    if (!user || !username.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid username",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);
    
    try {
      // Check if username is already taken by another user
      const allUsers = await getAllUsers();
      const usernameExists = allUsers.find(u => u.username === username && u.id !== user.id);
      
      if (usernameExists) {
        toast({
          title: "Username Taken",
          description: "This username is already taken. Please choose another.",
          variant: "destructive",
        });
        return;
      }

      // Update username in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { username: username });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword) {
      toast({
        title: "New Password Required",
        description: "Please enter a new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirm password must match",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      // Get current user data from Firestore to verify password
      const userRef = doc(db, 'users', user!.id);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        toast({
          title: "User Not Found",
          description: "User data not found",
          variant: "destructive",
        });
        return;
      }

      const userData = userSnap.data();
      
      // Verify current password
      if (currentPassword !== userData.password) {
        toast({
          title: "Invalid Password",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        return;
      }

      // Update password in Firestore
      await updateDoc(userRef, { password: newPassword });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password change error:", error);
      toast({
        title: "Password Change Failed",
        description: "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="py-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Profile</h1>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Button
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile}
                  className="bg-wallet-blue hover:bg-blue-600 text-white"
                >
                  {isUpdatingProfile ? "Updating..." : "Update Profile"}
                </Button>
              </CardContent>
            </Card>
            
            {/* Wallet Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <span>Wallet Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wallet ID
                  </label>
                  <div className="flex items-center">
                    <Input
                      value={user.walletId}
                      readOnly
                      className="w-full bg-gray-50"
                    />
                    <Button
                      variant="outline"
                      className="ml-2"
                      onClick={() => {
                        navigator.clipboard.writeText(user.walletId);
                        toast({
                          title: "Copied!",
                          description: "Wallet ID copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance
                  </label>
                  <div className="flex items-center">
                    <IndianRupee className="h-4 w-4 mr-1" />
                    <Input
                      value={`${user.balance.toFixed(2)}`}
                      readOnly
                      className="w-full bg-gray-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Security Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <span>Security</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="bg-wallet-blue hover:bg-blue-600 text-white"
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>
            
            {/* Logout Card */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full flex items-center justify-center"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
