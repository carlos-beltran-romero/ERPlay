import fs from 'fs';
import path from 'path';
import { load } from 'js-yaml';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

describe('OpenAPI public contract', () => {
  const specPath = path.join(__dirname, '..', '..', 'openapi.yaml');
  const raw = fs.readFileSync(specPath, 'utf8');
  const spec = load(raw) as any;

  it('loads an OpenAPI 3.1 specification', () => {
    expect(spec.openapi).toBeDefined();
    expect(String(spec.openapi)).toMatch(/^3\.1/);
    expect(spec.paths).toBeDefined();
    expect(spec.components?.schemas).toBeDefined();
  });

  const operations: Array<{
    path: string;
    method: HttpMethod;
    responses: string[];
    requiresAuth?: boolean;
  }> = [
    { path: '/auth/login', method: 'post', responses: ['200', '401'], requiresAuth: false },
    { path: '/auth/logout', method: 'post', responses: ['204', '401'] },
    { path: '/auth/refresh', method: 'post', responses: ['200', '400'], requiresAuth: false },
    { path: '/auth/forgot-password', method: 'post', responses: ['200'], requiresAuth: false },
    { path: '/auth/reset-password', method: 'post', responses: ['200', '400'], requiresAuth: false },
    { path: '/users/me', method: 'get', responses: ['200', '401'] },
    { path: '/users/me', method: 'put', responses: ['200', '400', '409'] },
    { path: '/users/me/password', method: 'post', responses: ['200', '400'] },
    { path: '/users', method: 'get', responses: ['200'] },
    { path: '/users', method: 'post', responses: ['201', '400'] },
    { path: '/users/{userId}', method: 'get', responses: ['200', '404'] },
    { path: '/users/{userId}', method: 'put', responses: ['200', '400', '403', '404', '409'] },
    { path: '/users/{userId}', method: 'delete', responses: ['204', '404'] },
    { path: '/diagrams/public', method: 'get', responses: ['200'] },
    { path: '/diagrams', method: 'get', responses: ['200'] },
    { path: '/diagrams', method: 'post', responses: ['201', '400'] },
    { path: '/diagrams/{diagramId}', method: 'get', responses: ['200', '404'] },
    { path: '/diagrams/{diagramId}', method: 'put', responses: ['200', '400', '404'] },
    { path: '/diagrams/{diagramId}', method: 'delete', responses: ['204', '404'] },
    { path: '/admin/diagrams/{diagramId}/stats', method: 'get', responses: ['200', '400', '404'] },
    { path: '/questions', method: 'post', responses: ['201', '400'] },
    { path: '/questions/pending/count', method: 'get', responses: ['200'] },
    { path: '/questions/pending', method: 'get', responses: ['200'] },
    { path: '/questions/{questionId}/verify', method: 'post', responses: ['200', '400', '403', '404'] },
    { path: '/questions/mine', method: 'get', responses: ['200'] },
    { path: '/claims', method: 'post', responses: ['201', '400'] },
    { path: '/claims/mine', method: 'get', responses: ['200'] },
    { path: '/claims/pending', method: 'get', responses: ['200'] },
    { path: '/claims/pending/count', method: 'get', responses: ['200'] },
    { path: '/claims/{claimId}/verify', method: 'post', responses: ['200', '400', '403', '404'] },
    { path: '/progress/overview', method: 'get', responses: ['200'] },
    { path: '/progress/trends', method: 'get', responses: ['200'] },
    { path: '/progress/errors', method: 'get', responses: ['200'] },
    { path: '/progress/habits', method: 'get', responses: ['200'] },
    { path: '/progress/claims', method: 'get', responses: ['200'] },
    { path: '/progress/badges', method: 'get', responses: ['200'] },
    { path: '/progress/weekly-goal/progress', method: 'get', responses: ['200'] },
    { path: '/dashboard/recent', method: 'get', responses: ['200'] },
    { path: '/exams/start', method: 'get', responses: ['200', '400'] },
    { path: '/test-sessions/start', method: 'post', responses: ['200', '400'] },
    { path: '/test-sessions/{sessionId}/results/{resultId}', method: 'patch', responses: ['200', '400'] },
    { path: '/test-sessions/{sessionId}/events', method: 'post', responses: ['200', '400'] },
    { path: '/test-sessions/{sessionId}/finish', method: 'post', responses: ['200', '400'] },
    { path: '/test-sessions/mine', method: 'get', responses: ['200'] },
    { path: '/test-sessions/{sessionId}', method: 'get', responses: ['200', '404'] },
    { path: '/supervisor/students/{studentId}', method: 'get', responses: ['200', '404'] },
    { path: '/supervisor/students/{studentId}/progress/overview', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/progress/trends', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/progress/errors', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/claims/stats', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/claims', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/badges', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/questions', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/tests', method: 'get', responses: ['200'] },
    { path: '/supervisor/students/{studentId}/tests/{sessionId}', method: 'get', responses: ['200', '404'] },
    { path: '/supervisor/weekly-goal', method: 'get', responses: ['200'] },
    { path: '/supervisor/weekly-goal', method: 'put', responses: ['200', '400'] },
    { path: '/supervisor/weekly-goal', method: 'post', responses: ['200', '400'] },
    { path: '/supervisor/weekly-goal/progress', method: 'get', responses: ['200'] },
  ];

  it.each(operations)('documents %s %s', ({ path: endpoint, method, responses, requiresAuth }) => {
    const pathItem = spec.paths?.[endpoint];
    expect(pathItem).toBeDefined();

    const operation = pathItem?.[method];
    expect(operation).toBeDefined();

    const documentedResponses = Object.keys(operation.responses ?? {});
    responses.forEach((status) => {
      expect(documentedResponses).toContain(status);
    });

    if (requiresAuth === false) {
      expect(operation.security).toEqual([]);
    } else if (requiresAuth === true || typeof requiresAuth === 'undefined') {
      if (Array.isArray(operation.security)) {
        expect(operation.security.length).toBeGreaterThan(0);
      }
    }
  });

  it('declares the schemas referenced by the contract', () => {
    const requiredSchemas = [
      'AuthTokens',
      'UserProfile',
      'UserSummary',
      'DiagramDetail',
      'DiagramStats',
      'QuestionCreateRequest',
      'ClaimCreateRequest',
      'ProgressOverview',
      'DashboardItem',
      'TestSessionDetail',
      'WeeklyGoal',
    ];

    const schemas = Object.keys(spec.components?.schemas ?? {});
    requiredSchemas.forEach((schemaName) => {
      expect(schemas).toContain(schemaName);
    });
  });
});
