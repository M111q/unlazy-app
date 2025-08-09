import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import { MatSnackBar } from "@angular/material/snack-bar";

import { AISummaryService } from "./ai-summary.service";
import { DbService } from "../../data/db.service";
import { AI_SUMMARY } from "../../shared/constants/ai-constants";
import {
  mockUsers,
  mockSessions,
  testScenarios,
  createMockDbService,
  createMockSnackBar,
  setupMockDbService,
  expectedMessages,
} from "./testing/ai-summary.fixtures";

describe("AISummaryService", () => {
  let service: AISummaryService;
  let mockDbService: ReturnType<typeof createMockDbService>;
  let mockSnackBar: ReturnType<typeof createMockSnackBar>;

  beforeEach(async () => {
    mockDbService = createMockDbService();
    mockSnackBar = createMockSnackBar();

    await TestBed.configureTestingModule({
      providers: [
        AISummaryService,
        { provide: DbService, useValue: mockDbService },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    service = TestBed.inject(AISummaryService);
  });

  describe("Service Initialization", () => {
    it("should be created", () => {
      expect(service).toBeTruthy();
    });

    it("should initialize with empty debounce timers map", () => {
      expect(service["debounceTimers"]).toBeDefined();
      expect(service["debounceTimers"].size).toBe(0);
    });
  });

  describe("generateSessionSummary()", () => {
    describe("Successful Generation", () => {
      it("should successfully initiate generation for valid session", fakeAsync(async () => {
        // Arrange
        const scenario = testScenarios.validGeneration;
        setupMockDbService(mockDbService, scenario);

        // Act
        const generatePromise = service.generateSessionSummary(
          scenario.sessionId,
        );
        tick(AI_SUMMARY.DEBOUNCE_DELAY);
        await generatePromise;

        // Assert
        expect(mockDbService.getCurrentUserWithAIStatus).toHaveBeenCalled();
        expect(mockDbService.getSession).toHaveBeenCalledWith(
          scenario.sessionId,
        );
        expect(mockDbService.callEdgeFunction).toHaveBeenCalledWith(
          scenario.expectedApiCall.functionName,
          scenario.expectedApiCall.payload,
        );
        expect(mockSnackBar.open).toHaveBeenCalledWith(
          expectedMessages.generating,
          "Zamknij",
          jasmine.objectContaining({
            duration: 4000,
            horizontalPosition: "center",
            verticalPosition: "bottom",
          }),
        );
      }));

      it("should call Edge Function with correct parameters", fakeAsync(async () => {
        // Arrange
        const sessionId = 123;
        const scenario = testScenarios.validGeneration;
        setupMockDbService(mockDbService, scenario);

        // Act
        const generatePromise = service.generateSessionSummary(sessionId);
        tick(AI_SUMMARY.DEBOUNCE_DELAY);
        await generatePromise;

        // Assert
        expect(mockDbService.callEdgeFunction).toHaveBeenCalledWith(
          "openrouter",
          { sessionId: sessionId },
        );
      }));
    });

    describe("Validation Failures", () => {
      it("should reject generation for invalid session ID", async () => {
        // Arrange
        const scenario = testScenarios.invalidSessionId;
        setupMockDbService(mockDbService, scenario);

        // Act & Assert
        await expectAsync(
          service.generateSessionSummary(scenario.sessionId),
        ).toBeRejectedWithError("Cannot generate summary for this session");
      });

      it("should reject when user is already generating", async () => {
        // Arrange
        const scenario = testScenarios.userAlreadyGenerating;
        setupMockDbService(mockDbService, scenario);

        // Act & Assert
        await expectAsync(
          service.generateSessionSummary(scenario.sessionId),
        ).toBeRejectedWithError("Cannot generate summary for this session");
      });

      it("should reject for session with existing summary", async () => {
        // Arrange
        const scenario = testScenarios.sessionWithExistingSummary;
        setupMockDbService(mockDbService, scenario);

        // Act & Assert
        await expectAsync(
          service.generateSessionSummary(scenario.sessionId),
        ).toBeRejectedWithError("Cannot generate summary for this session");
      });

      it("should reject for unauthorized session access", async () => {
        // Arrange
        const scenario = testScenarios.unauthorizedAccess;
        setupMockDbService(mockDbService, scenario);

        // Act & Assert
        await expectAsync(
          service.generateSessionSummary(scenario.sessionId),
        ).toBeRejectedWithError("Cannot generate summary for this session");
      });
    });

    describe("Debouncing Mechanism", () => {
      it("should not create timers when validation fails", async () => {
        // Arrange
        const scenario = testScenarios.invalidSessionId;
        setupMockDbService(mockDbService, scenario);

        // Act & Assert
        await expectAsync(
          service.generateSessionSummary(scenario.sessionId),
        ).toBeRejectedWithError("Cannot generate summary for this session");

        // No timer should be created when validation fails
        expect(service["debounceTimers"].size).toBe(0);
      });
    });
  });

  describe("canGenerateSummary()", () => {
    it("should return true for valid session without existing summary", async () => {
      // Arrange
      const scenario = testScenarios.validGeneration;
      setupMockDbService(mockDbService, scenario);

      // Act
      const result = await service.canGenerateSummary(scenario.sessionId);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user is already generating", async () => {
      // Arrange
      const scenario = testScenarios.userAlreadyGenerating;
      setupMockDbService(mockDbService, scenario);

      // Act
      const result = await service.canGenerateSummary(scenario.sessionId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for session with existing summary", async () => {
      // Arrange
      const scenario = testScenarios.sessionWithExistingSummary;
      setupMockDbService(mockDbService, scenario);

      // Act
      const result = await service.canGenerateSummary(scenario.sessionId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for unauthorized session access", async () => {
      // Arrange
      const scenario = testScenarios.unauthorizedAccess;
      setupMockDbService(mockDbService, scenario);

      // Act
      const result = await service.canGenerateSummary(scenario.sessionId);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when user is null", async () => {
      // Arrange
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.resolve(null),
      );
      mockDbService.getSession.and.returnValue(
        Promise.resolve(mockSessions.validSession),
      );

      // Act
      const result = await service.canGenerateSummary(1);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when session is null", async () => {
      // Arrange
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.resolve(mockUsers.validUser),
      );
      mockDbService.getSession.and.returnValue(Promise.resolve(null));

      // Act
      const result = await service.canGenerateSummary(1);

      // Assert
      expect(result).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      // Arrange
      const dbError = new Error("Database connection failed");
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.reject(dbError),
      );

      // Act
      const result = await service.canGenerateSummary(1);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isGenerating()", () => {
    it("should return true when user has active generation", async () => {
      // Arrange
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.resolve(mockUsers.generatingUser),
      );

      // Act
      const result = await service.isGenerating();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when user has no active generation", async () => {
      // Arrange
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.resolve(mockUsers.validUser),
      );

      // Act
      const result = await service.isGenerating();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when user is null", async () => {
      // Arrange
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.resolve(null),
      );

      // Act
      const result = await service.isGenerating();

      // Assert
      expect(result).toBe(false);
    });

    it("should handle user state retrieval errors", async () => {
      // Arrange
      const error = new Error("User retrieval failed");
      mockDbService.getCurrentUserWithAIStatus.and.returnValue(
        Promise.reject(error),
      );

      // Act
      const result = await service.isGenerating();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors gracefully", async () => {
      // Arrange
      const scenario = testScenarios.invalidSessionId;
      setupMockDbService(mockDbService, scenario);

      // Act & Assert
      await expectAsync(
        service.generateSessionSummary(scenario.sessionId),
      ).toBeRejectedWithError("Cannot generate summary for this session");
    });
  });

  describe("Memory Management", () => {
    it("should have ngOnDestroy method for cleanup", () => {
      // Assert that the cleanup method exists and can be called
      expect(service.ngOnDestroy).toBeDefined();
      expect(() => service.ngOnDestroy()).not.toThrow();
    });
  });

  describe("Integration Points", () => {
    it("should call DbService methods with correct parameters", async () => {
      // Arrange
      const sessionId = 123;
      const scenario = testScenarios.validGeneration;
      setupMockDbService(mockDbService, scenario);

      // Act
      await service.canGenerateSummary(sessionId);

      // Assert
      expect(mockDbService.getCurrentUserWithAIStatus).toHaveBeenCalled();
      expect(mockDbService.getSession).toHaveBeenCalledWith(sessionId);
    });

    it("should show success message when generation starts", fakeAsync(async () => {
      // Arrange
      const scenario = testScenarios.validGeneration;
      setupMockDbService(mockDbService, scenario);

      // Act
      const generatePromise = service.generateSessionSummary(
        scenario.sessionId,
      );
      tick(AI_SUMMARY.DEBOUNCE_DELAY);
      await generatePromise;

      // Assert
      expect(mockSnackBar.open).toHaveBeenCalledWith(
        expectedMessages.generating,
        "Zamknij",
        jasmine.objectContaining({
          duration: 4000,
          horizontalPosition: "center",
          verticalPosition: "bottom",
        }),
      );
    }));
  });
});
