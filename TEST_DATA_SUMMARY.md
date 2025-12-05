# Test Data Summary

## Quick Access

### View Test Data Dashboard
Navigate to: **http://localhost:5173/test-data**

This dashboard shows:
- Real-time session availability
- Enrollment counts and progress bars
- Coach ratings vs Session quality scores
- All test data in an easy-to-read table

---

## What Was Added

### 1. New Database Table: `session_reviews`

**Purpose:** Track session quality ratings (different from coach ratings)

**Columns:**
- `overall_rating` - Overall session experience (1-5)
- `coach_rating` - Coach-specific rating (1-5)
- `location_rating` - Location convenience (1-5)
- `time_slot_rating` - Time preference (1-5)
- `value_rating` - Value for money (1-5)
- `comment` - Written feedback
- `would_recommend` - Boolean recommendation

**Key Insight:** Session quality = Coach + Location + Time + Value combined

---

## 2. Test Families with Mock Coordinates

### Family Locations (for location-based testing)

| Family | Location Coordinates | Address | Distance Preference |
|--------|---------------------|---------|---------------------|
| Johnson | (39.7817, -89.6501) | 123 Maple St | 10 miles max |
| Garcia | (39.7950, -89.6350) | 456 Oak Ave | 5 miles max |
| Smith | (39.8100, -89.6100) | 789 Pine Rd | 15 miles max |
| Chen | (39.7700, -89.6200) | 321 Elm Blvd | 8 miles max |
| Williams | (39.7600, -89.5900) | 654 Birch Ln | 12 miles max |

### Family Preferences (for match scoring testing)

| Family | Preferred Days | Preferred Times | Activity Interests |
|--------|---------------|-----------------|-------------------|
| Johnson | Wed, Sat | Afternoon | Soccer, Basketball |
| Garcia | Mon, Wed, Fri | Evening | Swimming, Art |
| Smith | Sun, Mon, Fri | Evening | Soccer, Basketball |
| Chen | Tue, Thu, Sat | Morning, Afternoon | Swimming, Art, Basketball |
| Williams | Wed, Thu | Afternoon | Soccer, Swimming |

---

## 3. Venue Locations with Coordinates

| Venue | Coordinates | Distance from Main |
|-------|-------------|-------------------|
| Main Sports Complex | (39.7817, -89.6501) | 0 miles (baseline) |
| North Field Location | (39.7950, -89.6350) | ~1.2 miles |
| Oakwood Recreation Center | (39.8100, -89.6100) | ~2.5 miles |
| Springfield Community Center | (39.7700, -89.6200) | ~1.8 miles |
| Westside Sports Complex | (39.7600, -89.5900) | ~3.4 miles |
| East Park Athletic Fields | (39.8000, -89.6800) | ~2.1 miles |

**Testing Location Sorting:**
- Use Johnson family preferences (near Main Complex) → Main should rank first
- Use Williams family preferences (near Westside) → Westside should rank first

---

## 4. Edge Case Sessions for Testing

### Scenario 1: Full Session with Adjacent Alternatives
- **Wednesday 10:00 AM Mini Soccer**: FULL (12/12)
- **Tuesday 10:00 AM Mini Soccer**: Available (4/12) - Adjacent day, same time
- **Thursday 10:00 AM Mini Soccer**: Almost full (10/12) - Adjacent day, urgency
- **Friday 10:00 AM Mini Soccer**: Available (3/12) - 2 days away

**Test:** Ask for Wednesday 10 AM → Should suggest Tuesday, Thursday, or Friday

### Scenario 2: Multiple Fill Levels
- Full sessions: Test waitlist functionality
- Almost full (10/12): Test urgency messaging
- Partially full (4-9/12): Normal recommendations
- Mostly empty (2-3/12): No urgency

---

## 5. Session Reviews for Quality Scoring

We've added 8+ reviews across different sessions:

**Mini Soccer Wednesday 4 PM:**
- 2 reviews, Average: 4.8 overall, 4.8 coach, 4.3 location
- Comments: "Emma loves Coach Mike!", "Great program, location is a bit far"

**Premier Soccer Wednesday 6 PM:**
- 2 reviews, Average: 4.9 overall, 5.0 coach, 4.8 location
- Comments: "Excellent coaching", "Highly competitive program"

**Youth Basketball Sunday 11 AM:**
- 1 review, Average: 4.7 overall, 4.8 coach, 4.5 location
- Comment: "Sofia is having a blast!"

---

## 6. Registrations (Real Enrollment Data)

| Family | Child | Session | Status | Channel |
|--------|-------|---------|--------|---------|
| Johnson | Emma | Mini Soccer Wed 4PM | Confirmed | Web |
| Johnson | Liam | Premier Soccer Wed 6PM | Confirmed | Web |
| Garcia | Sofia | Youth Basketball Sun 11AM | Confirmed | Voice |
| Smith | Noah | Teen Basketball Sun 2PM | Confirmed | Web |
| Chen | Jackson | Junior Soccer Wed 5PM | Confirmed | Web |

**Note:** These registrations populate the `enrolled_count` field and enable real-time availability testing

---

## How to Test Each Feature

### Real-Time Availability
1. Open `/test-data` dashboard
2. Note the enrollment count of a session (e.g., 8/12)
3. In another tab, manually update the database:
   ```sql
   UPDATE sessions SET enrolled_count = 11 WHERE id = '[session-id]';
   ```
4. Dashboard should update within 2 seconds (real-time subscription working)

### Session Quality Scoring
1. Navigate to any session in the UI
2. Look for quality indicators (stars, review count)
3. Compare to coach rating:
   - Coach rating: From `staff.rating` (e.g., Coach Mike = 4.9)
   - Session quality: From avg of `session_reviews.overall_rating` (e.g., Wed 4PM = 4.8)
4. They should be different numbers

### Location-Based Sorting
1. Start a conversation as Johnson family
2. Ask: "Show me soccer classes near me"
3. Expected order:
   - Main Sports Complex (0 miles - same location as family)
   - Springfield Community Center (1.8 miles)
   - North Field Location (1.2 miles)

### Adjacent Day Suggestions
1. Ask Kai: "I want Mini Soccer on Wednesday at 10 AM"
2. Kai detects it's full
3. Kai should respond with:
   - "Wednesday 10 AM is full, but I found great alternatives:"
   - "Tuesday 10:00 AM - Same coach, same time, 8 spots left"
   - "Thursday 10:00 AM - Same coach, same time, 2 spots left!"

### Match Scoring Algorithm
**Background process - not visible to users**
1. Start conversation as Johnson family (prefers Wed/Sat, afternoon)
2. Ask: "Show me soccer classes"
3. Order should prioritize:
   - Wednesday afternoon sessions (day + time match)
   - Saturday afternoon sessions (day + time match)
   - Wednesday morning sessions (day match only)
   - Other days

### Find Alternatives Edge Function
1. Try to register for Wednesday 10 AM Mini Soccer (full)
2. The edge function should automatically:
   - Detect the session is full
   - Calculate match scores for alternatives
   - Return adjacent days first (Tue, Thu)
   - Return same location if possible
   - Return similar times
3. Kai presents these alternatives conversationally

---

## Quick SQL Queries for Testing

### View All Availability
```sql
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  s.start_time,
  s.enrolled_count || '/' || s.capacity as enrollment,
  (s.capacity - s.enrolled_count) as spots_left,
  s.status
FROM sessions s
JOIN programs p ON s.program_id = p.id
ORDER BY p.name, s.day_of_week, s.start_time;
```

### View Session Quality Scores
```sql
SELECT
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  COUNT(sr.id) as reviews,
  ROUND(AVG(sr.overall_rating)::numeric, 2) as quality_score,
  ROUND(AVG(sr.coach_rating)::numeric, 2) as coach_score
FROM sessions s
JOIN programs p ON s.program_id = p.id
LEFT JOIN session_reviews sr ON s.id = sr.session_id
GROUP BY p.name, s.day_of_week, s.start_time
ORDER BY quality_score DESC NULLS LAST;
```

### View Coach Ratings vs Session Quality
```sql
SELECT
  st.name as coach,
  st.rating as coach_rating,
  p.name as program,
  CASE s.day_of_week
    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat'
  END as day,
  s.start_time,
  COUNT(sr.id) as reviews,
  ROUND(AVG(sr.overall_rating)::numeric, 2) as session_quality
FROM sessions s
JOIN programs p ON s.program_id = p.id
JOIN staff st ON s.coach_id = st.id
LEFT JOIN session_reviews sr ON s.id = sr.session_id
GROUP BY st.name, st.rating, p.name, s.day_of_week, s.start_time
HAVING COUNT(sr.id) > 0
ORDER BY st.name, p.name;
```

### Simulate a Session Filling Up
```sql
-- Make Wednesday 10 AM Mini Soccer full
UPDATE sessions
SET enrolled_count = capacity, status = 'full'
WHERE day_of_week = 3
AND start_time = '10:00'
AND program_id IN (SELECT id FROM programs WHERE name = 'Mini Soccer')
LIMIT 1;
```

### Reset for Testing
```sql
-- Reset Wednesday 10 AM to have spots
UPDATE sessions
SET enrolled_count = 4, status = 'active'
WHERE day_of_week = 3
AND start_time = '10:00'
AND program_id IN (SELECT id FROM programs WHERE name = 'Mini Soccer')
LIMIT 1;
```

---

## Key Testing Principles

### 1. Real-Time Updates Work
- Open two browser tabs
- Modify data in one
- See updates in the other within 2 seconds

### 2. Coach Rating ≠ Session Quality
- **Coach Rating:** Individual performance (from staff table)
- **Session Quality:** Overall experience including location, time, value
- A great coach at an inconvenient time/location = lower session quality

### 3. Location Testing Without Geolocation
- Use family preference coordinates (already in database)
- Calculate distances using SQL `ST_Distance`
- No actual browser geolocation needed

### 4. Match Scoring is Background
- Users don't see match scores
- They just see "best matches first"
- Algorithm weighs: day, time, location, quality, availability

### 5. Find Alternatives is Smart
- Prefers adjacent days (±1 day)
- Prefers same time slot
- Prefers same location
- Falls back to broader search if needed

---

## Troubleshooting

### Issue: Dashboard shows "No data"
**Solution:** Run the migration to add test data
```bash
# Check if migration ran
SELECT filename FROM supabase.migrations ORDER BY created_at DESC;
```

### Issue: Enrolled counts don't match
**Solution:** Trigger should auto-update. If not, manually recalculate:
```sql
UPDATE sessions s
SET enrolled_count = (
  SELECT COUNT(*) FROM registrations r
  WHERE r.session_id = s.id
  AND r.status IN ('confirmed', 'pending')
);
```

### Issue: Can't test location sorting
**Solution:** Family addresses have coordinates. Test using:
```sql
-- Johnson family (39.7817, -89.6501)
SELECT
  l.name,
  ST_Distance(
    l.geo_coordinates::geography,
    ST_MakePoint(-89.6501, 39.7817)::geography
  ) / 1609.34 as miles
FROM locations l
ORDER BY miles;
```

---

## Files Created

1. **TESTING_GUIDE.md** - Comprehensive testing scenarios and instructions
2. **TEST_DATA_SUMMARY.md** - This file - quick reference
3. **src/pages/TestDataDashboard.tsx** - Visual dashboard at `/test-data`
4. **Migration:** `add_session_reviews_and_enhanced_test_data.sql`

---

## Next Steps

1. Visit `/test-data` to see all data visually
2. Read TESTING_GUIDE.md for detailed test scenarios
3. Start testing each feature systematically
4. Use SQL queries provided to inspect/modify data
5. Test Kai conversations with different family scenarios

Happy testing!
