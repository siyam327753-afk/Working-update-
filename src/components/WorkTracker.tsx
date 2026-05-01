import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { WorkLog } from '../lib/types';
import { Plus, Trash2, Calendar, Clock, BarChart3, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parse, differenceInMinutes, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { cn } from '../lib/utils';

interface Props {
  user: User;
}

export default function WorkTracker({ user }: Props) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'logs'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkLog[];
      setLogs(docs);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error:", err);
      setError("Failed to load logs. Please check your permissions.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const calculateHours = (s: string, e: string) => {
    const startTime = parse(s, 'HH:mm', new Date());
    let endTime = parse(e, 'HH:mm', new Date());
    
    // If end time is before start time, assume it's next day
    if (endTime < startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const minutes = differenceInMinutes(endTime, startTime);
    return minutes / 60;
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !start || !end) return;

    setIsSubmitting(true);
    setError(null);

    const total = calculateHours(start, end);

    try {
      await addDoc(collection(db, 'logs'), {
        uid: user.uid,
        date,
        start,
        end,
        total: parseFloat(total.toFixed(2)),
        createdAt: serverTimestamp()
      });
      // Success feedback or reset form
      // setDate(format(new Date(), 'yyyy-MM-dd')); // Reset date? Maybe keep it for multiple entries
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'logs');
      setError("Failed to save log. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'logs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `logs/${id}`);
      setError("Failed to delete log.");
    }
  };

  // Stats
  const totalHoursWeek = logs
    .filter(log => {
      const logDate = parse(log.date, 'yyyy-MM-dd', new Date());
      return isWithinInterval(logDate, {
        start: startOfWeek(new Date()),
        end: endOfWeek(new Date())
      });
    })
    .reduce((sum, log) => sum + log.total, 0);

  const totalHoursAllTime = logs.reduce((sum, log) => sum + log.total, 0);

  // Monthly Breakdown Logic
  const monthlyStats = logs.reduce((acc, log) => {
    const logDate = parse(log.date, 'yyyy-MM-dd', new Date());
    const monthKey = format(logDate, 'MMMM yyyy');
    acc[monthKey] = (acc[monthKey] || 0) + log.total;
    return acc;
  }, {} as Record<string, number>);

  const sortedMonths = Object.keys(monthlyStats).sort((a, b) => {
    return parse(b, 'MMMM yyyy', new Date()).getTime() - parse(a, 'MMMM yyyy', new Date()).getTime();
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Form and Stats */}
      <div className="lg:col-span-4 space-y-6">
        {/* Stats Card */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <BarChart3 className="w-16 h-16" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistics
          </h2>
          <div className="space-y-6">
            <div>
              <p className="text-3xl font-light tracking-tight">{totalHoursWeek.toFixed(1)} <span className="text-sm font-medium text-gray-400">HRS</span></p>
              <p className="text-xs font-medium text-gray-500 mt-1">Total this week</p>
            </div>
            <div className="h-[1px] bg-gray-100" />
            <div>
              <p className="text-xl font-light tracking-tight">{totalHoursAllTime.toFixed(1)} <span className="text-xs font-medium text-gray-400">HRS</span></p>
              <p className="text-xs font-medium text-gray-500 mt-1">Total all-time</p>
            </div>
          </div>
        </section>

        {/* Monthly Breakdown Card */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 min-h-[200px]">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly List
          </h2>
          {sortedMonths.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No monthly data yet.</p>
          ) : (
            <div className="space-y-4">
              {sortedMonths.map(month => (
                <div key={month} className="flex justify-between items-center group">
                  <span className="text-sm font-medium text-gray-700">{month}</span>
                  <span className="text-sm font-bold tabular-nums bg-gray-50 px-2 py-1 rounded-lg group-hover:bg-gray-100 transition-colors">
                    {monthlyStats[month].toFixed(1)} <span className="text-[10px] text-gray-400 font-medium ml-1">HRS</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Log Form */}
        <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Entry
          </h2>
          <form onSubmit={handleAddLog} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">Start</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-gray-400 ml-1">End</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-gray-900 transition-all outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-semibold tracking-tight hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200 active:scale-[0.98]"
            >
              {isSubmitting ? "Saving..." : "Update Log"}
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}
        </section>
      </div>

      {/* Right Column: List of History */}
      <div className="lg:col-span-8 flex flex-col">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            History
          </h2>
          <span className="text-[10px] font-bold text-gray-400 px-2 py-1 bg-white rounded-full border border-gray-100">
            {logs.length} ENTRIES
          </span>
        </div>

        {loading ? (
          <div className="flex-1 bg-white/50 rounded-[32px] border border-dashed border-gray-200 flex items-center justify-center min-h-[400px]">
             <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Clock className="w-6 h-6 text-gray-300" />
            </motion.div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 bg-white/50 rounded-[32px] border border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
              <Calendar className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium tracking-tight">No work logs found</p>
            <p className="text-xs text-gray-400 mt-1">Start tracking your time by adding your first entry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-gray-300 transition-all flex items-center gap-6"
                >
                  <div className="hidden sm:block">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-gray-100 transition-colors">
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold tracking-tight">
                        {format(parse(log.date, 'yyyy-MM-dd', new Date()), 'EEE, MMM d')}
                      </span>
                      {isWithinInterval(parse(log.date, 'yyyy-MM-dd', new Date()), { start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) && (
                        <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-md font-bold tracking-wider uppercase">This Week</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 opacity-50" />
                        {log.start} — {log.end}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-6">
                    <div>
                      <p className="text-lg font-bold tracking-tight text-gray-900">{log.total}<span className="text-[10px] text-gray-400 ml-1">H</span></p>
                    </div>
                    
                    <button
                      onClick={() => log.id && handleDelete(log.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all sm:opacity-0 group-hover:opacity-100 opacity-100"
                      title="Remove Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
