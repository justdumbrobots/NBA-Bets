import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Trophy, Home, Users, Menu, X, LogOut, ChevronDown } from 'lucide-react'

const NAV_LINKS = [
  { to: '/', label: 'Picks', icon: Home, exact: true },
  { to: '/community', label: 'Community', icon: Users },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
]

function BasketballIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-orange-400">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2C12 2 8 6 8 12s4 10 4 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2C12 2 16 6 16 12s-4 10-4 10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 12h20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function NavBar() {
  const { user, profile, isAuthenticated, signIn, signOut, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signIn()
    } catch {
      // error handled by auth hook
    } finally {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await signOut()
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'text-orange-400 bg-orange-400/10'
        : 'text-gray-300 hover:text-white hover:bg-gray-700'
    }`

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-3 text-base font-medium transition-colors duration-150 ${
      isActive ? 'text-orange-400 bg-orange-400/10' : 'text-gray-300 hover:text-white hover:bg-gray-700'
    }`

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <BasketballIcon />
            <span className="text-white font-extrabold text-lg tracking-tight group-hover:text-orange-400 transition-colors">
              NBA Picks
            </span>
          </NavLink>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
              <NavLink key={to} to={to} end={exact} className={navLinkClass}>
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {loading ? (
              <div className="w-24 h-8 bg-gray-700 rounded-md animate-pulse" />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full border border-gray-600"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      {(user?.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm text-gray-200 max-w-[120px] truncate">
                    {user?.displayName?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700">
                        <p className="text-sm font-medium text-white truncate">
                          {user?.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                        {profile && (
                          <p className="text-xs text-orange-400 mt-1">
                            {profile.wins ?? 0}W - {profile.losses ?? 0}L
                          </p>
                        )}
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors duration-150"
              >
                {signingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900">
          {NAV_LINKS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={mobileNavLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <div className="px-4 py-3 border-t border-gray-800">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
                      {(user?.displayName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-white">{user?.displayName}</p>
                    {profile && (
                      <p className="text-xs text-orange-400">{profile.wins ?? 0}W - {profile.losses ?? 0}L</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { handleSignIn(); setMenuOpen(false) }}
                disabled={signingIn}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors"
              >
                {signingIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
