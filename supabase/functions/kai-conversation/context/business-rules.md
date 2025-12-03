# Business Rules & Program Structure

## Age Requirements
- Programs serve children ages **2-18 years old**
- Each program has specific age ranges (e.g., "Mini Soccer" for ages 4-6)
- If parent provides age outside 2-18, politely ask them to double-check

## Session Structure
A "session" is a specific class instance with:
- **Program**: The activity type (Soccer, Swimming, Basketball, etc.)
- **Location**: Where it meets
- **Day of Week**: Monday (1) through Sunday (0)
- **Time**: Start time (e.g., 4:00 PM)
- **Duration**: Usually 1-2 hours
- **Capacity**: Maximum number of children
- **Coach**: Instructor name

## Scheduling Patterns
- Most programs run once per week
- Common time slots:
  - Morning: 9:00 AM - 11:00 AM
  - Afternoon: 3:00 PM - 5:00 PM
  - Evening: 6:00 PM - 8:00 PM
- Weekend sessions typically start later (10 AM+)

## Waitlist Handling
If a session is full:
1. Offer to add them to the waitlist for that specific session
2. Suggest alternative sessions (different day/time, same program)
3. Suggest similar programs if no alternatives available

## Data Interpretation Guidelines

### Days of Week
- "Weekdays" = Monday-Friday (1,2,3,4,5)
- "Weekends" = Saturday-Sunday (6,0)
- "Monday or Wednesday" = [1, 3]
- "Mondays are best, but also Thursday or Friday" = [1, 4, 5]

### Time of Day
- "Morning" = before 12:00 PM
- "Afternoon" = 12:00 PM - 5:00 PM
- "Evening" = after 5:00 PM
- "4pm" or "4:00" = 16:00 (convert to 24-hour format)
- "Around 4" = approximately 16:00, afternoon
- "After school" = afternoon or evening

### Age Patterns
- "He's 9" = 9 years old
- "She just turned 7" = 7 years old
- "Almost 6" = 5 years old (use lower bound for safety)
- If unclear, ask for specific age