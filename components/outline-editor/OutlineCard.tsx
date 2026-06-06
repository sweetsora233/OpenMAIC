'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GripVertical,
  Trash2,
  ChevronDown,
  FileText,
  HelpCircle,
  Puzzle,
  Briefcase,
  Plus,
  X,
  Image as ImageIcon,
  Video,
  ZoomIn,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { SceneOutline, PdfImage } from '@/lib/types/generation';
import type { MediaGenerationRequest } from '@/lib/media/types';
import type { WidgetType } from '@/lib/types/widgets';
import { nanoid } from 'nanoid';

// Scene type icons
const TYPE_ICONS: Record<string, typeof FileText> = {
  slide: FileText,
  quiz: HelpCircle,
  interactive: Puzzle,
  pbl: Briefcase,
};

// Default icon for unknown types
const DEFAULT_ICON = FileText;

// Scene type colors
const TYPE_COLORS: Record<string, string> = {
  slide: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  quiz: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  interactive: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  pbl: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
};

// Default color for unknown types
const DEFAULT_COLOR = 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800';

// Widget type options for interactive
const WIDGET_TYPES: { id: WidgetType; label: string }[] = [
  { id: 'simulation', label: 'Simulation' },
  { id: 'diagram', label: 'Diagram' },
  { id: 'code', label: 'Code' },
  { id: 'game', label: 'Game' },
  { id: 'visualization3d', label: '3D Visualization' },
];

// Diagram type options
const DIAGRAM_TYPES = ['flowchart', 'mindmap', 'hierarchy', 'system'] as const;

// Code language options
const CODE_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp'] as const;

// Game type options
const GAME_TYPES = ['quiz', 'puzzle', 'strategy', 'card', 'action'] as const;

// Visualization 3D type options
const VIZ_TYPES = ['molecular', 'solar', 'anatomy', 'geometry', 'physics', 'custom'] as const;

// Quiz question type options
const QUESTION_TYPE_OPTIONS = [
  { id: 'single', label: 'Single Choice' },
  { id: 'multiple', label: 'Multiple Choice' },
  { id: 'text', label: 'Short Answer' },
] as const;

interface OutlineCardProps {
  outline: SceneOutline;
  index: number;
  t: (key: string) => string;
  imageMapping?: Record<string, string>;
  pdfImages?: PdfImage[];
  onUpdate: (id: string, updates: Partial<SceneOutline>) => void;
  onDelete: () => void;
}

export function OutlineCard({
  outline,
  index,
  t,
  imageMapping,
  pdfImages,
  onUpdate,
  onDelete,
}: OutlineCardProps) {
  const [expanded, setExpanded] = useState(true); // 默认展开，方便编辑
  const [newKeyPoint, setNewKeyPoint] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [lightboxImage, setLightboxImage] = useState<PdfImage | null>(null);

  const TypeIcon = TYPE_ICONS[outline.type] ?? DEFAULT_ICON;

  // Handle type change - clear incompatible fields
  const handleTypeChange = (newType: SceneOutline['type']) => {
    const baseUpdate: Partial<SceneOutline> = {
      type: newType,
      // Clear all type-specific configs
      quizConfig: undefined,
      pblConfig: undefined,
      widgetType: undefined,
      widgetOutline: undefined,
      interactiveConfig: undefined,
    };

    // Initialize default config for new type
    if (newType === 'quiz') {
      baseUpdate.quizConfig = {
        questionCount: 5,
        difficulty: 'medium',
        questionTypes: ['single'],
      };
    } else if (newType === 'pbl') {
      baseUpdate.pblConfig = {
        projectTopic: '',
        projectDescription: '',
        targetSkills: [],
        issueCount: 3,
      };
    } else if (newType === 'interactive') {
      baseUpdate.widgetType = 'simulation';
      baseUpdate.widgetOutline = { concept: '' };
    }

    onUpdate(outline.id, baseUpdate);
  };

  // Handle adding key point
  const handleAddKeyPoint = () => {
    if (!newKeyPoint.trim()) return;
    const keyPoints = [...(outline.keyPoints || []), newKeyPoint.trim()];
    onUpdate(outline.id, { keyPoints });
    setNewKeyPoint('');
  };

  // Handle removing key point
  const handleRemoveKeyPoint = (idx: number) => {
    const keyPoints = (outline.keyPoints || []).filter((_, i) => i !== idx);
    onUpdate(outline.id, { keyPoints });
  };

  // Handle adding skill
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    const skills = [...(outline.pblConfig?.targetSkills || []), newSkill.trim()];
    onUpdate(outline.id, { pblConfig: { ...outline.pblConfig!, targetSkills: skills } });
    setNewSkill('');
  };

  // Handle removing skill
  const handleRemoveSkill = (idx: number) => {
    const skills = (outline.pblConfig?.targetSkills || []).filter((_, i) => i !== idx);
    onUpdate(outline.id, { pblConfig: { ...outline.pblConfig!, targetSkills: skills } });
  };

  // Handle suggested image toggle
  const handleImageToggle = (imgId: string) => {
    const currentIds = outline.suggestedImageIds || [];
    const newIds = currentIds.includes(imgId)
      ? currentIds.filter((id) => id !== imgId)
      : [...currentIds, imgId];
    onUpdate(outline.id, { suggestedImageIds: newIds });
  };

  // Handle question type toggle
  const handleQuestionTypeToggle = (type: 'single' | 'multiple' | 'text') => {
    const currentTypes = outline.quizConfig?.questionTypes || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onUpdate(outline.id, { quizConfig: { ...outline.quizConfig!, questionTypes: newTypes } });
  };

  // Handle media generation update
  const handleMediaUpdate = (idx: number, prompt: string) => {
    const mediaGenerations = (outline.mediaGenerations || []).map((mg, i) =>
      i === idx ? { ...mg, prompt } : mg
    );
    onUpdate(outline.id, { mediaGenerations });
  };

  // Handle media generation remove
  const handleMediaRemove = (idx: number) => {
    const mediaGenerations = (outline.mediaGenerations || []).filter((_, i) => i !== idx);
    onUpdate(outline.id, { mediaGenerations });
  };

  // Handle add media generation
  const handleAddMedia = (type: 'image' | 'video') => {
    const newMg: MediaGenerationRequest = {
      type,
      prompt: '',
      elementId: `gen_${type}_${nanoid(4)}`,
    };
    const mediaGenerations = [...(outline.mediaGenerations || []), newMg];
    onUpdate(outline.id, { mediaGenerations });
  };

  // Handle widget type change
  const handleWidgetTypeChange = (newWidgetType: WidgetType) => {
    const newWidgetOutline = { concept: outline.widgetOutline?.concept || '' };
    onUpdate(outline.id, { widgetType: newWidgetType, widgetOutline: newWidgetOutline });
  };

  // Get suggested images for preview
  const allPdfImages = pdfImages || [];

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow',
        TYPE_COLORS[outline.type] ?? DEFAULT_COLOR
      )}
    >
      {/* Header: drag handle + type + title + expand */}
      <div className="flex items-center gap-2 p-3 border-b border-border/30">
        <GripVertical className="size-4 text-muted-foreground shrink-0 cursor-grab" />

        {/* Type selector */}
        <Select
          value={outline.type}
          onValueChange={(v) => handleTypeChange(v as SceneOutline['type'])}
        >
          <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-2 gap-1">
            <TypeIcon className="size-3.5 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="slide">
              {t('outlinePreview.typeSlide')}
            </SelectItem>
            <SelectItem value="quiz">
              {t('outlinePreview.typeQuiz')}
            </SelectItem>
            <SelectItem value="interactive">
              {t('outlinePreview.typeInteractive')}
            </SelectItem>
            <SelectItem value="pbl">
              {t('outlinePreview.typePbl')}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Page number */}
        <Badge variant="outline" className="h-5 text-xs shrink-0">
          #{index + 1}
        </Badge>

        {/* Title input */}
        <Input
          value={outline.title}
          onChange={(e) => onUpdate(outline.id, { title: e.target.value })}
          placeholder={t('outlinePreview.titlePlaceholder')}
          className="flex-1 h-7 bg-transparent border-0 text-sm font-medium"
        />

        {/* Expand/Collapse + Delete */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="size-6 rounded hover:bg-muted/50 flex items-center justify-center transition-colors"
        >
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          />
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onDelete}
              className="size-6 rounded hover:bg-destructive/10 flex items-center justify-center transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t('outlinePreview.deletePage')}</TooltipContent>
        </Tooltip>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Description - 所有类型都有 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('outlinePreview.description')}</Label>
                <Textarea
                  value={outline.description}
                  onChange={(e) => onUpdate(outline.id, { description: e.target.value })}
                  placeholder={t('outlinePreview.descriptionPlaceholder')}
                  className="min-h-[60px] text-sm"
                />
              </div>

              {/* Key Points - 所有类型都有 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('outlinePreview.keyPoints')}</Label>
                <div className="space-y-1.5">
                  {(outline.keyPoints || []).map((kp, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={kp}
                        onChange={(e) => {
                          const keyPoints = (outline.keyPoints || []).map((k, idx) =>
                            idx === i ? e.target.value : k
                          );
                          onUpdate(outline.id, { keyPoints });
                        }}
                        className="h-7 text-sm"
                      />
                      <button
                        onClick={() => handleRemoveKeyPoint(i)}
                        className="size-6 rounded hover:bg-muted/50 flex items-center justify-center"
                      >
                        <X className="size-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <Input
                      value={newKeyPoint}
                      onChange={(e) => setNewKeyPoint(e.target.value)}
                      placeholder={t('outlinePreview.addKeyPoint')}
                      className="h-7 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddKeyPoint();
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddKeyPoint}
                      className="size-6"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Teaching Objective - 所有类型都有 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('outlinePreview.teachingObjective')}</Label>
                <Input
                  value={outline.teachingObjective || ''}
                  onChange={(e) => onUpdate(outline.id, { teachingObjective: e.target.value })}
                  placeholder={t('outlinePreview.teachingObjectivePlaceholder')}
                  className="h-7 text-sm"
                />
              </div>

              {/* Estimated Duration - 所有类型都有 */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('outlinePreview.estimatedDuration')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={outline.estimatedDuration || ''}
                    onChange={(e) =>
                      onUpdate(outline.id, { estimatedDuration: parseInt(e.target.value) || undefined })
                    }
                    placeholder="60"
                    className="h-7 text-sm w-24"
                  />
                  <span className="text-xs text-muted-foreground">{t('outlinePreview.seconds')}</span>
                </div>
              </div>

              {/* ========== Quiz 类型专属字段 ========== */}
              {outline.type === 'quiz' && outline.quizConfig && (
                <div className="space-y-3 p-3 rounded-lg bg-purple-100/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
                    {t('outlinePreview.typeQuiz')} Settings
                  </div>

                  {/* Question Count */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.questionCount')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={outline.quizConfig.questionCount}
                      onChange={(e) =>
                        onUpdate(outline.id, {
                          quizConfig: {
                            ...outline.quizConfig!,
                            questionCount: Math.max(1, parseInt(e.target.value) || 1),
                          },
                        })
                      }
                      className="h-7 w-16 text-sm"
                    />
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.difficulty')}</Label>
                    <Select
                      value={outline.quizConfig.difficulty}
                      onValueChange={(v) =>
                        onUpdate(outline.id, {
                          quizConfig: {
                            ...outline.quizConfig!,
                            difficulty: v as 'easy' | 'medium' | 'hard',
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-7 w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">{t('outlinePreview.difficultyEasy')}</SelectItem>
                        <SelectItem value="medium">{t('outlinePreview.difficultyMedium')}</SelectItem>
                        <SelectItem value="hard">{t('outlinePreview.difficultyHard')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Question Types - 多选 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.questionTypes')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {QUESTION_TYPE_OPTIONS.map((qt) => (
                        <label
                          key={qt.id}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={(outline.quizConfig?.questionTypes || []).includes(qt.id)}
                            onCheckedChange={() => handleQuestionTypeToggle(qt.id)}
                          />
                          <span className="text-xs">{qt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ========== Interactive 类型专属字段 ========== */}
              {outline.type === 'interactive' && (
                <div className="space-y-3 p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                    {t('outlinePreview.typeInteractive')} Settings
                  </div>

                  {/* Widget Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.widgetType')}</Label>
                    <Select
                      value={outline.widgetType || 'simulation'}
                      onValueChange={(v) => handleWidgetTypeChange(v as WidgetType)}
                    >
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WIDGET_TYPES.map((wt) => (
                          <SelectItem key={wt.id} value={wt.id}>
                            {wt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Concept - 所有 widget 类型都有 */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.concept')}</Label>
                    <Input
                      value={outline.widgetOutline?.concept || ''}
                      onChange={(e) =>
                        onUpdate(outline.id, {
                          widgetOutline: { ...outline.widgetOutline, concept: e.target.value },
                        })
                      }
                      placeholder="e.g. Newton's Laws, Chemical Bonding..."
                      className="h-7 text-sm"
                    />
                  </div>

                  {/* Simulation: keyVariables */}
                  {outline.widgetType === 'simulation' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('outlinePreview.keyVariables')}</Label>
                      <Textarea
                        value={(outline.widgetOutline?.keyVariables || []).join('\n')}
                        onChange={(e) =>
                          onUpdate(outline.id, {
                            widgetOutline: {
                              ...outline.widgetOutline,
                              keyVariables: e.target.value.split('\n').filter(Boolean),
                            },
                          })
                        }
                        placeholder="mass, velocity, acceleration (one per line)"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                  )}

                  {/* Diagram: diagramType + nodeCount */}
                  {outline.widgetType === 'diagram' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.diagramType')}</Label>
                        <Select
                          value={outline.widgetOutline?.diagramType || 'flowchart'}
                          onValueChange={(v) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                diagramType: v as typeof DIAGRAM_TYPES[number],
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAGRAM_TYPES.map((dt) => (
                              <SelectItem key={dt} value={dt}>{dt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.nodeCount')}</Label>
                        <Input
                          type="number"
                          value={outline.widgetOutline?.nodeCount || ''}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                nodeCount: parseInt(e.target.value) || undefined,
                              },
                            })
                          }
                          placeholder="10"
                          className="h-7 w-16 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* Code: language + challengeType */}
                  {outline.widgetType === 'code' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.language')}</Label>
                        <Select
                          value={outline.widgetOutline?.language || 'python'}
                          onValueChange={(v) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                language: v as typeof CODE_LANGUAGES[number],
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CODE_LANGUAGES.map((lang) => (
                              <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.challengeType')}</Label>
                        <Input
                          value={outline.widgetOutline?.challengeType || ''}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                challengeType: e.target.value,
                              },
                            })
                          }
                          placeholder="e.g. algorithm, debugging, optimization"
                          className="h-7 text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* Game: gameType + challenge + playerControls */}
                  {outline.widgetType === 'game' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.gameType')}</Label>
                        <Select
                          value={outline.widgetOutline?.gameType || 'quiz'}
                          onValueChange={(v) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                gameType: v as typeof GAME_TYPES[number],
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GAME_TYPES.map((gt) => (
                              <SelectItem key={gt} value={gt}>{gt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.challenge')}</Label>
                        <Textarea
                          value={outline.widgetOutline?.challenge || ''}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                challenge: e.target.value,
                              },
                            })
                          }
                          placeholder="What does the player do?"
                          className="min-h-[40px] text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.playerControls')}</Label>
                        <Textarea
                          value={(outline.widgetOutline?.playerControls || []).join('\n')}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                playerControls: e.target.value.split('\n').filter(Boolean),
                              },
                            })
                          }
                          placeholder="move, jump, select (one per line)"
                          className="min-h-[40px] text-sm"
                        />
                      </div>
                    </>
                  )}

                  {/* 3D Visualization: visualizationType + objects + interactions */}
                  {outline.widgetType === 'visualization3d' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.visualizationType')}</Label>
                        <Select
                          value={outline.widgetOutline?.visualizationType || 'geometry'}
                          onValueChange={(v) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                visualizationType: v as typeof VIZ_TYPES[number],
                              },
                            })
                          }
                        >
                          <SelectTrigger className="h-7 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VIZ_TYPES.map((vt) => (
                              <SelectItem key={vt} value={vt}>{vt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.objects')}</Label>
                        <Textarea
                          value={(outline.widgetOutline?.objects || []).join('\n')}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                objects: e.target.value.split('\n').filter(Boolean),
                              },
                            })
                          }
                          placeholder="sun, earth, moon (one per line)"
                          className="min-h-[40px] text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">{t('outlinePreview.interactions')}</Label>
                        <Textarea
                          value={(outline.widgetOutline?.interactions || []).join('\n')}
                          onChange={(e) =>
                            onUpdate(outline.id, {
                              widgetOutline: {
                                ...outline.widgetOutline,
                                interactions: e.target.value.split('\n').filter(Boolean),
                              },
                            })
                          }
                          placeholder="rotate, zoom, select (one per line)"
                          className="min-h-[40px] text-sm"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ========== PBL 类型专属字段 ========== */}
              {outline.type === 'pbl' && outline.pblConfig && (
                <div className="space-y-3 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                    {t('outlinePreview.typePbl')} Settings
                  </div>

                  {/* Project Topic */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.projectTopic')}</Label>
                    <Input
                      value={outline.pblConfig.projectTopic}
                      onChange={(e) =>
                        onUpdate(outline.id, {
                          pblConfig: { ...outline.pblConfig!, projectTopic: e.target.value },
                        })
                      }
                      placeholder="e.g. Design a Solar-Powered Car"
                      className="h-7 text-sm"
                    />
                  </div>

                  {/* Project Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.projectDescription')}</Label>
                    <Textarea
                      value={outline.pblConfig.projectDescription}
                      onChange={(e) =>
                        onUpdate(outline.id, {
                          pblConfig: { ...outline.pblConfig!, projectDescription: e.target.value },
                        })
                      }
                      placeholder="Describe the project context and goals..."
                      className="min-h-[60px] text-sm"
                    />
                  </div>

                  {/* Target Skills */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.targetSkills')}</Label>
                    <div className="flex flex-wrap gap-1">
                      {(outline.pblConfig.targetSkills || []).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs gap-1">
                          {skill}
                          <button
                            onClick={() => handleRemoveSkill(i)}
                            className="hover:text-destructive"
                          >
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add skill..."
                        className="h-7 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSkill();
                        }}
                      />
                      <Button variant="ghost" size="sm" onClick={handleAddSkill} className="size-6">
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Issue Count */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('outlinePreview.issueCount')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={outline.pblConfig.issueCount || 3}
                      onChange={(e) =>
                        onUpdate(outline.id, {
                          pblConfig: {
                            ...outline.pblConfig!,
                            issueCount: Math.max(1, parseInt(e.target.value) || 1),
                          },
                        })
                      }
                      className="h-7 w-16 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* ========== Suggested Images (PDF extracted) ========== */}
              {allPdfImages.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('outlinePreview.suggestedImages')}</Label>
                  <p className="text-xs text-muted-foreground">{t('outlinePreview.suggestedImagesHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {allPdfImages.map((img) => {
                      const isSelected = (outline.suggestedImageIds || []).includes(img.id);
                      const imgSrc = imageMapping?.[img.id] || img.src || '';
                      return (
                        <Tooltip key={img.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'relative size-16 rounded border-2 overflow-hidden cursor-pointer group',
                                isSelected
                                  ? 'border-violet-500'
                                  : 'border-border'
                              )}
                            >
                              {/* Selection circle - right top corner */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImageToggle(img.id);
                                }}
                                className={cn(
                                  'absolute -top-1 -right-1 size-5 rounded-full flex items-center justify-center z-10 shadow-sm',
                                  isSelected
                                    ? 'bg-violet-500 text-white'
                                    : 'bg-white dark:bg-slate-700 border-2 border-border group-hover:border-violet-400'
                                )}
                              >
                                {isSelected && (
                                  <svg className="size-3" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </button>

                              {/* Image preview - click to zoom */}
                              <div
                                className="size-full"
                                onClick={() => imgSrc && setLightboxImage(img)}
                              >
                                {imgSrc ? (
                                  <img src={imgSrc} alt={img.description || ''} className="size-full object-cover" />
                                ) : (
                                  <div className="size-full bg-muted flex items-center justify-center">
                                    <ImageIcon className="size-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {/* Hover zoom hint */}
                              {imgSrc && (
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex items-center justify-center pointer-events-none">
                                  <ZoomIn className="size-5 text-white" />
                                </div>
                              )}

                              {/* Page number badge */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 text-center">
                                P{img.pageNumber}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[200px]">
                            <p className="text-xs">{img.description || `Page ${img.pageNumber}`}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {t('outlinePreview.clickToZoom')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lightbox dialog for image zoom */}
              <Dialog open={lightboxImage !== null} onOpenChange={() => setLightboxImage(null)}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                  <DialogTitle className="sr-only">
                    {lightboxImage?.description || `Image from page ${lightboxImage?.pageNumber}`}
                  </DialogTitle>
                  {lightboxImage && (
                    <div className="relative">
                      <img
                        src={imageMapping?.[lightboxImage.id] || lightboxImage.src || ''}
                        alt={lightboxImage.description || ''}
                        className="w-full h-auto max-h-[80vh] object-contain"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3">
                        <p className="text-sm font-medium">{lightboxImage.description || `Page ${lightboxImage.pageNumber}`}</p>
                        <p className="text-xs text-muted-foreground">{lightboxImage.id}</p>
                      </div>
                      <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-2 right-2 size-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* ========== Media Generations (AI-generated) ========== */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t('outlinePreview.mediaGenerations')}</Label>
                {(outline.mediaGenerations || []).length === 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMedia('image')}
                      className="h-7 text-xs gap-1"
                    >
                      <ImageIcon className="size-3" />
                      {t('outlinePreview.addImage')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMedia('video')}
                      className="h-7 text-xs gap-1"
                    >
                      <Video className="size-3" />
                      {t('outlinePreview.addVideo')}
                    </Button>
                  </div>
                )}
                {(outline.mediaGenerations || []).length > 0 && (
                  <div className="space-y-2">
                    {(outline.mediaGenerations || []).map((mg, i) => (
                      <div key={mg.elementId} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                        <div className="shrink-0 size-6 rounded flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                          {mg.type === 'image' ? (
                            <ImageIcon className="size-3 text-blue-600" />
                          ) : (
                            <Video className="size-3 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-xs text-muted-foreground">{mg.elementId}</div>
                          <Textarea
                            value={mg.prompt}
                            onChange={(e) => handleMediaUpdate(i, e.target.value)}
                            placeholder={t('outlinePreview.mediaPromptPlaceholder')}
                            className="min-h-[40px] text-sm"
                          />
                        </div>
                        <button
                          onClick={() => handleMediaRemove(i)}
                          className="size-6 rounded hover:bg-destructive/10 flex items-center justify-center shrink-0"
                        >
                          <X className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMedia('image')}
                        className="h-7 text-xs gap-1"
                      >
                        <ImageIcon className="size-3" />
                        {t('outlinePreview.addImage')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMedia('video')}
                        className="h-7 text-xs gap-1"
                      >
                        <Video className="size-3" />
                        {t('outlinePreview.addVideo')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}