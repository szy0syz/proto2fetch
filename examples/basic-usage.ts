/**
 * Basic usage example for proto2fetch
 * This demonstrates how to use the generated API client
 */

import { CleanGoAPIClient } from '../generated/client.js';
import * as Types from '../generated/types.js';

// Example configuration
const client = new CleanGoAPIClient({
  baseUrl: 'https://api.example.com',
  auth: {
    token: 'your-auth-token-here',
    tokenType: 'Bearer'
  },
  timeout: 10000,
  retry: {
    limit: 3,
    statusCodes: [429, 500, 502, 503, 504]
  }
});

async function basicUsageExample(): Promise<void> {
  try {
    // User management examples
    console.log('=== User Management Examples ===');

    // Create a new user
    const createRequest: Types.CreateUserRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-0123',
      password: 'securepassword123'
    };

    const createResponse = await client.createUser(createRequest);
    console.log('Created user:', createResponse.user);

    // Get current user
    const currentUser = await client.getCurrentUser({});
    console.log('Current user:', currentUser.user);

    // Get users with pagination and filtering
    const getUsersRequest: Types.GetUsersRequest = {
      pagination: { page: 1, size: 10 },
      filter: {
        isActive: true,
        nameLike: 'John'
      },
      sort: [
        { field: 'created_at', direction: 'desc' }
      ]
    };

    const usersResponse = await client.getUsers(getUsersRequest);
    console.log('Users:', usersResponse.users);
    console.log('Total:', usersResponse.total);

    // Update user
    const updateRequest: Types.UpdateUserRequest = {
      id: '123',
      name: 'John Smith',
      email: 'johnsmith@example.com'
    };

    const updateResponse = await client.updateUser(updateRequest);
    console.log('Updated user:', updateResponse.user);

    // Authentication examples
    console.log('\n=== Authentication Examples ===');

    // Login
    const loginRequest: Types.LoginRequest = {
      username: 'john@example.com',
      password: 'securepassword123'
    };

    const loginResponse = await client.login(loginRequest);
    console.log('Login successful. Token expires at:', loginResponse.expiresAt);

    // Update client token
    client.setAuthToken(loginResponse.token);

    // Validate token
    const validateRequest: Types.ValidateTokenRequest = {
      token: loginResponse.token
    };

    const validateResponse = await client.validateToken(validateRequest);
    console.log('Token is valid:', validateResponse.valid);

    // Authorization examples
    console.log('\n=== Authorization Examples ===');

    // Assign role to user
    const assignRoleRequest: Types.AssignRoleRequest = {
      userId: '123',
      roleId: '456'
    };

    await client.assignRole(assignRoleRequest);
    console.log('Role assigned successfully');

    // Check permission
    const checkPermissionRequest: Types.CheckPermissionRequest = {
      userId: '123',
      resource: 'user',
      action: 'read'
    };

    const permissionResponse = await client.checkPermission(checkPermissionRequest);
    console.log('User has permission:', permissionResponse.allowed);

  } catch (error) {
    if (error instanceof Error) {
      console.error('API Error:', error.message);
      
      // Handle specific error types
      if ('status' in error) {
        const apiError = error as any;
        console.error('Status:', apiError.status);
        console.error('Code:', apiError.code);
        
        if (apiError.details && apiError.details.length > 0) {
          console.error('Details:', apiError.details);
        }
      }
    }
  }
}

async function advancedUsageExample(): Promise<void> {
  try {
    console.log('=== Advanced Usage Examples ===');

    // Using filter builders (if generated)
    const userFilter = new Types.UserFilterBuilder()
      .name('John')
      .isActive(true)
      .createdAfter(new Date('2024-01-01'))
      .build();

    // Using sort builders (if generated)  
    const userSort = new Types.UserSortBuilder()
      .byCreatedAt('desc')
      .byName('asc')
      .build();

    const advancedRequest: Types.GetUsersRequest = {
      pagination: { page: 1, size: 20 },
      filter: userFilter,
      sort: userSort
    };

    const response = await client.getUsers(advancedRequest);
    console.log('Advanced query results:', response.users.length);

    // Batch operations
    const batchAssignRequest: Types.BatchAssignRolesRequest = {
      userId: '123',
      roleIds: ['456', '789', '101112']
    };

    await client.batchAssignRoles(batchAssignRequest);
    console.log('Batch role assignment completed');

    // Batch permissions
    const batchPermissionsRequest: Types.BatchAddPermissionsRequest = {
      roleId: '456',
      permissions: [
        { resource: 'user', action: 'read' },
        { resource: 'user', action: 'write' },
        { resource: 'role', action: 'read' }
      ]
    };

    await client.batchAddPermissions(batchPermissionsRequest);
    console.log('Batch permissions added');

  } catch (error) {
    console.error('Advanced usage error:', error);
  }
}

async function errorHandlingExample(): Promise<void> {
  console.log('=== Error Handling Examples ===');

  try {
    // This will likely cause a validation error
    const invalidRequest: Types.CreateUserRequest = {
      name: '', // Invalid: empty name
      email: 'invalid-email', // Invalid: bad email format
      phone: '', // Invalid: empty phone
      password: '123' // Invalid: too short
    };

    await client.createUser(invalidRequest);
  } catch (error) {
    if (error instanceof Error) {
      console.log('Validation error caught:', error.message);
      
      // Access error details if available
      if ('details' in error) {
        const apiError = error as any;
        const fieldErrors = apiError.getFieldErrors?.();
        if (fieldErrors) {
          console.log('Field-specific errors:');
          for (const [field, errors] of Object.entries(fieldErrors)) {
            console.log(`  ${field}: ${errors}`);
          }
        }
      }
    }
  }

  // Test network error handling
  const offlineClient = new CleanGoAPIClient({
    baseUrl: 'http://nonexistent-domain.invalid',
    timeout: 1000
  });

  try {
    await offlineClient.getCurrentUser({});
  } catch (error) {
    console.log('Network error caught:', (error as Error).message);
  }
}

// Run examples
async function main(): Promise<void> {
  console.log('proto2fetch Usage Examples\n');
  
  await basicUsageExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await advancedUsageExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await errorHandlingExample();
}

// Export for use in other files
export {
  basicUsageExample,
  advancedUsageExample,
  errorHandlingExample
};

// Run if called directly (Node.js doesn't support import.meta.main, using process check instead)
if (process.argv[1] === import.meta.url.replace('file://', '')) {
  main().catch(console.error);
}