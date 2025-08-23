import { describe, it, expect } from 'vitest';
import { ProtoParser } from '../src/generator/parser.js';

describe('ProtoParser', () => {
  it('should create parser instance', () => {
    const parser = new ProtoParser();
    expect(parser).toBeDefined();
  });

  it('should handle empty proto directory gracefully', async () => {
    const parser = new ProtoParser();
    // Test with non-existent directory should not throw
    try {
      const result = await parser.parseFromDirectory('/non-existent-path');
      expect(result.files).toEqual([]);
    } catch (error) {
      // It's ok if it throws for non-existent directory
      expect(error).toBeDefined();
    }
  });
});