# SPARC Username Collection - Pseudocode Design

## Overview
This document provides algorithmic pseudocode for adding username/display name collection during user onboarding flow.

---

## 1. Data Structures

### 1.1 User Profile Extension
```
STRUCTURE: UserSettings
    user_id: UUID (Foreign Key → users.id)
    display_name: VARCHAR(50)
    username: VARCHAR(30) UNIQUE
    bio: TEXT (nullable)
    is_public: BOOLEAN DEFAULT TRUE
    created_at: TIMESTAMP
    updated_at: TIMESTAMP
END STRUCTURE

STRUCTURE: UsernameValidationResult
    isValid: BOOLEAN
    errors: ARRAY OF STRING
    suggestions: ARRAY OF STRING (if invalid)
END STRUCTURE

STRUCTURE: OnboardingState
    step: INTEGER (1=email/password, 2=basic info, 3=username)
    userId: UUID
    email: STRING
    name: STRING
    displayName: STRING (nullable)
    isComplete: BOOLEAN DEFAULT FALSE
END STRUCTURE
```

### 1.2 Username Cache
```
DATA STRUCTURE: UsernameCache
    Type: LRU Cache with TTL
    Size: 50,000 entries
    TTL: 10 minutes
    Purpose: Fast username uniqueness checks

    Operations:
        - exists(username): O(1)
        - add(username): O(1)
        - remove(username): O(1)
        - invalidate(): O(1)
```

---

## 2. Username Validation Algorithm

### 2.1 Main Validation Flow
```
ALGORITHM: ValidateUsername
INPUT: username (string), userId (UUID, optional)
OUTPUT: UsernameValidationResult

CONSTANTS:
    MIN_LENGTH = 3
    MAX_LENGTH = 30
    ALLOWED_PATTERN = /^[a-zA-Z0-9_-]+$/
    RESERVED_USERNAMES = ["admin", "root", "system", "api", "support", "help"]
    PROFANITY_LIST = LoadProfanityList()

BEGIN
    result ← NEW UsernameValidationResult
    result.isValid ← TRUE
    result.errors ← []
    result.suggestions ← []

    // 1. Null/Empty Check
    IF username IS NULL OR Trim(username) IS EMPTY THEN
        result.isValid ← FALSE
        result.errors.append("Username cannot be empty")
        RETURN result
    END IF

    normalizedUsername ← Trim(LowerCase(username))

    // 2. Length Validation
    IF Length(normalizedUsername) < MIN_LENGTH THEN
        result.isValid ← FALSE
        result.errors.append("Username must be at least " + MIN_LENGTH + " characters")
        RETURN result
    END IF

    IF Length(normalizedUsername) > MAX_LENGTH THEN
        result.isValid ← FALSE
        result.errors.append("Username cannot exceed " + MAX_LENGTH + " characters")
        RETURN result
    END IF

    // 3. Character Pattern Validation
    IF NOT Matches(normalizedUsername, ALLOWED_PATTERN) THEN
        result.isValid ← FALSE
        result.errors.append("Username can only contain letters, numbers, hyphens, and underscores")
        RETURN result
    END IF

    // 4. Reserved Username Check
    IF normalizedUsername IN RESERVED_USERNAMES THEN
        result.isValid ← FALSE
        result.errors.append("This username is reserved and cannot be used")
        result.suggestions ← GenerateSuggestions(normalizedUsername)
        RETURN result
    END IF

    // 5. Profanity Check
    IF ContainsProfanity(normalizedUsername, PROFANITY_LIST) THEN
        result.isValid ← FALSE
        result.errors.append("Username contains inappropriate content")
        RETURN result
    END IF

    // 6. Consecutive Special Characters Check
    IF Contains(normalizedUsername, "--") OR Contains(normalizedUsername, "__") THEN
        result.isValid ← FALSE
        result.errors.append("Username cannot contain consecutive hyphens or underscores")
        RETURN result
    END IF

    // 7. Leading/Trailing Special Characters Check
    IF StartsWith(normalizedUsername, "-") OR StartsWith(normalizedUsername, "_") OR
       EndsWith(normalizedUsername, "-") OR EndsWith(normalizedUsername, "_") THEN
        result.isValid ← FALSE
        result.errors.append("Username cannot start or end with special characters")
        RETURN result
    END IF

    // 8. Uniqueness Check (with cache)
    isUnique ← CheckUsernameUniqueness(normalizedUsername, userId)
    IF NOT isUnique THEN
        result.isValid ← FALSE
        result.errors.append("Username is already taken")
        result.suggestions ← GenerateSuggestions(normalizedUsername)
        RETURN result
    END IF

    RETURN result
END
```

### 2.2 Username Uniqueness Check
```
ALGORITHM: CheckUsernameUniqueness
INPUT: username (string), userId (UUID, optional)
OUTPUT: isUnique (boolean)

BEGIN
    normalizedUsername ← LowerCase(Trim(username))

    // Check cache first
    IF UsernameCache.exists(normalizedUsername) THEN
        cachedUserId ← UsernameCache.get(normalizedUsername)

        // If checking for update (userId provided), allow if it's the same user
        IF userId IS NOT NULL AND cachedUserId = userId THEN
            RETURN TRUE
        END IF

        RETURN FALSE
    END IF

    // Query database
    IF userId IS NULL THEN
        // New username check
        query ← "SELECT COUNT(*) FROM user_settings WHERE LOWER(username) = $1"
        count ← Database.executeScalar(query, [normalizedUsername])
    ELSE
        // Update check (allow same user to keep their username)
        query ← "SELECT COUNT(*) FROM user_settings
                 WHERE LOWER(username) = $1 AND user_id != $2"
        count ← Database.executeScalar(query, [normalizedUsername, userId])
    END IF

    isUnique ← (count = 0)

    // Update cache if not unique
    IF NOT isUnique THEN
        UsernameCache.add(normalizedUsername, userId)
    END IF

    RETURN isUnique
END
```

### 2.3 Display Name Validation
```
ALGORITHM: ValidateDisplayName
INPUT: displayName (string)
OUTPUT: ValidationResult

CONSTANTS:
    MIN_LENGTH = 1
    MAX_LENGTH = 50
    ALLOWED_PATTERN = /^[a-zA-Z0-9\s'-]+$/

BEGIN
    result ← NEW ValidationResult
    result.isValid ← TRUE
    result.errors ← []

    // 1. Null/Empty Check
    IF displayName IS NULL OR Trim(displayName) IS EMPTY THEN
        result.isValid ← FALSE
        result.errors.append("Display name cannot be empty")
        RETURN result
    END IF

    trimmedName ← Trim(displayName)

    // 2. Length Validation
    IF Length(trimmedName) < MIN_LENGTH THEN
        result.isValid ← FALSE
        result.errors.append("Display name cannot be empty")
        RETURN result
    END IF

    IF Length(trimmedName) > MAX_LENGTH THEN
        result.isValid ← FALSE
        result.errors.append("Display name cannot exceed " + MAX_LENGTH + " characters")
        RETURN result
    END IF

    // 3. Character Pattern Validation
    IF NOT Matches(trimmedName, ALLOWED_PATTERN) THEN
        result.isValid ← FALSE
        result.errors.append("Display name can only contain letters, numbers, spaces, hyphens, and apostrophes")
        RETURN result
    END IF

    // 4. Profanity Check
    IF ContainsProfanity(trimmedName, PROFANITY_LIST) THEN
        result.isValid ← FALSE
        result.errors.append("Display name contains inappropriate content")
        RETURN result
    END IF

    // 5. Excessive Whitespace Check
    IF Contains(trimmedName, "  ") THEN
        result.isValid ← FALSE
        result.errors.append("Display name cannot contain multiple consecutive spaces")
        RETURN result
    END IF

    RETURN result
END
```

### 2.4 Username Suggestion Generator
```
ALGORITHM: GenerateSuggestions
INPUT: baseUsername (string)
OUTPUT: suggestions (array of strings)

CONSTANTS:
    MAX_SUGGESTIONS = 5
    RANDOM_SUFFIX_LENGTH = 4

BEGIN
    suggestions ← []
    baseNormalized ← LowerCase(Trim(baseUsername))

    // Strategy 1: Append numbers
    FOR i FROM 1 TO 3 DO
        randomNum ← GenerateRandomNumber(10, 9999)
        candidate ← baseNormalized + ToString(randomNum)

        IF CheckUsernameUniqueness(candidate, NULL) THEN
            suggestions.append(candidate)
        END IF
    END FOR

    // Strategy 2: Append underscore and number
    IF Length(suggestions) < MAX_SUGGESTIONS THEN
        FOR i FROM 1 TO 2 DO
            randomNum ← GenerateRandomNumber(10, 999)
            candidate ← baseNormalized + "_" + ToString(randomNum)

            IF CheckUsernameUniqueness(candidate, NULL) THEN
                suggestions.append(candidate)
            END IF
        END FOR
    END IF

    // Strategy 3: Add random suffix
    IF Length(suggestions) < MAX_SUGGESTIONS THEN
        randomSuffix ← GenerateRandomAlphanumeric(RANDOM_SUFFIX_LENGTH)
        candidate ← baseNormalized + randomSuffix

        IF CheckUsernameUniqueness(candidate, NULL) THEN
            suggestions.append(candidate)
        END IF
    END IF

    RETURN suggestions.slice(0, MAX_SUGGESTIONS)
END
```

### 2.5 Profanity Detection
```
ALGORITHM: ContainsProfanity
INPUT: text (string), profanityList (set of strings)
OUTPUT: boolean

BEGIN
    normalizedText ← LowerCase(RemoveSpecialChars(text))

    // Check exact matches
    FOR EACH word IN profanityList DO
        IF Contains(normalizedText, word) THEN
            RETURN TRUE
        END IF
    END FOR

    // Check leetspeak variations (optional enhancement)
    leetText ← ConvertFromLeetSpeak(normalizedText)
    IF leetText != normalizedText THEN
        FOR EACH word IN profanityList DO
            IF Contains(leetText, word) THEN
                RETURN TRUE
            END IF
        END FOR
    END IF

    RETURN FALSE
END
```

---

## 3. Database Operations

### 3.1 Create User Settings Table Migration
```
ALGORITHM: CreateUserSettingsTable
INPUT: none
OUTPUT: migration success/failure

BEGIN
    SQL_MIGRATION ← "
        -- User settings table for extended profile
        CREATE TABLE IF NOT EXISTS user_settings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            username VARCHAR(30) UNIQUE NOT NULL,
            display_name VARCHAR(50) NOT NULL,
            bio TEXT,
            is_public BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 30),
            CONSTRAINT display_name_length CHECK (LENGTH(display_name) >= 1 AND LENGTH(display_name) <= 50)
        );

        -- Indexes for performance
        CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
        CREATE UNIQUE INDEX idx_user_settings_username_lower ON user_settings(LOWER(username));
        CREATE INDEX idx_user_settings_is_public ON user_settings(is_public);

        -- Trigger for updated_at
        CREATE TRIGGER update_user_settings_updated_at
        BEFORE UPDATE ON user_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();

        -- Comments
        COMMENT ON TABLE user_settings IS 'Extended user profile settings including username and display name';
        COMMENT ON COLUMN user_settings.username IS 'Unique username for @mentions and URLs (lowercase, alphanumeric with hyphens/underscores)';
        COMMENT ON COLUMN user_settings.display_name IS 'User-friendly display name shown in UI';
    "

    TRY
        Database.executeTransaction(SQL_MIGRATION)
        RETURN SUCCESS
    CATCH error
        Logger.error("Failed to create user_settings table", error)
        RETURN FAILURE
    END TRY
END
```

### 3.2 Insert User Settings
```
ALGORITHM: InsertUserSettings
INPUT: userId (UUID), username (string), displayName (string), bio (string, optional)
OUTPUT: userSettings (UserSettings object) or error

BEGIN
    // Validate inputs
    usernameValidation ← ValidateUsername(username, NULL)
    IF NOT usernameValidation.isValid THEN
        THROW ValidationError(usernameValidation.errors)
    END IF

    displayNameValidation ← ValidateDisplayName(displayName)
    IF NOT displayNameValidation.isValid THEN
        THROW ValidationError(displayNameValidation.errors)
    END IF

    // Normalize data
    normalizedUsername ← LowerCase(Trim(username))
    trimmedDisplayName ← Trim(displayName)
    trimmedBio ← bio ? Trim(bio) : NULL

    // Begin transaction
    BEGIN TRANSACTION

    TRY
        // Check if settings already exist for this user
        existingQuery ← "SELECT id FROM user_settings WHERE user_id = $1"
        existing ← Database.query(existingQuery, [userId])

        IF existing IS NOT NULL THEN
            ROLLBACK TRANSACTION
            THROW DuplicateError("User settings already exist for this user")
        END IF

        // Insert new settings
        insertQuery ← "
            INSERT INTO user_settings (user_id, username, display_name, bio)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        "

        result ← Database.query(insertQuery, [
            userId,
            normalizedUsername,
            trimmedDisplayName,
            trimmedBio
        ])

        // Add to cache
        UsernameCache.add(normalizedUsername, userId)

        COMMIT TRANSACTION

        // Log success
        Logger.info("User settings created", {userId, username: normalizedUsername})

        RETURN result.rows[0]

    CATCH error
        ROLLBACK TRANSACTION
        Logger.error("Failed to insert user settings", error)

        IF error.code = "23505" THEN  // Unique constraint violation
            THROW DuplicateError("Username already exists")
        ELSE
            THROW DatabaseError("Failed to create user settings")
        END IF
    END TRY
END
```

### 3.3 Update User Settings
```
ALGORITHM: UpdateUserSettings
INPUT: userId (UUID), updates (object with optional username, displayName, bio)
OUTPUT: updatedSettings (UserSettings) or error

BEGIN
    // Validate provided fields
    IF updates.username IS NOT NULL THEN
        usernameValidation ← ValidateUsername(updates.username, userId)
        IF NOT usernameValidation.isValid THEN
            THROW ValidationError(usernameValidation.errors)
        END IF
    END IF

    IF updates.displayName IS NOT NULL THEN
        displayNameValidation ← ValidateDisplayName(updates.displayName)
        IF NOT displayNameValidation.isValid THEN
            THROW ValidationError(displayNameValidation.errors)
        END IF
    END IF

    // Build dynamic UPDATE query
    setClauses ← []
    params ← []
    paramIndex ← 1

    IF updates.username IS NOT NULL THEN
        setClauses.append("username = $" + ToString(paramIndex))
        params.append(LowerCase(Trim(updates.username)))
        paramIndex ← paramIndex + 1
    END IF

    IF updates.displayName IS NOT NULL THEN
        setClauses.append("display_name = $" + ToString(paramIndex))
        params.append(Trim(updates.displayName))
        paramIndex ← paramIndex + 1
    END IF

    IF updates.bio IS NOT NULL THEN
        setClauses.append("bio = $" + ToString(paramIndex))
        params.append(Trim(updates.bio))
        paramIndex ← paramIndex + 1
    END IF

    IF Length(setClauses) = 0 THEN
        THROW ValidationError("No updates provided")
    END IF

    setClauses.append("updated_at = NOW()")
    params.append(userId)

    BEGIN TRANSACTION

    TRY
        // Get old username for cache invalidation
        oldQuery ← "SELECT username FROM user_settings WHERE user_id = $1"
        oldResult ← Database.query(oldQuery, [userId])

        IF oldResult IS NULL THEN
            ROLLBACK TRANSACTION
            THROW NotFoundError("User settings not found")
        END IF

        oldUsername ← oldResult.rows[0].username

        // Update settings
        updateQuery ← "
            UPDATE user_settings
            SET " + Join(setClauses, ", ") + "
            WHERE user_id = $" + ToString(paramIndex) + "
            RETURNING *
        "

        result ← Database.query(updateQuery, params)

        // Update cache
        IF updates.username IS NOT NULL AND updates.username != oldUsername THEN
            UsernameCache.remove(oldUsername)
            UsernameCache.add(LowerCase(updates.username), userId)
        END IF

        COMMIT TRANSACTION

        Logger.info("User settings updated", {userId})

        RETURN result.rows[0]

    CATCH error
        ROLLBACK TRANSACTION
        Logger.error("Failed to update user settings", error)

        IF error.code = "23505" THEN
            THROW DuplicateError("Username already exists")
        ELSE
            THROW DatabaseError("Failed to update user settings")
        END IF
    END TRY
END
```

### 3.4 Get User Settings by Username
```
ALGORITHM: GetUserSettingsByUsername
INPUT: username (string)
OUTPUT: userSettings (UserSettings) or null

BEGIN
    normalizedUsername ← LowerCase(Trim(username))

    TRY
        query ← "
            SELECT us.*, u.email, u.name as account_name, u.avatar_url
            FROM user_settings us
            JOIN users u ON us.user_id = u.id
            WHERE LOWER(us.username) = $1
        "

        result ← Database.query(query, [normalizedUsername])

        IF result.rows.length = 0 THEN
            RETURN NULL
        END IF

        RETURN result.rows[0]

    CATCH error
        Logger.error("Failed to get user settings by username", error)
        THROW DatabaseError("Failed to retrieve user settings")
    END TRY
END
```

---

## 4. Frontend State Management

### 4.1 Onboarding State Machine
```
ALGORITHM: OnboardingStateMachine
INPUT: currentState (OnboardingState), action (object)
OUTPUT: nextState (OnboardingState)

ENUM: OnboardingStep
    EMAIL_PASSWORD = 1
    BASIC_INFO = 2
    USERNAME_SETUP = 3
    COMPLETE = 4

BEGIN
    SWITCH action.type
        CASE "SET_EMAIL_PASSWORD":
            IF ValidateEmail(action.email) AND ValidatePassword(action.password) THEN
                RETURN {
                    ...currentState,
                    step: OnboardingStep.BASIC_INFO,
                    email: action.email
                }
            ELSE
                THROW ValidationError("Invalid email or password")
            END IF

        CASE "SET_BASIC_INFO":
            IF ValidateBasicInfo(action.name) THEN
                RETURN {
                    ...currentState,
                    step: OnboardingStep.USERNAME_SETUP,
                    name: action.name,
                    userId: action.userId
                }
            ELSE
                THROW ValidationError("Invalid basic information")
            END IF

        CASE "SET_USERNAME":
            validation ← ValidateUsername(action.username, currentState.userId)
            displayValidation ← ValidateDisplayName(action.displayName)

            IF validation.isValid AND displayValidation.isValid THEN
                RETURN {
                    ...currentState,
                    step: OnboardingStep.COMPLETE,
                    displayName: action.displayName,
                    isComplete: TRUE
                }
            ELSE
                errors ← [...validation.errors, ...displayValidation.errors]
                THROW ValidationError(errors)
            END IF

        CASE "GO_BACK":
            IF currentState.step > OnboardingStep.EMAIL_PASSWORD THEN
                RETURN {
                    ...currentState,
                    step: currentState.step - 1
                }
            END IF
            RETURN currentState

        CASE "SKIP_USERNAME":
            // Generate default username from email
            defaultUsername ← GenerateDefaultUsername(currentState.email)

            RETURN {
                ...currentState,
                step: OnboardingStep.COMPLETE,
                displayName: currentState.name,
                username: defaultUsername,
                isComplete: TRUE
            }

        DEFAULT:
            RETURN currentState
    END SWITCH
END
```

### 4.2 React State Management Hook
```
ALGORITHM: useUsernameForm
INPUT: initialUsername (string, optional), initialDisplayName (string, optional)
OUTPUT: formState and handlers

BEGIN
    DEFINE STATE:
        username ← initialUsername OR ""
        displayName ← initialDisplayName OR ""
        isValidating ← FALSE
        validationErrors ← []
        suggestions ← []
        isAvailable ← NULL
        debouncedUsername ← ""

    // Debounced username validation
    EFFECT (dependency: username)
        debounceTimer ← SetTimeout(() => {
            debouncedUsername ← username
        }, 500)

        CLEANUP:
            ClearTimeout(debounceTimer)
    END EFFECT

    // Validate username when debounced value changes
    EFFECT (dependency: debouncedUsername)
        IF Length(debouncedUsername) > 0 THEN
            isValidating ← TRUE
            validationErrors ← []

            TRY
                result ← API.validateUsername(debouncedUsername)

                IF result.isValid THEN
                    isAvailable ← TRUE
                    suggestions ← []
                ELSE
                    isAvailable ← FALSE
                    validationErrors ← result.errors
                    suggestions ← result.suggestions
                END IF
            CATCH error
                validationErrors ← ["Failed to validate username"]
                isAvailable ← NULL
            FINALLY
                isValidating ← FALSE
            END TRY
        END IF
    END EFFECT

    // Handler functions
    FUNCTION handleUsernameChange(value: string)
        // Normalize input (lowercase, remove invalid chars)
        normalized ← LowerCase(value.replace(/[^a-zA-Z0-9_-]/g, ""))
        username ← normalized
    END FUNCTION

    FUNCTION handleDisplayNameChange(value: string)
        displayName ← value
    END FUNCTION

    FUNCTION handleSuggestionClick(suggestion: string)
        username ← suggestion
    END FUNCTION

    FUNCTION handleSubmit()
        IF isAvailable AND Length(displayName) > 0 THEN
            RETURN {
                username: username,
                displayName: displayName
            }
        ELSE
            THROW ValidationError("Please complete all fields correctly")
        END IF
    END FUNCTION

    RETURN {
        state: {
            username,
            displayName,
            isValidating,
            validationErrors,
            suggestions,
            isAvailable
        },
        handlers: {
            handleUsernameChange,
            handleDisplayNameChange,
            handleSuggestionClick,
            handleSubmit
        }
    }
END
```

### 4.3 Optimistic UI Update
```
ALGORITHM: OptimisticUsernameUpdate
INPUT: userId (UUID), newUsername (string), newDisplayName (string)
OUTPUT: promise of updated settings

BEGIN
    // Store current state for rollback
    previousState ← GetCurrentUserSettings()

    // Optimistically update UI
    UpdateLocalState({
        username: newUsername,
        displayName: newDisplayName
    })

    TRY
        // Send API request
        response ← API.updateUserSettings(userId, {
            username: newUsername,
            displayName: newDisplayName
        })

        // Sync with server response
        UpdateLocalState(response.data)

        // Show success message
        ShowToast("Username updated successfully", "success")

        RETURN response.data

    CATCH error
        // Rollback on error
        UpdateLocalState(previousState)

        IF error.type = "VALIDATION_ERROR" THEN
            ShowToast(error.message, "error")
        ELSE IF error.type = "DUPLICATE_ERROR" THEN
            ShowToast("Username already taken. Please try another.", "error")
        ELSE
            ShowToast("Failed to update username. Please try again.", "error")
        END IF

        THROW error
    END TRY
END
```

---

## 5. API Endpoints

### 5.1 Validate Username Endpoint
```
ALGORITHM: POST /api/auth/validate-username
INPUT: request body {username: string, userId?: UUID}
OUTPUT: response {isValid: boolean, errors: string[], suggestions: string[]}

BEGIN
    TRY
        // Extract and validate input
        {username, userId} ← request.body

        IF username IS NULL OR Trim(username) IS EMPTY THEN
            RETURN Response(400, {
                error: "Username is required"
            })
        END IF

        // Perform validation
        result ← ValidateUsername(username, userId)

        // Return result
        RETURN Response(200, {
            isValid: result.isValid,
            errors: result.errors,
            suggestions: result.suggestions
        })

    CATCH error
        Logger.error("Validate username error", error)
        RETURN Response(500, {
            error: "Internal server error"
        })
    END TRY
END
```

### 5.2 Complete Onboarding Endpoint
```
ALGORITHM: POST /api/auth/complete-onboarding
INPUT: request body {username: string, displayName: string, bio?: string}
OUTPUT: response {success: boolean, data: UserSettings}

AUTHENTICATION: Required (JWT token)

BEGIN
    TRY
        // Get authenticated user
        userId ← request.user.id
        {username, displayName, bio} ← request.body

        // Validate inputs
        IF username IS NULL OR displayName IS NULL THEN
            RETURN Response(400, {
                error: "Username and display name are required"
            })
        END IF

        // Check if onboarding already completed
        existingSettings ← GetUserSettings(userId)
        IF existingSettings IS NOT NULL THEN
            RETURN Response(409, {
                error: "Onboarding already completed"
            })
        END IF

        // Validate and create settings
        usernameValidation ← ValidateUsername(username, NULL)
        displayValidation ← ValidateDisplayName(displayName)

        IF NOT usernameValidation.isValid THEN
            RETURN Response(400, {
                error: usernameValidation.errors[0],
                suggestions: usernameValidation.suggestions
            })
        END IF

        IF NOT displayValidation.isValid THEN
            RETURN Response(400, {
                error: displayValidation.errors[0]
            })
        END IF

        // Create user settings
        userSettings ← InsertUserSettings(userId, username, displayName, bio)

        // Update user session with onboarding completion flag
        UpdateUserMetadata(userId, {onboarding_completed: TRUE})

        // Log event
        Logger.info("Onboarding completed", {userId, username})

        RETURN Response(201, {
            success: TRUE,
            data: userSettings
        })

    CATCH ValidationError as error
        RETURN Response(400, {
            error: error.message
        })
    CATCH DuplicateError as error
        RETURN Response(409, {
            error: error.message
        })
    CATCH error
        Logger.error("Complete onboarding error", error)
        RETURN Response(500, {
            error: "Failed to complete onboarding"
        })
    END TRY
END
```

### 5.3 Update User Settings Endpoint
```
ALGORITHM: PUT /api/auth/user-settings
INPUT: request body {username?: string, displayName?: string, bio?: string, isPublic?: boolean}
OUTPUT: response {success: boolean, data: UserSettings}

AUTHENTICATION: Required (JWT token)

BEGIN
    TRY
        userId ← request.user.id
        updates ← request.body

        // Validate updates
        IF IsEmpty(updates) THEN
            RETURN Response(400, {
                error: "No updates provided"
            })
        END IF

        // Validate individual fields if provided
        IF updates.username IS NOT NULL THEN
            validation ← ValidateUsername(updates.username, userId)
            IF NOT validation.isValid THEN
                RETURN Response(400, {
                    error: validation.errors[0],
                    suggestions: validation.suggestions
                })
            END IF
        END IF

        IF updates.displayName IS NOT NULL THEN
            validation ← ValidateDisplayName(updates.displayName)
            IF NOT validation.isValid THEN
                RETURN Response(400, {
                    error: validation.errors[0]
                })
            END IF
        END IF

        // Update settings
        updatedSettings ← UpdateUserSettings(userId, updates)

        // Log event
        Logger.info("User settings updated", {userId, fields: Object.keys(updates)})

        RETURN Response(200, {
            success: TRUE,
            data: updatedSettings
        })

    CATCH NotFoundError as error
        RETURN Response(404, {
            error: "User settings not found. Please complete onboarding first."
        })
    CATCH DuplicateError as error
        RETURN Response(409, {
            error: error.message
        })
    CATCH ValidationError as error
        RETURN Response(400, {
            error: error.message
        })
    CATCH error
        Logger.error("Update user settings error", error)
        RETURN Response(500, {
            error: "Failed to update user settings"
        })
    END TRY
END
```

### 5.4 Get User Settings Endpoint
```
ALGORITHM: GET /api/auth/user-settings/:username?
INPUT: URL parameter username (optional), query param userId (optional)
OUTPUT: response {success: boolean, data: UserSettings}

AUTHENTICATION: Optional (public profiles visible without auth)

BEGIN
    TRY
        // Determine which user to fetch
        IF request.params.username IS NOT NULL THEN
            // Fetch by username (public profile)
            userSettings ← GetUserSettingsByUsername(request.params.username)

            IF userSettings IS NULL THEN
                RETURN Response(404, {
                    error: "User not found"
                })
            END IF

            // Check if profile is public or requester is the owner
            IF NOT userSettings.is_public AND
               (request.user IS NULL OR request.user.id != userSettings.user_id) THEN
                RETURN Response(403, {
                    error: "This profile is private"
                })
            END IF

        ELSE IF request.user IS NOT NULL THEN
            // Fetch authenticated user's own settings
            userSettings ← GetUserSettings(request.user.id)

            IF userSettings IS NULL THEN
                RETURN Response(404, {
                    error: "User settings not found"
                })
            END IF

        ELSE
            RETURN Response(400, {
                error: "Username parameter or authentication required"
            })
        END IF

        RETURN Response(200, {
            success: TRUE,
            data: userSettings
        })

    CATCH error
        Logger.error("Get user settings error", error)
        RETURN Response(500, {
            error: "Failed to retrieve user settings"
        })
    END TRY
END
```

---

## 6. Integration with Existing Onboarding

### 6.1 Modified Registration Flow
```
ALGORITHM: RegisterUser (Modified)
INPUT: email, password, name
OUTPUT: user with onboarding_incomplete flag

BEGIN
    // Original registration logic
    user ← CreateUser(email, password, name)
    tokens ← GenerateTokens(user)
    session ← CreateUserSession(user.id, tokens.refreshToken)

    // NEW: Add onboarding status
    user.metadata ← {
        onboarding_completed: FALSE,
        onboarding_step: OnboardingStep.USERNAME_SETUP
    }

    RETURN {
        user: user,
        tokens: tokens,
        onboarding_required: TRUE
    }
END
```

### 6.2 Login Flow Check
```
ALGORITHM: LoginUser (Modified)
INPUT: email, password
OUTPUT: user with onboarding status

BEGIN
    // Original login logic
    user ← AuthenticateUser(email, password)
    tokens ← GenerateTokens(user)
    UpdateLastLogin(user.id)

    // NEW: Check onboarding completion
    userSettings ← GetUserSettings(user.id)
    onboarding_completed ← (userSettings IS NOT NULL)

    RETURN {
        user: user,
        tokens: tokens,
        onboarding_required: NOT onboarding_completed
    }
END
```

### 6.3 Protected Route Middleware
```
ALGORITHM: RequireOnboardingComplete
INPUT: request, response, next
OUTPUT: proceed to next middleware or return error

BEGIN
    userId ← request.user.id

    // Check if user has completed onboarding
    userSettings ← GetUserSettings(userId)

    IF userSettings IS NULL THEN
        RETURN Response(403, {
            error: "Onboarding not completed",
            redirect: "/onboarding/username"
        })
    END IF

    // Attach user settings to request
    request.userSettings ← userSettings

    next()
END
```

---

## 7. Error Handling and Retry Logic

### 7.1 Retry Strategy for Network Errors
```
ALGORITHM: RetryableAPICall
INPUT: apiFunction, maxRetries (default 3), delayMs (default 1000)
OUTPUT: API response or final error

BEGIN
    attemptCount ← 0
    lastError ← NULL

    WHILE attemptCount < maxRetries DO
        TRY
            response ← apiFunction()
            RETURN response

        CATCH error
            attemptCount ← attemptCount + 1
            lastError ← error

            // Only retry on network errors, not validation errors
            IF error.type IN ["NETWORK_ERROR", "TIMEOUT", "SERVER_ERROR"] THEN
                IF attemptCount < maxRetries THEN
                    // Exponential backoff
                    delay ← delayMs * Math.pow(2, attemptCount - 1)
                    Logger.warn("API call failed, retrying in " + delay + "ms", {
                        attempt: attemptCount,
                        error: error.message
                    })
                    Sleep(delay)
                END IF
            ELSE
                // Don't retry validation or client errors
                THROW error
            END IF
        END TRY
    END WHILE

    // Max retries exceeded
    Logger.error("API call failed after " + maxRetries + " attempts", lastError)
    THROW NetworkError("Request failed after " + maxRetries + " attempts")
END
```

### 7.2 Frontend Error Boundary
```
ALGORITHM: UsernameFormErrorBoundary
INPUT: Component, fallbackUI
OUTPUT: Wrapped component with error handling

BEGIN
    DEFINE STATE:
        hasError ← FALSE
        error ← NULL
        errorInfo ← NULL

    FUNCTION componentDidCatch(error, errorInfo)
        hasError ← TRUE
        this.error ← error
        this.errorInfo ← errorInfo

        // Log to error tracking service
        Logger.error("Username form error", {
            error: error,
            componentStack: errorInfo.componentStack
        })

        // Show user-friendly error message
        ShowToast("Something went wrong. Please refresh the page.", "error")
    END FUNCTION

    FUNCTION resetError()
        hasError ← FALSE
        error ← NULL
        errorInfo ← NULL
    END FUNCTION

    FUNCTION render()
        IF hasError THEN
            RETURN fallbackUI(error, resetError)
        ELSE
            RETURN Component
        END IF
    END FUNCTION
END
```

### 7.3 Validation Error Aggregation
```
ALGORITHM: AggregateValidationErrors
INPUT: validationResults (array of ValidationResult)
OUTPUT: aggregatedErrors (object)

BEGIN
    aggregated ← {
        hasErrors: FALSE,
        fieldErrors: {},
        generalErrors: []
    }

    FOR EACH result IN validationResults DO
        IF NOT result.isValid THEN
            aggregated.hasErrors ← TRUE

            IF result.field IS NOT NULL THEN
                // Field-specific error
                IF aggregated.fieldErrors[result.field] IS NULL THEN
                    aggregated.fieldErrors[result.field] ← []
                END IF
                aggregated.fieldErrors[result.field].push(...result.errors)
            ELSE
                // General error
                aggregated.generalErrors.push(...result.errors)
            END IF
        END IF
    END FOR

    RETURN aggregated
END
```

---

## 8. Performance Optimizations

### 8.1 Database Query Optimization
```
COMPLEXITY ANALYSIS: CheckUsernameUniqueness

Time Complexity:
    - Cache lookup: O(1)
    - Database query with index: O(log n) where n = total usernames
    - Total: O(log n) on cache miss, O(1) on cache hit

Space Complexity:
    - Cache storage: O(k) where k = cache size (50,000)
    - Query result: O(1)
    - Total: O(k)

Optimization Notes:
    - LOWER(username) index enables case-insensitive search in O(log n)
    - LRU cache reduces 90%+ queries to O(1)
    - Consider adding Redis cache layer for distributed systems
```

### 8.2 Batch Username Validation
```
ALGORITHM: ValidateUsernamesBatch
INPUT: usernames (array of strings)
OUTPUT: results (array of ValidationResult)

PURPOSE: Validate multiple usernames in single database query

BEGIN
    // Validate format locally first
    localResults ← []
    validCandidates ← []

    FOR EACH username IN usernames DO
        formatValidation ← ValidateUsernameFormat(username)
        localResults.append(formatValidation)

        IF formatValidation.isValid THEN
            validCandidates.append(LowerCase(Trim(username)))
        END IF
    END FOR

    IF Length(validCandidates) = 0 THEN
        RETURN localResults
    END IF

    // Single database query for all valid candidates
    query ← "
        SELECT LOWER(username) as username
        FROM user_settings
        WHERE LOWER(username) = ANY($1)
    "

    takenUsernames ← Database.query(query, [validCandidates])
    takenSet ← CreateSet(takenUsernames.map(row => row.username))

    // Merge results
    candidateIndex ← 0
    FOR i FROM 0 TO Length(localResults) - 1 DO
        IF localResults[i].isValid THEN
            candidate ← validCandidates[candidateIndex]

            IF candidate IN takenSet THEN
                localResults[i].isValid ← FALSE
                localResults[i].errors.append("Username already taken")
                localResults[i].suggestions ← GenerateSuggestions(candidate)
            END IF

            candidateIndex ← candidateIndex + 1
        END IF
    END FOR

    RETURN localResults
END

COMPLEXITY:
    Time: O(n + m log m) where n = input count, m = valid candidates
    Space: O(n)
```

### 8.3 Frontend Debouncing
```
ALGORITHM: DebounceUsernameValidation
INPUT: username (string), delayMs (default 500)
OUTPUT: debounced validation call

PURPOSE: Reduce API calls during typing

BEGIN
    STATIC STATE:
        timerId ← NULL
        lastUsername ← ""

    FUNCTION debouncedValidate(username)
        // Cancel previous timer
        IF timerId IS NOT NULL THEN
            ClearTimeout(timerId)
        END IF

        // Skip if username hasn't changed
        IF username = lastUsername THEN
            RETURN
        END IF

        lastUsername ← username

        // Set new timer
        timerId ← SetTimeout(() => {
            ValidateUsernameAPI(username)
            timerId ← NULL
        }, delayMs)
    END FUNCTION

    RETURN debouncedValidate
END

OPTIMIZATION IMPACT:
    - Reduces API calls by ~80% during typing
    - Improves user experience (less loading states)
    - Reduces server load
```

---

## 9. Security Considerations

### 9.1 Rate Limiting
```
ALGORITHM: RateLimitUsernameValidation
INPUT: userId or IP address
OUTPUT: allow or deny request

CONSTANTS:
    MAX_REQUESTS_PER_MINUTE = 30
    MAX_REQUESTS_PER_HOUR = 200

BEGIN
    identifier ← userId ? "user:" + userId : "ip:" + ipAddress

    // Check minute rate
    minuteKey ← identifier + ":minute:" + CurrentMinute()
    minuteCount ← Redis.get(minuteKey) OR 0

    IF minuteCount >= MAX_REQUESTS_PER_MINUTE THEN
        THROW RateLimitError("Too many requests. Please try again in a minute.")
    END IF

    // Check hour rate
    hourKey ← identifier + ":hour:" + CurrentHour()
    hourCount ← Redis.get(hourKey) OR 0

    IF hourCount >= MAX_REQUESTS_PER_HOUR THEN
        THROW RateLimitError("Hourly rate limit exceeded. Please try again later.")
    END IF

    // Increment counters
    Redis.incr(minuteKey)
    Redis.expire(minuteKey, 60)  // 1 minute TTL

    Redis.incr(hourKey)
    Redis.expire(hourKey, 3600)  // 1 hour TTL

    RETURN ALLOW
END
```

### 9.2 SQL Injection Prevention
```
SECURITY: Parameterized Queries

INCORRECT (Vulnerable to SQL Injection):
    query ← "SELECT * FROM user_settings WHERE username = '" + username + "'"
    Database.execute(query)

CORRECT (Safe with parameterization):
    query ← "SELECT * FROM user_settings WHERE LOWER(username) = $1"
    Database.query(query, [LowerCase(username)])

ADDITIONAL MEASURES:
    - All user inputs are parameterized ($1, $2, etc.)
    - Input validation before database queries
    - ORM/Query builder usage where appropriate
    - Principle of least privilege for database user
```

### 9.3 XSS Prevention
```
ALGORITHM: SanitizeUserInput
INPUT: rawInput (string), context (enum: DISPLAY_NAME, BIO, USERNAME)
OUTPUT: sanitized (string)

BEGIN
    SWITCH context
        CASE USERNAME:
            // Username is already restricted by validation
            // Only alphanumeric, hyphens, underscores
            RETURN Trim(LowerCase(rawInput))

        CASE DISPLAY_NAME:
            // Escape HTML entities
            sanitized ← EscapeHTML(rawInput)
            // Remove any remaining HTML tags
            sanitized ← StripHTMLTags(sanitized)
            RETURN Trim(sanitized)

        CASE BIO:
            // Allow limited markdown, escape HTML
            sanitized ← EscapeHTML(rawInput)
            sanitized ← SanitizeMarkdown(sanitized, {
                allowedTags: ["b", "i", "a"],
                allowedAttributes: {a: ["href"]}
            })
            RETURN Trim(sanitized)
    END SWITCH
END

FRONTEND RENDERING:
    // Always use framework's built-in escaping
    REACT: {displayName}  // Automatic escaping
    AVOID: dangerouslySetInnerHTML unless absolutely necessary
```

---

## 10. Testing Pseudocode

### 10.1 Unit Test: Username Validation
```
TEST: ValidateUsername_WithValidInput_ReturnsValid

BEGIN
    // Arrange
    username ← "john_doe123"

    // Act
    result ← ValidateUsername(username, NULL)

    // Assert
    ASSERT result.isValid = TRUE
    ASSERT Length(result.errors) = 0
END

TEST: ValidateUsername_WithShortInput_ReturnsInvalid

BEGIN
    // Arrange
    username ← "ab"  // Too short (< 3 chars)

    // Act
    result ← ValidateUsername(username, NULL)

    // Assert
    ASSERT result.isValid = FALSE
    ASSERT "must be at least 3 characters" IN result.errors
END

TEST: ValidateUsername_WithTakenUsername_ReturnsInvalidWithSuggestions

BEGIN
    // Arrange
    username ← "john_doe"
    MockDatabase.setupUsername("john_doe", "existing-user-id")

    // Act
    result ← ValidateUsername(username, NULL)

    // Assert
    ASSERT result.isValid = FALSE
    ASSERT "already taken" IN result.errors
    ASSERT Length(result.suggestions) > 0
END
```

### 10.2 Integration Test: Complete Onboarding Flow
```
TEST: CompleteOnboardingFlow_Success

BEGIN
    // Arrange
    userEmail ← "test@example.com"
    password ← "SecurePass123!"
    name ← "Test User"
    username ← "testuser123"
    displayName ← "Test User"

    // Act: Register
    registerResponse ← POST("/api/auth/register", {
        email: userEmail,
        password: password,
        name: name
    })

    ASSERT registerResponse.status = 201
    ASSERT registerResponse.data.onboarding_required = TRUE

    accessToken ← registerResponse.data.access_token

    // Act: Complete onboarding
    onboardingResponse ← POST("/api/auth/complete-onboarding", {
        username: username,
        displayName: displayName
    }, {
        headers: {Authorization: "Bearer " + accessToken}
    })

    // Assert
    ASSERT onboardingResponse.status = 201
    ASSERT onboardingResponse.data.username = username
    ASSERT onboardingResponse.data.display_name = displayName

    // Verify database state
    dbSettings ← Database.query(
        "SELECT * FROM user_settings WHERE username = $1",
        [username]
    )
    ASSERT dbSettings IS NOT NULL
END
```

### 10.3 E2E Test: UI Username Entry
```
TEST: UsernameForm_UserEntersValidUsername_ShowsSuccessIndicator

BEGIN
    // Arrange
    page ← Browser.newPage()
    page.goto("/onboarding/username")

    // Act: Type username
    usernameInput ← page.findElement("#username-input")
    usernameInput.type("johndoe123")

    // Wait for debounced validation
    Sleep(600)

    // Assert: Success indicator appears
    successIcon ← page.findElement(".validation-success")
    ASSERT successIcon.isVisible() = TRUE

    // Act: Type display name
    displayNameInput ← page.findElement("#display-name-input")
    displayNameInput.type("John Doe")

    // Act: Submit form
    submitButton ← page.findElement("#submit-button")
    ASSERT submitButton.isEnabled() = TRUE
    submitButton.click()

    // Assert: Redirected to dashboard
    page.waitForURL("/dashboard")
    ASSERT page.url() = "/dashboard"
END

TEST: UsernameForm_UserEntersTakenUsername_ShowsSuggestions

BEGIN
    // Arrange
    page ← Browser.newPage()
    page.goto("/onboarding/username")

    // Mock API to return taken username
    page.mockAPI("POST", "/api/auth/validate-username", {
        status: 200,
        body: {
            isValid: FALSE,
            errors: ["Username already taken"],
            suggestions: ["johndoe123", "johndoe456", "john_doe"]
        }
    })

    // Act
    usernameInput ← page.findElement("#username-input")
    usernameInput.type("johndoe")
    Sleep(600)

    // Assert: Error message shown
    errorMessage ← page.findElement(".validation-error")
    ASSERT errorMessage.text() CONTAINS "already taken"

    // Assert: Suggestions displayed
    suggestions ← page.findElements(".username-suggestion")
    ASSERT Length(suggestions) > 0

    // Act: Click suggestion
    suggestions[0].click()

    // Assert: Username input updated
    ASSERT usernameInput.value() = "johndoe123"
END
```

---

## 11. Monitoring and Analytics

### 11.1 Metrics to Track
```
METRICS: Username Collection

1. Validation Metrics:
    - validation_attempts_total (counter)
    - validation_failures_by_reason (counter with label)
    - validation_duration_ms (histogram)

2. Onboarding Metrics:
    - onboarding_completions_total (counter)
    - onboarding_duration_seconds (histogram)
    - onboarding_abandonment_by_step (counter with label)
    - username_suggestion_clicks (counter)

3. Performance Metrics:
    - username_cache_hit_rate (gauge)
    - database_query_duration_ms (histogram)
    - api_response_time_ms (histogram)

4. Error Metrics:
    - api_errors_total (counter with label: endpoint, status)
    - validation_errors_by_type (counter with label)
```

### 11.2 Logging Strategy
```
ALGORITHM: LogUsernameEvent
INPUT: eventType (enum), userId (UUID), metadata (object)
OUTPUT: logged event

BEGIN
    logEntry ← {
        timestamp: NOW(),
        eventType: eventType,
        userId: userId,
        sessionId: GetCurrentSessionId(),
        metadata: metadata
    }

    SWITCH eventType
        CASE "USERNAME_VALIDATION":
            Logger.info("Username validation", {
                ...logEntry,
                username: metadata.username,
                isValid: metadata.isValid,
                errorReason: metadata.errorReason
            })

        CASE "ONBOARDING_COMPLETE":
            Logger.info("Onboarding completed", {
                ...logEntry,
                username: metadata.username,
                duration: metadata.duration
            })

        CASE "USERNAME_SUGGESTION_USED":
            Logger.info("Username suggestion clicked", {
                ...logEntry,
                originalUsername: metadata.original,
                suggestedUsername: metadata.suggested
            })

        CASE "VALIDATION_ERROR":
            Logger.warn("Username validation failed", {
                ...logEntry,
                errorReason: metadata.reason,
                attempts: metadata.attempts
            })

        CASE "API_ERROR":
            Logger.error("Username API error", {
                ...logEntry,
                endpoint: metadata.endpoint,
                statusCode: metadata.statusCode,
                errorMessage: metadata.error
            })
    END SWITCH
END
```

---

## 12. Migration Strategy

### 12.1 Database Migration Script
```
ALGORITHM: MigrateExistingUsers
INPUT: none
OUTPUT: migration report

BEGIN
    report ← {
        total: 0,
        migrated: 0,
        skipped: 0,
        errors: []
    }

    // Get all users without user_settings
    query ← "
        SELECT u.id, u.email, u.name
        FROM users u
        LEFT JOIN user_settings us ON u.id = us.user_id
        WHERE us.id IS NULL
    "

    usersToMigrate ← Database.query(query)
    report.total ← Length(usersToMigrate.rows)

    FOR EACH user IN usersToMigrate.rows DO
        TRY
            // Generate default username from email
            baseUsername ← ExtractUsernameFromEmail(user.email)
            username ← FindAvailableUsername(baseUsername)

            // Use existing name as display name
            displayName ← user.name

            // Create user settings
            InsertUserSettings(user.id, username, displayName, NULL)

            report.migrated ← report.migrated + 1

            Logger.info("Migrated user", {userId: user.id, username})

        CATCH error
            report.errors.append({
                userId: user.id,
                email: user.email,
                error: error.message
            })
            Logger.error("Migration failed for user", {userId: user.id, error})
        END TRY
    END FOR

    report.skipped ← report.total - report.migrated - Length(report.errors)

    Logger.info("Migration completed", report)

    RETURN report
END

SUBROUTINE: ExtractUsernameFromEmail
INPUT: email (string)
OUTPUT: username (string)

BEGIN
    // Extract local part before @
    localPart ← email.split("@")[0]

    // Remove non-alphanumeric characters
    cleaned ← localPart.replace(/[^a-zA-Z0-9]/g, "")

    // Ensure minimum length
    IF Length(cleaned) < 3 THEN
        cleaned ← cleaned + "user"
    END IF

    // Ensure maximum length
    IF Length(cleaned) > 30 THEN
        cleaned ← cleaned.substring(0, 30)
    END IF

    RETURN LowerCase(cleaned)
END

SUBROUTINE: FindAvailableUsername
INPUT: baseUsername (string)
OUTPUT: availableUsername (string)

BEGIN
    candidate ← baseUsername
    counter ← 1

    WHILE NOT CheckUsernameUniqueness(candidate, NULL) DO
        candidate ← baseUsername + ToString(counter)
        counter ← counter + 1

        // Prevent infinite loop
        IF counter > 10000 THEN
            candidate ← baseUsername + GenerateRandomString(6)
            BREAK
        END IF
    END WHILE

    RETURN candidate
END
```

---

## Summary

This pseudocode document provides complete algorithmic specifications for:

1. **Username Validation** - Comprehensive validation logic with format checks, profanity filtering, and uniqueness verification
2. **Database Operations** - Transaction-safe CRUD operations for user settings
3. **Frontend State Management** - React hooks and state machines for smooth UX
4. **API Endpoints** - RESTful endpoints with proper error handling
5. **Integration** - Seamless integration with existing authentication flow
6. **Performance** - Caching strategies and batch operations
7. **Security** - Rate limiting, SQL injection prevention, XSS protection
8. **Testing** - Comprehensive test scenarios
9. **Monitoring** - Metrics and logging strategy
10. **Migration** - Strategy for existing users

All algorithms follow SPARC pseudocode standards with:
- Clear input/output specifications
- Step-by-step logic flow
- Complexity analysis
- Error handling
- Security considerations

**Next Phase**: Architecture design to implement these algorithms in the existing TypeScript/PostgreSQL stack.
