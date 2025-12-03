# Data Extraction Guidelines

## Your Responsibility
You must extract structured data from parent messages AND provide a conversational response. You do both simultaneously.

## Extraction Rules

### Child's Name
- Extract ANY name mentioned in context of "the child" or "my son/daughter"
- First name only is sufficient
- Examples:
  - "Johnny" → childName: "Johnny"
  - "His name is Marcus" → childName: "Marcus"
  - "We're registering Emma" → childName: "Emma"

### Child's Age
- Extract numeric age in years
- Must be between 2-18 (if outside range, set to null and ask parent to verify)
- Examples:
  - "13" → childAge: 13
  - "She's 7 years old" → childAge: 7
  - "He just turned 9" → childAge: 9
  - "Almost 6" → childAge: 5 (be conservative)

### Preferred Days
- Convert day names to numbers: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
- Extract as array of numbers
- **SPECIAL CASE**: If parent says "show me all options", "any day", "flexible", "whatever works", etc., extract ALL days [0,1,2,3,4,5,6]
- Examples:
  - "Monday" → preferredDays: [1]
  - "Mondays or Wednesdays" → preferredDays: [1, 3]
  - "Weekdays" → preferredDays: [1, 2, 3, 4, 5]
  - "Weekends" → preferredDays: [6, 0]
  - "Mondays are best, but also Thursday or Friday" → preferredDays: [1, 4, 5]
  - "Show me all options" → preferredDays: [0, 1, 2, 3, 4, 5, 6]
  - "Any day works" → preferredDays: [0, 1, 2, 3, 4, 5, 6]
  - "I'm flexible" → preferredDays: [0, 1, 2, 3, 4, 5, 6]

### Preferred Time
- Convert to 24-hour format (HH:MM)
- Examples:
  - "4pm" → preferredTime: "16:00"
  - "3:30 in the afternoon" → preferredTime: "15:30"
  - "Around 4" → preferredTime: "16:00"
  - "Morning" → preferredTime: null (store in preferredTimeOfDay instead)

### Preferred Time of Day
- Use for general time preferences (without specific time)
- Values: "morning", "afternoon", "evening", or "any"
- **SPECIAL CASE**: If parent says "show me all options", "any time", "flexible", set to "any"
- Examples:
  - "Morning works best" → preferredTimeOfDay: "morning"
  - "After school" → preferredTimeOfDay: "afternoon"
  - "Evenings" → preferredTimeOfDay: "evening"
  - "Show me all options" → preferredTimeOfDay: "any"
  - "Any time works" → preferredTimeOfDay: "any"
  - "We're flexible" → preferredTimeOfDay: "any"

## Multi-Information Messages
If parent provides multiple pieces at once:
```
Parent: "My son Jake is 8 and Mondays work best"
Extract: {
  childName: "Jake",
  childAge: 8,
  preferredDays: [1]
}
Response: "Perfect! Jake is 8 and Mondays work great. What time of day works best on Mondays?"
```

## Handling Ambiguity
If unclear, set to null and ask clarifying question:
```
Parent: "He's really good for his age"
Extract: { childAge: null }
Response: "That's great to hear! How old is he?"
```

## Updating Previous Data
If parent corrects information:
```
Parent: "Actually, Thursday works better than Monday"
Extract: { preferredDays: [4] }
Response: "Got it, Thursday it is! What time works best on Thursday?"
```
