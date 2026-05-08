'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Graph } from '@antv/g6';
import { ArrowLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Course data type
interface KnowledgeNode {
  id: string;
  label: string;
  description: string;
}

interface KnowledgeEdge {
  source: string;
  target: string;
  type: string;
  label: string;
}

interface CourseData {
  id: string;
  name: string;
  description: string;
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

// Load course data
async function loadCourseData(courseId: string): Promise<CourseData | null> {
  try {
    const res = await fetch(`/api/knowledge-graph/${courseId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function KnowledgeGraphContent({ courseId: courseIdParam }: { courseId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData(courseIdParam).then((data) => {
      setCourseData(data);
      setLoading(false);
    });
  }, [courseIdParam]);

  useEffect(() => {
    if (!courseData || !containerRef.current) return;

    // Prepare G6 data
    const nodes = courseData.nodes.map((node: KnowledgeNode, index: number) => ({
      id: node.id,
      data: {
        label: node.label,
        description: node.description,
        x: 200 + (index % 4) * 180,
        y: 100 + Math.floor(index / 4) * 120,
      },
    }));

    const edges = courseData.edges.map((edge: KnowledgeEdge) => ({
      id: `${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      data: {
        label: edge.label,
        lineDash: edge.type === 'prerequisite' ? [] : [5, 5],
      },
    }));

    // Create graph
    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.offsetWidth,
      height: containerRef.current.offsetHeight || 500,
      data: { nodes, edges },
      node: {
        type: 'rect',
        style: {
          size: [120, 40],
          radius: 8,
          labelText: (d: any) => d.data?.label,
          labelFill: '#333',
          fill: '#f0f4f8',
          stroke: '#2563eb',
          cursor: 'pointer',
        },
        state: {
          hover: {
            fill: '#dbeafe',
            stroke: '#1d4ed8',
          },
          selected: {
            fill: '#bfdbfe',
            stroke: '#1e40af',
          },
        },
      },
      edge: {
        type: 'line',
        style: {
          stroke: '#94a3b8',
          lineWidth: 2,
          endArrow: true,
          labelText: (d: any) => d.data?.label,
          labelFill: '#64748b',
          labelFontSize: 10,
          lineDash: (d: any) => d.data?.lineDash || [],
        },
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element', 'click-select'],
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeStrength: -200,
        linkDistance: 150,
      },
    });

    graph.render();

    // Click event
    graph.on('node:click', (event: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nodeId = (event as any).itemId || (event as any).target?.id;
      const node = courseData.nodes.find((n: KnowledgeNode) => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        setDialogOpen(true);
      }
    });

    graphRef.current = graph;

    // Resize handler
    const handleResize = () => {
      if (graphRef.current && containerRef.current) {
        graphRef.current.resize(
          containerRef.current.offsetWidth,
          containerRef.current.offsetHeight || 500,
        );
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
    // Navigate to home page with requirement prefilled
    const requirement = `学习${selectedNode.label}：${selectedNode.description}`;
    router.push(`/?requirement=${encodeURIComponent(requirement)}`);
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">加载中...</p>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">课程数据不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <Link href="/knowledge-graph">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {courseData.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {courseData.description}
          </p>
        </div>
      </div>

      {/* Graph container */}
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-100px)] bg-white dark:bg-slate-800"
      />

      {/* Node detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedNode?.label}</DialogTitle>
            <DialogDescription>{selectedNode?.description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button onClick={handleGenerateCourse} className="w-full">
              <BookOpen className="w-4 h-4 mr-2" />
              生成课程
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function KnowledgeGraphDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <KnowledgeGraphDetailContent params={params} />
    </Suspense>
  );
}

function KnowledgeGraphDetailContent({ params }: { params: Promise<{ courseId: string }> }) {
  const [courseId, setCourseId] = useState<string>('');

  useEffect(() => {
    params.then((p) => setCourseId(p.courseId));
  }, [params]);

  if (!courseId) return null;

  return <KnowledgeGraphContent courseId={courseId} />;
}