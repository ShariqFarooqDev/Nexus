import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Features from './pages/Features';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Documentation from './pages/Documentation';
import Help from './pages/Help';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import GetStarted from './pages/GetStarted';
import { Auth } from './pages/Auth';
import ScrollToTop from './components/ScrollToTop';
import NotFoundPage from './pages/NotFoundPage';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/signup" element={<Auth />} />
            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="how-it-works" element={<HowItWorks />} />
              <Route path="features" element={<Features />} />
              <Route path="blog" element={<Blog />} />
              <Route path="contact" element={<Contact />} />
              <Route path="documentation" element={<Documentation />} />
              <Route path="help" element={<Help />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="get-started" element={<GetStarted />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;