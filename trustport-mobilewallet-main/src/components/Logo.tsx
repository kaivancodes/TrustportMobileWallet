
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface LogoProps {
  size?: "small" | "medium" | "large";
}

const Logo: React.FC<LogoProps> = ({ size = "medium" }) => {
  const { isAuthenticated } = useAuth();
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-12 h-12",
    large: "w-16 h-16",
  };

  // Define the destination based on authentication status
  const destination = isAuthenticated ? "/dashboard" : "/login";

  return (
    <Link to={destination} className="flex items-center group transition-all duration-300">
      <div className={`font-bold ${sizeClasses[size]} relative overflow-hidden rounded-lg transform transition-transform group-hover:scale-105`}>
        <img 
          src="/lovable-uploads/e3054b10-bfbf-4c9c-8e0b-cf6fa9623309.png" 
          alt="Trust Port"
          className="h-full w-auto object-contain transition-all duration-300 group-hover:brightness-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </Link>
  );
};

export default Logo;
