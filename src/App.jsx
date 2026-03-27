import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { SportProvider } from './context/SportContext'
import NavBar from './components/NavBar'
import SportSidebar from './components/SportSidebar'
import Home from './pages/Home'
import Community from './pages/Community'
import LeaderboardPage from './pages/LeaderboardPage'
import GameDetailPage from './pages/GameDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SportProvider>
          <BrowserRouter>
            <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
              <NavBar />
              <div className="flex flex-1 min-h-0">
                <SportSidebar />
                <main className="flex-1 min-w-0">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/game/:gameId" element={<GameDetailPage />} />
                  </Routes>
                </main>
              </div>
            </div>
          </BrowserRouter>
        </SportProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

