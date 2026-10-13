# Masar Tech

## Master Product, UX, Architecture & Implementation Specification

> **Project:** Masar Tech — مسار تك
> **Product Type:** Arabic-first Programming Education Platform
> **Target:** Egyptian secondary-school students
> **Frontend:** React + Vite + TypeScript
> **Styling:** Tailwind CSS
> **Backend:** Supabase
> **Video Provider:** YouTube
> **File Storage:** Supabase Storage
> **Admin:** Separate React application
> **Student Platform:** Separate React application
> **Code Editor:** HTML / CSS / JavaScript
> **Theme:** Light + Dark
> **Design Direction:** Premium Neumorphic / Embossed / Elevated UI

---

# 1. IMPORTANT IMPLEMENTATION RULE

This document is the source of truth for the first production version of Masar Tech.

The implementation must not introduce unnecessary features outside this specification before the core architecture is complete.

Do not replace React + Vite with Next.js.

Do not create a custom backend server unless absolutely required.

Supabase is the primary backend.

The Student Web App and Admin Dashboard must be two separate React applications.

They may share types, utilities, constants, and UI primitives through a shared package if the repository architecture supports it, but they must remain independently deployable applications.

---

# 2. PRODUCT VISION

Masar Tech is a modern Arabic-first programming education platform for Egyptian secondary-school students.

The platform is not simply a video-course website.

It combines:

* Structured programming courses
* Monthly and full-term subscriptions
* Video lessons
* PDF learning resources
* Interactive HTML/CSS/JavaScript coding practice
* Assignments
* Automatic grading
* Lesson unlocking
* Student progress
* Student discussions
* Community / Q&A
* Manual payments
* Student wallet
* Admin content management
* YouTube integration
* Course publishing controls

The platform should feel like a modern technology product, not a traditional school LMS.

---

# 3. APPLICATIONS

There are two independent applications.

## 3.1 Student Web App

Purpose:

* Public website
* Authentication
* Course browsing
* Course purchasing
* Wallet
* Learning
* Lessons
* Video
* PDFs
* Code editor
* Assignments
* Results
* Progress
* Community
* Notifications
* Profile

Example:

```text
masartech.com
```

---

# 3.2 Admin Dashboard

Purpose:

* Dashboard overview
* Course management
* Modules/months
* Lessons
* YouTube videos
* PDFs/resources
* Interactive editors
* Assignments
* Questions
* Students
* Payments
* Wallet transactions
* Subscriptions
* Community moderation
* Live sessions
* Notifications
* Reports
* Settings

Example:

```text
admin.masartech.com
```

The Admin Dashboard must not expose admin functionality through the Student application.

---

# 4. TECHNOLOGY STACK

## Student App

```text
React
Vite
TypeScript
Tailwind CSS
React Router
TanStack Query
Supabase JS
Lucide React
Monaco Editor
```

## Admin App

```text
React
Vite
TypeScript
Tailwind CSS
React Router
TanStack Query
Supabase JS
Lucide React
```

## Backend

```text
Supabase Auth
Supabase PostgreSQL
Supabase Storage
Supabase Realtime
Supabase Edge Functions
Row Level Security
```

## Video

```text
YouTube
YouTube Data API
YouTube OAuth 2.0
```

---

# 5. DESIGN SYSTEM

## 5.1 General Direction

The UI must use a modern premium embossed/neumorphic style.

The interface should visually feel:

* Elevated
* Soft
* Tactile
* Modern
* Clean
* Premium
* Technology-focused

Avoid old-fashioned neumorphism where every element looks like a giant gray bubble.

Use neumorphism selectively for:

* Cards
* Buttons
* Inputs
* Statistics
* Dashboard widgets
* Player containers
* Editor containers

Use flat surfaces where visual hierarchy requires them.

---

# 6. COLOR SYSTEM

The design must support both Light and Dark Mode.

## Light Mode

Primary background:

```text
#EEF1F5
```

Surface:

```text
#F5F7FA
```

Primary brand:

```text
#2563EB
```

Secondary accent:

```text
#7C3AED
```

Success:

```text
#16A34A
```

Warning:

```text
#F59E0B
```

Danger:

```text
#DC2626
```

Primary text:

```text
#111827
```

Secondary text:

```text
#64748B
```

---

## Dark Mode

Background:

```text
#0B1020
```

Surface:

```text
#111827
```

Elevated surface:

```text
#172033
```

Primary:

```text
#3B82F6
```

Secondary:

```text
#8B5CF6
```

Success:

```text
#22C55E
```

Warning:

```text
#F59E0B
```

Danger:

```text
#EF4444
```

Primary text:

```text
#F8FAFC
```

Secondary text:

```text
#94A3B8
```

These values can be adjusted slightly during implementation if required for accessibility and visual consistency.

---

# 7. TYPOGRAPHY

Arabic must be the primary language.

Use a modern Arabic font such as:

```text
Cairo
```

or another highly readable Arabic UI font if project requirements change.

English/code content should use appropriate Latin/code fonts.

Code editor must always use a monospace font.

Recommended:

```text
JetBrains Mono
```

---

# 8. RTL

The platform is Arabic-first.

Default:

```html
dir="rtl"
lang="ar"
```

Code editor must remain LTR.

Code:

```text
LTR
```

Arabic interface:

```text
RTL
```

English technical terms may appear naturally inside Arabic UI.

---

# 9. RESPONSIVE DESIGN

The entire system must support:

```text
Mobile
Tablet
Desktop
Large Desktop
```

Mobile-first implementation is required.

Student experience must be excellent on mobile because a large portion of students may access lessons from phones.

Admin Dashboard must also be responsive, but desktop is the primary productivity environment.

---

# 10. THEME SYSTEM

Users can switch:

```text
Light
Dark
System
```

Persist preference locally.

The theme must not cause layout shifts.

All components must support both themes.

Do not hardcode colors inside individual components.

Use semantic design tokens.

---

# 11. STUDENT AUTHENTICATION

Authentication is handled by Supabase Auth.

Student registration fields:

```text
Full Name
Phone Number
Parent Phone Number
City
Governorate
School
Educational Stage
Grade
Password
```

Authentication identity must not depend on the student's full name.

Use Supabase Auth user ID as the primary identity.

Create a `profiles` table for student information.

---

# 12. STUDENT PROFILE

Profile data:

```text
id
full_name
phone
parent_phone
city
governorate
school
educational_stage
grade
avatar
created_at
updated_at
```

Do not expose parent phone number publicly.

---

# 13. USER ROLES

At minimum:

```text
student
teacher
admin
```

Roles must be enforced through backend authorization/RLS.

Do not rely on React UI checks for security.

The UI may hide unavailable actions, but Supabase policies must independently prevent unauthorized operations.

---

# 14. COURSE STRUCTURE

The hierarchy is:

```text
Course
    ↓
Module / Month
    ↓
Lesson
    ↓
Lesson Content
    ├── Video
    ├── Resources
    ├── Interactive Editor
    ├── Assignment
    └── Discussion
```

Example:

```text
Programming — Second Secondary

Month 1
├── Lesson 1
├── Lesson 2
└── Lesson 3

Month 2
├── Lesson 4
├── Lesson 5
└── Lesson 6
```

Modules can represent months, units, or curriculum sections.

---

# 15. COURSE

Course fields:

```text
id
title
slug
description
image_url
subject
educational_stage
grade
academic_year
status
created_at
updated_at
```

Status:

```text
draft
published
archived
```

---

# 16. COURSE MODULE

Fields:

```text
id
course_id
title
description
order_index
is_published
release_date
created_at
updated_at
```

The Admin can hide/show an entire module.

---

# 17. LESSON

Fields:

```text
id
module_id
title
slug
description
order_index
is_published
is_locked
created_at
updated_at
```

Admin controls whether a lesson is visible.

---

# 18. LESSON CONTENT VISIBILITY

Visibility must be independent for each content type.

Admin can control:

```text
Video visible
PDF visible
Editor visible
Assignment visible
```

Example:

```text
Lesson
├── Video       visible
├── PDF         visible
├── Editor      hidden
└── Assignment  hidden
```

This allows the teacher/admin to publish content progressively.

---

# 19. COURSE PLANS

The platform supports at least two plans.

## Monthly Plan

The student pays for a specific month.

Example:

```text
Month 1 → Paid
Month 2 → Not Paid
Month 3 → Not Paid
```

Only the paid month(s) are accessible.

---

## Full Term Plan

The student pays the complete term amount once.

This gives the student entitlement to the complete course.

However, the content can still remain hidden until the Admin publishes it.

Therefore:

```text
Payment Access
+
Content Publishing Status
=
Actual Availability
```

---

# 20. ACCESS LOGIC

A student can access a lesson only if:

```text
Student owns the required subscription
AND
Module is published
AND
Lesson is published
AND
Lesson prerequisites are completed
```

If the lesson requires an assignment:

```text
Previous assignment must be completed
```

before the next lesson becomes unlocked.

---

# 21. ASSIGNMENT UNLOCK SYSTEM

Default behavior:

```text
Lesson 1
    ↓
Watch / Study
    ↓
Assignment 1
    ↓
Submit
    ↓
Result
    ↓
Lesson 2 unlocked
```

The default rule should be:

> Submission/completion unlocks the next lesson.

Do not permanently block students just because they scored poorly unless the Admin explicitly configures a passing score requirement.

Assignments should support:

```text
is_required
passing_score
max_attempts
```

---

# 22. VIDEO SYSTEM

Initial video provider:

```text
YouTube
```

The system must support two methods.

## Method A — Upload through Platform

Admin chooses:

```text
Upload to YouTube
```

The platform uses:

```text
YouTube OAuth 2.0
YouTube Data API
Supabase Edge Functions
```

Never expose YouTube OAuth secrets in React.

Flow:

```text
Admin Dashboard
        ↓
Edge Function
        ↓
YouTube API
        ↓
YouTube
        ↓
Video ID
        ↓
Supabase
```

---

# 23. METHOD B — EXISTING YOUTUBE VIDEO

Admin can manually provide:

```text
YouTube URL
```

or:

```text
YouTube Video ID
```

Examples:

```text
https://www.youtube.com/watch?v=ABC123
```

or:

```text
ABC123
```

The system extracts/validates the ID.

This is a fallback if YouTube API upload is unavailable.

---

# 24. VIDEO DATABASE ABSTRACTION

Do not hardcode the database around YouTube.

Use:

```text
video_provider
video_id
```

Example:

```text
video_provider = youtube
video_id = ABC123
```

Future:

```text
video_provider = cloudflare_stream
video_id = XYZ789
```

The frontend should use a video-provider abstraction.

This allows migration away from YouTube later without redesigning courses.

---

# 25. YOUTUBE METADATA

Store useful metadata:

```text
youtube_video_id
youtube_channel_id
title
description
thumbnail_url
duration
upload_method
created_at
updated_at
```

Upload method:

```text
api
manual
```

---

# 26. YOUTUBE COMMENTS

YouTube comments are NOT the platform community system.

They are treated as an optional YouTube integration.

The platform may retrieve:

```text
YouTube comments
```

and allow the Admin to reply through YouTube API.

However, the main student discussion/community system lives in Supabase.

---

# 27. YOUTUBE API FAILURE FALLBACK

The Admin must never be blocked from creating a lesson because the YouTube API is temporarily unavailable.

Fallback:

```text
Upload manually on YouTube
        ↓
Copy URL
        ↓
Paste into Admin Dashboard
        ↓
Validate
        ↓
Attach to lesson
```

This is a mandatory fallback.

---

# 28. PDF AND FILE STORAGE

Use:

```text
Supabase Storage
```

Do NOT use Google Drive for the primary system.

Storage structure:

```text
course-resources/
    course-id/
        module-id/
            lesson-id/
                resource.pdf
```

Other storage:

```text
assignment-files/
student-submissions/
avatars/
```

---

# 29. RESOURCE MODEL

Resources should be independent entities.

Fields:

```text
id
lesson_id
title
file_path
file_type
file_size
is_visible
created_at
updated_at
```

Admin can:

```text
Upload
Rename
Hide
Show
Delete
Replace
```

---

# 30. INTERACTIVE CODE EDITOR

Some lessons include practical coding.

The editor is optional per lesson.

Supported languages initially:

```text
HTML
CSS
JavaScript
```

Use Monaco Editor or an equivalent professional code editor.

---

# 31. EDITOR CONFIGURATION

Each editor block can have:

```text
id
lesson_id
language
starter_code
instructions
is_visible
allow_edit
allow_run
save_student_code
order_index
```

The Admin can:

```text
Show / Hide
Change starter code
Change instructions
Enable / Disable Run
Enable / Disable saving
```

---

# 32. HTML/CSS/JS EDITOR EXPERIENCE

For practical web lessons, the ideal experience is:

```text
HTML
CSS
JavaScript
        ↓
Run
        ↓
Preview
```

The student should be able to see the result on the same page.

Example:

```text
┌───────────────┬───────────────┐
│ Code          │ Preview       │
│               │               │
│ HTML          │               │
│ CSS           │   Website     │
│ JS            │   Preview     │
│               │               │
│ [Run]         │               │
└───────────────┴───────────────┘
```

On mobile, stack:

```text
Code
↓
Run
↓
Preview
```

---

# 33. CODE EXECUTION SECURITY

Never execute arbitrary student code directly on the application server or inside privileged Supabase infrastructure.

HTML/CSS/JS preview must be sandboxed.

Use appropriate browser sandboxing for frontend preview.

If server-side execution is required later, use an isolated sandbox execution service.

Do not allow arbitrary server-side code execution.

---

# 34. STUDENT CODE PERSISTENCE

If enabled, save each student's code separately.

Model:

```text
student_lesson_code
```

Fields:

```text
id
student_id
lesson_id
editor_block_id
html_code
css_code
js_code
updated_at
```

When the student returns to the lesson, restore their latest saved version.

---

# 35. ASSIGNMENTS

Assignment belongs to a lesson.

Fields:

```text
id
lesson_id
title
description
passing_score
max_attempts
is_required
is_published
created_at
updated_at
```

---

# 36. QUESTION TYPES

Initial system should support:

```text
multiple_choice
true_false
code_output
```

Architecture should allow additional types later.

---

# 37. QUESTIONS

Fields:

```text
id
assignment_id
question_text
question_type
points
order_index
explanation
```

Options:

```text
question_options
```

Fields:

```text
id
question_id
option_text
is_correct
order_index
```

Correct answers must not be exposed to the client before submission.

---

# 38. ASSIGNMENT ATTEMPTS

Fields:

```text
id
assignment_id
student_id
attempt_number
score
total_points
percentage
passed
submitted_at
```

Answers:

```text
assignment_answers
```

Fields:

```text
id
attempt_id
question_id
selected_option_id
answer_text
is_correct
points_awarded
```

---

# 39. INSTANT RESULTS

After submission:

```text
Score
Correct answers
Wrong answers
Percentage
Explanations
```

Example:

```text
8 / 10

Correct: 8
Wrong: 2

Question 1 ✓
Question 2 ✗
Question 3 ✓
```

The result must be generated server-side where required so correct answers cannot be manipulated from the client.

---

# 40. LESSON PROGRESS

Track:

```text
student_id
lesson_id
video_progress
last_position
video_completed
assignment_completed
lesson_completed
completed_at
updated_at
```

This allows students to resume lessons.

---

# 41. COMMUNITY

Do not use YouTube comments as the main student community.

Create a Supabase-powered community.

Features:

```text
Posts
Questions
Replies
Teacher Answers
Upvotes
Tags
Reports
Moderation
```

Example:

```text
Student:
مش فاهم الفرق بين while و for

Student 2:
...

Teacher:
...
```

---

# 42. LESSON DISCUSSION

A lesson can optionally have discussion attached to it.

Fields:

```text
id
lesson_id
user_id
content
parent_id
is_teacher_answer
is_hidden
created_at
updated_at
```

`parent_id` supports replies.

---

# 43. GENERAL COMMUNITY

Separate from lesson discussion.

Sections may include:

```text
All Questions
Programming
Course Questions
Homework Help
Announcements
```

Future support:

```text
Upvotes
Accepted Answer
Search
Tags
Mentions
Notifications
```

---

# 44. PAYMENT SYSTEM

Initial payment system is manual.

Supported methods may include:

```text
Vodafone Cash
Orange Cash
e& money
InstaPay
```

The exact payment methods must be configurable from Admin Settings.

---

# 45. PAYMENT FLOW

Student:

```text
Choose Course
    ↓
Choose Plan
    ↓
Choose Payment Method
    ↓
See transfer instructions
    ↓
Transfer money
    ↓
Enter transaction reference
    ↓
Upload screenshot
    ↓
Submit
```

Status:

```text
pending
```

Admin reviews:

```text
Screenshot
Transaction reference
Amount
Student
Payment method
```

Then:

```text
Approve
or
Reject
```

---

# 46. WALLET SYSTEM

Do NOT rely only on:

```text
users.balance
```

Use a transaction ledger.

Table:

```text
wallet_transactions
```

Types:

```text
deposit
course_purchase
refund
adjustment
```

Example:

```text
Deposit +500
Course Purchase -300
Balance = 200
```

---

# 47. PAYMENT STATUS

Payment:

```text
pending
approved
rejected
cancelled
```

Wallet transaction:

```text
pending
completed
failed
reversed
```

Subscription/access status must remain separate.

Do not mix payment status, wallet status, and subscription status.

---

# 48. COURSE PURCHASE

Example:

```text
Wallet Balance: 700 EGP
Course Price: 500 EGP
```

After purchase:

```text
Wallet Balance: 200 EGP
Course Access: Active
```

Create:

```text
wallet_transactions
type = course_purchase
amount = -500
```

and create/update the appropriate subscription entitlement.

---

# 49. SUBSCRIPTIONS

Do not model subscription as simply "course purchased".

Use:

```text
subscription_plans
subscriptions
```

Plan fields:

```text
id
course_id
name
type
price
duration
module_scope
is_active
```

Types:

```text
monthly
full_term
```

---

# 50. MONTHLY ENTITLEMENT

For monthly plans:

```text
student
+
paid month
=
access to that month's content
```

Example:

```text
Month 1 → active
Month 2 → locked
Month 3 → locked
```

When Month 2 is purchased:

```text
Month 1 → active
Month 2 → active
Month 3 → locked
```

---

# 51. FULL TERM ENTITLEMENT

Full term purchase:

```text
Month 1 → entitled
Month 2 → entitled
Month 3 → entitled
Month 4 → entitled
```

But publication remains controlled by Admin.

Therefore a student can have entitlement while content is still unpublished.

---

# 52. CONTENT ACCESS FORMULA

Actual lesson availability:

```text
Has Subscription Entitlement
AND
Content Is Published
AND
Prerequisites Are Completed
```

This is a core business rule.

---

# 53. ADMIN COURSE MANAGEMENT

Admin should be able to:

```text
Create Course
Edit Course
Delete/Archive Course
Publish Course
Hide Course
Upload Image
Manage Modules
Manage Lessons
Manage Videos
Manage PDFs
Manage Editors
Manage Assignments
Manage Questions
Manage Publishing
```

---

# 54. COURSE ADMIN SCREEN

Recommended layout:

```text
Course Header
├── Image
├── Title
├── Description
├── Status
└── Actions

Course Content
├── Month 1
│   ├── Lesson 1
│   ├── Lesson 2
│   └── Lesson 3
│
├── Month 2
│   ├── Lesson 4
│   └── Lesson 5
```

Use drag-and-drop ordering where practical.

---

# 55. LESSON ADMIN SCREEN

Tabs/sections:

```text
Basic Info
Video
Resources
Interactive Editor
Assignment
Publishing
```

---

# 56. DASHBOARD OVERVIEW

Admin dashboard should show:

```text
Total Students
Active Students
Total Courses
Published Lessons
Pending Payments
Revenue
Wallet Deposits
Recent Activity
```

Use premium elevated cards.

---

# 57. STUDENT ADMIN

Admin can view:

```text
Student
Phone
School
Governorate
Courses
Subscription
Balance
Progress
Payment history
```

Admin must not expose sensitive student information unnecessarily.

---

# 58. PAYMENT ADMIN

Page:

```text
Payments
```

Filters:

```text
Pending
Approved
Rejected
Date
Payment method
Course
Student
```

Payment details:

```text
Student
Amount
Method
Reference
Screenshot
Created at
Status
Admin note
```

Actions:

```text
Approve
Reject
```

---

# 59. FILE SECURITY

Use Supabase Storage policies.

Private resources should not be publicly accessible if they belong to paid courses.

Use authenticated access / signed URLs where appropriate.

Do not put private files in public buckets simply because the frontend needs them.

---

# 60. RLS

RLS is mandatory.

Examples:

Student can:

```text
Read own profile
Update own profile
Read courses
Read published content they are entitled to
Read own progress
Write own progress
Create own payment request
Read own payments
Read own wallet transactions
Create own assignment attempts
Read own results
Create community posts
Reply to permitted posts
```

Student cannot:

```text
Read another student's private data
Modify balance
Approve payment
Modify course
Modify assignments
Read correct answers before submission
Access admin tables
```

Admin/Teacher permissions must be role-based.

---

# 61. EDGE FUNCTIONS

Use Supabase Edge Functions for secure server-side operations such as:

```text
YouTube OAuth
YouTube upload
YouTube metadata
YouTube comments
YouTube replies
Sensitive payment approval logic
Future webhooks
```

Never expose secrets in Vite environment variables that are bundled into the browser.

Public frontend environment variables must contain only safe client-side values.

---

# 62. YOUTUBE OAUTH

Admin can connect the platform to the YouTube channel.

Flow:

```text
Admin Dashboard
    ↓
Connect YouTube
    ↓
Google OAuth
    ↓
Grant Permissions
    ↓
OAuth callback
    ↓
Secure token handling
```

Store credentials securely.

Never expose refresh tokens to the frontend.

---

# 63. API FALLBACK DESIGN

Every YouTube-dependent workflow must have a manual fallback.

Example:

```text
Upload via API
       OR
Attach Existing Video
```

The course system must continue functioning if YouTube API is unavailable.

---

# 64. STUDENT LESSON PAGE

Recommended structure:

```text
Breadcrumb

Lesson Header

Video Player

Lesson Description

Resources
├── PDF
└── Other Files

Interactive Practice
└── HTML/CSS/JS Editor

Assignment

Lesson Progress

Discussion

Previous Lesson / Next Lesson
```

The order can be configured later.

---

# 65. VIDEO PLAYER

YouTube embedded player.

Do not attempt to recreate YouTube's proprietary player.

Provide surrounding platform controls where appropriate:

```text
Lesson title
Progress
Completion state
Resources
Assignment
```

---

# 66. LOCKED LESSON UI

Locked lesson should clearly explain why.

Examples:

```text
🔒 متاح بعد إتمام الواجب السابق
```

or:

```text
🔒 متاح بعد الاشتراك في الشهر الثاني
```

or:

```text
🔒 سيتم نشر هذه المحاضرة قريبًا
```

Do not simply hide locked content without explanation.

---

# 67. STUDENT DASHBOARD

Show:

```text
Welcome
Continue Learning
Current Courses
Overall Progress
Upcoming Content
Recent Activity
Latest Results
Community Questions
Wallet Balance
Subscription Status
```

---

# 68. PROGRESS

Course progress:

```text
Completed Lessons / Total Lessons
```

Also track:

```text
Video completion
Assignments completed
Quiz/assignment scores
Module progress
```

---

# 69. NOTIFICATIONS

Architecture should support notifications.

Examples:

```text
New lesson published
New assignment
Assignment result
Payment approved
Payment rejected
Course purchased
Teacher replied
Community reply
New live session
```

Implement the database structure early even if some notification types are added later.

---

# 70. LIVE SESSIONS

The platform should support weekly live Q&A sessions.

The platform manages:

```text
Title
Description
Date
Time
Join URL
Status
Recording URL
Questions
Attendance
```

The actual live video can initially use:

```text
Zoom
Google Meet
```

Do not build custom video conferencing in version one.

---

# 71. ADMIN SETTINGS

Admin settings should eventually control:

```text
Platform name
Logo
Theme
Payment methods
Payment account instructions
Course settings
YouTube connection
Notification settings
```

---

# 72. PUBLIC WEBSITE

Landing page should include:

```text
Hero
Why Masar Tech
How It Works
Featured Courses
Learning Experience
Interactive Coding
Assignments
Progress
Live Sessions
Pricing
FAQ
Testimonials
CTA
Footer
```

The design should feel like a modern technology company.

Avoid generic education-template aesthetics.

---

# 73. STUDENT NAVIGATION

Suggested navigation:

```text
الرئيسية
كورساتي
المجتمع
المحاضرات
التقدم
المدفوعات
الإشعارات
حسابي
```

---

# 74. ADMIN NAVIGATION

Suggested:

```text
Overview
Students
Courses
Assignments
Question Bank
Payments
Subscriptions
Wallet
Community
Live Sessions
Notifications
Reports
Settings
```

---

# 75. COMPONENT DESIGN

Build reusable components.

Examples:

```text
Button
Input
Select
Textarea
Modal
Drawer
Card
Badge
Tabs
Dropdown
Toast
Table
Pagination
EmptyState
LoadingState
ErrorState
ConfirmDialog
FileUploader
VideoUploader
ResourceUploader
CodeEditor
AssignmentBuilder
QuestionBuilder
CourseCard
LessonCard
ProgressBar
StatCard
```

Do not duplicate UI patterns unnecessarily.

---

# 76. STATE MANAGEMENT

Prefer:

```text
TanStack Query
```

for server state.

Use React state for local UI state.

Do not put all server data into global Redux-like state unless there is a clear requirement.

---

# 77. DATA FETCHING

All protected data must be fetched with authenticated Supabase sessions.

Handle:

```text
loading
success
empty
error
unauthorized
forbidden
```

properly.

---

# 78. ERROR HANDLING

Never show raw database errors to students.

Use friendly Arabic messages.

Example:

```text
حدث خطأ غير متوقع.
حاول مرة أخرى.
```

Admin can see useful technical details where appropriate.

---

# 79. EMPTY STATES

Every list needs a proper empty state.

Examples:

```text
لا توجد محاضرات بعد.
```

```text
لا توجد مدفوعات معلقة.
```

```text
لا توجد أسئلة حتى الآن.
```

---

# 80. LOADING STATES

Use skeletons where appropriate.

Avoid unnecessary full-page loaders.

Buttons must show processing states:

```text
جاري الحفظ...
جاري الرفع...
جاري الإرسال...
```

---

# 81. SECURITY PRINCIPLES

Never trust frontend validation.

Validate on backend/database level.

Never expose:

```text
OAuth secrets
Service role keys
Private API keys
Refresh tokens
```

Never put Supabase service role key inside Vite client environment variables.

RLS is mandatory.

---

# 82. PAYMENT SECURITY

Admin approval should be protected.

Approval should perform a transaction-safe operation:

```text
Payment Approved
        ↓
Wallet transaction created
        ↓
Student balance updated/derived
        ↓
Subscription entitlement created
```

Avoid double-crediting if Admin accidentally clicks Approve twice.

Approval must be idempotent.

---

# 83. WALLET DESIGN

Prefer calculating balance from ledger or maintaining a cached balance with transactional protection.

Never allow students to directly update their own balance.

---

# 84. COURSE ACCESS SECURITY

Do not rely on:

```text
isLocked
```

in React.

The backend must verify entitlement.

A student should not be able to manually modify requests and read locked lesson resources.

---

# 85. VIDEO ACCESS

YouTube videos are inherently harder to protect than a dedicated private video platform.

In the first version, use the platform's course-access logic and unlisted YouTube videos where appropriate.

Do not claim complete video protection.

Future migration can use:

```text
Cloudflare Stream
Mux
Bunny Stream
```

without changing the lesson architecture because of the `video_provider` abstraction.

---

# 86. FUTURE VIDEO MIGRATION

Current:

```text
video_provider = youtube
```

Future:

```text
video_provider = cloudflare_stream
```

The Student lesson component should render:

```text
<VideoPlayer provider={lesson.video_provider} />
```

rather than hardcoding YouTube throughout the application.

---

# 87. DATABASE INITIAL STRUCTURE

Initial core tables:

```text
profiles

courses
course_modules
lessons

lesson_resources
lesson_editor_blocks

assignments
questions
question_options
assignment_attempts
assignment_answers

lesson_progress
student_lesson_code

subscription_plans
subscriptions

payments
wallet_transactions

community_posts
community_replies

lesson_discussions

youtube_connections
youtube_videos

notifications

live_sessions
```

Additional tables can be introduced only when justified.

---

# 88. DATABASE RELATIONSHIPS

Main:

```text
courses
  ↓
course_modules
  ↓
lessons
```

Lesson:

```text
lessons
 ├── lesson_resources
 ├── lesson_editor_blocks
 ├── assignments
 ├── lesson_progress
 └── lesson_discussions
```

Assignment:

```text
assignments
 ├── questions
 │    └── question_options
 └── assignment_attempts
       └── assignment_answers
```

Subscriptions:

```text
courses
 ↓
subscription_plans
 ↓
subscriptions
```

Payments:

```text
payments
 ↓
wallet_transactions
```

---

# 89. IMPORTANT: DO NOT OVERENGINEER

The first implementation must be production-ready but not unnecessarily complex.

Do not add:

```text
Microservices
Custom backend server
Custom video streaming
Custom authentication
Custom payment gateway
Complex event infrastructure
```

unless a real requirement appears.

Supabase should handle the majority of backend requirements.

---

# 90. DEVELOPMENT ORDER

Implement in this order.

## Phase 1 — Foundation

```text
Project setup
Theme
RTL
Routing
Supabase connection
Auth
Roles
Shared UI
```

## Phase 2 — Admin Courses

```text
Courses
Modules
Lessons
Publishing
Resources
```

## Phase 3 — YouTube

```text
OAuth
Upload
Existing Video ID/URL
Video metadata
Fallback
```

## Phase 4 — Student Learning

```text
Course
Modules
Lessons
Video
PDF
Progress
```

## Phase 5 — Editor

```text
HTML
CSS
JS
Preview
Persistence
```

## Phase 6 — Assignments

```text
Question builder
Questions
Submission
Automatic grading
Results
Unlocking
```

## Phase 7 — Payments

```text
Payment submission
Screenshot
Admin review
Wallet ledger
Course purchase
Subscriptions
```

## Phase 8 — Community

```text
Posts
Replies
Teacher answers
Moderation
```

## Phase 9 — Live Sessions

```text
Scheduling
Questions
Join links
Recording
```

## Phase 10 — Analytics / Notifications / Polish

```text
Progress analytics
Notifications
Reports
UX polish
Performance
Security audit
```

---

# 91. ADMIN + STUDENT DEVELOPMENT IN ONE SESSION

The two projects may be opened in the same Cursor session/workspace.

Cursor should understand that:

```text
/student-app
/admin-app
```

are separate applications sharing the same Supabase backend.

If useful:

```text
/packages/shared
```

can contain:

```text
types
constants
validation schemas
shared API helpers
design tokens
```

Do not duplicate database types manually between projects.

Generate/use a shared source of truth for Supabase types.

---

# 92. ENVIRONMENT VARIABLES

Student:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Admin:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Never put:

```text
SUPABASE_SERVICE_ROLE_KEY
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
```

in frontend environment variables.

Those belong only in secure Edge Function/server environments.

---

# 93. DEPLOYMENT

Student:

```text
Vercel
```

Admin:

```text
Vercel
```

Both independently deployable.

Supabase:

```text
Production project
```

Use separate development/staging configuration when the project becomes mature.

---

# 94. PERFORMANCE

Student application must optimize:

```text
Code splitting
Lazy routes
Image optimization
Query caching
Pagination
Virtualized long lists where necessary
Debounced search
Minimal bundle size
```

Admin dashboard:

```text
Pagination
Server-side filtering
Debounced search
Lazy-loaded pages
```

Do not fetch entire tables unnecessarily.

---

# 95. ACCESSIBILITY

Support:

```text
Keyboard navigation
Focus states
ARIA where needed
Readable contrast
Reduced motion
Accessible forms
Clear error messages
```

Do not sacrifice accessibility for the neumorphic visual style.

---

# 96. ANIMATION

Animations should be subtle and purposeful.

Use:

```text
Framer Motion
```

only where useful.

Examples:

```text
Page transitions
Card hover
Modal entrance
Progress animation
Success state
Unlock animation
```

Avoid excessive animation inside the Admin Dashboard.

---

# 97. STUDENT EXPERIENCE PRINCIPLE

The student should always know:

```text
Where am I?
What am I learning?
What have I completed?
What is locked?
Why is it locked?
What do I need to do next?
```

The platform should guide the student rather than forcing them to navigate manually.

---

# 98. ADMIN EXPERIENCE PRINCIPLE

The Admin should be able to create a complete lesson quickly:

```text
Create Lesson
↓
Add Video
↓
Add PDF
↓
Enable Editor if needed
↓
Create Assignment
↓
Publish
```

Do not create unnecessarily fragmented workflows.

---

# 99. LESSON CREATION TARGET

The ideal workflow:

```text
Course
 ↓
Module
 ↓
Add Lesson
 ↓
Basic Information
 ↓
Video
 ↓
Resources
 ↓
Editor (optional)
 ↓
Assignment (optional)
 ↓
Publishing
 ↓
Save
```

---

# 100. FINAL CORE PRODUCT FLOW

```text
                    MASAR TECH
                         │
          ┌──────────────┴──────────────┐
          │                             │
       STUDENT                         ADMIN
          │                             │
       Register                      Dashboard
          │                             │
       Login                         Courses
          │                             │
       Courses                       Modules
          │                             │
       Purchase                       Lessons
          │                             │
       Payment                        Video
          │                             │
       Pending                         PDF
          │                             │
       Approval                       Editor
          │                             │
       Wallet                       Assignment
          │                             │
       Course                         Publish
          │                             │
       Lesson                           │
          │                             │
   ┌──────┼──────────┐                  │
   │      │          │                  │
 Video   PDF       Editor               │
   │      │          │                  │
   └──────┼──────────┘                  │
          │                             │
      Assignment ◄──────────────────────┘
          │
        Result
          │
     Lesson Complete
          │
    Next Lesson Unlock
          │
      Community
          │
      Progress
```

---

# 101. NON-NEGOTIABLE BUSINESS RULES

1. Students cannot access content they have not purchased/been entitled to.
2. Full-term subscriptions grant entitlement to the complete course, but unpublished content remains hidden.
3. Monthly subscriptions grant access only to the paid month(s).
4. Admin can publish/hide modules and individual lessons.
5. Admin can independently show/hide lesson video, resources, editor, and assignment.
6. A required assignment can control the next lesson's unlocking.
7. Assignment results appear immediately after submission.
8. Correct answers must not be exposed before submission.
9. Student balances cannot be modified from the client.
10. Payment approval must be idempotent.
11. YouTube API must never be required for the platform to attach an existing YouTube video.
12. YouTube credentials must never be exposed to the browser.
13. Community discussions belong to Supabase, not YouTube.
14. The video provider must be abstracted so YouTube can later be replaced.
15. Supabase RLS is mandatory for protected data.
16. Admin and Student applications remain separate.
17. PDFs and course resources use Supabase Storage.
18. HTML/CSS/JS execution must be sandboxed.
19. The frontend must never be considered the security layer.
20. Light and Dark themes must both be first-class experiences.

---

# 102. IMPLEMENTATION EXPECTATION FOR CURSOR

Before writing large amounts of code:

1. Inspect the existing repository structure.
2. Confirm whether the Student App and Admin App already exist.
3. Do not delete working code without understanding it.
4. Create a clear implementation plan.
5. Create the Supabase schema and RLS policies before building dependent screens.
6. Build shared types from the database schema.
7. Implement core flows end-to-end.
8. Keep the code modular.
9. Avoid placeholder logic for critical business rules.
10. Test authentication, RLS, subscriptions, payments, lesson unlocking, assignments, and file access.

Do not merely create visually impressive pages with fake data.

The system must be connected to real Supabase data.

---

# 103. FIRST IMPLEMENTATION TARGET

The first fully working end-to-end flow must be:

```text
Admin Login
    ↓
Create Course
    ↓
Create Module
    ↓
Create Lesson
    ↓
Attach YouTube Video
    ↓
Upload PDF
    ↓
Enable HTML/CSS/JS Editor
    ↓
Create Assignment
    ↓
Publish Lesson
    ↓
Student Registration
    ↓
Student sees Course
    ↓
Student purchases through manual payment
    ↓
Admin approves payment
    ↓
Student receives access
    ↓
Student opens Lesson
    ↓
Watches Video
    ↓
Opens PDF
    ↓
Uses Editor
    ↓
Solves Assignment
    ↓
Receives instant result
    ↓
Lesson marked completed
    ↓
Next Lesson unlocked
```

This flow must work with real database data before moving to secondary features.

---

# 104. PRODUCT QUALITY BAR

Masar Tech must look and behave like a real premium product.

Do not use:

```text
Generic dashboard templates
Random colors
Huge unnecessary shadows
Inconsistent cards
Placeholder lorem ipsum
Fake statistics in production
Poor Arabic typography
Broken mobile layouts
Unclear locked states
Unprotected database operations
```

The visual language must be consistent across both applications.

Student:

```text
Modern
Interactive
Energetic
Premium
```

Admin:

```text
Professional
Dense but clean
Fast
Productivity-focused
```

Both share the same Masar Tech brand.

---

# 105. BRAND

Arabic name:

```text
مسار تك
```

English:

```text
Masar Tech
```

Brand concept:

> مسار واضح لتعلّم البرمجة وبناء المهارات خطوة بخطوة.

The brand should communicate:

```text
Learning
Progress
Technology
Path
Growth
```

Avoid childish school branding.

The product should feel suitable for teenagers while still feeling professional enough for parents.

---

# 106. FUTURE-READY ARCHITECTURE

The architecture should allow future additions without redesigning the core:

```text
More subjects
More grades
More teachers
More courses
Certificates
Exams
Question bank
Advanced analytics
Automated payments
Cloudflare Stream
Mobile application
Teacher accounts
Parent accounts
Gamification
Achievements
```

Do not implement all future features now.

Only ensure the current architecture does not prevent them.

---

# 107. FINAL PRINCIPLE

Build Masar Tech as a real product, not a demo.

Prioritize:

```text
Correct architecture
Security
Real Supabase integration
Clean UX
Arabic RTL
Responsive design
Maintainability
Clear business rules
```

over:

```text
Unnecessary animations
Unnecessary libraries
Overengineering
Fake functionality
```

The first release must provide a complete working learning loop:

```text
Learn
→ Practice
→ Solve
→ Get Result
→ Complete
→ Unlock
→ Continue
```

That loop is the heart of Masar Tech.
