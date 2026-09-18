NeighbouRent --- AWS Agentic Neighborhood Sharing Network

Hackathon direction: Turn NeighbouRent from a conventional
peer-to-peer rental marketplace into an AI-powered neighborhood
sharing agent that discovers nearby supply, understands what a user
needs, coordinates owners and renters, and automates the rental
workflow.

1. Problem

People often need an item for a short period but buy it because they do
not know that someone nearby already owns it.

Examples:

A drill needed for two hours

A ladder needed for a weekend

A projector needed for one event

Sports equipment needed for a few days

A camping item needed once

A power tool or appliance needed temporarily

At the same time, many households own items that remain unused for long
periods.

The current marketplace flow is:

User knows what they need
        ↓
Search marketplace
        ↓
Browse listings
        ↓
Compare distance / price / availability
        ↓
Contact owner
        ↓
Book

The goal of the AWS version is to move toward:

"I need a drill tomorrow evening."
        ↓
AI agent understands the request
        ↓
Searches nearby inventory
        ↓
Checks availability + distance + price + trust
        ↓
If supply exists → recommends / books
        ↓
If supply does not exist → creates a neighborhood request
        ↓
Nearby owners with matching items are notified
        ↓
Owner accepts
        ↓
Booking + payment workflow
        ↓
Rental completed
        ↓
Trust + savings + environmental impact updated

The AI is therefore not just a chatbot. It is an orchestration layer
over the marketplace.

2. Existing NeighbouRent Foundation

The current application already contains:

React 19 + Vite frontend

Express 5 / Node.js backend

Prisma + MySQL

Hyperlocal listings and map discovery

Distance filtering using the Haversine formula

Gemini-based rental price suggestions

Stripe payments

Email OTP and status notifications

Multi-tier identity verification

Booking lifecycle

Reviews and ratings

CO₂ and money-saved calculations

The existing project should be extended rather than rewritten from
scratch.

3. Hackathon Goal

Core product

"Tell NeighbouRent what you need. Let the agent find the best way to get it from your neighborhood."

The main new capability is an Agentic Rental Coordinator.

Example

User:

"I need a ladder this Saturday from 10 AM to 4 PM. I'm near campus."

Agent:

Understands the item and rental period.

Searches nearby listings.

Filters by availability.

Calculates distance.

Considers price and owner trust.

Returns the best options.

Asks for confirmation before payment.

Creates the booking after approval.

If no suitable listing exists:

"I couldn't find a ladder currently listed within 5 km. I can create a
neighborhood request and notify nearby verified owners."

That second path is a key differentiator.

4. Core Features for V1

Feature A --- Natural-language rental request

Instead of forcing the user to search using filters:

"I need a projector for Saturday evening."

The agent extracts:

{
  "item": "projector",
  "start": "Saturday 18:00",
  "end": "Saturday 23:00",
  "location": "user location",
  "max_distance_km": 5
}

The extracted request is validated before any booking action.

Feature B --- Agentic inventory search

The agent uses tools/functions rather than guessing.

Required tools:

searchListings

checkAvailability

calculateDistance

getOwnerTrust

getPriceEstimate

createBooking

createNeighborhoodRequest

notifyMatchingOwners

The model decides which tools are needed.

It must never invent listing IDs, prices, availability, owners, or
booking confirmations.

Feature C --- Neighborhood demand requests

If supply does not exist:

REQUEST

Need:
Ladder

Date:
Saturday, 10 AM – 4 PM

Area:
Within 5 km

Potential rental:
₹100–₹200

The system finds nearby users who have a matching item and sends them a
notification.

Owner:

"I can lend mine."

The owner can accept the request and create a listing/booking flow.

This creates a demand-driven marketplace rather than a marketplace that
depends entirely on users creating listings first.

Feature D --- Dormant inventory agent

The system can detect opportunities such as:

Projector:
Available
Owner verified
1.4 km away

Recent demand:
3 users searched for projector nearby

The agent can notify the owner:

"Three nearby users recently searched for a projector. Your projector
is available this weekend. Make it available?"

The owner must approve before the item becomes available.

Feature E --- Trust-aware recommendations

Recommendations should consider more than price.

Example:

Option 1
₹150/day
1.2 km away
Verified owner
4.9 rating
12 completed rentals

Option 2
₹100/day
4.8 km away
Email verified
2 completed rentals

The agent explains why an option is recommended without producing an
arbitrary "AI score."

Feature F --- User approval before financial actions

The agent can search and prepare actions autonomously.

It should not silently charge the user.

Example:

Agent found:

Bosch Drill
₹150/day
1.1 km away
Available tomorrow

Total: ₹150

[Confirm & Pay]

Only after user approval should the payment/booking action execute.

5. AWS Architecture

                         ┌──────────────────────┐
                         │   React / Vite UI    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Amazon API Gateway   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   AWS Lambda APIs    │
                         └──────────┬───────────┘
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
      │  DynamoDB   │       │     S3      │       │  Bedrock    │
      │ Marketplace │       │    Images   │       │   Models    │
      │ Agent state │       │   Evidence  │       │ + Strands   │
      └─────────────┘       └─────────────┘       └──────┬──────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Strands Agent   │
                                               │ + Custom Tools  │
                                               └────────┬────────┘
                                                        │
                              ┌─────────────────────────┼──────────────────────┐
                              │                         │                      │
                              ▼                         ▼                      ▼
                     Search Listings          Check Availability       Trust / Pricing
                              │                         │                      │
                              └─────────────────────────┼──────────────────────┘
                                                        ▼
                                               Booking / Request
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │  EventBridge    │
                                               │ async events &   │
                                               │ scheduled jobs  │
                                               └─────────────────┘

AWS service responsibilities

Service                             Responsibility

Amazon Bedrock                  Foundation model used by the agent

Strands Agents SDK              Agent loop, tools, reasoning and
orchestration

AWS Lambda                      Serverless business logic and tool
implementations

API Gateway                     HTTP API between frontend and
backend

DynamoDB                        Agent state, requests, listings,
bookings and event state

S3                              Listing images and uploaded assets

EventBridge                     Asynchronous events, reminders and
scheduled workflows

Cognito                         Optional authentication/user
identity

CloudWatch                      Logs, debugging and monitoring

Step Functions                  Optional complex booking/request
workflows

Amplify Hosting                 Optional frontend hosting

6. Recommended AWS Strategy

Do not rewrite the entire existing application into AWS on day one.

Build the AWS version incrementally.

Phase 1 --- Keep existing marketplace working

Keep:

React frontend

Existing listing UI

Existing booking UI

Existing Stripe integration

Existing MySQL/Prisma data

Add a new /agent experience.

This lets the team demo a working product even if some AWS integration
is incomplete.

7. Phase 2 --- Create AWS Account

Create an AWS account for the hackathon.

Immediately do:

Enable MFA on the root account.

Do not use the root account for application development.

Create an IAM identity/role with only the permissions required for
development.

Select one AWS Region and keep resources in that region unless a
service/model requires otherwise.

Configure AWS Budgets / billing alerts before experimenting.

For local development, configure the AWS CLI:

aws configure

Verify:

aws sts get-caller-identity

8. Phase 3 --- Amazon Bedrock

Open:

AWS Console → Amazon Bedrock → Model catalog

Choose a model available in the selected region.

For the Strands agent, keep the model ID configurable:

AWS_REGION=...
BEDROCK_MODEL_ID=...

Do not hard-code the model ID throughout the application.

Before invoking the model, verify the account has the required model
permissions/access.

Bedrock's current documentation recommends the bedrock-runtime
endpoint for new applications.

9. Phase 4 --- Strands Agent

Because the current backend is Node.js, use the TypeScript version of
Strands Agents rather than introducing a second Python backend.

Create:

backend/
└── agent/
    ├── agent.ts
    ├── tools/
    │   ├── searchListings.ts
    │   ├── checkAvailability.ts
    │   ├── calculateDistance.ts
    │   ├── getOwnerTrust.ts
    │   ├── getPriceEstimate.ts
    │   ├── createNeighborhoodRequest.ts
    │   └── createBooking.ts
    └── prompts/
        └── rentalAgent.ts

Install:

npm install @strands-agents/sdk

The agent should have tools, not direct unrestricted database access.

10. Agent Tool Design

searchListings

Input:

{
  "item": "ladder",
  "latitude": 12.97,
  "longitude": 77.59,
  "radiusKm": 5
}

Output:

[
  {
    "listingId": "abc123",
    "title": "Aluminium Ladder",
    "pricePerDay": 120,
    "distanceKm": 1.2,
    "ownerRating": 4.8
  }
]

checkAvailability

Input:

{
  "listingId": "abc123",
  "start": "...",
  "end": "..."
}

Output:

{
  "available": true
}

getOwnerTrust

Return factual signals:

{
  "emailVerified": true,
  "idVerified": true,
  "completedRentals": 14,
  "averageRating": 4.8
}

The agent uses these facts when explaining recommendations.

createNeighborhoodRequest

Used when there is insufficient supply.

{
  "item": "ladder",
  "start": "...",
  "end": "...",
  "latitude": 12.97,
  "longitude": 77.59,
  "radiusKm": 5
}

createBooking

This is a high-impact tool.

It should require an explicit user confirmation token:

{
  "listingId": "abc123",
  "confirmedByUser": true
}

The agent should never create a paid booking solely because the model
decided it was appropriate.

11. Phase 5 --- DynamoDB

Create tables based on the actual access patterns.

Recommended initial tables:

Users

PK: userId

Listings

PK: listingId
GSI: ownerId
GSI: category + locationKey

Bookings

PK: bookingId
GSI: listingId + startDate
GSI: renterId

NeighborhoodRequests

PK: requestId
GSI: locationKey + category

AgentSessions

PK: sessionId

Do not blindly copy the MySQL schema into DynamoDB. Design DynamoDB
around the queries the application needs.

12. Phase 6 --- S3

Create a private bucket for:

Listing images

User-uploaded documents if needed

Agent-generated evidence/assets

Do not expose the bucket publicly.

Use presigned URLs for uploads/downloads where appropriate.

Suggested structure:

s3://neighbourent-assets/
    listings/
    users/
    requests/

13. Phase 7 --- API Gateway + Lambda

Create endpoints such as:

POST /agent/chat
POST /agent/request
GET  /agent/session/:id

GET  /listings/search
GET  /listings/:id/availability

POST /neighborhood-requests
POST /bookings

The agent endpoint should call the Strands agent.

The agent then calls its tools.

The tools call Lambda/business logic.

14. Phase 8 --- EventBridge

EventBridge handles events such as:

BookingCreated
BookingConfirmed
RentalStarted
RentalCompleted
NeighborhoodRequestCreated
OwnerMatched
RequestExpired

Example:

NeighborhoodRequestCreated
        ↓
EventBridge
        ↓
Find nearby matching owners
        ↓
Notify owners

This prevents the agent from having to do every task synchronously.

15. Phase 9 --- Authentication

For the AWS version, Cognito can eventually replace/augment the existing
JWT authentication.

But do not spend the hackathon rebuilding authentication unless
necessary.

Priority order:

1. Agent
2. Marketplace tools
3. AWS data layer
4. Event-driven workflow
5. Authentication migration

16. Demo Scenario

The final demo should tell one simple story.

Step 1 --- User request

User types:

"I need a projector for Saturday evening within 5 km."

Step 2 --- Agent searches

Agent calls:

searchListings()
checkAvailability()
getOwnerTrust()

Step 3 --- Recommendation

I found 2 suitable projectors.

1. Epson Projector
   ₹300/day
   1.4 km away
   Owner: verified
   4.9★ / 16 rentals

2. BenQ Projector
   ₹250/day
   4.2 km away
   Owner: verified
   4.5★ / 5 rentals

Step 4 --- User chooses

"Book option 1."

Agent:

"Total is ₹300. Confirm payment?"

User:

Confirm

Step 5 --- Booking

Payment + booking executes.

Step 6 --- Event

BookingCreated
        ↓
EventBridge
        ↓
Owner notification
        ↓
Renter confirmation

17. Second Demo Scenario --- The "Wow" Moment

Now demonstrate a case where no listing exists.

User:

"I need a ladder this weekend."

Agent:

"I couldn't find a currently available ladder within 5 km."

Then:

"Would you like me to ask nearby verified owners?"

User:

Yes.

Agent creates:

NEIGHBORHOOD REQUEST

🪜 Ladder

Saturday
10 AM – 4 PM

Within 5 km

Potential rental: ₹100–₹200

Nearby owner receives:

"Someone 1.8 km away needs a ladder this Saturday."

Owner:

I can lend mine

The agent connects them and starts the booking flow.

This is the feature to emphasize to judges.

18. What Makes This Different

Do not pitch it as:

"Airbnb for objects."

Pitch it as:

"An agentic neighborhood sharing network that turns local demand
into local supply."

Traditional marketplace:

LIST → SEARCH → BOOK

NeighbouRent V2:

NEED → AGENT → DISCOVER / CREATE SUPPLY → BOOK → SHARE

The agent can work in both directions:

Renter side

Need something
     ↓
Agent searches

Owner side

Unused item
     ↓
Agent detects relevant demand
     ↓
Owner gets opportunity

19. Security Principles

The agent must not have unrestricted authority.

Read actions

Allowed automatically:

Search listings

Check availability

Read public listing information

Calculate distance

Sensitive actions

Require user confirmation:

Create paid booking

Charge payment

Cancel booking

Modify rental dates

Share private information

Never allow

Agent to expose another user's private data

Agent to reveal government ID information

Agent to fabricate availability

Agent to fabricate payment confirmation

Agent to make financial transactions without confirmation

20. What NOT to Build

For the hackathon, avoid:

Rebuilding the entire existing frontend

Rewriting every MySQL model into DynamoDB

Building a generic chatbot

Adding unnecessary multi-agent complexity

Building a custom recommendation model

Moving every existing feature to Lambda

Building a complicated admin panel

Adding AI to features that don't need it

The hackathon should focus on the agentic layer.

21. Development Plan

Day 1 --- AWS Foundation

Create AWS account/project

Configure IAM

Configure AWS CLI

Configure Bedrock

Create S3 bucket

Create DynamoDB tables

Create basic Lambda/API Gateway

Set up Strands locally

Get a simple Bedrock agent responding

Milestone

User → API → Strands → Bedrock → Response

Day 2 --- Agent Tools

Implement:

Search listings

Availability

Distance

Owner trust

Price

Neighborhood request

Milestone

User request
     ↓
Agent
     ↓
Real marketplace tools
     ↓
Useful recommendation

Day 3 --- Agentic Workflow

Implement:

Neighborhood request

Owner matching

Notifications

Booking confirmation

EventBridge events

Human approval for payment

Milestone

Need
 ↓
Search
 ↓
No supply
 ↓
Neighborhood request
 ↓
Owner responds
 ↓
Booking

Day 4 --- Polish & Demo

Improve UI

Add agent activity timeline

Add AWS architecture diagram

Add error handling

Add CloudWatch logging

Test all demo flows

Deploy frontend

Deploy backend

Prepare 3-minute pitch

22. Agent Activity Timeline

One UI feature that will make the demo feel genuinely agentic:

AGENT ACTIVITY

✓ Understood request
✓ Searching within 5 km
✓ Found 8 listings
✓ Checked availability
✓ Compared price
✓ Checked owner verification
✓ Found 2 suitable options

Waiting for your confirmation...

For a neighborhood request:

✓ No suitable listing found
✓ Created neighborhood request
✓ Found 17 nearby potential owners
✓ Notified 6 relevant verified owners
⏳ Waiting for response

This lets judges see what the agent is actually doing.

23. Success Metrics for the Demo

Track:

Search-to-booking time

Number of manual steps removed

Number of neighborhood requests fulfilled

Average distance between renter and item

Rental cost vs estimated purchase value

Money saved

CO₂ saved

Number of dormant items activated

The existing application already has money-saved and CO₂-saved
calculations that can be retained in this version.

24. Final MVP Scope

Must have

Existing listings

Natural-language request

Strands agent

Bedrock model

Search tool

Availability tool

Trust tool

Neighborhood request

Owner notification

User approval before booking/payment

DynamoDB or AWS-backed agent state

S3 asset storage

EventBridge event

Working deployed demo

Nice to have

Cognito

Step Functions

Dormant inventory detection

Agent activity timeline

Personalized recommendations

Advanced analytics

Full AWS migration of existing backend

25. One-Sentence Pitch

NeighbouRent is an agentic neighborhood sharing network that
understands what people need, finds unused resources nearby, creates
supply when none exists, and coordinates the rental from discovery to
completion.

26. AWS Setup Checklist

AWS ACCOUNT
[ ] Create AWS account
[ ] Enable MFA
[ ] Create development IAM identity/role
[ ] Configure AWS CLI
[ ] Configure billing alert

BEDROCK
[ ] Choose region
[ ] Open Bedrock
[ ] Verify model availability/access
[ ] Test first inference
[ ] Set BEDROCK_MODEL_ID

STRANDS
[ ] Install @strands-agents/sdk
[ ] Create agent
[ ] Connect Bedrock
[ ] Add tools
[ ] Test locally

DYNAMODB
[ ] Create Listings
[ ] Create Bookings
[ ] Create NeighborhoodRequests
[ ] Create AgentSessions

S3
[ ] Create private assets bucket
[ ] Configure upload flow
[ ] Configure CORS/presigned URLs as required

LAMBDA
[ ] Agent API
[ ] Search tool
[ ] Availability tool
[ ] Request tool
[ ] Notification tool

API GATEWAY
[ ] Create API
[ ] Connect routes to Lambda
[ ] Test endpoints

EVENTBRIDGE
[ ] Create event bus/rules
[ ] BookingCreated
[ ] NeighborhoodRequestCreated
[ ] OwnerMatchFound

DEPLOYMENT
[ ] Deploy backend
[ ] Deploy frontend
[ ] Configure environment variables
[ ] Test complete demo

27. Official AWS References

Amazon Bedrock getting started:
https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html

Bedrock model access:
https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html

Strands Agents TypeScript quickstart:
https://strandsagents.com/docs/user-guide/quickstart/typescript/

Strands + Bedrock:
https://strandsagents.com/docs/user-guide/concepts/model-providers/amazon-bedrock/

Lambda + API Gateway:
https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-tutorial.html

AWS currently documents Strands as an open-source agent SDK, with
TypeScript support and native Amazon Bedrock integration.
citeturn0search0turn0search4turn0search6

For a deployed implementation, Amazon's documentation also provides the
standard API Gateway → Lambda → DynamoDB pattern, which fits the backend
portion of this architecture. citeturn0search9

Important implementation principle

Do not start by migrating everything to AWS.

Start with:

Existing NeighbouRent
        +
AWS Agent
        +
AWS event-driven capabilities
        ↓
Hackathon V1

Once the agent flow works, migrate individual components where AWS adds
clear value.

This minimizes risk while giving the project a genuinely AWS-native
capability.
