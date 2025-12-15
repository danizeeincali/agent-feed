# Get-to-Know-You Agent - Username Collection Flow Example

**SPARC Implementation: FR-2 - Username Collection in Onboarding**
**Agent**: get-to-know-you-agent
**Updated**: 2025-11-02
**Status**: IMPLEMENTED

---

## Overview

This document demonstrates the updated get-to-know-you-agent flow with username collection as the **FIRST** step in onboarding, before any other questions are asked.

---

## Example Flow 1: Successful Username Collection

### Step 1: Initial Greeting (Username Collection - FIRST QUESTION)

**Agent:**
```
Hi! Welcome to your AI-powered workspace. Before we begin, what would you like me to call you?

You can use:
• Your first name (e.g., 'Alex')
• Your full name (e.g., 'Alex Chen')
• A nickname (e.g., 'AC')
• A professional title (e.g., 'Dr. Chen')

This will be your display name throughout the system.
```

**User:**
```
Alex Chen
```

### Step 2: Username Validation & API Call

**Agent (Internal Process):**
1. ✅ Validate: "Alex Chen" is 9 characters (within 1-50 limit)
2. ✅ Validate: Not empty or whitespace only
3. ✅ Sanitize: No HTML/script tags detected
4. 🔄 API Call:
   ```bash
   curl -X PUT "http://localhost:5000/api/user-settings/display-name" \
     -H "Content-Type: application/json" \
     -d '{"userId": "demo-user-123", "display_name": "Alex Chen"}'
   ```
5. ✅ API Response:
   ```json
   {
     "success": true,
     "data": {
       "user_id": "demo-user-123",
       "display_name": "Alex Chen",
       "updated_at": 1730588400
     },
     "message": "Display name updated successfully"
   }
   ```
6. ✅ Store in memory: `PREFERRED_NAME = "Alex Chen"`

### Step 3: Welcome Phase (Using Collected Username)

**Agent:**
```
Thanks, Alex Chen! Welcome to your personalized production environment. I'm your Get-to-Know-You Agent, and I'm here to help you build an amazing relationship with Λvi (your AI chief of staff) and the entire agent ecosystem.

This onboarding takes about 10 minutes and will personalize everything to work exactly how you prefer. You're about to meet Λvi, who will be your strategic partner and coordinator.

Let's get started, Alex Chen!
```

### Step 4: Continue Onboarding (All Using "Alex Chen")

**Agent:**
```
First, let's talk about Λvi - your AI chief of staff, Alex Chen. Λvi isn't just a tool, they're designed to be your strategic partner and trusted advisor.

• How would you like to work with a chief of staff? (collaborative, directive, consultative)
...
```

### Step 5: Completion Post (Personalized with Username)

**Agent Posts to Feed:**
```markdown
🎉 Welcome Alex Chen - Your AI Team is Ready!

Onboarding complete - Alex Chen's personalized agent ecosystem is configured and ready

## Welcome to Your Personalized AI Experience, Alex Chen!

I'm excited to have you here! Based on our conversation, I've set up everything to work exactly how you prefer.

**Your Profile:**
- **Name:** Alex Chen
- **Focus:** Business productivity
- **Goals:** Increase team efficiency, Better time management, Strategic planning
- **Communication Style:** Professional but friendly

**Λvi Relationship:** Collaborative Strategic Partner
Alex Chen, your chief of staff Λvi is configured to work with you as a collaborative decision-making partner

**Agent Team Configuration:**
✅ Personal Todos Agent: Fibonacci IMPACT priorities
✅ Meeting Agents: Detailed preparation and comprehensive follow-up
✅ Link Logger: Competitive intelligence capture

**First Task Created:** Review Q4 strategic initiatives

**Next Steps for Alex Chen:**
1. Check your personalized task list in Personal Todos Agent
2. Explore the agent feed to see what your team is working on
3. Try asking Λvi for strategic guidance on your top priority

Welcome to the team, Alex Chen! 🚀

Your display name is now set across the entire system - you'll see it in posts, comments, and everywhere you interact with the agent feed.
```

---

## Example Flow 2: Invalid Username (Too Long)

### Step 1: Initial Greeting

**Agent:**
```
Hi! Welcome to your AI-powered workspace. Before we begin, what would you like me to call you?

You can use:
• Your first name (e.g., 'Alex')
• Your full name (e.g., 'Alex Chen')
• A nickname (e.g., 'AC')
• A professional title (e.g., 'Dr. Chen')

This will be your display name throughout the system.
```

**User:**
```
Dr. Alexander Christopher Montgomery-Wellington III, PhD
```

### Step 2: Validation Fails - Re-prompt

**Agent (Internal):**
1. ❌ Validate: "Dr. Alexander Christopher Montgomery-Wellington III, PhD" is 54 characters (exceeds 50 limit)

**Agent:**
```
That's a bit long! Please use a shorter version (maximum 50 characters).

You could try:
• Dr. Montgomery-Wellington
• Alexander Montgomery
• Dr. ACM
• Alex MW

What would you like me to call you?
```

**User:**
```
Dr. Montgomery
```

**Agent (Internal):**
1. ✅ Validate: "Dr. Montgomery" is 14 characters (within limit)
2. ✅ Save via API
3. ✅ Continue onboarding

**Agent:**
```
Thanks, Dr. Montgomery! Welcome to your personalized production environment...
```

---

## Example Flow 3: Empty Username

### Step 1: Initial Greeting

**Agent:**
```
Hi! Welcome to your AI-powered workspace. Before we begin, what would you like me to call you?

You can use:
• Your first name (e.g., 'Alex')
• Your full name (e.g., 'Alex Chen')
• A nickname (e.g., 'AC')
• A professional title (e.g., 'Dr. Chen')

This will be your display name throughout the system.
```

**User:**
```
[presses Enter without typing anything]
```

### Step 2: Validation Fails - Re-prompt

**Agent (Internal):**
1. ❌ Validate: Empty or whitespace only

**Agent:**
```
I didn't catch that. Please provide a name I can call you by.

It can be anything you're comfortable with - your first name, a nickname, or however you'd like to be addressed.
```

**User:**
```
Sarah
```

**Agent (Internal):**
1. ✅ Validate: "Sarah" is 5 characters (within limit)
2. ✅ Save via API
3. ✅ Continue onboarding

**Agent:**
```
Thanks, Sarah! Welcome to your personalized production environment...
```

---

## Example Flow 4: Username with Special Characters (International)

### Step 1: Initial Greeting

**Agent:**
```
Hi! Welcome to your AI-powered workspace. Before we begin, what would you like me to call you?
...
```

**User:**
```
María García
```

### Step 2: Validation & API Call (Unicode Support)

**Agent (Internal):**
1. ✅ Validate: "María García" is 12 characters (within limit)
2. ✅ Unicode characters supported (á, í)
3. ✅ API Call successful
4. ✅ Store: `PREFERRED_NAME = "María García"`

**Agent:**
```
Thanks, María García! Welcome to your personalized production environment. I'm your Get-to-Know-You Agent...
```

---

## Example Flow 5: API Error Handling

### Step 1: Username Collection

**User:**
```
Jordan
```

### Step 2: API Call Fails

**Agent (Internal):**
1. ✅ Validate: "Jordan" is valid
2. ❌ API Call fails (network error, server down, etc.)
3. 🔄 Retry once
4. ❌ Still fails

**Agent:**
```
Oops! I had trouble saving that. Let's try again - what should I call you?

(The system might be experiencing a temporary issue. Your name will be saved once we're connected.)
```

**User:**
```
Jordan
```

**Agent (Internal):**
1. 🔄 Retry API call
2. ✅ Success this time

**Agent:**
```
Thanks, Jordan! Got it saved. Welcome to your personalized production environment...
```

---

## Technical Implementation Details

### API Endpoint Used
```
PUT /api/user-settings/display-name
```

### Request Format
```json
{
  "userId": "demo-user-123",
  "display_name": "User's Collected Username"
}
```

### Response Format (Success)
```json
{
  "success": true,
  "data": {
    "user_id": "demo-user-123",
    "display_name": "User's Collected Username",
    "updated_at": 1730588400
  },
  "message": "Display name updated successfully"
}
```

### Response Format (Error)
```json
{
  "success": false,
  "error": "display_name must be 1-50 characters"
}
```

### Validation Rules
- **Length**: 1-50 characters
- **Required**: Cannot be empty or whitespace only
- **Unicode**: Supports international characters (UTF-8)
- **Sanitization**: HTML/script tags automatically removed
- **Trimming**: Leading/trailing whitespace removed

---

## Benefits of Username-First Approach

1. **Immediate Personalization**: User feels recognized from the very first interaction
2. **Natural Flow**: Asking name first mirrors human conversation patterns
3. **Consistent Experience**: Username used throughout entire onboarding and beyond
4. **Technical Correctness**: Profile data structure populated from the start
5. **Error Recovery**: Early validation means issues caught before deep onboarding

---

## Success Criteria

✅ Username question appears FIRST (before any other onboarding questions)
✅ Clear examples provided to users
✅ Username validated (1-50 characters, not empty)
✅ Username saved via API before continuing
✅ Username used throughout all onboarding messages
✅ Completion post uses collected username (not "User Agent")
✅ Error handling for invalid usernames implemented
✅ Unicode/international characters supported

---

**Status**: IMPLEMENTED ✅
**Next Step**: Agent 4 (Frontend Display Name Integrator) will use this data to show personalized names throughout the UI.
