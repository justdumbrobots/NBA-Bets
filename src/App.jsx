import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import NavBar from './components/NavBar'
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
        <BrowserRouter>
          <div className="min-h-screen bg-gray-900 text-gray-100">
            <NavBar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/community" element={<Community />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/game/:gameId" element={<GameDetailPage />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
