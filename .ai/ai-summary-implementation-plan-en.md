# AI Summary Implementation Plan - Current State

## Overview

This document describes the current implementation of the AI Summary feature for the Unlazy fitness tracking application. The system allows users to generate AI-powered summaries of their workout sessions using an async background processing approach with a robust blocking mechanism.

## Architecture Overview

### 1. Edge Function (`/functions/v1/openrouter`)

**Location**: `supabase/functions/openrouter/index.ts`

**Mode**: Async-only (no sync mode)

**Flow**:
1. Validates request and user authentication
2. Sets `generating_started_at = NOW()` in users table
3. Starts background generation process
4. Returns immediate response with status "started"
5. Generates summary using OpenRouter AI
6. Saves summary to sessions table
7. Clears `generating_started_at = NULL`

**Request Format**:
```typescript
interface SessionSummaryRequest {
  sessionId: number;
}
```

**Response Format**:
```typescript
interface SessionSummaryAsyncResponse {
  requestId: string;
  status: "started" | "generating" | "completed" | "error";
  sessionId: number;
  summary?: string;
  tokensUsed?: number;
  error?: string;
}
```

### 2. Frontend Service Layer

#### AISummaryService (`src/app/features/ai-summary/ai-summary.service.ts`)

**Key Methods**:
- `generateSessionSummary(sessionId)`: Starts async generation
- `canGenerateSummary(sessionId)`: Checks if generation is allowed
- `isGenerating()`: Returns current user's generation status

**Implementation**:
```typescript
@Injectable({ providedIn: 'root' })
export class AISummaryService {
  async generateSessionSummary(sessionId: number): Promise<void> {
    // Check blocking state
    const canGenerate = await this.canGenerateSummary(sessionId);
    if (!canGenerate) {
      throw new Error("Cannot generate summary for this session");
    }

    // Call edge function (async-only)
    const response = await this.dbService.callEdgeFunction("openrouter", { sessionId });
    
    if (response.error) {
      throw new Error(response.error.message);
    }

    // Show success message
    this.showMessage(AI_MESSAGES.GENERATING, "info");
  }

  async isGenerating(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user?.generating_started_at;
  }

  async canGenerateSummary(sessionId: number): Promise<boolean> {
    const [user, session] = await Promise.all([
      this.getCurrentUser(),
      this.getSession(sessionId),
    ]);

    // Blocking checks
    if (user.generating_started_at) return false;
    if (session.summary) return false;
    if (session.user_id !== user.id) return false;

    return true;
  }
}
```

### 4. UI Components

#### SessionListComponent

**Blocking Implementation**:
```typescript
async onGenerateAISummary(sessionId: number): Promise<void> {
  // Check if user is already generating
  const isGenerating = await this.aiSummaryService.isGenerating();
  if (isGenerating) {
    this.showBlockedMessage();
    return;
  }

  try {
    // Start generation
    await this.aiSummaryService.generateSessionSummary(sessionId);
    
    // Start polling for completion
    this.startSummaryPolling(sessionId);
  } catch (error) {
    this.handleError(error);
  }
}

private startSummaryPolling(sessionId: number): void {
  const pollInterval = setInterval(async () => {
    const isGenerating = await this.aiSummaryService.isGenerating();
    
    if (!isGenerating) {
      clearInterval(pollInterval);
      this.refreshSessions();
      this.showSuccessMessage();
    }
  }, 2000);

  // Timeout after 60 seconds
  setTimeout(() => clearInterval(pollInterval), 60000);
}
```

#### SessionDetailsComponent

Similar implementation with session-specific polling and state management.

#### UI State Management

**StatsCardComponent**: Shows AI generation button when appropriate
- `[hasExerciseSets]`: Session has exercises
- `[hasSummary]`: Session already has summary
- `[isGenerating]`: User is currently generating
- `[isAnyGenerating]`: Any generation in progress (deprecated)

**AISummaryComponent**: Displays generated summaries
- `[summary]`: The AI-generated text
- `[isGenerating]`: Shows loading state

## Type Definitions

```typescript
// User type with blocking field
export type User = Pick<
  Tables<"users">,
  "auth_user_id" | "email" | "id" | "generating_started_at"
>;

// Request to edge function
export interface GenerateSummaryRequest {
  sessionId: number;
}

// Response from edge function
export interface GenerateSummaryAsyncResponse {
  requestId: string;
  status: "started" | "generating" | "completed" | "error";
  sessionId: number;
  summary?: string;
  tokensUsed?: number;
  error?: string;
}

// Session view model for UI
export interface SessionItemViewModel {
  id: number;
  sessionDatetime: Date;
  description: string | null;
  location: string | null;
  totalWeight: number;
  totalReps: number;
  exerciseCount: number;
  formattedDate: string;
  formattedTime: string;
  isExpandedByDefault: boolean;
  // AI Summary properties
  hasExerciseSets: boolean;
  hasSummary: boolean;
  isGenerating: boolean;
  summary: string | null;
}
```

## Constants and Configuration

```typescript
// AI Summary configuration
export const AI_SUMMARY = {
  API_ENDPOINT: '/functions/v1/openrouter',
  POLLING_INTERVAL: 2000,
  MAX_POLLING_ATTEMPTS: 30,
  REQUEST_TIMEOUT: 30000,
  DEBOUNCE_DELAY: 500,
} as const;

// Error codes
export const AI_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  // ... other codes
} as const;

// User-facing messages
export const AI_MESSAGES = {
  GENERATING: 'Generowanie podsumowania...',
  SUCCESS: 'Podsumowanie zostało wygenerowane',
  ALREADY_GENERATING: 'Już trwa generowanie innego podsumowania',
  ERROR_GENERIC: 'Wystąpił błąd podczas generowania podsumowania',
  // ... other messages
} as const;
```

## Blocking Mechanism Flow

### 1. User Initiates Generation
```
User clicks "Generate AI Summary" button
    ↓
Frontend checks: await aiSummaryService.isGenerating()
    ↓
If true: Show "Already generating" message
If false: Proceed to generation
```

### 2. Generation Start
```
Frontend calls: generateSessionSummary(sessionId)
    ↓
Edge function sets: generating_started_at = NOW()
    ↓
Edge function returns: { status: "started", sessionId, requestId }
    ↓
Frontend starts polling every 2 seconds
```

### 3. Background Processing
```
Edge function (background):
    ↓
Fetches session data
    ↓
Calls OpenRouter AI API
    ↓
Generates summary
    ↓
Saves to sessions.summary
    ↓
Clears: generating_started_at = NULL
```

### 4. Completion Detection
```
Frontend polling detects: isGenerating() = false
    ↓
Frontend refreshes session data
    ↓
UI shows new summary
    ↓
Success message displayed
```

## Error Handling

### Edge Function Errors
- Always clears `generating_started_at` flag
- Returns appropriate HTTP status codes
- Provides detailed error messages

### Frontend Error Handling
- Network errors: Retry suggestions
- Authentication errors: Login prompts
- Validation errors: User feedback
- Timeout: Manual refresh options

## Security Considerations

1. **Authentication**: JWT verification for all requests
2. **Authorization**: Users can only summarize their own sessions
3. **Rate Limiting**: Database-level blocking prevents spam
4. **Input Validation**: Comprehensive request validation
5. **Error Sanitization**: No internal details leaked to users

## Performance Optimizations

1. **Async Processing**: Non-blocking user experience
2. **Debouncing**: Prevents rapid successive calls
3. **Efficient Polling**: 2-second intervals with 60s timeout
4. **Database Indexes**: On `generating_started_at` field
5. **Client Caching**: Session data cached during polling

## Testing Strategy

### Unit Tests
- Service method validation
- Error handling scenarios
- Type safety verification

### Integration Tests
- Edge function end-to-end flow
- Database state consistency
- Multi-user blocking scenarios

### Manual Testing
- Multi-tab concurrent generation attempts
- Network interruption scenarios
- Long-running generation timeouts

## Monitoring and Observability

### Metrics to Track
- Generation success/failure rates
- Average generation time
- Concurrent generation attempts
- Token usage statistics

### Logging
- Edge function: Request/response logging
- Frontend: Error and performance logging
- Database: Generation state changes

## Future Enhancements

### Planned Improvements
1. **WebSocket Updates**: Replace polling with real-time notifications
2. **Queue System**: Allow multiple generations per user with queueing
3. **Language Support**: Multi-language summary generation
4. **Advanced AI Models**: Support for different AI providers
5. **Caching Layer**: Cache generated summaries for faster retrieval

### Database Optimizations
1. **Cleanup Job**: Periodic cleanup of stale `generating_started_at` flags
2. **Partitioning**: Session table partitioning for better performance
3. **Indexes**: Additional indexes on frequently queried fields

## Deployment Notes

### Environment Variables
```
OPENROUTER_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Database Migrations
```sql
-- Add generation tracking column
ALTER TABLE users ADD COLUMN generating_started_at TIMESTAMP NULL;

-- Add index for performance
CREATE INDEX idx_users_generating_started_at ON users(generating_started_at);

-- Add summary column if not exists
ALTER TABLE sessions ADD COLUMN summary TEXT NULL;
```

### Edge Function Deployment
```bash
supabase functions deploy openrouter --project-ref your-project-ref
```

## Documentation References

- [Blocking Mechanism Documentation](../docs/ai-summary-blocking-mechanism.md)
- [Edge Function API Documentation](../supabase/functions/openrouter/DESCRIPTION.md)
- [OpenRouter AI API Documentation](https://openrouter.ai/docs)

## Conclusion

The AI Summary feature is now fully implemented with a robust, async-first architecture that provides excellent user experience while maintaining data consistency and preventing concurrent generation issues. The implementation is production-ready and includes comprehensive error handling, monitoring capabilities, and future enhancement possibilities.
