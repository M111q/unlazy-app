 typemismatch# AI Summary Feature Implementation Plan - Unlazy App (CORRECTED)

## 1. Current Situation Analysis

### 1.1 Infrastructure Status
✅ **Ready elements:**
- `summary` column in `sessions` table (TEXT, nullable)
- `generating_started_at` column in `users` table (TIMESTAMP, nullable) 
- Database function `clear_session_summary()` with trigger
- Edge Function `/openrouter` working synchronously
- Index `idx_users_generating_started_at`
- Cleanup function `cleanup_stale_generating_flags()`

❌ **Critical issues found:**
- TypeScript types inconsistent with current database schema
- Edge Function works synchronously, needs async mode
- Missing UI components for AI functionality
- Missing service for managing AI state
- Missing AI-related constants

### 1.2 Application Architecture
- Angular 17+ with standalone components
- Angular Material UI
- Signals-based state management
- Modular structure (features/sessions)
- Supabase as backend (auth + database + edge functions)
- TypeScript with strict mode

## 2. Implementation Strategy

### 2.1 Architectural Decision
**Choice: Enhanced Edge Function with Async Mode**
- Modify existing Edge Function `/openrouter` to support async mode
- Add backward compatibility for synchronous calls
- Implement client-side polling for better UX
- Maintain existing functionality

### 2.2 Implementation Approach
1. **Phase 1:** Critical type corrections and constants
2. **Phase 2:** Edge Function enhancement for async support
3. **Phase 3:** AI Summary service implementation  
4. **Phase 4:** UI components and integration
5. **Phase 5:** Testing and optimization

## 3. Detailed Implementation Plan

### 3.1 Phase 1: Critical Type Corrections and Constants

#### 3.1.1 Fix types.ts
**File:** `src/types.ts`
**Critical Fix:**
```typescript
// CURRENT (incorrect - types.ts doesn't match database):
export type User = Pick<
  Tables<"users">,
  "auth_user_id" | "email" | "id" | "is_generating"  // ❌ This column doesn't exist in DB
>;

// CORRECTED (to match actual database schema):
export type User = Pick<
  Tables<"users">,
  "auth_user_id" | "email" | "id" | "generating_started_at"  // ✅ This is the actual DB column
>;

// Add new AI Summary types
export interface AISummaryState {
  isGenerating: boolean;
  summary: string | null;
  canGenerate: boolean;
  error: string | null;
}

export interface GenerateSummaryStartResponse {
  started: boolean;
  sessionId: number;
  estimatedTime?: number;
}

export interface SummaryGenerationStatus {
  isGenerating: boolean;
  startedAt: string | null;
  sessionId: number;
}

export interface GenerateSummaryRequest {
  sessionId: number;
  async?: boolean; // New parameter for async mode
}

export interface GenerateSummaryAsyncResponse {
  started: boolean;
  sessionId: number;
  estimatedTime: number;
}
```

#### 3.1.2 Add AI constants
**File:** `src/app/constants.ts`
**Add to existing file:**
```typescript
// ========================================
// AI SUMMARY CONFIGURATION
// ========================================

export const AI_SUMMARY = {
  POLLING_INTERVAL: 2000, // 2 seconds
  TIMEOUT: 60000, // 60 seconds
  MAX_RETRIES: 3,
  DEBOUNCE_TIME: 1000, // 1 second
  ESTIMATED_TIME: 30, // 30 seconds estimated generation time
} as const;

export const AI_ERROR_CODES = {
  ALREADY_GENERATING: 'ALREADY_GENERATING',
  NO_EXERCISE_SETS: 'NO_EXERCISE_SETS',
  SUMMARY_EXISTS: 'SUMMARY_EXISTS',
  TIMEOUT: 'TIMEOUT',
  API_ERROR: 'API_ERROR',
  POLLING_ERROR: 'POLLING_ERROR',
} as const;

export const AI_MESSAGES = {
  GENERATING: 'Generowanie podsumowania AI...',
  SUCCESS: 'Podsumowanie AI zostało wygenerowane!',
  ERROR: 'Nie udało się wygenerować podsumowania',
  TIMEOUT: 'Przekroczono limit czasu generowania',
  ALREADY_GENERATING: 'Już trwa generowanie podsumowania',
} as const;
```

### 3.2 Phase 2: Edge Function Enhancement

#### 3.2.1 Modify existing Edge Function
**File:** `supabase/functions/openrouter/index.ts`
**Strategy:** Build on existing working implementation

**Key changes:**
```typescript
// Add to existing interfaces
interface SessionSummaryRequest {
  sessionId: number;
  async?: boolean; // New optional parameter
}

interface SessionSummaryAsyncResponse {
  started: boolean;
  sessionId: number;
  estimatedTime: number;
}

// Modify main handler after request validation
serve(async (req) => {
  try {
    // ... existing CORS and validation code ...

    const requestBody: SessionSummaryRequest = await req.json();
    
    // NEW: Check for async mode
    const isAsync = requestBody.async === true;
    
    // ... existing auth and data fetching code stays the same ...

    if (isAsync) {
      // ASYNC MODE: Set generating flag and return immediately
      try {
        await supabase
          .from('users')
          .update({ generating_started_at: new Date().toISOString() })
          .eq('auth_user_id', authUserId);
        
        // Start background generation (no await)
        generateSummaryInBackground(
          requestBody.sessionId, 
          authUserId, 
          exerciseSummary, 
          userLanguage,
          supabase
        );
        
        // Immediate response
        return new Response(
          JSON.stringify({
            started: true,
            sessionId: requestBody.sessionId,
            estimatedTime: 30
          } as SessionSummaryAsyncResponse),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      } catch (error) {
        console.error('Failed to start async generation:', error);
        throw new SessionSummaryError(
          'Failed to start summary generation',
          500,
          'ASYNC_START_ERROR'
        );
      }
    }

    // SYNC MODE: Keep existing behavior exactly as is
    // ... existing OpenRouter API call and processing ...
    
  } catch (error) {
    // ... existing error handling ...
  }
});

// NEW: Background generation function
async function generateSummaryInBackground(
  sessionId: number,
  authUserId: string,
  exerciseSummary: string,
  userLanguage: string,
  supabase: any
): Promise<void> {
  try {
    // Use existing OpenRouter API call logic
    const systemMessage = "Your role is as a training assistant. Summarize a given training session in 2-3 sentences. Try to motivate the user to another training session. Summarize the body part that was most burdened by this training, if you don't know, period training as 'general development'. Answer in user language.";
    const userMessage = `${exerciseSummary}; User language: ${userLanguage}`;

    const openRouterPayload = {
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 200,
    };

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": Deno.env.get("SUPABASE_URL"),
        "X-Title": "Unlazy App Session Summary",
      },
      body: JSON.stringify(openRouterPayload),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.error?.message || "OpenRouter API error");
    }

    const summary = responseData.choices?.[0]?.message?.content || 
      "Unable to generate summary at this time.";

    // Save summary to database
    await supabase
      .from('sessions')
      .update({ summary })
      .eq('id', sessionId);

    console.log(`Background generation completed for session ${sessionId}`);
    
  } catch (error) {
    console.error('Background generation failed:', error);
    // Could optionally save error state to database here
  } finally {
    // Always reset generating flag
    try {
      await supabase
        .from('users')
        .update({ generating_started_at: null })
        .eq('auth_user_id', authUserId);
    } catch (resetError) {
      console.error('Failed to reset generating flag:', resetError);
    }
  }
}
```

### 3.3 Phase 3: AI Summary Service Implementation

#### 3.3.1 Create AISummaryService
**File:** `src/app/features/sessions/services/ai-summary.service.ts`

```typescript
import { Injectable, inject, OnDestroy } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../data/supabase.service';
import { DbService } from '../../../data/db.service';
import { AI_SUMMARY, AI_ERROR_CODES, AI_MESSAGES } from '../../../constants';
import {
  AISummaryState,
  GenerateSummaryAsyncResponse,
  User,
  SessionWithStats
} from '../../../../types';

@Injectable({
  providedIn: 'root'
})
export class AISummaryService implements OnDestroy {
  private readonly supabase = inject(SupabaseService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dbService = inject(DbService);
  
  private pollingIntervals = new Map<number, any>();
  private debounceTimers = new Map<number, any>();

  /**
   * Generate AI summary for session with async polling
   */
  async generateSessionSummary(sessionId: number): Promise<void> {
    try {
      // Clear any existing debounce timer
      this.clearDebounceTimer(sessionId);
      
      // Debounce multiple clicks
      const debounceTimer = setTimeout(async () => {
        await this.executeGeneration(sessionId);
      }, AI_SUMMARY.DEBOUNCE_TIME);
      
      this.debounceTimers.set(sessionId, debounceTimer);
      
    } catch (error) {
      this.handleGenerationError(error, sessionId);
    }
  }

  /**
   * Execute the actual generation process
   */
  private async executeGeneration(sessionId: number): Promise<void> {
    try {
      // Validate generation is possible
      const canGenerate = await this.canGenerateSummary(sessionId);
      if (!canGenerate.canGenerate) {
        throw new Error(canGenerate.reason || 'Cannot generate summary');
      }

      // Call Edge Function in async mode
      const { data, error } = await this.supabase.client.functions.invoke('openrouter', {
        body: { sessionId, async: true }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to start generation');
      }

      const response = data as GenerateSummaryAsyncResponse;
      
      if (response.started) {
        this.showMessage(AI_MESSAGES.GENERATING);
        this.startGenerationPolling(sessionId);
      } else {
        throw new Error('Failed to start generation');
      }
      
    } catch (error) {
      this.handleGenerationError(error, sessionId);
    }
  }

  /**
   * Start polling for generation completion
   */
  private startGenerationPolling(sessionId: number): void {
    // Clear any existing polling for this session
    this.stopPolling(sessionId);
    
    const startTime = Date.now();
    let retryCount = 0;
    
    const pollInterval = setInterval(async () => {
      try {
        const user = await this.getCurrentUser();
        
        // Check if generation completed
        if (!user.generating_started_at) {
          clearInterval(pollInterval);
          this.pollingIntervals.delete(sessionId);
          
          await this.handleGenerationComplete(sessionId);
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime > AI_SUMMARY.TIMEOUT) {
          clearInterval(pollInterval);
          this.pollingIntervals.delete(sessionId);
          this.handleTimeout(sessionId);
          return;
        }
        
        // Reset retry count on successful poll
        retryCount = 0;
        
      } catch (error) {
        retryCount++;
        console.error(`Polling error (attempt ${retryCount}):`, error);
        
        if (retryCount >= AI_SUMMARY.MAX_RETRIES) {
          clearInterval(pollInterval);
          this.pollingIntervals.delete(sessionId);
          this.handlePollingError(error);
        }
      }
    }, AI_SUMMARY.POLLING_INTERVAL);
    
    this.pollingIntervals.set(sessionId, pollInterval);
  }

  /**
   * Handle successful generation completion
   */
  private async handleGenerationComplete(sessionId: number): Promise<void> {
    try {
      // Refresh session data to get new summary
      await this.refreshSessionData(sessionId);
      this.showMessage(AI_MESSAGES.SUCCESS);
    } catch (error) {
      console.error('Failed to refresh session data:', error);
      this.showMessage('Podsumowanie zostało wygenerowane, ale wystąpił problem z odświeżeniem danych');
    }
  }

  /**
   * Check if summary generation is possible for session
   */
  async canGenerateSummary(sessionId: number): Promise<{canGenerate: boolean, reason?: string}> {
    try {
      const [user, session] = await Promise.all([
        this.getCurrentUser(),
        this.getSession(sessionId)
      ]);
      
      if (user.generating_started_at) {
        return { canGenerate: false, reason: AI_MESSAGES.ALREADY_GENERATING };
      }
      
      if (session.summary) {
        return { canGenerate: false, reason: 'Podsumowanie już istnieje' };
      }
      
      if (!session.exercise_sets || session.exercise_sets.length === 0) {
        return { canGenerate: false, reason: 'Sesja nie zawiera żadnych ćwiczeń' };
      }
      
      return { canGenerate: true };
      
    } catch (error) {
      console.error('Error checking generation possibility:', error);
      return { canGenerate: false, reason: 'Błąd sprawdzania możliwości generowania' };
    }
  }

  /**
   * Check if user is currently generating any summary
   */
  async isGenerating(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user.generating_started_at;
    } catch (error) {
      console.error('Error checking generation status:', error);
      return false;
    }
  }

  /**
   * Stop polling for specific session
   */
  stopPolling(sessionId: number): void {
    const interval = this.pollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(sessionId);
    }
    
    this.clearDebounceTimer(sessionId);
  }

  /**
   * Clear debounce timer for session
   */
  private clearDebounceTimer(sessionId: number): void {
    const timer = this.debounceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }
  }

  /**
   * Get current user profile
   */
  private async getCurrentUser(): Promise<User> {
    return await this.dbService.getCurrentUserProfile();
  }

  /**
   * Get session details
   */
  private async getSession(sessionId: number): Promise<SessionWithStats> {
    return await this.dbService.getSessionWithStats(sessionId);
  }

  /**
   * Refresh session data (trigger component refresh)
   */
  private async refreshSessionData(sessionId: number): Promise<void> {
    // This would typically emit an event or call a refresh method
    // For now, we'll rely on the component to handle refresh
    console.log(`Session ${sessionId} data should be refreshed`);
  }

  /**
   * Handle generation errors
   */
  private handleGenerationError(error: any, sessionId: number): void {
    console.error('Generation error:', error);
    this.stopPolling(sessionId);
    
    const message = error.message || AI_MESSAGES.ERROR;
    this.showMessage(message, 'error');
  }

  /**
   * Handle timeout
   */
  private handleTimeout(sessionId: number): void {
    console.warn(`Generation timeout for session ${sessionId}`);
    this.showMessage(AI_MESSAGES.TIMEOUT, 'error');
  }

  /**
   * Handle polling errors
   */
  private handlePollingError(error: any): void {
    console.error('Polling error:', error);
    this.showMessage('Błąd podczas sprawdzania statusu generowania', 'error');
  }

  /**
   * Show snackbar message
   */
  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.snackBar.open(message, 'Zamknij', {
      duration: type === 'error' ? 5000 : 3000,
      panelClass: type === 'error' ? ['error-snackbar'] : ['success-snackbar']
    });
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    // Clear all polling intervals
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
```

### 3.4 Phase 4: UI Components and Integration

#### 3.4.1 Extend StatsCardComponent
**File:** `src/app/features/sessions/components/stats-card/stats-card.component.ts`

**Add new properties:**
```typescript
import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../../../../shared/material.module";

@Component({
  selector: "app-stats-card",
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: "./stats-card.component.html",
  styleUrl: "./stats-card.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
  @Input({ required: true }) totalWeight = 0;
  @Input({ required: true }) totalReps = 0;
  @Input({ required: true }) exerciseCount = 0;
  
  // NEW AI-related inputs
  @Input() hasExerciseSets = false;
  @Input() hasSummary = false;
  @Input() isGenerating = false;
  
  // NEW AI event output
  @Output() generateSummary = new EventEmitter<void>();

  // NEW computed property for AI icon visibility
  get canShowAIIcon(): boolean {
    return this.hasExerciseSets && !this.hasSummary && !this.isGenerating;
  }

  // NEW method for AI generation
  onGenerateAI(): void {
    if (this.canShowAIIcon) {
      this.generateSummary.emit();
    }
  }

  // Existing methods remain unchanged...
  get validatedTotalWeight(): number {
    return this.isValidNumber(this.totalWeight) ? this.totalWeight : 0;
  }

  get validatedTotalReps(): number {
    return this.isValidNumber(this.totalReps) ? this.totalReps : 0;
  }

  get validatedExerciseCount(): number {
    return this.isValidNumber(this.exerciseCount) ? this.exerciseCount : 0;
  }

  get formattedWeight(): string {
    const weight = this.validatedTotalWeight;
    return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  }

  get formattedReps(): string {
    return Math.floor(this.validatedTotalReps).toString();
  }

  get formattedExerciseCount(): string {
    return Math.floor(this.validatedExerciseCount).toString();
  }

  private isValidNumber(value: number): boolean {
    return typeof value === "number" && !isNaN(value) && value >= 0;
  }
}
```

**Template:** `stats-card.component.html`
```html
<mat-card class="stats-card">
  <mat-card-header>
    <mat-card-title class="title-with-ai">
      <span>Statystyki</span>
      @if (canShowAIIcon) {
        <button 
          mat-icon-button 
          class="ai-icon-button"
          matTooltip="Wygeneruj podsumowanie AI"
          matTooltipPosition="left"
          (click)="onGenerateAI()"
          [disabled]="isGenerating"
          type="button">
          <mat-icon>auto_awesome</mat-icon>
        </button>
      }
    </mat-card-title>
  </mat-card-header>
  <mat-card-content>
    <div class="stats-grid">
      <div class="stat-item">
        <mat-icon>fitness_center</mat-icon>
        <div class="stat-content">
          <span class="stat-value">{{ formattedWeight }}</span>
          <span class="stat-label">kg łącznie</span>
        </div>
      </div>
      <div class="stat-item">
        <mat-icon>repeat</mat-icon>
        <div class="stat-content">
          <span class="stat-value">{{ formattedReps }}</span>
          <span class="stat-label">powtórzeń łącznie</span>
        </div>
      </div>
      <div class="stat-item">
        <mat-icon>list</mat-icon>
        <div class="stat-content">
          <span class="stat-value">{{ formattedExerciseCount }}</span>
          <span class="stat-label">różnych ćwiczeń</span>
        </div>
      </div>
    </div>
  </mat-card-content>
</mat-card>
```

**Add styles:** `stats-card.component.scss`
```scss
.title-with-ai {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.ai-icon-button {
  color: #673ab7; // Purple color for AI icon
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    color: #9c27b0;
    transform: scale(1.1);
  }
  
  &:disabled {
    opacity: 0.5;
  }
}
```

#### 3.4.2 Create AISummaryComponent
**File:** `src/app/features/sessions/components/ai-summary/ai-summary.component.ts`

```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { MaterialModule } from '../../../../shared/material.module';

@Component({
  selector: 'app-ai-summary',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <mat-card class="ai-summary-card" [@fadeIn]>
      <mat-card-header>
        <mat-card-title class="ai-title">
          <mat-icon class="ai-icon">auto_awesome</mat-icon>
          <span>Podsumowanie AI</span>
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (isGenerating) {
          <div class="generating-state">
            <mat-progress-bar mode="indeterminate" class="progress-bar"></mat-progress-bar>
            <p class="generating-text">Generowanie podsumowania AI...</p>
          </div>
        } @else if (summary) {
          <div class="summary-content">
            <p class="summary-text">{{ summary }}</p>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styleUrl: './ai-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class AISummaryComponent {
  @Input({ required: true }) summary: string | null = null;
  @Input({ required: true }) isGenerating = false;
}
```

**Create styles:** `ai-summary.component.scss`
```scss
.ai-summary-card {
  background: linear-gradient(135deg, #f8f4ff 0%, #fff 100%);
  border-left: 4px solid #673ab7;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #673ab7;
  font-weight: 500;
}

.ai-icon {
  color: #673ab7;
  font-size: 24px;
}

.generating-state {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  padding: 16px 0;
}

.progress-bar {
  width: 100%;
  height: 4px;
}

.generating-text {
  margin: 0;
  color: #666;
  font-style: italic;
  text-align: center;
}

.summary-content {
  padding: 8px 0;
}

.summary-text {
  margin: 0;
  line-height: 1.6;
  color: #333;
  font-size: 16px;
}

@media (max-width: 768px) {
  .ai-title {
    font-size: 18px;
  }
  
  .summary-text {
    font-size: 14px;
  }
}
```

#### 3.4.3 Modify SessionDetailsComponent
**File:** `src/app/features/sessions/components/session-details/session-details.component.ts`

**Add imports and inject service:**
```typescript
// Add to existing imports
import { AISummaryService } from '../../services/ai-summary.service';
import { AISummaryComponent } from '../ai-summary/ai-summary.component';

// Modify interface to include user
interface SessionDetailsState {
  sessionId: number;
  sessionDetails: SessionWithStats | null;
  sessionSets: ExerciseSetWithExercise[];
  user: User | null; // ADD THIS
  isLoading: boolean;
  isLoadingSets: boolean;
  isDeletingSet: boolean;
  deletingSetId: number | null;
  isChangingPage: boolean;
  error: ApiError | null;
  currentPage: number;
  totalSetsCount: number;
  itemsPerPage: number;
}

@Component({
  selector: "app-session-details",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageHeaderComponent,
    SessionDetailsCardComponent,
    StatsCardComponent,
    SessionSetsListComponent,
    AISummaryComponent, // ADD THIS
  ],
  // ... rest of component
})
export class SessionDetailsComponent implements OnInit {
  // Add service injection
  private readonly aiSummaryService = inject(AISummaryService);
  
  // Update initial state to include user
  private readonly state = signal<SessionDetailsState>({
    sessionId: 0,
    sessionDetails: null,
    sessionSets: [],
    user: null, // ADD THIS
    isLoading: false,
    isLoadingSets: false,
    isDeletingSet: false,
    deletingSetId: null,
    isChangingPage: false,
    error: null,
    currentPage: PAGINATION.DEFAULT_PAGE,
    totalSetsCount: 0,
    itemsPerPage: PAGINATION.DEFAULT_SETS_LIMIT,
  });

  // Add computed for AI summary state
  protected readonly aiSummaryState = computed(() => {
    const session = this.state().sessionDetails;
    const user = this.state().user;
    
    return {
      isGenerating: !!user?.generating_started_at,
      summary: session?.summary || null,
      canGenerate: !!(
        session && 
        !session.summary && 
        session.exercise_sets?.length > 0 && 
        !user?.generating_started_at
      ),
      hasExerciseSets: (session?.exercise_sets?.length || 0) > 0,
      hasSummary: !!session?.summary
    };
  });

  // Modify ngOnInit to load user profile
  ngOnInit(): void {
    this.initializeComponent();
    this.loadUserProfile(); // ADD THIS
  }

  // Add user profile loading
  private async loadUserProfile(): Promise<void> {
    try {
      const user = await this.dbService.getCurrentUserProfile();
      this.state.update(current => ({ ...current, user }));
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // Don't show error to user, AI features just won't be available
    }
  }

  // Add AI summary generation method
  protected async onGenerateSummary(): Promise<void> {
    const sessionId = this.state().sessionId;
    if (!sessionId) return;
    
    try {
      await this.aiSummaryService.generateSessionSummary(sessionId);
      
      // Start polling for user state updates
      this.startUserProfilePolling();
      
    } catch (error) {
      console.error('Failed to generate summary:', error);
      this.showErrorMessage('Nie udało się rozpocząć generowania podsumowania');
    }
  }

  // Add user profile polling during generation
  private startUserProfilePolling(): void {
    const pollInterval = setInterval(async () => {
      try {
        const user = await this.