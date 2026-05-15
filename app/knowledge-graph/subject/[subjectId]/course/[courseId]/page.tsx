'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Graph } from '@antv/g6';
import { ArrowLeft, Sparkles, Zap, X, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface KnowledgeNode {
  id: string;
  label: string;
  level?: number;
  parentId?: string | null;
  description?: string;
  category?: string;
}

interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  type: 'prerequisite' | 'related' | 'inference';
  label: string;
  color?: string;
}

interface RelationType {
  label: string;
  description: string;
  color: string;
}

interface CourseData {
  id: string;
  name: string;
  description: string;
  metadata?: {
    totalNodes: number;
    totalEdges: number;
    maxLevel: number;
    version: string;
  };
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  relationTypes?: Record<string, RelationType>;
}

async function loadCourseData(courseId: string): Promise<CourseData | null> {
  try {
    const res = await fetch(`/api/knowledge-graph/${courseId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function getNodeSize(level: number): number {
  const sizes = { 1: 70, 2: 60, 3: 50, 4: 45, 5: 40 };
  return sizes[level as keyof typeof sizes] || 45;
}

function getNodeColors(level: number): { fill: string; stroke: string } {
  const colors = {
    1: { fill: '#0c4a6e', stroke: '#38bdf8' },
    2: { fill: '#134e4a', stroke: '#2dd4bf' },
    3: { fill: '#18181b', stroke: '#22d3ee' },
    4: { fill: '#1c1917', stroke: '#a8a29e' },
    5: { fill: '#1c1917', stroke: '#78716c' },
  };
  return colors[level as keyof typeof colors] || colors[3];
}

const RELATION_CONFIG: Record<string, { color: string; dashed: boolean }> = {
  prerequisite: { color: '#3b82f6', dashed: false },
  related: { color: '#6b7280', dashed: true },
  inference: { color: '#f59e0b', dashed: false },
};

function CourseGraphContent({
  courseId: courseIdParam,
  subjectId: subjectIdParam,
}: {
  courseId: string;
  subjectId: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData(courseIdParam).then((data) => {
      setCourseData(data);
      setLoading(false);
    });
  }, [courseIdParam]);

  useEffect(() => {
    if (!courseData || !containerRef.current) return;

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight || 500;

    const isV2 = courseData.metadata?.version === '2.0';

    const nodes = courseData.nodes.map((node: KnowledgeNode) => {
      const level = node.level || 3;
      const colors = getNodeColors(level);
      const size = getNodeSize(level);

      return {
        id: node.id,
        data: {
          label: node.label,
          description: node.description || '',
          level,
          category: node.category,
        },
        style: { size, fill: colors.fill, stroke: colors.stroke },
      };
    });

    const edges = courseData.edges.map((edge: KnowledgeEdge) => {
      const config = RELATION_CONFIG[edge.type] || RELATION_CONFIG.related;

      return {
        id: edge.id || `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        data: {
          label: edge.label,
          type: edge.type,
          color: edge.color || config.color,
          dashed: config.dashed,
        },
      };
    });

    const graph = new Graph({
      container: containerRef.current,
      width,
      height,
      data: { nodes, edges },
      node: {
        type: 'circle',
        style: {
          size: (d: any) => d.style?.size || 50,
          labelText: (d: any) => d.data?.label,
          labelFill: '#e4e4e7',
          labelFontSize: (d: any) => (d.data?.level <= 2 ? 13 : 11),
          labelFontWeight: (d: any) => (d.data?.level <= 2 ? 600 : 500),
          labelOffsetY: 8,
          fill: (d: any) => d.style?.fill || '#18181b',
          stroke: (d: any) => d.style?.stroke || '#22d3ee',
          lineWidth: 2,
          cursor: 'pointer',
          shadowColor: (d: any) => d.style?.stroke || '#22d3ee',
          shadowBlur: 10,
        },
        state: {
          hover: { lineWidth: 3, shadowBlur: 18, scale: 1.08 },
          selected: { lineWidth: 4, shadowBlur: 22, scale: 1.12 },
        },
        animation: false,
      },
      edge: {
        type: 'line',
        style: {
          stroke: (d: any) => d.data?.color || '#71717a',
          lineWidth: 1.5,
          endArrow: true,
          endArrowSize: 5,
          endArrowFill: (d: any) => d.data?.color || '#71717a',
          labelText: (d: any) => d.data?.label,
          labelFill: '#a1a1aa',
          labelFontSize: 9,
          labelBackground: true,
          labelBackgroundFill: '#18181b',
          labelBackgroundOpacity: 0.8,
          labelBackgroundPadding: [2, 4, 2, 4],
          lineDash: (d: any) => (d.data?.dashed ? [5, 3] : []),
          opacity: 0.8,
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'click-select'],
      layout: {
        type: 'dagre',
        direction: 'LR',
        nodeSep: 50,
        rankSep: isV2 ? 90 : 100,
        preventOverlap: true,
      },
      autoFit: 'view',
      padding: [30, 30, 30, 30],
    });

    graph.render();

    graph.on('node:click', (event: unknown) => {
      const nodeId = (event as any).itemId || (event as any).target?.id;
      const node = courseData.nodes.find((n: KnowledgeNode) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
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
  }, [courseData]);

  const handleGenerateCourse = () => {
    if (!selectedNode) return;
    const requirement = `【${courseData.name}】${selectedNode.label}\n\n请帮我学习「${courseData.name}」课程中的「${selectedNode.label}」知识点。${selectedNode.description || '掌握这个知识点的核心概念和应用'}。请生成一份完整的课程，包含概念讲解、实例演示和练习题。`;
    router.push(`/?requirement=${encodeURIComponent(requirement)}`);
    setSelectedNode(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-900 animate-pulse" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
          <p className="text-zinc-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">课程数据不存在</div>
      </div>
    );
  }

  const isV2 = courseData.metadata?.version === '2.0';

  return (
    <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-15">
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
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

      {/* Header */}
      <div className="relative z-10 p-5 flex items-center gap-3 border-b border-zinc-800/50 backdrop-blur-sm bg-zinc-900/30">
        <Link href={`/knowledge-graph/subject/${subjectIdParam}`}>
          <Button variant="ghost" size="icon" className="hover:bg-zinc-800 hover:text-cyan-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
              {courseData.name}
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{courseData.description}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{courseData.nodes.length} 知识点</span>
          </div>
          {isV2 && (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              <span>{courseData.edges.length} 关系</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      {isV2 && courseData.relationTypes && (
        <div className="absolute bottom-3 left-3 z-20 bg-zinc-900/80 border border-zinc-700/50 rounded-lg p-2.5 backdrop-blur-sm">
          <div className="text-xs text-zinc-400 mb-1.5">知识关系</div>
          <div className="flex flex-col gap-1">
            {Object.entries(courseData.relationTypes).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <div
                  className="w-6 h-0.5 rounded"
                  style={{ backgroundColor: value.color, opacity: 0.8 }}
                />
                <span className="text-zinc-300">{value.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graph container */}
      <div ref={containerRef} className="relative z-10 w-full h-[calc(100vh-70px)]" />

      {/* Side panel */}
      {selectedNode && (
        <div className="fixed right-0 top-0 h-full w-80 bg-zinc-900/95 border-l border-zinc-700/50 backdrop-blur-sm z-50 p-5 flex flex-col animate-in slide-in-from-right duration-200">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mt-1">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border-2 border-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">{selectedNode.label}</h2>
              {selectedNode.level && (
                <span className="text-xs text-zinc-500">层级 {selectedNode.level}</span>
              )}
            </div>
          </div>

          {selectedNode.description && (
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{selectedNode.description}</p>
          )}

          <div className="mt-auto pt-5 border-t border-zinc-700/50">
            <Button
              onClick={handleGenerateCourse}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-zinc-900 font-semibold border-0"
            >
              <Zap className="w-4 h-4 mr-2" />
              生成学习课程
            </Button>
            <p className="text-xs text-zinc-500 mt-2 text-center">
              点击后跳转到首页生成课程
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CourseGraphPage({
  params,
}: {
  params: Promise<{ subjectId: string; courseId: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center">加载中...</div>}>
      <CourseGraphContentWrapper params={params} />
    </Suspense>
  );
}

function CourseGraphContentWrapper({ params }: { params: Promise<{ subjectId: string; courseId: string }> }) {
  const [ids, setIds] = useState<{ subjectId: string; courseId: string } | null>(null);

  useEffect(() => {
    params.then((p) => setIds({ subjectId: p.subjectId, courseId: p.courseId }));
  }, [params]);

  if (!ids) return null;

  return <CourseGraphContent courseId={ids.courseId} subjectId={ids.subjectId} />;
}