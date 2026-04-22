import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the nanoid module
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id-123',
}));

// Test utilities for outline operations
describe('Outline Editor Operations', () => {
  // Sample outline for testing
  const createTestOutline = (overrides = {}): SceneOutline => ({
    id: 'test-id-123',
    type: 'slide',
    title: 'Test Title',
    description: 'Test Description',
    keyPoints: ['Point 1', 'Point 2'],
    order: 1,
    ...overrides,
  });

  describe('Outline CRUD Operations', () => {
    it('should add a new outline at a specific position', () => {
      const outlines = [createTestOutline({ id: 'a', order: 1 }), createTestOutline({ id: 'b', order: 2 })];

      // Add at index 1
      const newOutline: SceneOutline = {
        id: 'new-id',
        type: 'slide',
        title: '',
        description: '',
        keyPoints: [],
        order: 2,
      };

      const newOutlines = [...outlines];
      newOutlines.splice(1, 0, newOutline);

      // Finalize order
      const finalized = newOutlines.map((o, i) => ({ ...o, order: i + 1 }));

      expect(finalized.length).toBe(3);
      expect(finalized[0].id).toBe('a');
      expect(finalized[0].order).toBe(1);
      expect(finalized[1].id).toBe('new-id');
      expect(finalized[1].order).toBe(2);
      expect(finalized[2].id).toBe('b');
      expect(finalized[2].order).toBe(3);
    });

    it('should delete an outline and recompute order', () => {
      const outlines = [
        createTestOutline({ id: 'a', order: 1 }),
        createTestOutline({ id: 'b', order: 2 }),
        createTestOutline({ id: 'c', order: 3 }),
      ];

      const afterDelete = outlines.filter((o) => o.id !== 'b');
      const finalized = afterDelete.map((o, i) => ({ ...o, order: i + 1 }));

      expect(finalized.length).toBe(2);
      expect(finalized[0].id).toBe('a');
      expect(finalized[0].order).toBe(1);
      expect(finalized[1].id).toBe('c');
      expect(finalized[1].order).toBe(2);
    });

    it('should update outline fields', () => {
      const outline = createTestOutline();

      const updated = { ...outline, title: 'New Title', description: 'New Description' };

      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('New Description');
      expect(updated.id).toBe(outline.id); // ID should remain unchanged
    });
  });

  describe('Key Points Operations', () => {
    it('should add a key point', () => {
      const outline = createTestOutline({ keyPoints: ['Point 1'] });
      const keyPoints = [...outline.keyPoints, 'Point 2'];
      const updated = { ...outline, keyPoints };

      expect(updated.keyPoints.length).toBe(2);
      expect(updated.keyPoints[1]).toBe('Point 2');
    });

    it('should remove a key point', () => {
      const outline = createTestOutline({ keyPoints: ['Point 1', 'Point 2', 'Point 3'] });
      const keyPoints = outline.keyPoints.filter((_, i) => i !== 1);
      const updated = { ...outline, keyPoints };

      expect(updated.keyPoints.length).toBe(2);
      expect(updated.keyPoints[0]).toBe('Point 1');
      expect(updated.keyPoints[1]).toBe('Point 3');
    });

    it('should update a key point', () => {
      const outline = createTestOutline({ keyPoints: ['Point 1', 'Point 2'] });
      const keyPoints = outline.keyPoints.map((kp, i) => i === 0 ? 'Updated Point' : kp);
      const updated = { ...outline, keyPoints };

      expect(updated.keyPoints[0]).toBe('Updated Point');
      expect(updated.keyPoints[1]).toBe('Point 2');
    });
  });

  describe('Type-specific Fields', () => {
    it('should handle quiz config updates', () => {
      const outline = createTestOutline({
        type: 'quiz',
        quizConfig: {
          questionCount: 5,
          difficulty: 'medium',
          questionTypes: ['single', 'multiple'],
        },
      });

      const updated = {
        ...outline,
        quizConfig: {
          ...outline.quizConfig!,
          questionCount: 10,
          difficulty: 'hard',
        },
      };

      expect(updated.quizConfig?.questionCount).toBe(10);
      expect(updated.quizConfig?.difficulty).toBe('hard');
      expect(updated.quizConfig?.questionTypes).toEqual(['single', 'multiple']);
    });

    it('should handle pbl config updates', () => {
      const outline = createTestOutline({
        type: 'pbl',
        pblConfig: {
          projectTopic: 'Test Project',
          projectDescription: 'Description',
          targetSkills: ['Skill 1'],
        },
      });

      const updated = {
        ...outline,
        pblConfig: {
          ...outline.pblConfig!,
          targetSkills: [...outline.pblConfig!.targetSkills, 'Skill 2'],
        },
      };

      expect(updated.pblConfig?.targetSkills.length).toBe(2);
      expect(updated.pblConfig?.targetSkills[1]).toBe('Skill 2');
    });

    it('should handle interactive widget config updates', () => {
      const outline = createTestOutline({
        type: 'interactive',
        widgetType: 'simulation',
        widgetOutline: {
          concept: 'Test Concept',
        },
      });

      const updated = {
        ...outline,
        widgetOutline: {
          ...outline.widgetOutline,
          concept: 'Updated Concept',
        },
      };

      expect(updated.widgetOutline?.concept).toBe('Updated Concept');
    });
  });

  describe('Suggested Images Operations', () => {
    it('should toggle suggested image inclusion', () => {
      const outline = createTestOutline({
        suggestedImageIds: ['img_1', 'img_2'],
      });

      // Remove img_1
      const newIds = outline.suggestedImageIds!.filter((id) => id !== 'img_1');
      const updated = { ...outline, suggestedImageIds: newIds };

      expect(updated.suggestedImageIds?.length).toBe(1);
      expect(updated.suggestedImageIds?.[0]).toBe('img_2');

      // Add img_3
      const addedIds = [...newIds, 'img_3'];
      const addedUpdated = { ...outline, suggestedImageIds: addedIds };

      expect(addedUpdated.suggestedImageIds?.length).toBe(2);
      expect(addedUpdated.suggestedImageIds?.includes('img_3')).toBe(true);
    });
  });

  describe('Media Generations Operations', () => {
    it('should update media generation prompt', () => {
      const outline = createTestOutline({
        mediaGenerations: [
          { type: 'image', prompt: 'Original prompt', elementId: 'gen_img_1' },
        ],
      });

      const mediaGenerations = outline.mediaGenerations!.map((mg, i) =>
        i === 0 ? { ...mg, prompt: 'Updated prompt' } : mg
      );
      const updated = { ...outline, mediaGenerations };

      expect(updated.mediaGenerations?.[0].prompt).toBe('Updated prompt');
    });

    it('should remove media generation', () => {
      const outline = createTestOutline({
        mediaGenerations: [
          { type: 'image', prompt: 'Image 1', elementId: 'gen_img_1' },
          { type: 'video', prompt: 'Video 1', elementId: 'gen_vid_1' },
        ],
      });

      const mediaGenerations = outline.mediaGenerations!.filter((_, i) => i !== 0);
      const updated = { ...outline, mediaGenerations };

      expect(updated.mediaGenerations?.length).toBe(1);
      expect(updated.mediaGenerations?.[0].type).toBe('video');
    });
  });

  describe('Order Finalization', () => {
    it('should compute correct order after drag reorder', () => {
      const outlines = [
        createTestOutline({ id: 'a', order: 1 }),
        createTestOutline({ id: 'b', order: 2 }),
        createTestOutline({ id: 'c', order: 3 }),
      ];

      // Simulate reorder: a -> c -> b
      const reordered = [
        outlines[0], // a
        outlines[2], // c
        outlines[1], // b
      ];

      // Finalize order
      const finalized = reordered.map((o, i) => ({ ...o, order: i + 1 }));

      expect(finalized[0].id).toBe('a');
      expect(finalized[0].order).toBe(1);
      expect(finalized[1].id).toBe('c');
      expect(finalized[1].order).toBe(2);
      expect(finalized[2].id).toBe('b');
      expect(finalized[2].order).toBe(3);
    });
  });
});

// Type imports for the tests
import type { SceneOutline } from '@/lib/types/generation';