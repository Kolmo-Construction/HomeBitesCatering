/**
 * API Versioning System for Questionnaire Architecture
 * 
 * This module implements versioned API endpoints that:
 * - Support multiple API versions concurrently
 * - Provide backward compatibility
 * - Allow for graceful API evolution
 */

import { Router } from 'express';
import { handleBuilderApiRequest } from './questionnaire-builder.js';

// Router for API v1
const v1Router = Router();

// Router for API v2
const v2Router = Router();

/**
 * Configure Express application with versioned API routes
 * @param {Express} app - Express application instance
 * @param {Function} isAdmin - Authentication middleware for admin routes
 */
export function setupVersionedApiRoutes(app, isAdmin) {
  // Mount v1 API routes
  app.use('/api/v1', v1Router);
  
  // Mount v2 API routes
  app.use('/api/v2', v2Router);
  
  // Set up v1 routes
  configureV1Routes(v1Router, isAdmin);
  
  // Set up v2 routes
  configureV2Routes(v2Router, isAdmin);
  
  // Legacy support - map current endpoints to latest version
  configureLegacyRoutes(app, isAdmin);
}

/**
 * Configure v1 API routes
 * @param {Router} router - Express router for v1 API
 * @param {Function} isAdmin - Authentication middleware for admin routes
 */
function configureV1Routes(router, isAdmin) {
  // Questionnaire definitions endpoint
  router.get('/questionnaires', async (req, res) => {
    // Handle request to get all questionnaires
    res.json({
      version: 'v1',
      message: 'Get all questionnaires',
      // Implementation would be similar to current API
    });
  });
  
  // Get specific questionnaire
  router.get('/questionnaires/:id', async (req, res) => {
    const { id } = req.params;
    
    res.json({
      version: 'v1',
      message: `Get questionnaire with id ${id}`,
      // Implementation would be similar to current API
    });
  });
  
  // Create/update questionnaire components (unified builder API)
  router.post('/components/:componentType', isAdmin, async (req, res) => {
    const { componentType } = req.params;
    const { action, data } = req.body;
    
    // Modify the request to match the format expected by the builder API
    req.body.action = `${action}${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
    
    // Use the existing builder API handler
    return handleBuilderApiRequest(req, res);
  });
  
  // Delete questionnaire component
  router.delete('/components/:componentType/:id', isAdmin, async (req, res) => {
    const { componentType, id } = req.params;
    
    // Modify the request to match the format expected by the builder API
    req.body = {
      action: `delete${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`,
      data: { id }
    };
    
    // Use the existing builder API handler
    return handleBuilderApiRequest(req, res);
  });
}

/**
 * Configure v2 API routes with additional features
 * @param {Router} router - Express router for v2 API
 * @param {Function} isAdmin - Authentication middleware for admin routes
 */
function configureV2Routes(router, isAdmin) {
  // Include all v1 routes for backward compatibility
  configureV1Routes(router, isAdmin);
  
  // Add new v2-specific endpoints
  
  // Batch operations for components
  router.post('/components/batch', isAdmin, async (req, res) => {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        version: 'v2',
        success: false,
        message: 'Invalid request format. Expected array of operations.'
      });
    }
    
    // Process each operation in sequence
    const results = [];
    
    for (const operation of operations) {
      const { componentType, action, data, id } = operation;
      
      // Create a mock request object for each operation
      const mockReq = {
        body: {
          action: `${action}${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`,
          data: { ...data, id }
        },
        params: {}
      };
      
      // Create a mock response object to capture the result
      const mockRes = {
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.data = data;
          return this;
        }
      };
      
      // Process the operation
      await handleBuilderApiRequest(mockReq, mockRes);
      
      // Add the result to the results array
      results.push({
        operation,
        status: mockRes.statusCode || 200,
        result: mockRes.data
      });
    }
    
    // Return the combined results
    res.json({
      version: 'v2',
      success: true,
      results
    });
  });
  
  // Version control endpoints for questionnaires
  router.post('/questionnaires/:id/versions', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { versionName, notes } = req.body;
    
    res.json({
      version: 'v2',
      message: `Created new version of questionnaire ${id}`,
      versionId: Date.now(), // Mock version ID
      versionName,
      notes
    });
  });
  
  router.get('/questionnaires/:id/versions', async (req, res) => {
    const { id } = req.params;
    
    res.json({
      version: 'v2',
      message: `Get versions of questionnaire ${id}`,
      versions: [
        // Mock version data
        {
          versionId: 1,
          versionName: 'v1.0',
          notes: 'Initial version',
          createdAt: '2025-05-01T12:00:00Z'
        },
        {
          versionId: 2,
          versionName: 'v1.1',
          notes: 'Added new fields',
          createdAt: '2025-05-10T12:00:00Z'
        }
      ]
    });
  });
  
  // Component registry endpoints (for component types)
  router.get('/registry/components', async (req, res) => {
    res.json({
      version: 'v2',
      message: 'Get all registered component types',
      components: [
        // Mock component type data, would be fetched from the database
        {
          typeKey: 'text',
          componentCategory: 'question',
          displayName: 'Text Input',
          description: 'Single-line text input field'
        },
        {
          typeKey: 'select',
          componentCategory: 'question',
          displayName: 'Dropdown Select',
          description: 'Dropdown selection field'
        }
      ]
    });
  });
  
  // Template repository endpoints
  router.get('/templates/sections', async (req, res) => {
    res.json({
      version: 'v2',
      message: 'Get all section templates',
      templates: [
        // Mock section template data, would be fetched from the database
        {
          id: 1,
          title: 'Contact Information',
          description: 'Basic contact details section',
          templateKey: 'contact_info'
        },
        {
          id: 2,
          title: 'Event Details',
          description: 'Basic event information',
          templateKey: 'event_details'
        }
      ]
    });
  });
}

/**
 * Configure legacy routes to maintain backward compatibility
 * @param {Express} app - Express application instance
 * @param {Function} isAdmin - Authentication middleware for admin routes
 */
function configureLegacyRoutes(app, isAdmin) {
  // Maintain the existing builder API endpoint
  app.post('/api/questionnaires/builder', isAdmin, handleBuilderApiRequest);
  
  // Map other existing endpoints to latest version as needed
  app.get('/api/questionnaires/active', async (req, res) => {
    // Forward to the latest version
    req.url = '/api/v2/questionnaires/active';
    app._router.handle(req, res);
  });
}