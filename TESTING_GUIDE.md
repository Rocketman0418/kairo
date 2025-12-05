# Kairo Platform Testing Guide

**Version:** 1.0
**Last Updated:** December 5, 2025

## Overview

This guide provides comprehensive testing scenarios for all Kairo features, with specific data and example conversations to validate functionality.

---

## Table of Contents

1. [Real-Time Availability Testing](#1-real-time-availability-testing)
2. [Session Quality Scoring](#2-session-quality-scoring)
3. [Coach Rating vs Session Quality](#3-coach-rating-vs-session-quality)
4. [Location-Based Sorting](#4-location-based-sorting)
5. [Adjacent Day Suggestions](#5-adjacent-day-suggestions)
6. [Match Scoring Algorithm](#6-match-scoring-algorithm)
7. [Find Alternatives Edge Function](#7-find-alternatives-edge-function)
8. [Test Data Summary](#8-test-data-summary)

---

## 1. Real-Time Availability Testing

### Purpose
Test that the UI shows accurate, live availability data and updates when sessions fill up.

### Database State
We now have sessions at various fill levels:
- **Full sessions** (12/12 enrolled): Wednesday 10:00 AM Mini Soccer
- **Almost full** (10/12 enrolled): Thursday 10:00 AM Mini Soccer
- **Partially filled** (4-9/12 enrolled): Various sessions
- **Mostly empty** (2-3/12 enrolled): Multiple options

### How to Test

#### Test 1: View Session Availability
**Steps:**
1. Start a conversation with Kai
2. Say: "I'm looking for Mini Soccer classes for my 3-year-old"
3. Kai should show sessions with availability indicators

**Expected Result:**
- Sessions display "X spots remaining" badges
- Full sessions show "Waitlist Available" or alternatives
- Almost-full sessions show urgency messaging

#### Test 2: Simulate Real-Time Updates
**Steps:**
1. Open two browser tabs
2. In Tab 1, view available sessions
3. In Tab 2, manually update the database:
   ```sql
   UPDATE sessions SET enrolled_count = capacity WHERE id = '[session-id]';
   ```
4. Tab 1 should show the session as full within seconds (via real-time subscription)

**Expected Result:**
- UI updates automatically without refresh
- "X spots remaining" changes in real-time
- If user had selected the now-full session, they see a notification

---

## 2. Session Quality Scoring

### Purpose
Measure overall session quality based on past attendee reviews.

### What It Is
**Session Quality Score** is calculated from the `session_reviews` table:
- Overall rating (1-5 stars)
- Component ratings: coach, location, time slot, value
- Written comments and recommendations
- Multiple reviews averaged together

### Database Query
```sql
-- Get session quality score
SELECT
  s.id,
  s.start_time,
  s.day_of_week,
  COUNT(sr.id) as review_count,
  AVG(sr.overall_rating) as avg_quality_score,
  AVG(sr.coach_rating) as avg_coach_score,
  AVG(sr.location_rating) as avg_location_score,
  AVG(sr.time_slot_rating) as avg_time_score,
  AVG(sr.value_rating) as avg_value_score
FROM sessions s
LEFT JOIN session_reviews sr ON s.id = sr.session_id
WHERE s.program_id = '[program-id]'
GROUP BY s.id;
```

### How to Test

#### Test 1: View Quality Scores
**Steps:**
1. Ask Kai: "Show me the best-rated Mini Soccer classes"
2. Kai should prioritize sessions with higher quality scores

**Expected Result:**
- Sessions with 4.8+ average ratings shown first
- Quality indicators visible (stars, badges)
- Number of reviews displayed (e.g., "4.8 stars from 12 parents")

#### Test 2: Submit a Review
**Steps:**
1. After attending a session, navigate to "My Registrations"
2. Select "Leave a Review"
3. Rate: Overall (5), Coach (5), Location (4), Time (5), Value (4.5)
4. Add comment: "Fantastic experience!"
5. Submit review

**Expected Result:**
- Review saved to `session_reviews` table
- Session's quality score recalculates
- Future recommendations factor in the new review

---

## 3. Coach Rating vs Session Quality

### Key Differences

| Attribute | Coach Rating | Session Quality Score |
|-----------|--------------|----------------------|
| **Table** | `staff.rating` | AVG(`session_reviews.overall_rating`) |
| **Scope** | Individual coach across all sessions | Specific session instance |
| **Factors** | Coach performance only | Coach + Location + Time + Value + Overall experience |
| **Use Case** | "Show me sessions with Coach Mike" | "Find the best Wednesday morning soccer class" |
| **Updated** | Admin updates, aggregated feedback | Parent reviews after each session |

### Example Scenario

**Coach Mike's Rating:** 4.9 (from `staff` table)

**Coach Mike's Sessions:**
- **Session A** (Wed 4PM at Main Complex): Quality Score 5.0 (location convenient, time perfect)
- **Session B** (Sat 6AM at North Field): Quality Score 3.8 (location far, time too early)

**Why the difference?**
Coach Mike is excellent (4.9), but Session B's early time and distant location reduce the overall session quality.

### How to Test

#### Test 1: Coach-Based Search
**Steps:**
1. Ask: "Show me all classes with Coach Mike"
2. All Coach Mike sessions should appear

**Expected Result:**
- Sessions grouped by coach
- Coach's overall rating displayed (4.9)
- Individual session quality scores also shown

#### Test 2: Quality-Based Search
**Steps:**
1. Ask: "Find the highest-rated Wednesday morning classes"
2. Kai prioritizes by session quality score, not just coach rating

**Expected Result:**
- Session A (quality 5.0) ranks above Session B (quality 3.8)
- Even if Session B has a different highly-rated coach

---

## 4. Location-Based Sorting

### Purpose
Test distance-based recommendations without actual geolocation enabled.

### Mock Coordinates
We've added realistic coordinates to all locations:

| Location | Coordinates | Address |
|----------|-------------|---------|
| Main Sports Complex | (39.7817, -89.6501) | 123 Park Ave, Springfield, IL |
| North Field Location | (39.7950, -89.6350) | 456 River Road, Springfield, IL |
| Oakwood Recreation Center | (39.8100, -89.6100) | 789 Oak Street, Springfield, IL |
| Springfield Community Center | (39.7700, -89.6200) | 321 Main Street, Springfield, IL |
| Westside Sports Complex | (39.7600, -89.5900) | 555 West Ave, Springfield, IL |
| East Park Athletic Fields | (39.8000, -89.6800) | 888 East Boulevard, Springfield, IL |

### Test Mode Approach
Since actual geolocation isn't enabled, we test using **family preference coordinates** from the test data.

### How to Test

#### Test 1: Mock Location Input
**Steps:**
1. Start registration for **Johnson Family** (coordinates: 39.7817, -89.6501)
2. Ask: "Show me soccer classes near me"
3. Kai should use the family's address coordinates

**Expected Result:**
- Sessions sorted by distance
- **Main Sports Complex** (same coordinates as family) shown first
- **North Field** and **Springfield Community Center** shown next
- Distance displayed (e.g., "0.5 miles away")

#### Test 2: Different Family Distances
**Steps:**
1. Compare recommendations for:
   - **Johnson Family** (near Main Sports Complex)
   - **Garcia Family** (near North Field)
   - **Williams Family** (near Westside Complex)

**Expected Result:**
- Each family sees different location ordering
- Closest locations prioritized
- Distance limits respected (families have `max_distance_miles` preferences)

#### Test 3: Manual Distance Query
**SQL to calculate distances:**
```sql
SELECT
  l.name,
  l.address,
  l.geo_coordinates,
  -- Calculate distance from Johnson family home (39.7817, -89.6501)
  ST_Distance(
    l.geo_coordinates::geography,
    ST_MakePoint(-89.6501, 39.7817)::geography
  ) / 1609.34 as distance_miles
FROM locations l
ORDER BY distance_miles;
```

---

## 5. Adjacent Day Suggestions

### Purpose
When a preferred day/time is full, suggest sessions on adjacent days (±1 day).

### Test Scenarios

#### Scenario 1: Wednesday is Full
**Database State:**
- **Wednesday 10:00 AM Mini Soccer**: FULL (12/12)
- **Tuesday 10:00 AM Mini Soccer**: Available (4/12)
- **Thursday 10:00 AM Mini Soccer**: Almost full (10/12)
- **Friday 10:00 AM Mini Soccer**: Available (3/12)

**Test Steps:**
1. Say: "I want Mini Soccer on Wednesday mornings"
2. Kai detects Wednesday 10:00 is full

**Expected Response:**
```
I see Wednesday morning Mini Soccer is full right now.
I have great alternatives on nearby days:

📅 Tuesday 10:00 AM - 8 spots left (same coach, same time!)
📅 Thursday 10:00 AM - 2 spots left (filling fast!)
📅 Friday 10:00 AM - 9 spots left

Would any of these work for you? Or I can add you to the Wednesday waitlist.
```

#### Scenario 2: Accept Adjacent Day
**Test Steps:**
1. Follow Scenario 1
2. Respond: "Tuesday works!"
3. Kai proceeds with Tuesday registration

**Expected Result:**
- Registration completes for Tuesday 10:00 AM
- No waitlist entry created
- Confirmation shows Tuesday details

---

## 6. Match Scoring Algorithm

### Purpose
Rank session recommendations by how well they match family preferences.

### Algorithm (Background Process)
The match score is calculated server-side and NOT displayed to users. It's used to order recommendations.

**Factors:**
1. **Day Match** (30%): Preferred days from family preferences
2. **Time Match** (25%): Preferred times (morning, afternoon, evening)
3. **Location Match** (20%): Distance from home
4. **Quality Match** (15%): Session quality score
5. **Availability** (10%): More spots = higher score

**Formula:**
```
match_score = (
  (day_match * 0.30) +
  (time_match * 0.25) +
  (location_match * 0.20) +
  (quality_match * 0.15) +
  (availability_match * 0.10)
) * 100
```

### How to Test

#### Test 1: View Backend Calculations
**Use the Kai Conversation edge function with debug mode:**
```javascript
// In kai-conversation edge function, add logging
const matchScores = sessions.map(session => ({
  session_id: session.id,
  day_match: calculateDayMatch(session, preferences),
  time_match: calculateTimeMatch(session, preferences),
  location_match: calculateLocationMatch(session, family.address),
  quality_match: session.avg_quality_score / 5,
  availability_match: (session.capacity - session.enrolled_count) / session.capacity,
  total_score: calculateTotalMatchScore(session, preferences, family)
}));

console.log('Match Scores:', matchScores);
```

#### Test 2: Verify Recommendation Order
**Steps:**
1. Ask Johnson Family (prefers Wed/Sat afternoons): "Find soccer for Emma"
2. Note the order of recommendations

**Expected Order:**
1. Wednesday afternoon sessions (day + time match)
2. Saturday afternoon sessions (day + time match)
3. Wednesday morning sessions (day match only)
4. Other days' afternoon sessions (time match only)
5. Other days' other times

#### Test 3: Different Family Preferences
**Compare:**
- **Johnson** (Wed/Sat, afternoon) → Gets different order than...
- **Garcia** (Mon/Wed/Fri, evening) → Different order than...
- **Smith** (Sun/Mon/Fri, evening)

**Expected Result:**
- Each family sees personalized order
- Higher match scores appear first
- Match scoring is invisible to user (just shows best matches)

---

## 7. Find Alternatives Edge Function

### Purpose
When a desired session is full or unavailable, intelligently suggest alternatives.

### Edge Function Location
`supabase/functions/find-alternatives/index.ts`

### Testing Scenarios

#### Scenario 1: Full Session with Perfect Alternative
**Setup:**
1. Mini Soccer Wed 10:00 AM is FULL
2. Mini Soccer Tue 10:00 AM has spots (adjacent day, same time, same coach)

**Test Steps:**
1. POST to `/functions/v1/find-alternatives`:
```json
{
  "requestedSession": {
    "program_id": "[mini-soccer-id]",
    "day_of_week": 3,
    "start_time": "10:00",
    "location_id": "[main-complex-id]"
  },
  "familyId": "[johnson-family-id]",
  "childAge": 3
}
```

**Expected Response:**
```json
{
  "alternatives": [
    {
      "session_id": "[tuesday-session-id]",
      "match_score": 92,
      "reason": "Same time, adjacent day (Tuesday)",
      "differences": ["Day: Tuesday instead of Wednesday"],
      "spots_remaining": 8
    },
    {
      "session_id": "[thursday-session-id]",
      "match_score": 90,
      "reason": "Same time, adjacent day (Thursday)",
      "differences": ["Day: Thursday instead of Wednesday"],
      "spots_remaining": 2,
      "urgency": "Only 2 spots left!"
    }
  ],
  "waitlistAvailable": true
}
```

#### Scenario 2: No Adjacent Days, Suggest Different Time
**Setup:**
1. Mini Soccer Wed 10:00 AM is FULL
2. No adjacent day sessions at 10:00 AM
3. Mini Soccer Wed 4:00 PM has spots (same day, different time)

**Expected Response:**
```json
{
  "alternatives": [
    {
      "session_id": "[wed-4pm-session-id]",
      "match_score": 85,
      "reason": "Same day (Wednesday), afternoon instead of morning",
      "differences": ["Time: 4:00 PM instead of 10:00 AM"],
      "spots_remaining": 5
    }
  ]
}
```

#### Scenario 3: No Good Matches, Suggest Waitlist
**Setup:**
1. All Mini Soccer sessions are full or nearly full
2. No adjacent days available
3. Different locations too far

**Expected Response:**
```json
{
  "alternatives": [],
  "waitlistAvailable": true,
  "waitlistPosition": 3,
  "message": "All Mini Soccer sessions are currently full. We recommend joining the waitlist for Wednesday 10:00 AM - you'll be notified immediately when a spot opens."
}
```

### How to Test in UI

**Steps:**
1. Ask Kai: "I need Mini Soccer on Wednesday at 10 AM"
2. Kai detects it's full
3. Kai automatically calls find-alternatives edge function
4. Kai presents alternatives in conversational format

**Expected Kai Response:**
```
Wednesday 10 AM Mini Soccer is full right now, but I found some great options:

✨ Tuesday 10:00 AM - Same coach, same time, just one day earlier! (8 spots)
🔥 Thursday 10:00 AM - Same coach, same time (only 2 spots left - filling fast!)

Which would work better for you? Or I can add you to the Wednesday waitlist.
```

---

## 8. Test Data Summary

### Families & Children

| Family | Children | Age | Preferences | Test Scenario |
|--------|----------|-----|-------------|---------------|
| Johnson | Emma (5), Liam (8) | 2-3, 7-10 | Wed/Sat, afternoon | Returning customer, high engagement |
| Garcia | Sofia (7) | 4-6 | Mon/Wed/Fri, evening | New customer, exploring |
| Smith | Noah (17) | 15-18 | Sun/Mon/Fri, evening | High school athlete |
| Chen | Olivia (6), Jackson (9) | 2-3, 7-10 | Tue/Thu/Sat, morning/afternoon | Busy schedule, multiple kids |
| Williams | Ava (4), Lucas (10) | 2-3, 7-10 | Wed/Thu, afternoon | Looking for alternatives |

### Programs Available

| Program | Age Range | Sessions | Price |
|---------|-----------|----------|-------|
| Mini Soccer | 2-3 | 15+ sessions | $149 |
| Junior Soccer | 4-6 | 15+ sessions | $169 |
| Premier Soccer | 7-10 | 15+ sessions | $199 |
| High School Soccer | 15-18 | 4 sessions | $450 |
| Youth Basketball | 5-8 | 8 sessions | $350 |
| Teen Basketball | 9-13 | 8 sessions | $400 |
| High School Basketball | 14-18 | 6 sessions | $450 |
| Learn to Swim | 4-8 | 8 sessions | $300 |
| Intermediate Swimming | 8-12 | 6 sessions | $350 |
| Advanced Swimming | 11-16 | 6 sessions | $400 |
| Creative Arts Studio | 6-14 | 6 sessions | $250 |

### Locations with Coordinates

All locations have mock coordinates for distance testing:
- Main Sports Complex: (39.7817, -89.6501)
- North Field Location: (39.7950, -89.6350)
- Oakwood Recreation Center: (39.8100, -89.6100)
- Springfield Community Center: (39.7700, -89.6200)
- Westside Sports Complex: (39.7600, -89.5900)
- East Park Athletic Fields: (39.8000, -89.6800)

### Session Fill Levels

- **Full (12/12)**: Wednesday 10:00 AM Mini Soccer
- **Almost Full (10/12)**: Thursday 10:00 AM Mini Soccer
- **Partially Full (4-9/12)**: Most sessions
- **Mostly Empty (2-3/12)**: Several early sessions

### Coaches

| Coach | Rating | Specialties |
|-------|--------|-------------|
| Coach Mike Johnson | 4.9 | Soccer, Youth Development |
| Coach Sarah | 4.8 | Soccer, Mini Programs |
| Coach Alex | 4.7 | Soccer, Competitive Play |
| Marcus Johnson | 4.9 | Basketball, Youth |
| Lisa Chen | 4.8 | Swimming, Safety |
| David Rodriguez | 4.7 | Basketball, Advanced |
| Sarah Mitchell | 5.0 | Swimming, Instruction |
| Jenny Park | 4.9 | Art, Creativity |

---

## Quick Test Commands

### View All Session Availability
```sql
SELECT
  p.name as program,
  s.day_of_week,
  s.start_time,
  s.enrolled_count,
  s.capacity,
  (s.capacity - s.enrolled_count) as spots_remaining,
  s.status,
  l.name as location
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN locations l ON s.location_id = l.id
ORDER BY p.name, s.day_of_week, s.start_time;
```

### View Session Quality Scores
```sql
SELECT
  p.name as program,
  s.day_of_week,
  s.start_time,
  COUNT(sr.id) as review_count,
  ROUND(AVG(sr.overall_rating)::numeric, 2) as avg_quality,
  ROUND(AVG(sr.coach_rating)::numeric, 2) as avg_coach,
  ROUND(AVG(sr.location_rating)::numeric, 2) as avg_location
FROM sessions s
JOIN programs p ON s.program_id = p.id
LEFT JOIN session_reviews sr ON s.id = sr.session_id
GROUP BY p.name, s.day_of_week, s.start_time
HAVING COUNT(sr.id) > 0
ORDER BY avg_quality DESC;
```

### View Registrations by Family
```sql
SELECT
  f.primary_contact_name,
  c.first_name as child,
  p.name as program,
  s.day_of_week,
  s.start_time,
  r.status,
  r.payment_status
FROM registrations r
JOIN families f ON r.family_id = f.id
JOIN children c ON r.child_id = c.id
JOIN sessions s ON r.session_id = s.id
JOIN programs p ON s.program_id = p.id
ORDER BY f.primary_contact_name, c.first_name;
```

### Simulate Full Session
```sql
-- Fill a specific session to test alternatives
UPDATE sessions
SET enrolled_count = capacity, status = 'full'
WHERE day_of_week = 3 AND start_time = '10:00'
AND program_id IN (SELECT id FROM programs WHERE name = 'Mini Soccer')
LIMIT 1;
```

### Reset Session for Testing
```sql
-- Reset a session to have available spots
UPDATE sessions
SET enrolled_count = 4, status = 'active'
WHERE day_of_week = 3 AND start_time = '10:00'
AND program_id IN (SELECT id FROM programs WHERE name = 'Mini Soccer')
LIMIT 1;
```

---

## Kai Testing Conversation Examples

### Example 1: Basic Registration
```
User: I need to register my daughter for soccer
Kai: I'd love to help! How old is your daughter?
User: She's 3
Kai: Perfect! Mini Soccer is great for 3-year-olds. What days work best for you?
User: Wednesdays or Saturdays
Kai: I found great options:
     - Wednesday 4:00 PM (10 spots left)
     - Saturday 9:00 AM (5 spots left)
     Which would you prefer?
```

### Example 2: Full Session with Alternatives
```
User: I want Wednesday 10 AM Mini Soccer
Kai: Wednesday 10 AM is full, but I have excellent alternatives:
     - Tuesday 10:00 AM (same coach, same time, 8 spots)
     - Thursday 10:00 AM (same coach, same time, 2 spots left!)
     Would either of these work?
User: Tuesday sounds good
Kai: Great! I'll register [Child] for Tuesday 10 AM Mini Soccer...
```

### Example 3: Location-Based Sorting
```
User: Show me soccer classes near me
Kai: Based on your location, here are the closest options:
     🏆 Main Sports Complex (0.5 miles) - Wed 4PM, Sat 9AM
     📍 North Field (2.1 miles) - Tue 10AM, Fri 6PM
     📍 Springfield Center (3.4 miles) - Thu 4PM

     Which location works best for you?
```

---

## Conclusion

This testing guide covers all major features with specific data and scenarios. Each test can be run independently using the provided test data and SQL commands.

**Key Testing Principles:**
1. Always check database state before testing
2. Use provided test families for consistent results
3. Monitor edge function logs for debugging
4. Reset test data between tests if needed
5. Validate both UI and database updates

For questions or additional test scenarios, refer to the project documentation or contact the development team.
