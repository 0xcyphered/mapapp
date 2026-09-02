# AminTajeran Transportation & Logistics Platform — Feature Implementation Roadmap (V5)

Canonical product feature list for **AminTajeran (Taticom Ecosystem)**
freight and logistics. Source of truth for *what* to build:
`resources/RFP.pdf` (16 pages, published 10 Shahrivar 1405). This file is
the implementation checklist derived from that RFP. Contractor process
(SOW, bidding, contracts, NDA) stays in the PDF and is not duplicated here.

Phase 1 is the booking MVP (cargo owner + driver + admin oversight).
Phase 2 stays parked until Phase 1 booking works: live GPS, companies/fleet,
ratings, payments, KYC APIs, Telegram/WhatsApp, SMS gateway, BI.

Mode-specific cargo fields, final notification channels, and API contracts
are finalized in the joint SRS (RFP 4.2, 4.2.7, 4.2.8, 4.6). This checklist
must still *name* every RFP-requested capability so later slices cannot
drop them.

---

## Phase 1: Core Platform (v1 - MVP)
This phase covers the essential customer, driver, and administrator workflows required to book, transport, and track cargo end-to-end (RFP 4.2, 4.3). It establishes the core iOS/Android apps, scalable backend APIs, and the primary admin web panel (RFP 4.3).

### 0. Phase 1 platform surfaces (سامانه‌های مورد انتظار)

*   **iOS mobile application**: Native or cross-platform client on the App Store path (RFP 4.3).
*   **Android mobile application**: Native or cross-platform client on the Google Play path (RFP 4.3).
*   **Web administrator panel**: Browser admin shell for oversight and verification (RFP 4.3, 4.2.6).
*   **Independent scalable backend API**: Separate service, not embedded in a client (RFP 4.3).

### 1. User Application Features (اپلیکیشن کاربری)
*   **User registration**: Allows new users to register on the platform (RFP 4.2.1).
*   **User login**: Provides secure sign-in functionality for registered users (RFP 4.2.1).
*   **Phone OTP sign-in**: Authenticate with `User.phone` via SMS OTP gateway, not email/password (RFP 7.3).
*   **User information management**: Allows users to manage their administrative and contact details (RFP 4.2.1).
*   **Profile management**: Allows users to customize and update their platform profile settings (RFP 4.2.1).
*   **Submitting transport requests**: Enables users to request a cargo transport service (RFP 4.2.1).
*   **Submitting cargo/load details**: Allows users to submit parameters and info of a new load (RFP 4.2.1).
*   **Managing cargo/load records**: Allows users to edit, update, or cancel their draft load records (RFP 4.2.1).
*   **Viewing request status**: Allows users to view current active status of transport requests (RFP 4.2.1).
*   **Tracking request status**: Allows users to track changes in requested shipping services (RFP 4.2.1).
*   **Viewing cargo shipment status**: Allows users to see current milestones of their active loads (RFP 4.2.1).
*   **Tracking cargo shipment status**: Allows users to monitor progress updates of their cargo (RFP 4.2.1).
*   **Searching transportation options**: Enables users to search for matching shipment providers (RFP 4.2.1).
*   **Viewing transportation options**: Allows users to view available transport vehicles and carrier options (RFP 4.2.1).
*   **Selecting transport services**: Allows users to pick specific shipping services from search results (RFP 4.2.1).
*   **Requesting transport services**: Enables users to request a direct booking from a carrier (RFP 4.2.1).
*   **Viewing transport-related information**: Provides users with general platform transit and freight guidelines (RFP 4.2.1).
*   **Receiving system notifications**: Triggers automated alerts for account and booking actions (RFP 4.2.1, 4.2.7).
*   **Receiving operational alerts**: Informs users of any vital logistical changes (RFP 4.2.1, 4.2.7).
*   **Viewing transport history**: Provides users with a detailed history of past shipments (RFP 4.2.1).
*   **Viewing activity logs**: Full user action history is Phase 2 §6; this Phase 1 surface only needs transport history (RFP 4.2.1).
*   **Contacting customer support**: Provides built-in mechanisms to connect with help desk support (RFP 4.2.1).
*   **SRS-deferred user capabilities**: Additional user-app features finalized during analysis/SRS without a fundamental scope change (RFP 4.2.1).

### 2. Cargo Owners Section (بخش صاحبان کالا)
*   **Cargo registry**: Allows cargo owners to register cargo details on the platform (RFP 4.2.2).
*   **Setting origin geographic location**: Allows owners to mark the exact loading point (RFP 4.2.2).
*   **Setting destination geographic location**: Allows owners to mark the exact unloading point (RFP 4.2.2).
*   **Specifying physical cargo dimensions**: Allows owners to enter load weight, volume, and sizes (RFP 4.2.2).
*   **Specifying special cargo characteristics**: Allows owners to classify hazardous, fragile, or refrigerated cargo (RFP 4.2.2).
*   **Specifying required pickup timing**: Allows owners to define the precise loading date and time (RFP 4.2.2).
*   **Specifying required delivery timing**: Allows owners to define target delivery deadlines (RFP 4.2.2).
*   **Viewing transport requests status list**: Displays a dashboard of all active and pending owner shipments (RFP 4.2.2).
*   **Viewing incoming carrier offers**: Lists incoming price bids and transport proposals from drivers (RFP 4.2.2).
*   **Viewing transport options list**: Shows available transport vehicles near cargo pickup point (RFP 4.2.2).
*   **Selecting service provider**: Enables the cargo owner to select a driver/carrier bid (RFP 4.2.2).
*   **Tracking shipment stages**: Displays sequentially updated stages of the active cargo journey (RFP 4.2.2).
*   **Viewing historical transport records**: Keeps a searchable log of all past completed shipments (RFP 4.2.2).
*   **Receiving cargo milestone alerts**: Triggers automated notifications on critical cargo updates (RFP 4.2.2, 4.2.7).

### 3. Cargo transport modes (حوزه‌های حمل‌ونقل)

The platform must register and manage cargo across the primary modes.
Final mode list and per-mode fields are locked in the SRS (RFP 4.2).

*   **Road / land cargo (زمینی)**: Register and manage ground freight (RFP 4.2).
*   **Sea / maritime cargo (دریایی)**: Register and manage sea freight (RFP 4.2).
*   **Air cargo (هوایی)**: Register and manage air freight (RFP 4.2).
*   **Rail cargo (ریلی)**: Register and manage rail freight (RFP 4.2).
*   **Combined / multimodal cargo (ترکیبی)**: Register and manage shipments that use more than one mode (RFP 4.2).
*   **Mode-specific cargo fields**: Each mode may add its own attributes; do not assume truck-only dimensions (RFP 4.2).

### 4. Drivers Section (بخش رانندگان)
*   **Driver registration**: Allows new truck drivers to register on the platform (RFP 4.2.3).
*   **Driver information completion**: Allows drivers to complete their profile profiles and info (RFP 4.2.3).
*   **Registering vehicle specifications**: Allows drivers to input vehicle type, plate, and load capacities (RFP 4.2.3).
*   **Managing vehicle specifications**: Allows drivers to update or edit their truck parameters (RFP 4.2.3).
*   **Uploading vehicle licenses**: Allows drivers to submit copies of truck registrations and safety cards (RFP 4.2.3).
*   **Uploading driver licenses**: Allows drivers to submit digital copies of driving licenses (RFP 4.2.3).
*   **Submitting required documents**: Allows drivers to upload national identity cards and professional cards (RFP 4.2.3).
*   **Viewing matching transport requests**: Lists open cargo requests matching the driver's vehicle type and location (RFP 4.2.3).
*   **Receiving direct cargo transport offers**: Receives exclusive shipping offers dispatched to the driver (RFP 4.2.3).
*   **Managing transport proposals**: Allows drivers to organize, review, and filter incoming load offers (RFP 4.2.3).
*   **Accepting transportation requests**: Allows drivers to accept a cargo request (RFP 4.2.3).
*   **Rejecting transportation requests**: Allows drivers to reject a cargo request (RFP 4.2.3).
*   **Viewing cargo parameters**: Displays details of cargo dimensions and weight to accepted drivers (RFP 4.2.3).
*   **Viewing route destinations**: Shows transit destinations on the map to accepted drivers (RFP 4.2.3).
*   **Managing active trip status**: Allows drivers to toggle trip state (e.g. Started, At Customs, Completed) (RFP 4.2.3).
*   **Logging transit checkpoints**: Allows drivers to register custom checkpoints during delivery (RFP 4.2.3).
*   **Viewing past trip history**: Displays a personal log of all historical trips completed by the driver (RFP 4.2.3).
*   **Viewing earnings history**: Displays a dashboard of driver's financial history and past completed payouts (extension beyond RFP 4.2.3; RFP only requires trip/transport history).

### 5. Shipment Tracking & Status Management (رهگیری و مدیریت وضعیت حمل‌ونقل)
*   **Displaying current shipment status**: Displays the active shipment's status on the user dashboard (RFP 4.2.5).
*   **Event log creation**: Allows users to log key shipment events (e.g., "Cargo Loaded", "Driver departed") (RFP 4.2.5).
*   **Displaying status history logs**: Shows a timestamped table of all past status changes for a shipment (RFP 4.2.5).
*   **Status transition notification**: Automatically dispatches alerts when a shipment shifts to a new state (RFP 4.2.5, 4.2.7).
*   **Recording key events timestamp**: Stores exact time and date of major events like customs stop (RFP 4.2.5).
*   **Owner cargo tracking portal**: Provides a dedicated lookup feature for cargo owners to check active loads (RFP 4.2.5).

### 6. Web Administrator Panel (پنل مدیریت تحت وب)
*   **Registered user management**: Allows administrators to view, edit, block, or delete platform users (RFP 4.2.6).
*   **Registered driver management**: Allows administrators to manage driver accounts (RFP 4.2.6).
*   **Registered transport company management**: Provides basic dashboard to view transport companies (RFP 4.2.6).
*   **Cargo database management**: Allows administrators to oversee, edit, and cancel platform cargo postings (RFP 4.2.6).
*   **Transport requests overview**: Provides monitoring of all pending and active shipping requests (RFP 4.2.6).
*   **Active trip monitoring**: Tracks all active logistics journeys on the platform (RFP 4.2.6).
*   **Platform base data management**: Allows administrators to manage base tables, zones, and static platform variables (RFP 4.2.6).
*   **Driver document verification**: Provides interfaces to verify and approve uploaded driver documents (RFP 4.2.6).
*   **Company credential verification**: Provides interfaces to verify and approve transport company legal documents (RFP 4.2.6).
*   **Role-based access control (RBAC)**: Allows assigning custom admin roles and permissions (RFP 4.2.6).
*   **System settings configuration**: Provides controls to modify global platform rules and constraints (RFP 4.2.6).

### 7. Notification & Communication System (سامانه اعلان و ارتباطات)
*   **Push notifications engine**: Powers live app notifications on Android/iOS (RFP 4.2.7).
*   **Lifecycle-triggered alerts**: Sends automated notifications based on logistics status changes (RFP 4.2.7).

### 8. Core Integrations & APIs (ارتباط با سایر سامانه‌ها)
*   **Map and location services API**: Base map APIs for visual address picking (RFP 4.2.8, 7.3).
*   **Routing services API**: Route geometry and directions, not only geocoding (RFP 7.3 نقشه و مسیریابی).
*   **SMS / OTP gateway (auth)**: Third-party SMS used for OTP sign-in; transactional SMS alerts stay Phase 2 (RFP 7.3).
*   **Push notification provider**: Device push via a third-party push service (RFP 7.3, 4.2.7).

---

## Phase 2: Final Phase (Advanced & Corporate)
This phase introduces multi-tier corporate shipping workflows (RFP 4.2.4), real-time background GPS tracking, advanced analytics dashboards, social automation integrations, and deferred gateway, trust, and verification systems (RFP 4.2.3, 4.2.6, 4.2.8).

### 1. Advanced Tracking & GPS Features
*   **Online vehicle GPS tracking**: Allows cargo owners to view live vehicle positions on maps (RFP 4.2.2).
*   **Continuous background GPS coordinates streaming**: Streams active coordinates from driver's device (RFP 4.2.3).
*   **Interactive map tracking**: Displays live coordinate-based movement inside the Web Admin Panel (RFP 4.2.5).

### 2. Transportation Companies Section (بخش شرکت‌های حمل‌ونقل)
*   **Shipping company registration**: Allows corporate logistics companies to register profiles (RFP 4.2.4).
*   **Shipping company data management**: Allows editing and updating corporate credentials (RFP 4.2.4).
*   **Corporate staff management**: Allows company admins to register and manage company personnel (RFP 4.2.4).
*   **Corporate operator management**: Allows assigning custom roles to internal company employees (RFP 4.2.4).
*   **Fleet management**: Provides registers to add, modify, and manage corporate trucks (RFP 4.2.4).
*   **Driver database management**: Allows tracking and organizing corporate-employed drivers (RFP 4.2.4).
*   **Searching open market cargo**: Allows corporate operators to look for cargoes matching fleet parameters (RFP 4.2.4).
*   **Viewing transportable cargo list**: Displays a dashboard of public cargoes open for bidding (RFP 4.2.4).
*   **Corporate transport request management**: Tracks and manages shipments assigned to the company (RFP 4.2.4).
*   **Allocating loads to vehicles**: Allows company admins to assign loads directly to specific trucks (RFP 4.2.4).
*   **Allocating loads to drivers**: Allows company admins to assign loads directly to specific drivers (RFP 4.2.4).
*   **Monitoring corporate shipment status**: Tracks all ongoing corporate logistics activities (RFP 4.2.4).
*   **Rating cargo owners by company**: Allows corporate entities to submit ratings for clients (RFP 4.2.4).
*   **Viewing company-related reviews**: Shows feedback written by drivers and owners about the company (RFP 4.2.4).
*   **Corporate activity reporting**: Generates operational reports on company shipping volume (RFP 4.2.4).
*   **Historical shipping logs**: Accesses a full historical log of corporate logistics transactions (RFP 4.2.4).

### 3. Ratings, Feedback & Mutual Social Trust System
*   **Submitting ratings for partners**: Allows users to rate transport partners after completion (RFP 4.2.1).
*   **Submitting textual reviews for partners**: Allows users to write detailed feedback on transport partners (RFP 4.2.1).
*   **Viewing ratings of other users**: Allows users to view the rating score of prospective partners (RFP 4.2.1).
*   **Viewing textual reviews of other users**: Allows users to read written reviews on prospective partners (RFP 4.2.1).
*   **Submitting ratings on carriers**: Allows cargo owners to rate carriers (RFP 4.2.2).
*   **Viewing ratings of carriers**: Shows carrier rating scores given by other cargo owners (RFP 4.2.2).
*   **Viewing text feedback of carriers**: Shows textual feedback written about carriers by others (RFP 4.2.2).
*   **Submitting rating on cargo owners**: Allows drivers to rate cargo owners (RFP 4.2.3).
*   **Viewing ratings of cargo owners**: Shows cargo owner scores given by other drivers (RFP 4.2.3).
*   **Viewing reviews of cargo owners**: Shows textual reviews of cargo owners written by other drivers (RFP 4.2.3).
*   **Review moderation**: Allows administrators to moderate ratings, comments, and partner reviews (RFP 4.2.6).

### 4. Advanced Admin Web Panel Features
*   **Interactive business intelligence dashboards**: Provides visual charts on platform performance (RFP 4.2.6).
*   **Analytical operations reporting**: Generates system-level reports for platform owners (RFP 4.2.6).
*   **Admin activity logs (Audit Trail)**: Tracks and records all actions taken by administrators (RFP 4.2.6).
*   **User action logs**: Keeps chronological traces of critical user operations for security audit (RFP 4.2.6).
*   **Permission matrix management**: Allows fine-tuning administrative access across different sub-panels (RFP 4.2.6).

### 5. Advanced Notification & Messaging Systems
*   **In-app notifications system**: Displays an notifications center in user profiles (RFP 4.2.7).
*   **Notification dispatch management**: Allows administrators to compose and broadcast system-wide alerts (RFP 4.2.6).
*   **In-app message broadcast**: Allows administrators to send mass text notifications to users (RFP 4.2.6).
*   **Email dispatch engine**: Sends automated email notifications for accounts and agreements (RFP 4.2.7).

### 6. User Activity Logs
*   **Viewing activity logs**: Allows users to view historical logs of their actions on the platform (RFP 4.2.1).

### 7. Advanced Integrations & API Endpoints
*   **Taticom ecosystem internal API**: Connects the platform to Taticom core system (RFP 4.2.8).
*   **External legal inquiry service integration**: Integrates automated background check APIs (RFP 4.2.8).
*   **External credit validation integration**: Integrates corporate credit checking web services (RFP 4.2.8).
*   **Telegram bot integrations**: Allows sending and receiving load data via a Telegram bot (RFP 4.2.8).
*   **WhatsApp bot integrations**: Allows sending and receiving shipment data via a WhatsApp bot (RFP 4.2.8).
*   **Automatic social channel broadcasting**: Broadcasts new open loads automatically to public channels (RFP 4.2.8).
*   **Interactive international payment gateway integration**: Integrates international banking portals for payments (RFP 4.2.8, 7.3).
*   **Custom API hooks**: Connects the platform with external logistics/ERP software (RFP 4.2.8).

### 8. Identity Verification & KYC Features
*   **User identity authentication**: Facilitates verifying the profile and identities of platform users (RFP 4.2.1).
*   **Authentication API integrations**: Connects to secure user identity verification services (RFP 4.2.8).

### 9. Core Gateway Integrations
*   **SMS notifications engine**: Dispatches SMS alerts to user phones (RFP 4.2.7).
*   **SMS Gateway API integration**: Integrates with third-party SMS providers to send standard messages (RFP 4.2.8, 7.3).
*   **Domestic payment gateway integration**: Integrates domestic banking portals for transactions (RFP 4.2.8, 7.3).

### 10. Value-added services foundation (خدمات ارزش افزوده)

*   **Adjacent revenue / value-added services bed**: Architecture must allow later supply-chain add-ons without rewriting the core (RFP 4.1, page 5). No specific add-on is in Phase 1 or Phase 2 scope until the SRS names it.

## Out of scope (RFP 4.4)

Unless a signed contract or the final SRS says otherwise, these are **not**
product features for the initial project:

*   Hardware or physical equipment development
*   Supplying mobile phones or GPS devices
*   Server / datacenter provisioning, unless separately agreed
*   External services that require their own contract or license
*   Content production and marketing
*   Operational business support and human resources
*   Features added after SRS approval that require a fundamental scope change
    (those go through Change Request, RFP 4.4 / 5.6)

## Non-functional and platform requirements (RFP 4.5, 7.1, 7.4)

Not user-facing screens, but they are requested and must stay visible:

*   **Page load**: under 2 seconds in normal conditions (RFP 7.1)
*   **API latency**: under 500 ms in normal conditions (RFP 7.1)
*   **Horizontal scalability**: users and transaction volume (RFP 4.5, 7.1)
*   **Availability**: at least 99.5% annual uptime with monitoring and alerts (RFP 7.1)
*   **Security**: encryption, secure auth, OWASP Top 10 hardening (RFP 7.1)
*   **Sensitive-data encryption**: passwords and payment data at rest (RFP 7.4)
*   **Privacy**: applicable user data-protection and privacy rules (RFP 7.4)
*   **Security audit trail**: record and trace security-relevant events (RFP 7.4)
*   **Penetration test**: before final production release (RFP 7.4)
*   **Client compatibility**: last two major Android and iOS versions, plus major browsers (RFP 7.1)
*   **Accessibility and responsive design**: usable across device sizes (RFP 7.1)
*   **Backup and disaster recovery**: automated backup and restore (RFP 4.5, 7.1)
*   **Logging and monitoring**: operational event logging and health checks (RFP 4.5)
*   **File / image storage**: documents and images live in an object store, not in Mongo documents (RFP 7.2)
*   **Modular APIs**: add modules and external systems without a core rewrite (RFP 4.5)

## RFP mapping (machine check)

| RFP | Must appear in this file |
|-----|--------------------------|
| 4.2.1 user app | Phase 1 User Application |
| 4.2.2 cargo owners | Phase 1 Cargo Owners |
| 4.2 preamble modes | Phase 1 Cargo transport modes |
| 4.2.3 drivers | Phase 1 Drivers |
| 4.2.4 companies | Phase 2 Transportation Companies |
| 4.2.5 tracking | Phase 1 Shipment Tracking |
| 4.2.6 admin | Phase 1 Web Administrator + Phase 2 Advanced Admin |
| 4.2.7 notifications | Phase 1 § notifications + Phase 2 Advanced Notification |
| 4.2.8 integrations | Phase 1 Core Integrations + Phase 2 Advanced Integrations |
| 4.3 surfaces | Phase 1 platform surfaces |
| 4.4 out of scope | Out of scope |
| 7.1 / 7.4 NFR | Non-functional and platform requirements |
| 7.3 OTP, maps+routing, push, SMS, payments | OTP + Routing in Phase 1 integrations; SMS/payments remain Phase 2 |
