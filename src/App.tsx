import { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, signInWithGoogle } from './lib/firebase';
import WorkTracker from './components/WorkTracker';
import { LogOut, Layout, Clock, User as UserIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Clock className="w-8 h-8 text-gray-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-900 font-sans selection:bg-gray-200">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
              <div className="mb-6 inline-flex p-4 bg-gray-50 rounded-full">
                <Clock className="w-10 h-10 text-gray-900" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Work Tracker</h1>
              <p className="text-gray-500 text-sm mb-8">আমার ডেইলি আপডেট - Track your daily performance</p>
              
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 py-3 px-4 rounded-2xl font-medium hover:bg-gray-50 transition-colors shadow-sm active:scale-[0.98]"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                Sign in with Google
              </button>
            </div>
          </motion.div>
        ) : !user.emailVerified ? (
          <motion.div
            key="verify"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex items-center justify-center p-4"
          >
            <div className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 text-center">
              <div className="mb-6 inline-flex p-4 bg-amber-50 rounded-full">
                <AlertCircle className="w-10 h-10 text-amber-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-2">Verification Required</h1>
              <p className="text-gray-500 text-sm mb-8">Please verify your email address to start tracking your work hours.</p>
              <button
                onClick={() => signOut(auth)}
                className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Sign out and try another account
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-4xl mx-auto p-4 md:p-8"
          >
            <header className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                  <Layout className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">Work Tracker</h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 group cursor-default">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || "User"} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">{user.displayName || "User"}</span>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  className="p-2 hover:bg-white hover:text-red-500 rounded-xl transition-all hover:shadow-sm border border-transparent hover:border-gray-100 text-gray-400"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </header>

            <main>
              <WorkTracker user={user} />
            </main>

            <footer className="mt-16 pt-8 border-t border-gray-200/60 text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium">Work Tracker &copy; 2026 — Built with Precision</p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
