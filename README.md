This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Photo Sharing Platform

A full-stack photo-sharing platform built for the TRIZEN AI Full Stack Internship Challenge. It allows an Admin/Lead to create events, manage team members, review uploaded event photos, select photos, and publish a customer-facing gallery protected by a PIN. Team Members can access assigned events and upload photos. Customers can access a published gallery through a shareable link and PIN without creating an account.

1. Project Overview

User roles

Admin / Lead

Register and log in.

Create photography events.

Create team member accounts.

Assign team members to events.

View photos uploaded by the event team.

Select or deselect photos for the customer gallery.

Create a gallery and set a 4–8 digit PIN.

Publish or unpublish a gallery.

Provide the gallery link and PIN to the customer.

Team Member

Log in.

View assigned events.

Upload multiple JPG, PNG, or WebP photos.

View their own uploaded photos.

Cannot publish galleries or manage other users' photos.

Customer

No account required.

Opens the gallery link.

Enters the gallery PIN.

Views photos selected and published by the Admin.

2. Technology Stack

Layer

Technology

Frontend

Next.js 16, React, TypeScript

Styling

Tailwind CSS

Backend/API

Next.js App Router Route Handlers

ORM

Prisma 7

Database

PostgreSQL (Neon)

Object Storage

Amazon S3

Authentication

Server-side PostgreSQL sessions + HTTP-only cookies

Password Security

bcryptjs

Gallery Access

bcrypt PIN verification + signed access token

Testing

Vitest

Deployment

Vercel

The application uses a single Next.js repository containing both the frontend and backend API routes.

3. Architecture

                         ┌──────────────────────┐
                         │      Customer        │
                         │   Gallery Link + PIN │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Next.js App      │
                         │  Customer Gallery    │
                         └──────────┬───────────┘
                                    │
                          PIN verification
                                    │
                                    ▼
┌──────────────┐          ┌──────────────────────┐
│    Admin     │─────────►│     Next.js API      │
└──────────────┘          │ Authentication/RBAC  │
                          │ Events / Gallery API │
┌──────────────┐          │ Photo APIs           │
│ Team Member  │─────────►│                      │
└──────────────┘          └───────┬───────┬──────┘
                                  │       │
                                  ▼       ▼
                         ┌────────────┐ ┌──────────────┐
                         │ PostgreSQL │ │   Amazon S3  │
                         │   Neon     │ │ Photo Files  │
                         └────────────┘ └──────────────┘

Request flow

Users authenticate through the Next.js API.

Authentication creates a server-side session stored in PostgreSQL.

The HTTP-only session cookie identifies the authenticated user.

API routes enforce Admin or Team Member authorization.

Team Member photo uploads are stored in Amazon S3.

PostgreSQL stores photo metadata and the S3 object location, not the image binary.

Admin selects photos for a gallery.

Gallery creation stores a bcrypt hash of the PIN.

Publishing makes the gallery available through its unique shareable slug.

Customers submit the PIN.

After successful verification, a short-lived HTTP-only gallery access cookie is issued.

Selected gallery photos are returned using temporary S3 signed URLs.

4. Database Design

The database contains the following main models:

User

Stores Admin and Team Member accounts.

id

name

email

passwordHash

role

createdAt

Event

Represents a photography/event assignment.

id

name

createdAt

createdById

EventMember

Connects Team Members to Events.

id

eventId

userId

createdAt

A unique constraint prevents the same Team Member from being assigned to the same event more than once.

Photo

Stores photo metadata.

id

eventId

uploadedById

filename

storageLocation

fileSize

selectedForGallery

createdAt

Image files themselves are stored in Amazon S3.

Gallery

Represents the customer-facing gallery.

id

eventId

slug

pinHash

published

createdAt

publishedAt

Session

Stores authenticated application sessions.

id

token

userId

expiresAt

createdAt

5. Security and Access Control

Passwords are hashed with bcrypt.

Password hashes are never returned through API responses.

Authentication uses server-side sessions stored in PostgreSQL.

Session cookies are HTTP-only.

Admin-only API routes verify the authenticated user's role.

Team Members can access only events assigned to them.

Team Members can view only their own uploaded photos.

Team Members cannot publish or manage galleries.

Customers cannot access unpublished galleries.

Gallery PINs are stored as hashes rather than plaintext.

Gallery access uses a short-lived signed HTTP-only cookie.

Customer photo URLs are temporary S3 signed URLs.

S3 objects are kept private.

Uploads accept only JPEG, PNG, and WebP files.

Zero-byte uploads are rejected.

Environment variables are used for database, AWS, and gallery secrets.

Secrets and credentials must not be committed to Git.

6. API Overview

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

Admin

GET  /api/events
POST /api/events

GET  /api/users/team-members
POST /api/users/team-members

POST /api/events/:eventId/members

GET   /api/admin/events/:eventId/photos
PATCH /api/admin/events/:eventId/photos

GET   /api/admin/events/:eventId/gallery
POST  /api/admin/events/:eventId/gallery
PATCH /api/admin/events/:eventId/gallery

Team Member

GET  /api/team/events
GET  /api/team/events/:eventId/photos
POST /api/team/events/:eventId/photos

Customer Gallery

GET  /api/galleries/:slug
POST /api/galleries/:slug/verify
GET  /api/galleries/:slug/photos

7. Local Setup

Prerequisites

Node.js 22+

npm

PostgreSQL database

AWS account with an S3 bucket

Git

Install

git clone https://github.com/Mdhajee/photo-sharing-platform.git
cd photo-sharing-platform
npm install

Environment variables

Create a .env file:

DATABASE_URL="your_postgresql_connection_string"

AWS_REGION="eu-north-1"
AWS_ACCESS_KEY_ID="your_aws_access_key_id"
AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
AWS_S3_BUCKET="your_s3_bucket_name"

GALLERY_ACCESS_SECRET="your_gallery_access_secret"

Do not commit .env.

Database setup

npx prisma migrate deploy
npx prisma generate

For local development:

npm run dev

Open:

http://localhost:3000

8. Testing

The project includes tests covering important security and authentication behavior.

Run:

npm test

The test suite covers:

Authentication-related validation.

Password hashing and verification.

Role-based authorization.

Gallery access-token creation and verification.

Manual verification was also performed for:

Admin-only API authorization.

Team Member access restrictions.

Event assignment restrictions.

Team Member photo ownership.

Gallery publishing/unpublishing.

Incorrect gallery PIN rejection.

Unpublished gallery protection.

Selected-photo visibility in the customer gallery.

S3 photo upload and signed photo access.

9. Production Deployment

The application is deployed using Vercel.

Production environment variables required by the application:

DATABASE_URL
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET
GALLERY_ACCESS_SECRET

The production AWS region is:

eu-north-1

The build command is:

prisma generate && next build

Vercel must have DATABASE_URL available during the build because Prisma reads the database configuration while generating the client.

10. Live Application

Production URL:

https://photo-sharing-platform-jsmile.vercel.app

11. Demo Information

Admin

Demo Admin email:

admin2@example.com

Demo Admin password:

[Provide the demo password in the submission]

Team Member

Demo Team Member email:

photographer@example.com

Demo Team Member password:

[Provide the demo password in the submission]

Demo Gallery

Gallery URL:

https://photo-sharing-platform-jsmile.vercel.app/gallery/1e3e694a-e064-4ba7-a1a4-4db8f6e11fc7

Gallery PIN:

[Provide the active gallery PIN in the submission]

Do not commit additional production secrets to this repository.

12. Known Limitations

This implementation intentionally focuses on the core requirements of the internship challenge.

The following optional features were not implemented:

Image thumbnail generation/resizing

Pagination/infinite scrolling

Photo search/filtering

Bulk-upload workflow beyond selecting multiple files in the upload form

Photo downloading

Gallery expiration

CDN integration

Automated CI/CD pipeline

These were treated as optional features and were not added at the expense of the required workflow.

13. Core Workflow

Admin
  │
  ├── Create Event
  │
  ├── Create Team Member
  │
  └── Assign Team Member
          │
          ▼
     Team Member
          │
          └── Upload Photos
                  │
                  ▼
             Amazon S3
                  │
                  ▼
               Admin
                  │
                  ├── Review Photos
                  ├── Select Photos
                  └── Publish Gallery
                         │
                         ├── Gallery Link
                         └── Gallery PIN
                                │
                                ▼
                            Customer
                                │
                                ├── Open Link
                                ├── Enter PIN
                                └── View Published Photos

14. Submission Deliverables

This repository is intended to provide:

Source code

Live application

README documentation

Architecture and database explanation

Demo Admin credentials

Demo Team Member credentials

Demo Gallery URL and PIN

Automated tests

Cloud deployment