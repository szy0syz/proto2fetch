import { describe, it, expect, beforeEach } from 'vitest';
import { KyAPIClient } from '../src/runtime/client.js';

describe('objectToSearchParams', () => {
  let client: KyAPIClient;

  beforeEach(() => {
    client = new KyAPIClient({
      baseUrl: 'https://api.test.com'
    });
  });

  it('should handle simple key-value pairs', () => {
    const obj = {
      name: 'John',
      age: 30,
      active: true
    };

    const params = client.objectToSearchParams(obj);
    
    expect(params.get('name')).toBe('John');
    expect(params.get('age')).toBe('30');
    expect(params.get('active')).toBe('true');
  });

  it('should handle nested objects with dot notation', () => {
    const obj = {
      pagination: {
        page: 1,
        size: 10
      },
      user: {
        name: 'John',
        email: 'john@example.com'
      }
    };

    const params = client.objectToSearchParams(obj);
    
    expect(params.get('pagination.page')).toBe('1');
    expect(params.get('pagination.size')).toBe('10');
    expect(params.get('user.name')).toBe('John');
    expect(params.get('user.email')).toBe('john@example.com');
  });

  it('should handle primitive arrays correctly', () => {
    const obj = {
      tags: ['javascript', 'typescript', 'node'],
      ids: [1, 2, 3]
    };

    const params = client.objectToSearchParams(obj);
    
    // Arrays should create multiple entries with the same key
    expect(params.getAll('tags')).toEqual(['javascript', 'typescript', 'node']);
    expect(params.getAll('ids')).toEqual(['1', '2', '3']);
  });

  it('should handle object arrays with indexed flattening', () => {
    const obj = {
      sort: [
        { field: 'name', direction: 'asc' },
        { field: 'created_at', direction: 'desc' }
      ]
    };

    const params = client.objectToSearchParams(obj);
    
    // Object arrays should be flattened with indices
    expect(params.get('sort[0].field')).toBe('name');
    expect(params.get('sort[0].direction')).toBe('asc');
    expect(params.get('sort[1].field')).toBe('created_at');
    expect(params.get('sort[1].direction')).toBe('desc');
  });

  it('should handle complex nested structures', () => {
    const obj = {
      pagination: {
        page: 1,
        size: 5
      },
      filter: {
        isActive: true,
        category: 'tech'
      },
      sort: [
        { field: 'name', direction: 'asc' },
        { field: 'created_at', direction: 'desc' }
      ]
    };

    const params = client.objectToSearchParams(obj);
    
    // Check pagination
    expect(params.get('pagination.page')).toBe('1');
    expect(params.get('pagination.size')).toBe('5');
    
    // Check filter
    expect(params.get('filter.isActive')).toBe('true');
    expect(params.get('filter.category')).toBe('tech');
    
    // Check sort array
    expect(params.get('sort[0].field')).toBe('name');
    expect(params.get('sort[0].direction')).toBe('asc');
    expect(params.get('sort[1].field')).toBe('created_at');
    expect(params.get('sort[1].direction')).toBe('desc');
  });

  it('should ignore undefined and null values', () => {
    const obj = {
      name: 'John',
      age: null,
      email: undefined,
      active: true
    };

    const params = client.objectToSearchParams(obj);
    
    expect(params.get('name')).toBe('John');
    expect(params.get('age')).toBeNull();
    expect(params.get('email')).toBeNull();
    expect(params.get('active')).toBe('true');
    expect(params.has('age')).toBe(false);
    expect(params.has('email')).toBe(false);
  });

  it('should handle empty arrays and objects', () => {
    const obj = {
      emptyArray: [],
      emptyObject: {},
      normalValue: 'test'
    };

    const params = client.objectToSearchParams(obj);
    
    expect(params.get('normalValue')).toBe('test');
    expect(params.has('emptyArray')).toBe(false);
    expect(params.has('emptyObject')).toBe(false);
  });

  it('should handle mixed array types', () => {
    const obj = {
      primitives: ['a', 'b', 'c'],
      objects: [
        { name: 'item1', value: 1 },
        { name: 'item2', value: 2 }
      ],
      mixed: ['string', { key: 'value' }, 123]
    };

    const params = client.objectToSearchParams(obj);
    
    // Primitive array
    expect(params.getAll('primitives')).toEqual(['a', 'b', 'c']);
    
    // Object array
    expect(params.get('objects[0].name')).toBe('item1');
    expect(params.get('objects[0].value')).toBe('1');
    expect(params.get('objects[1].name')).toBe('item2');
    expect(params.get('objects[1].value')).toBe('2');
    
    // Mixed array (objects get indexed, primitives don't)
    expect(params.get('mixed')).toBe('string'); // First primitive
    expect(params.getAll('mixed')).toEqual(['string', '123']); // All primitives
    expect(params.get('mixed[1].key')).toBe('value'); // Object at index 1
  });

  it('should handle deeply nested object arrays', () => {
    const obj = {
      users: [
        {
          name: 'John',
          addresses: [
            { street: '123 Main St', city: 'New York' },
            { street: '456 Oak Ave', city: 'Boston' }
          ]
        }
      ]
    };

    const params = client.objectToSearchParams(obj);
    
    expect(params.get('users[0].name')).toBe('John');
    expect(params.get('users[0].addresses[0].street')).toBe('123 Main St');
    expect(params.get('users[0].addresses[0].city')).toBe('New York');
    expect(params.get('users[0].addresses[1].street')).toBe('456 Oak Ave');
    expect(params.get('users[0].addresses[1].city')).toBe('Boston');
  });

  it('should generate correct URL parameters for real-world pagination request', () => {
    const request = {
      pagination: { page: 1, size: 5 },
      filter: { isActive: true },
      sort: [{ field: 'created_at', direction: 'desc' as const }]
    };

    const params = client.objectToSearchParams(request);
    const urlString = params.toString();
    
    expect(urlString).toContain('pagination.page=1');
    expect(urlString).toContain('pagination.size=5');
    expect(urlString).toContain('filter.isActive=true');
    expect(urlString).toContain('sort%5B0%5D.field=created_at'); // sort[0].field=created_at (URL encoded)
    expect(urlString).toContain('sort%5B0%5D.direction=desc');   // sort[0].direction=desc (URL encoded)
    
    // Verify the bug is fixed - should not contain [object Object]
    expect(urlString).not.toContain('object+Object');
    expect(urlString).not.toContain('%5Bobject+Object%5D');
  });
});