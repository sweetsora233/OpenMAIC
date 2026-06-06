'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Graph } from '@antv/g6';
import { ArrowLeft, Sparkles, Zap, X, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CourseNode {
  id: string;
  label: string;
  level?: number;
  description?: string;
}

interface CourseEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
}

interface SubjectData {
  id: string;
  name: string;
  description: string;
  metadata?: { totalNodes: number; totalEdges: number; version: string };
  nodes: CourseNode[];
  edges: CourseEdge[];
  relationTypes?: Record<string, { label: string; description: string; color: string }>;
}

async function loadSubjectData(subjectId: string): Promise<SubjectData | null> {
  try {
    const res = await fetch(`/api/knowledge-graph/${subjectId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function SubjectGraphContent({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CourseNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubjectData(subjectId).then((data) => {
      setSubjectData(data);
      setLoading(false);
    });
  }, [subjectId]);

  useEffect(() => {
    if (!subjectData || !containerRef.current) return;

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight || 500;

    const nodes = subjectData.nodes.map((node: CourseNode) => ({
      id: node.id,
      data: {
        label: node.label,
        description: node.description || '',
        level: node.level || 3,
      },
    }));

    const edges = subjectData.edges.map((edge: CourseEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data: {
        label: edge.label,
        type: edge.type,
        color: edge.type === 'prerequisite' ? '#3b82f6' : '#6b7280',
        dashed: edge.type !== 'prerequisite',
      },
    }));

    const graph = new Graph({
      container: containerRef.current,
      width,
      height,
      data: { nodes, edges },
      node: {
        type: 'circle',
        style: {
          size: 55,
          labelText: (d: any) => d.data?.label,
          labelFill: '#e4e4e7',
          labelFontSize: 12,
          labelFontWeight: 500,
          labelOffsetY: 8,
          fill: '#18181b',
          stroke: '#22d3ee',
          lineWidth: 2,
          cursor: 'pointer',
          shadowColor: '#22d3ee',
          shadowBlur: 12,
        },
        state: {
          hover: { lineWidth: 3, shadowBlur: 20, scale: 1.1 },
          selected: { lineWidth: 4, shadowBlur: 25, scale: 1.15 },
        },
        animation: false,
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: any) => d.data?.color || '#71717a',
          lineWidth: 2,
          endArrow: true,
          endArrowSize: 6,
          endArrowFill: (d: any) => d.data?.color || '#71717a',
          labelText: (d: any) => d.data?.label,
          labelFill: '#a1a1aa',
          labelFontSize: 9,
          labelBackground: true,
          labelBackgroundFill: '#18181b',
          labelBackgroundOpacity: 0.85,
          labelBackgroundPadding: [2, 4, 2, 4],
          lineDash: (d: any) => d.data?.dashed ? [5, 3] : [],
          opacity: 0.85,
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'click-select'],
      layout: {
        type: 'dagre',
        direction: 'LR',
        nodeSep: 50,
        rankSep: 100,
        preventOverlap: true,
      },
      autoFit: 'view',
      padding: [40, 40, 40, 40],
    });

    graph.render();

    graph.on('node:click', (event: unknown) => {
      const nodeId = (event as any).itemId || (event as any).target?.id;
      const node = subjectData.nodes.find((n: CourseNode) => n.id === nodeId);
      if (node) {
        setSelectedCourse(node);
      }
    });

    graphRef.current = graph;

    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.resize(
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight || 500,
        );
        graphRef.current.fitView();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      graph.destroy();
    };
  }, [subjectData]);

  const handleViewCourse = () => {
    if (!selectedCourse) return;
    router.push(`/knowledge-graph/subject/${subjectId}/course/${selectedCourse.id}`);
    setSelectedCourse(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-zinc-900 animate-pulse" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
          </div>
          <p className="text-zinc-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!subjectData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">学科数据不存在</div>
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
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

      {/* Header */}
      <div className="relative z-10 p-6 flex items-center gap-4 border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
        <Link href="/knowledge-graph">
          <Button variant="ghost" size="icon" className="hover:bg-zinc-800 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              {subjectData.name}
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
            {subjectData.description}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{subjectData.nodes.length} 门课程</span>
          </div>
          {subjectData.edges.length > 0 && (
            <div className="flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <span>{subjectData.edges.length} 关系</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {subjectData.relationTypes && (
        <div className="absolute bottom-4 left-4 z-20 bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-3 backdrop-blur-sm">
          <div className="text-xs text-zinc-400 mb-2">课程关系</div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(subjectData.relationTypes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div
                  className="w-8 h-0.5 rounded"
                  style={{ backgroundColor: value.color, opacity: 0.8 }}
                />
                <span className="text-zinc-300">{value.label}</span>
                <span className="text-zinc-500 text-[10px]">{value.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph container */}
      <div ref={containerRef} className="relative z-10 w-full h-[calc(100vh-80px)]" />

      {/* Side panel */}
      {selectedCourse && (
        <div className="fixed right-0 top-0 h-full w-80 bg-zinc-900/95 border-l border-zinc-700/50 backdrop-blur-sm z-50 p-6 flex flex-col animate-in slide-in-from-right duration-200">
          <button
            onClick={() => setSelectedCourse(null)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mt-2">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">{selectedCourse.label}</h2>
          </div>

          {selectedCourse.description && (
            <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
              {selectedCourse.description}
            </p>
          )}

          <div className="mt-auto pt-6 border-t border-zinc-700/50">
            <Button
              onClick={handleViewCourse}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-zinc-900 font-semibold border-0"
            >
              <Zap className="w-4 h-4 mr-2" />
              查看知识点图谱
            </Button>
            <p className="text-xs text-zinc-500 mt-3 text-center">
              点击查看该课程的知识点详情
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubjectGraphPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center">加载中...</div>}>
      <SubjectGraphContentWrapper params={params} />
    </Suspense>
  );
}

function SubjectGraphContentWrapper({ params }: { params: Promise<{ subjectId: string }> }) {
  const [subjectId, setSubjectId] = useState<string>('');

  useEffect(() => {
    params.then((p) => setSubjectId(p.subjectId));
  }, [params]);

  if (!subjectId) return null;

  return <SubjectGraphContent subjectId={subjectId} />;
}