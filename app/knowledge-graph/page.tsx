'use client';

import { motion } from 'motion/react';
import { Database, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import courseIndex from '@/lib/data/knowledge-graphs/index.json';

const iconMap: Record<string, React.ElementType> = {
  database: Database,
};

export default function KnowledgeGraphPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          知识图谱
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          探索课程知识体系，点击知识点开始学习
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courseIndex.map((course, index) => {
            const IconComponent = iconMap[course.icon] || Database;
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/knowledge-graph/${course.id}`}>
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        <IconComponent className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {course.name}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {course.description}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {course.nodeCount} 个知识点
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
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