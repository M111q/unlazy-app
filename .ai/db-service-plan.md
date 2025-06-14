# Supabase Database Service Plan

## 1. Database Structure

### 1.1 Main Tables Configuration

#### Users Table
Stores user profiles, linked to Supabase Auth users.

**RLS Policy:**
Ensures users can only access their own user profile record based on their authenticated user ID.

#### Exercises Table
Contains a list of predefined exercises.

**RLS Policy:**
Allows read-only access for all authenticated users to the list of exercises, while restricting other operations.

#### Sessions Table
Records user training sessions, including date, time, description, and location.

**RLS Policy:**
Ensures users can only access (read, create, update, delete) their own training sessions.

#### Exercise Sets Table
Stores individual sets of exercises performed within a training session, including reps and weight.

**RLS Policy:**
Ensures users can only access (read, create, update, delete) exercise sets that belong to their training sessions.


## 2. Service Methods

### 2.1 Authentication Service

#### Sign Up
```typescript
async signUp(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await this.supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw new Error(error.message);
  
  // Create user profile
  if (data.user) {
    await this.createUserProfile(data.user);
  }
  
  return data;
}
```

#### Sign In
```typescript
async signIn(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await this.supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw new Error(error.message);
  return data;
}
```

#### Sign Out
```typescript
async signOut(): Promise<void> {
  const { error } = await this.supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
```

#### Get Current User
```typescript
async getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await this.supabase.auth.getUser();
  return user;
}
```

### 2.2 User Profile Service

#### Create User Profile
```typescript
async createUserProfile(authUser: User): Promise<void> {
  const { error } = await this.supabase
    .from('users')
    .insert([{
      auth_user_id: authUser.id,
      email: authUser.email
    }]);
    
  if (error) throw new Error(error.message);
}
```

#### Get User Profile
```typescript
async getUserProfile(): Promise<UserProfile> {
  const { data, error } = await this.supabase
    .from('users')
    .select('*')
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}
```

### 2.3 Exercises Service

#### Get All Exercises
```typescript
async getAllExercises(): Promise<Exercise[]> {
  const { data, error } = await this.supabase
    .from('exercises')
    .select('*')
    .order('name');
    
  if (error) throw new Error(error.message);
  return data || [];
}
```

#### Subscribe to Exercises Changes
```typescript
subscribeToExercises(callback: (exercises: Exercise[]) => void): RealtimeChannel {
  return this.supabase
    .channel('exercises')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'exercises' },
      () => this.getAllExercises().then(callback)
    )
    .subscribe();
}
```

### 2.4 Sessions Service

#### Get Sessions with Pagination
```typescript
async getSessions(page: number = 0, limit: number = 10): Promise<SessionWithStats[]> {
  const offset = page * limit;
  
  const { data, error } = await this.supabase
    .from('sessions')
    .select(`
      *,
      exercise_sets (
        reps,
        weight
      )
    `)
    .order('session_datetime', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw new Error(error.message);
  
  // Calculate statistics
  return data?.map(session => ({
    ...session,
    total_weight: session.exercise_sets.reduce((sum, set) => sum + set.weight, 0),
    total_reps: session.exercise_sets.reduce((sum, set) => sum + set.reps, 0)
  })) || [];
}
```

#### Get Session by ID
```typescript
async getSessionById(id: number): Promise<SessionWithStats> {
  const { data, error } = await this.supabase
    .from('sessions')
    .select(`
      *,
      exercise_sets (
        id,
        reps,
        weight,
        exercises (
          id,
          name
        )
      )
    `)
    .eq('id', id)
    .single();
    
  if (error) throw new Error(error.message);
  
  return {
    ...data,
    total_weight: data.exercise_sets.reduce((sum, set) => sum + set.weight, 0),
    total_reps: data.exercise_sets.reduce((sum, set) => sum + set.reps, 0)
  };
}
```

#### Create Session
```typescript
async createSession(session: CreateSessionDto): Promise<Session> {
  // Validate daily limit
  await this.validateDailySessionLimit(session.session_datetime);
  
  const { data, error } = await this.supabase
    .from('sessions')
    .insert([{
      user_id: await this.getCurrentUserId(),
      session_datetime: session.session_datetime,
      description: session.description,
      location: session.location
    }])
    .select()
    .single();
    
  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('Session already exists at this time');
    }
    throw new Error(error.message);
  }
  
  return data;
}
```

#### Update Session
```typescript
async updateSession(id: number, updates: UpdateSessionDto): Promise<Session> {
  const { data, error } = await this.supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}
```

#### Delete Session
```typescript
async deleteSession(id: number): Promise<void> {
  const { error } = await this.supabase
    .from('sessions')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
}
```

#### Validate Daily Session Limit
```typescript
private async validateDailySessionLimit(sessionDateTime: string): Promise<void> {
  const startOfDay = new Date(sessionDateTime);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(sessionDateTime);
  endOfDay.setHours(23, 59, 59, 999);
  
  const { count, error } = await this.supabase
    .from('sessions')
    .select('*', { count: 'exact' })
    .gte('session_datetime', startOfDay.toISOString())
    .lte('session_datetime', endOfDay.toISOString());
    
  if (error) throw new Error(error.message);
  
  if (count >= 3) {
    throw new Error('Daily session limit exceeded (maximum 3 sessions per day)');
  }
}
```

#### Subscribe to Session Changes
```typescript
subscribeToSessions(callback: (sessions: SessionWithStats[]) => void): RealtimeChannel {
  return this.supabase
    .channel('sessions')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'sessions' },
      () => this.getSessions().then(callback)
    )
    .subscribe();
}
```

### 2.5 Exercise Sets Service

#### Get Sets for Session
```typescript
async getSessionSets(sessionId: number, page: number = 0, limit: number = 20): Promise<ExerciseSetWithExercise[]> {
  const offset = page * limit;
  
  const { data, error } = await this.supabase
    .from('exercise_sets')
    .select(`
      *,
      exercises (
        id,
        name
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  if (error) throw new Error(error.message);
  return data || [];
}
```

#### Create Exercise Set
```typescript
async createExerciseSet(set: CreateExerciseSetDto): Promise<ExerciseSet> {
  // Validate session sets limit
  await this.validateSessionSetsLimit(set.session_id);
  
  const { data, error } = await this.supabase
    .from('exercise_sets')
    .insert([set])
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}
```

#### Update Exercise Set
```typescript
async updateExerciseSet(id: number, updates: UpdateExerciseSetDto): Promise<ExerciseSet> {
  const { data, error } = await this.supabase
    .from('exercise_sets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(error.message);
  return data;
}
```

#### Delete Exercise Set
```typescript
async deleteExerciseSet(id: number): Promise<void> {
  const { error } = await this.supabase
    .from('exercise_sets')
    .delete()
    .eq('id', id);
    
  if (error) throw new Error(error.message);
}
```

#### Validate Session Sets Limit
```typescript
private async validateSessionSetsLimit(sessionId: number): Promise<void> {
  const { count, error } = await this.supabase
    .from('exercise_sets')
    .select('*', { count: 'exact' })
    .eq('session_id', sessionId);
    
  if (error) throw new Error(error.message);
  
  if (count >= 50) {
    throw new Error('Session sets limit exceeded (maximum 50 sets per session)');
  }
}
```

#### Subscribe to Session Sets Changes
```typescript
subscribeToSessionSets(sessionId: number, callback: (sets: ExerciseSetWithExercise[]) => void): RealtimeChannel {
  return this.supabase
    .channel(`session_sets_${sessionId}`)
    .on('postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'exercise_sets',
        filter: `session_id=eq.${sessionId}`
      },
      () => this.getSessionSets(sessionId).then(callback)
    )
    .subscribe();
}
```

## 3. Authentication and Authorization

### 3.1 Supabase Auth Configuration
```typescript
// Environment configuration
const supabaseUrl = process.env['SUPABASE_URL'];
const supabaseAnonKey = process.env['SUPABASE_ANON_KEY'];

// Supabase client initialization
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

### 3.2 RLS Policies Implementation

All tables use Row Level Security to ensure data isolation:

- **Users**: Can only access their own profile data
- **Sessions**: Can only access sessions they created
- **Exercise Sets**: Can only access sets from their own sessions
- **Exercises**: Global read-only access for all authenticated users

### 3.3 Auth Guard Implementation
```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(): Promise<boolean> {
    const user = await this.authService.getCurrentUser();
    
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }
    
    return true;
  }
}
```

### 3.4 User Roles and Permissions

**Single Role System:**
- **Authenticated User**: Can perform all CRUD operations on their own data
- **Anonymous User**: No access to any data (redirected to login)

## 4. Validation and Business Logic

### 4.1 Database-Level Validation

#### Sessions Table Constraints
```sql
CONSTRAINT check_description_length CHECK (LENGTH(description) <= 260)
CONSTRAINT check_location_length CHECK (LENGTH(location) <= 160)
```

#### Exercise Sets Table Constraints
```sql
CONSTRAINT check_reps_range CHECK (reps >= 1 AND reps <= 300)
CONSTRAINT check_weight_range CHECK (weight >= 1 AND weight <= 400)
```

### 4.2 Frontend Validation

#### Form Validation Rules
```typescript
interface ValidationRules {
  session: {
    description: { maxLength: 260 };
    location: { maxLength: 160 };
  };
  exerciseSet: {
    reps: { min: 1, max: 300 };
    weight: { min: 1, max: 400 };
  };
}
```

#### Error Handling Strategy
```typescript
interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

class ErrorHandler {
  static handleSupabaseError(error: PostgrestError): ApiError {
    if (error.code === '23505') {
      return { message: 'Duplicate entry detected', code: 'DUPLICATE' };
    }
    
    if (error.message.includes('Daily session limit')) {
      return { message: 'Maximum 3 sessions per day allowed', code: 'DAILY_LIMIT' };
    }
    
    if (error.message.includes('Session sets limit')) {
      return { message: 'Maximum 50 sets per session allowed', code: 'SETS_LIMIT' };
    }
    
    return { message: error.message, code: error.code };
  }
}
```

### 4.4 Real-Time Updates Configuration

#### Channel Management
```typescript
class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();
  
  subscribeToTable(tableName: string, callback: Function): void {
    const channel = this.supabase
      .channel(tableName)
      .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
      .subscribe();
      
    this.channels.set(tableName, channel);
  }
  
  unsubscribeAll(): void {
    this.channels.forEach(channel => channel.unsubscribe());
    this.channels.clear();
  }
}
```

### 4.5 Performance Optimization

#### Query Optimization Strategies
- Use selective column selection with `select()`
- Implement proper pagination with `range()`
- Leverage database indexes for sorting and filtering
- Use prepared statements for repeated queries
- Implement query result caching where appropriate

#### Connection Pool Configuration
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
```
