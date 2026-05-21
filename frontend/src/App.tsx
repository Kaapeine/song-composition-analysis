import { useEffect, useState } from 'react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppHeader } from './AppHeader'
import { UploadPage } from './features/upload/UploadPage'
import { ResultsPage } from './features/results/ResultsPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
})

function Layout() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <>
      <AppHeader
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <UploadPage /> },
      { path: '/analysis/:jobId', element: <ResultsPage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
