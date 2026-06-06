import { beforeEach, describe, expect, it, vi } from 'vitest';

const googleMock = vi.hoisted(() => ({
  chat: vi.fn((modelId: string) => ({ endpoint: 'google-chat', modelId })),
  createGoogleGenerativeAI: vi.fn(),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: googleMock.createGoogleGenerativeAI,
}));

import { getModel } from '@/lib/ai/providers';

describe('Lconai provider', () => {
  beforeEach(() => {
    googleMock.createGoogleGenerativeAI.mockReturnValue({ chat: googleMock.chat });
  });

  it('forces the native Gemini endpoint and bearer authentication', () => {
    getModel({
      providerId: 'lconai',
      modelId: 'gemini-3-flash-preview',
      apiKey: 'sk-test',
      baseUrl: 'https://s.lconai.com/v1',
      providerType: 'openai',
    });

    expect(googleMock.createGoogleGenerativeAI).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      baseURL: 'https://s.lconai.com/v1beta',
      headers: { Authorization: 'Bearer sk-test' },
    });
    expect(googleMock.chat).toHaveBeenCalledWith('gemini-3-flash-preview');
  });
});
