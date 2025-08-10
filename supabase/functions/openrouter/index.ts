import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.40.0";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// @ts-expect-error - Deno global is available in edge function runtime
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

// ===== INTERFACES AND TYPES =====

// Request from frontend
interface SessionSummaryRequest {
  sessionId: number;
}

// Response to frontend

// Async response for background generation
interface SessionSummaryAsyncResponse {
  requestId: string;
  status: "started" | "generating" | "completed" | "error";
  sessionId: number;
  summary?: string;
  tokensUsed?: number;
  error?: string;
}

// Database types
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

// ===== BACKGROUND GENERATION FUNCTION =====

async function generateSummaryInBackground(
  sessionId: number,
  authUserId: string,
  supabase: SupabaseClient,
): Promise<SessionSummaryAsyncResponse> {
  const requestId = crypto.randomUUID();
  let userData: UserData | null = null;

  try {
    // Get user's internal ID
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
    let exerciseSets: ExerciseSetData[] = [];

    try {
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
        .eq("id", sessionId)
        .eq("user_id", userData!.id)
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

      if (data.exercise_sets && data.exercise_sets.length > 0) {
        exerciseSets = data.exercise_sets.map(
          (set: Record<string, unknown>): ExerciseSetData => ({
            id: set["id"] as number,
            exercise_id: set["exercise_id"] as number,
            exercise_name:
              (set["exercises"] as { name: string } | null)?.name ||
              "Unknown exercise",
            reps: set["reps"] as number,
            weight: Number(set["weight"]),
            created_at: set["created_at"] as string,
          }),
        );
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
          // @ts-expect-error - Deno global is available in edge function runtime
          "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
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
      console.error("error:", error);
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

    // Save summary to database
    await supabase.from("sessions").update({ summary }).eq("id", sessionId);

    // Clear generating_started_at to indicate generation is complete
    await supabase
      .from("users")
      .update({ generating_started_at: null })
      .eq("id", userData!.id);

    console.log(`Background generation completed for session ${sessionId}`);

    const tokensUsed = openRouterResponse.usage?.total_tokens || 0;

    return {
      requestId,
      status: "completed",
      sessionId,
      summary,
      tokensUsed,
    };
  } catch (error) {
    console.error("Background generation error:", error);

    // Clear generating_started_at on error to unblock future generations
    if (userData) {
      try {
        await supabase
          .from("users")
          .update({ generating_started_at: null })
          .eq("id", userData.id);
      } catch (clearError) {
        console.error("Failed to clear generating_started_at:", clearError);
      }
    }

    if (error instanceof SessionSummaryError) {
      return {
        requestId,
        status: "error",
        sessionId,
        error: error.message,
      };
    }

    return {
      requestId,
      status: "error",
      sessionId,
      error: "Internal server error",
    };
  }
}

// ===== STATUS HANDLER =====

async function handleStatusRequest(req: Request): Promise<Response> {
  try {
    // Get sessionId from URL parameters
    const url = new URL(req.url);
    const sessionIdParam = url.searchParams.get("sessionId");

    if (!sessionIdParam) {
      throw new SessionSummaryError(
        "sessionId parameter is required",
        400,
        "INVALID_REQUEST",
      );
    }

    const sessionId = parseInt(sessionIdParam, 10);
    if (isNaN(sessionId) || sessionId <= 0) {
      throw new SessionSummaryError(
        "sessionId must be a positive integer",
        400,
        "INVALID_SESSION_ID",
      );
    }

    // Verify authorization
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
    // @ts-expect-error - Deno global is available in edge function runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error - Deno global is available in edge function runtime
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

    // Get user data to check generating status
    let userData: UserData | null = null;
    let isGenerating = false;

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, auth_user_id, generating_started_at")
        .eq("auth_user_id", authUserId)
        .single();

      if (error || !data) {
        console.error("User lookup error:", error);
        throw new SessionSummaryError("User not found", 404, "USER_NOT_FOUND");
      }

      userData = data;
      isGenerating = !!data.generating_started_at;
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Database error fetching user:", error);
      throw new SessionSummaryError(
        "Failed to fetch user data",
        500,
        "DB_ERROR",
      );
    }

    // Check session and summary status
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, user_id, summary")
        .eq("id", sessionId)
        .eq("user_id", userData!.id)
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

      // Determine status
      let status: string;
      let summary: string | undefined;

      if (data.summary) {
        status = "completed";
        summary = data.summary;
      } else if (isGenerating) {
        status = "generating";
      } else {
        status = "not_started";
      }

      const response: SessionSummaryAsyncResponse = {
        requestId: crypto.randomUUID(), // Generate new requestId for this status check
        status: status as "started" | "generating" | "completed" | "error",
        sessionId,
        summary,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      console.error("Database error fetching session:", error);
      throw new SessionSummaryError(
        "Failed to fetch session data",
        500,
        "DB_ERROR",
      );
    }
  } catch (error) {
    console.error("Status request error:", error);

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
}

// ===== MAIN HANDLER =====

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Handle GET requests for status checking
    if (req.method === "GET") {
      return await handleStatusRequest(req);
    }

    // Verify HTTP method for POST
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
      if (error instanceof SessionSummaryError) throw error;
      throw new SessionSummaryError(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON",
      );
    }

    // Check if request body is empty
    if (!requestBody || typeof requestBody !== "object") {
      throw new SessionSummaryError(
        "Request body is required",
        400,
        "INVALID_REQUEST",
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
    // @ts-expect-error - Deno global is available in edge function runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-expect-error - Deno global is available in edge function runtime
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

    // ===== STEP 3: ASYNC PROCESSING MODE =====

    // First, get user data to set generating_started_at
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", authUserId)
        .single();

      if (userError || !userData) {
        throw new SessionSummaryError("User not found", 404, "USER_NOT_FOUND");
      }

      // Set generating_started_at to indicate generation is in progress
      const { error: updateError } = await supabase
        .from("users")
        .update({ generating_started_at: new Date().toISOString() })
        .eq("id", userData.id);

      if (updateError) {
        console.error("Failed to set generating_started_at:", updateError);
        throw new SessionSummaryError(
          "Failed to start generation",
          500,
          "DB_ERROR",
        );
      }
    } catch (error) {
      if (error instanceof SessionSummaryError) throw error;
      throw new SessionSummaryError(
        "Failed to initialize generation",
        500,
        "INIT_ERROR",
      );
    }

    // Generate summary in background and return immediately
    const asyncResult = await generateSummaryInBackground(
      requestBody.sessionId,
      authUserId,
      supabase,
    );

    return new Response(JSON.stringify(asyncResult), {
      status: asyncResult.status === "error" ? 500 : 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
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
