# Exam Blueprint

# Project Name

AI Mock Test Generator

## Overview

Build a production-quality web application that converts uploaded MCQ PDFs into a Computer Based Test (CBT) similar to SSC CGL, Banking, Railway, UPSC, CAT and other competitive exams.

This project must be built with scalability, clean architecture and future AI integration in mind.

IMPORTANT:

Do NOT build everything at once.

For this first version, focus only on the application foundation, layout, routing, state management, PDF upload, and exam configuration.

The actual AI extraction and exam engine will be added later.

------------------------------------------------

## Tech Stack

Use:

- Next.js (App Router)

- React

- TypeScript

- TailwindCSS

- shadcn/ui

- Zustand for state management

- pdf.js

- React Hook Form

- Zod

- Lucide Icons

Do NOT use Redux.

Do NOT use Bootstrap.

Do NOT use plain CSS.

Everything should be responsive.

------------------------------------------------

## Design Requirements

Create a modern professional dashboard.

Think of Testbook + Oliveboard + SSC CBT.

Minimal.

Clean.

Professional.

Rounded cards.

Good spacing.

Dark Mode.

Light Mode.

Responsive.

Animations should be subtle.

------------------------------------------------

## Application Structure

Create these pages.

Home

Upload

Configure Exam

Mock Test

Results

Review

Settings

Each page should already exist with routing.

Only Upload and Configure should be functional for now.

------------------------------------------------

## Navigation

Responsive Navbar

Logo

Home

Upload

Settings

Theme Toggle

------------------------------------------------

## Home Page

Beautiful landing page.

Explain what the application does.

Large Upload button.

Feature cards.

Supported Exams

SSC

UPSC

Railway

Banking

CAT

NEET

JEE

Professional hero section.

------------------------------------------------

## Upload Page

Allow

PDF Upload

Drag and Drop

Browse Files

Display

Filename

Size

Pages

Loading State

Progress Bar

Validation

Accept only PDF.

Maximum size

100 MB

If invalid

Show friendly error.

------------------------------------------------

## PDF Processing

After upload

Read the PDF.

Extract basic metadata only.

Number of pages

Title if available

Do NOT call AI yet.

Store extracted information in Zustand.

------------------------------------------------

## Exam Configuration Page

This page is extremely important.

The user should configure the exam BEFORE starting.

Allow editing

Exam Name

Total Marks

Marks Per Question

Negative Marking

Enable Negative Marking

Enable Section Timers

Shuffle Questions

Shuffle Options

Allow Review Mode

Enable Fullscreen

Warn Before Exit

------------------------------------------------

## Section Configuration

Allow creating unlimited sections.

Example

Reasoning

English

General Awareness

Quant

Each section must have

Section Name

Number of Questions

Timer

Example

Reasoning

25 Questions

20 Minutes

English

25 Questions

15 Minutes

General Awareness

25 Questions

10 Minutes

Quant

25 Questions

35 Minutes

The user can

Add

Delete

Rename

Reorder

Sections

The total duration should automatically update.

------------------------------------------------

## Future AI Integration

Do NOT implement AI.

Instead

Create interfaces

AIService

PDFParser

ExamParser

QuestionExtractor

QuestionValidator

These should be empty placeholder services.

The application architecture must be ready for future AI integration.

------------------------------------------------

## State Management

Create Zustand stores

Exam Store

PDF Store

Settings Store

Theme Store

------------------------------------------------

## File Structure

Organize professionally.

components/

features/

hooks/

lib/

services/

types/

store/

utils/

------------------------------------------------

## Types

Create reusable TypeScript interfaces.

Question

Section

Exam

Result

Answer

Configuration

Timer

PDFMetadata

------------------------------------------------

## Error Handling

Proper loading states.

Error boundaries.

Toast notifications.

Graceful failures.

------------------------------------------------

## Accessibility

Keyboard navigation.

ARIA labels.

Good focus states.

------------------------------------------------

## Performance

Lazy loading.

Code splitting.

Memoization where useful.

------------------------------------------------

## Important

This first version should ONLY build the application foundation.

Do NOT implement AI.

Do NOT implement CBT.

Do NOT implement timers.

Do NOT implement scoring.

Focus on creating an excellent architecture that future prompts can extend.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aac13805-d720-44aa-9d22-ac394ccf8f4f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
