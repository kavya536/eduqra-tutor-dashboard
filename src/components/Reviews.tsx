import { Star, TrendingUp, Users, MessageSquare, Clock, Calendar, Quote } from 'lucide-react';
import { Review } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { useMemo } from 'react';

interface ReviewsProps {
  reviews: Review[];
  profile: any;
}

const getMockRating = (id: string) => {
  if (!id) return 4.5;
  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const random = Math.abs(hash % 7);
  return +(4.2 + (random * 0.1)).toFixed(1);
};

const getMockCount = (id: string) => {
  if (!id) return 100;
  const hash = id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  return 100 + (Math.abs(hash) % 50);
};

export function Reviews({ reviews, profile }: ReviewsProps) {
  const mockR = getMockRating(profile?.id || 'default');
  const mockC = getMockCount(profile?.id || 'default');
  
  const realC = reviews.length;
  const realSum = reviews.reduce((acc, r) => acc + r.rating, 0);

  const displayCount = mockC + realC;
  const displayRating = ((mockR * mockC) + realSum) / displayCount;

  const hasRealReviews = reviews.length > 0;

  // Sort reviews by date and time (most recent first)
  const sortedReviews = useMemo(() => {
    return [...reviews].sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [reviews]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-16 p-4">
      {/* Refined Left-Stat Header */}
      <section className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-primary/5 border border-slate-100 relative overflow-hidden group">
        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14 relative z-10">
          
          {/* LEFT SIDE: Avatar + Focus Stats */}
          <div className="shrink-0 flex flex-col items-center gap-5 md:border-r md:border-slate-100 md:pr-10">
            {/* Sized-Down Avatar */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-50 flex items-center justify-center font-black text-primary text-2xl border-4 border-white shadow-xl ring-1 ring-slate-100 italic">
                AJ
              </div>
              <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-lg" />
            </div>

            {/* Stars & Rating Focus (Left-Aligned below Avatar) */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex text-amber-400 gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={22} className={cn(i <= Math.round(displayRating) ? "fill-amber-400 text-amber-400" : "text-slate-100")} />
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-lg font-black text-on-surface leading-none">{displayRating.toFixed(1)}</span>
                <span className="text-[8px] font-black uppercase tracking-widest text-on-surface/30">Average Rating</span>
              </div>
            </div>

            {/* Combined Stats Row (Left-Aligned) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-6 px-4 py-2 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                <div className="text-center">
                  <div className="text-lg font-black text-on-surface leading-none">{displayCount}</div>
                  <div className="text-[8px] font-black uppercase tracking-tighter text-on-surface/40">Reviews</div>
                </div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="text-center">
                  <div className="text-lg font-black text-on-surface leading-none">99%</div>
                  <div className="text-[8px] font-black uppercase tracking-tighter text-on-surface/40">Success</div>
                </div>
              </div>
              {!hasRealReviews && (
                <div className="px-3 py-1 bg-primary/5 rounded-full border border-primary/10">
                  <p className="text-[7px] font-black text-primary uppercase tracking-[0.1em] text-center">Next review prompt in 2 weeks</p>
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE: Name & Bio (Centralized Focus) */}
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start justify-center">
            <h2 className="text-2xl font-black text-on-surface tracking-tight italic">Alex Johnson</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mt-1 opacity-60">Professional Mathematics & Physics Tutor</p>
            
            <div className="mt-2">
              <p className="text-on-surface/70 text-sm font-medium leading-relaxed max-w-lg italic">
                "Empowering students to master complex concepts through personalized guidance and analytical problem-solving techniques."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Students Review Stream */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-4 pt-6">
            <h3 className="text-lg font-bold text-on-surface tracking-tight italic">Student Feedback Stream</h3>
            <div className="flex-1 h-px bg-slate-100" />
            <div className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> Recent First
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {sortedReviews.map((review, index) => (
            <motion.div 
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-md border border-slate-50 flex flex-col gap-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-black text-xl border-2 border-white shadow-sm italic">
                    {((review as any).studentName || review.name || 'S')[0]}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-on-surface tracking-tight flex items-center gap-2 italic">
                      {(review as any).studentName || review.name}
                      <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest not-italic">Verified</span>
                    </h5>
                    <p className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{review.subject}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex text-amber-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={14} className={cn(i <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-100")} />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-on-surface/30">{review.date} • {review.time}</span>
                </div>
              </div>
              <p className="text-on-surface text-sm font-medium italic leading-relaxed pl-4 border-l-4 border-primary/10">
                "{(review as any).comment || review.text}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
