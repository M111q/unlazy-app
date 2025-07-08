import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

// ===== INTERFACES AND TYPES =====

// Request from frontend
interface SessionSummaryRequest {
  sessionId: number;
}

// Response to frontend
interface SessionSummaryResponse {
  summary: string;
  sessionId: number;
  tokensUsed?: number;
  error?: string;
}

// Database types
interface SessionData {
  id: number;
  user_id: number;
  session_datetime: string;
  description?: string | null;
  location?: string | null;
}

interface ExerciseSetData {
  id: number;
  exercise_id: number;
  exercise_name: string;
  reps: number;
  weight: number;
  created_at: string;
}

interface UserData {
  id: number;
  email: string;
  auth_user_id: string;
}

// OpenRouter types
interface OpenRouterMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: OpenRouterMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

// Error class for better error handling
class SessionSummaryError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "SessionSummaryError";
  }
}

// ===== MAIN HANDLER =====

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify HTTP method
    if (req.method !== "POST") {
      throw new SessionSummaryError(
        "Method not allowed",
        405,
        "METHOD_NOT_ALLOWED",
      );
    }

    // Verify OpenRouter API key is configured
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      throw new SessionSummaryError(
        "Service configuration error",
        500,
        "CONFIG_ERROR",
      );
    }

    // ===== STEP 1: PARSE AND VALIDATE REQUEST =====

    let requestBody: SessionSummaryRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new SessionSummaryError(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON",
      );
    }

    // Validate request body
    if (!requestBody.sessionId || typeof requestBody.sessionId !== "number") {
      throw new SessionSummaryError(
        "sessionId is required and must be a number",
        400,
        "INVALID_REQUEST",
      );
    }

    if (
      requestBody.sessionId <= 0 ||
      !Number.isInteger(requestBody.sessionId)
    ) {
      throw new SessionSummaryError(
        "sessionId must be a positive integer",
        400,
        "INVALID_SESSION_ID",
      );
    }

    // ===== STEP 2: VERIFY AUTHORIZATION =====

    // Get JWT token from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new SessionSummaryError(
        "Missing or invalid authorization header",
        401,
        "UNAUTHORIZED",
      );
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token || token.length < 10) {
      throw new SessionSummaryError(
        "Invalid token format",
        401,
        "INVALID_TOKEN",
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase configuration is missing");
      throw new SessionSummaryError(
        "Service configuration error",
        500,
        "CONFIG_ERROR",
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify JWT and get user
    let authUserId: string;
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("Auth verification failed:", authError?.message);
        throw new SessionSummaryError(
          "Invalid or expired token",
          401,
          "AUTH_FAILED",
        );
      }

      authUserId = user.id;
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Auth verification error:", error);
      throw new SessionSummaryError("Authentication failed", 401, "AUTH_ERROR");
    }

    // ===== STEP 3: FETCH AND VERIFY DATA =====

    // Get user's internal ID
    let userData: UserData | null = null;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, auth_user_id")
        .eq("auth_user_id", authUserId)
        .single();

      if (error || !data) {
        console.error("User lookup error:", error);
        throw new SessionSummaryError("User not found", 404, "USER_NOT_FOUND");
      }

      userData = data;
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Database error fetching user:", error);
      throw new SessionSummaryError(
        "Failed to fetch user data",
        500,
        "DB_ERROR",
      );
    }

    // Fetch session with exercises in a single query
    let sessionData: SessionData | null = null;
    let exerciseSets: ExerciseSetData[] = [];

    try {
      // Single query to get session with all exercise sets and exercise names
      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          id,
          user_id,
          session_datetime,
          description,
          location,
          exercise_sets (
            id,
            exercise_id,
            reps,
            weight,
            created_at,
            exercises (
              name
            )
          )
        `,
        )
        .eq("id", requestBody.sessionId)
        .eq("user_id", userData.id) // Ensure user owns this session
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          throw new SessionSummaryError(
            "Session not found or access denied",
            404,
            "SESSION_NOT_FOUND",
          );
        }
        throw error;
      }

      if (!data) {
        throw new SessionSummaryError(
          "Session not found",
          404,
          "SESSION_NOT_FOUND",
        );
      }

      // Extract session data
      sessionData = {
        id: data.id,
        user_id: data.user_id,
        session_datetime: data.session_datetime,
        description: data.description,
        location: data.location,
      };

      // Extract and transform exercise sets
      if (data.exercise_sets && data.exercise_sets.length > 0) {
        exerciseSets = data.exercise_sets.map((set: any) => ({
          id: set.id,
          exercise_id: set.exercise_id,
          exercise_name: set.exercises?.name || "Unknown exercise",
          reps: set.reps,
          weight: Number(set.weight), // Convert NUMERIC to number
          created_at: set.created_at,
        }));
      }
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Database error fetching session data:", error);
      throw new SessionSummaryError(
        "Failed to fetch session data",
        500,
        "DB_ERROR",
      );
    }

    // Check if session has any exercises - treat empty session as not found
    if (exerciseSets.length === 0) {
      throw new SessionSummaryError(
        "Session not found or access denied",
        404,
        "SESSION_NOT_FOUND",
      );
    }

    // Format training data for OpenRouter
    const exerciseSummary = exerciseSets
      .map((set) => `${set.exercise_name} ${set.reps}x${set.weight}kg`)
      .join("; ");

    // Hardcode language as PL until database supports language field
    const userLanguage = "PL";

    // Prepare OpenRouter request
    const systemMessage =
      "Your role is as a training assistant. Summarize a given training session in 2-3 sentences. Try to motivate the user to another training session. Summarize the body part that was most burdened by this training, if you don't know, period training as 'general development'. Answer in user language.";

    const userMessage = `${exerciseSummary}; User language: ${userLanguage}`;

    const openRouterPayload: OpenRouterRequest = {
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 200,
    };

    // Call OpenRouter API
    let openRouterResponse: OpenRouterResponse;
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": supabaseUrl,
          "X-Title": "Unlazy App Session Summary",
        },
        body: JSON.stringify(openRouterPayload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error("OpenRouter API error:", responseData);
        throw new SessionSummaryError(
          responseData.error?.message || "Failed to generate summary",
          response.status,
          "OPENROUTER_ERROR",
        );
      }

      openRouterResponse = responseData;
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Error calling OpenRouter:", error);
      throw new SessionSummaryError(
        "Failed to generate training summary",
        500,
        "API_ERROR",
      );
    }

    // Extract summary from OpenRouter response
    const summary =
      openRouterResponse.choices?.[0]?.message?.content ||
      "Unable to generate summary at this time.";

    const tokensUsed = openRouterResponse.usage?.total_tokens || 0;

    // Return successful response
    return new Response(
      JSON.stringify({
        summary,
        sessionId: requestBody.sessionId,
        tokensUsed,
      } as SessionSummaryResponse),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    // Handle errors
    console.error("Edge function error:", error);

    if (error instanceof SessionSummaryError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          code: error.code,
        }),
        {
          status: error.statusCode,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    // Generic error response (don't leak internal details)
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
