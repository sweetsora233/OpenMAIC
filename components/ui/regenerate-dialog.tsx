'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/hooks/use-i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface RegenerateDialogProps {
  readonly open: boolean;
  readonly sceneTitle: string;
  readonly onRegenerate: (feedback: string) => Promise<void>;
  readonly onCancel: () => void;
  readonly isRegenerating: boolean;
}

// Quick feedback options for common issues
const QUICK_FEEDBACKS_ZH = [
  '按钮不好用',
  '动画太快',
  '看不清',
  '布局不对',
  '手机上看不了',
];

const QUICK_FEEDBACKS_EN = [
  'Buttons not working',
  'Animation too fast',
  'Hard to see',
  'Layout is wrong',
  'Not working on mobile',
];

export function RegenerateDialog({
  open,
  sceneTitle,
  onRegenerate,
  onCancel,
  isRegenerating,
}: RegenerateDialogProps) {
  const { t, locale } = useI18n();
  const [feedback, setFeedback] = useState('');

  const quickFeedbacks = locale === 'zh-CN' ? QUICK_FEEDBACKS_ZH : QUICK_FEEDBACKS_EN;

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    await onRegenerate(feedback.trim());
    setFeedback('');
  };

  const handleQuickFeedback = (text: string) => {
    setFeedback(feedback ? `${feedback}, ${text}` : text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isRegenerating && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>
          {t('generation.regenerateScene')}: {sceneTitle}
        </DialogTitle>
        <DialogDescription>
          {t('generation.regenerateSceneDesc')}
        </DialogDescription>

        <div className="space-y-4 py-4">
          {/* Feedback input */}
          <div className="space-y-2">
            <Label htmlFor="feedback">{t('generation.describeIssue')}</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('generation.feedbackPlaceholder')}
              rows={4}
              disabled={isRegenerating}
              className="resize-none"
            />
          </div>

          {/* Quick feedback buttons */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t('generation.quickFeedback')}</Label>
            <div className="flex flex-wrap gap-2">
              {quickFeedbacks.map((fb) => (
                <Button
                  key={fb}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFeedback(fb)}
                  disabled={isRegenerating}
                  className="text-xs"
                >
                  {fb}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isRegenerating}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isRegenerating || !feedback.trim()}
          >
            {isRegenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isRegenerating ? t('generation.regenerating') : t('generation.regenerateScene')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}