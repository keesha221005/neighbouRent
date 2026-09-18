import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[68px]">

          {/* Logo */}
          <Link to="/listings" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center">
              <img src="/logo.jpg" alt="NeighbouRent" className="w-7 h-7 object-contain rounded-lg" />
            </div>
            <span className="brand-font text-[var(--color-ink)] text-[19px]">NeighbouRent</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1.5">
            <Link to="/listings"
              className="btn-bounce text-[var(--color-ink)]/70 hover:text-[var(--color-ink)] hover:bg-gray-50 font-display font-semibold text-sm transition-colors px-3.5 py-2 rounded-xl">
              Browse
            </Link>

            {isLoggedIn ? (
              <>
                <Link to="/list-item"
                  className="btn-bounce flex items-center gap-1.5 bg-[var(--color-violet-light)] text-[var(--color-violet)] hover:bg-[var(--color-violet)] hover:text-white font-display font-bold text-sm transition-colors px-4 py-2 rounded-xl">
                  + List item
                </Link>

                {/* Profile dropdown */}
                <div className="relative ml-2" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen((o) => !o)}
                    className="btn-bounce flex items-center gap-2 hover:bg-gray-50 pl-1.5 pr-3 py-1.5 rounded-2xl transition-colors"
                  >
                    <div className="w-8 h-8 bg-[var(--color-ink)] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-display font-bold text-[var(--color-ink)] hidden sm:block">
                      {user?.name?.split(" ")[0]}
                    </span>
                    <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-display font-bold text-[var(--color-ink)] truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                      </div>

                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]/80 hover:bg-[var(--color-bg)] transition-colors">
                        <span>📊</span> Dashboard
                      </Link>
                      <Link to="/profile" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]/80 hover:bg-[var(--color-bg)] transition-colors">
                        <span>👤</span> My Profile
                      </Link>
                      <Link to="/list-item" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[var(--color-ink)]/80 hover:bg-[var(--color-bg)] transition-colors">
                        <span>📦</span> List an Item
                      </Link>

                      <div className="border-t border-gray-50 mt-1 pt-1">
                        <button onClick={handleLogout}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-[var(--color-coral)] hover:bg-[var(--color-coral-light)] transition-colors">
                          <span>🚪</span> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login"
                  className="btn-bounce text-[var(--color-ink)]/70 hover:text-[var(--color-ink)] font-display font-semibold text-sm px-3.5 py-2 rounded-xl transition-colors">
                  Login
                </Link>
                <Link to="/register"
                  className="btn-bounce bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-display font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}