'use client';

import { motion } from 'motion/react';
import { Cpu, Network, Database, Brain, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  courseCount: number;
  code: string;
}

const iconMap: Record<string, React.ElementType> = {
  cpu: Cpu,
  network: Network,
  database: Database,
  brain: Brain,
};

async function loadSubjects(): Promise<Subject[]> {
  try {
    const res = await fetch('/api/knowledge-graph');
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default function KnowledgeGraphPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjects().then((data) => {
      setSubjects(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #27272a 1px, transparent 1px),
              linear-gradient(to bottom, #27272a 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-500/15 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <Network className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">
              学科知识图谱
            </h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-xl">
            探索各学科的课程体系，了解课程之间的依赖关系，点击课程深入知识点
          </p>
        </motion.div>

        {/* Subject cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((subject, index) => {
            const IconComponent = iconMap[subject.icon] || Cpu;
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.15 + 0.2, duration: 0.5 }}
              >
                <Link href={`/knowledge-graph/subject/${subject.id}`}>
                  <div className="group relative">
                    {/* Glow effect on hover */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Card */}
                    <div className="relative bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-6 hover:border-cyan-400/50 transition-all duration-300 backdrop-blur-sm">
                      <div className="flex items-start gap-5">
                        {/* Icon */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-cyan-400/20 rounded-lg blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative p-4 bg-zinc-800/80 rounded-lg border border-zinc-700 group-hover:border-cyan-400/30 transition-colors">
                            <IconComponent className="w-7 h-7 text-zinc-300 group-hover:text-cyan-400 transition-colors" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-zinc-500 font-mono">{subject.code}</span>
                            <h2 className="text-xl font-semibold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                              {subject.name}
                            </h2>
                          </div>
                          <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                            {subject.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 rounded-full text-xs text-zinc-400">
                              <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{subject.courseCount} 门课程</span>
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="flex items-center">
                          <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors transform group-hover:translate-x-1 duration-300" />
                        </div>
                      </div>

                      {/* Bottom accent line */}
                      <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent group-hover:via-cyan-400/30 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}