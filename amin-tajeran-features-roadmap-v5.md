# AminTajeran Transportation & Logistics Platform - Feature Implementation Roadmap (V5)

This document contains a comprehensive, granular list of all features specified in the RFP for the **AminTajeran (Taticom Ecosystem) Transportation and Logistics Platform** [1]. 

---

## Phase 1: Core Platform (v1 - MVP)
This phase covers the essential customer, driver, and administrator workflows required to book, transport, and track cargo end-to-end [8, 11]. It establishes the core iOS/Android apps, scalable backend APIs, and the primary admin web panel [21, 22].

### 1. User Application Features (اپلیکیشن کاربری)
*   **User registration**: Allows new users to register on the platform [14].
*   **User login**: Provides secure sign-in functionality for registered users [14].
*   **User information management**: Allows users to manage their administrative and contact details [14].
*   **Profile management**: Allows users to customize and update their platform profile settings [14].
*   **Submitting transport requests**: Enables users to request a cargo transport service [14].
*   **Submitting cargo/load details**: Allows users to submit parameters and info of a new load [14].
*   **Managing cargo/load records**: Allows users to edit, update, or cancel their draft load records [14].
*   **Viewing request status**: Allows users to view current active status of transport requests [15].
*   **Tracking request status**: Allows users to track changes in requested shipping services [15].
*   **Viewing cargo shipment status**: Allows users to see current milestones of their active loads [15].
*   **Tracking cargo shipment status**: Allows users to monitor progress updates of their cargo [15].
*   **Searching transportation options**: Enables users to search for matching shipment providers [15].
*   **Viewing transportation options**: Allows users to view available transport vehicles and carrier options [15].
*   **Selecting transport services**: Allows users to pick specific shipping services from search results [15].
*   **Requesting transport services**: Enables users to request a direct booking from a carrier [15].
*   **Viewing transport-related information**: Provides users with general platform transit and freight guidelines [15].
*   **Receiving system notifications**: Triggers automated alerts for account and booking actions [15].
*   **Receiving operational alerts**: Informs users of any vital logistical changes [15].
*   **Viewing transport history**: Provides users with a detailed history of past shipments [15].
*   **Contacting customer support**: Provides built-in mechanisms to connect with help desk support [15].

### 2. Cargo Owners Section (بخش صاحبان کالا)
*   **Cargo registry**: Allows cargo owners to register cargo details on the platform [15].
*   **Setting origin geographic location**: Allows owners to mark the exact loading point [15].
*   **Setting destination geographic location**: Allows owners to mark the exact unloading point [15].
*   **Specifying physical cargo dimensions**: Allows owners to enter load weight, volume, and sizes [15].
*   **Specifying special cargo characteristics**: Allows owners to classify hazardous, fragile, or refrigerated cargo [15].
*   **Specifying required pickup timing**: Allows owners to define the precise loading date and time [15].
*   **Specifying required delivery timing**: Allows owners to define target delivery deadlines [15].
*   **Viewing transport requests status list**: Displays a dashboard of all active and pending owner shipments [16].
*   **Viewing incoming carrier offers**: Lists incoming price bids and transport proposals from drivers [16].
*   **Viewing transport options list**: Shows available transport vehicles near cargo pickup point [16].
*   **Selecting service provider**: Enables the cargo owner to select a driver/carrier bid [16].
*   **Tracking shipment stages**: Displays sequentially updated stages of the active cargo journey [16].
*   **Viewing historical transport records**: Keeps a searchable log of all past completed shipments [16].
*   **Receiving cargo milestone alerts**: Triggers automated notifications on critical cargo updates [16].

### 3. Drivers Section (بخش رانندگان)
*   **Driver registration**: Allows new truck drivers to register on the platform [16].
*   **Driver information completion**: Allows drivers to complete their profile profiles and info [16].
*   **Registering vehicle specifications**: Allows drivers to input vehicle type, plate, and load capacities [16].
*   **Managing vehicle specifications**: Allows drivers to update or edit their truck parameters [16].
*   **Uploading vehicle licenses**: Allows drivers to submit copies of truck registrations and safety cards [16].
*   **Uploading driver licenses**: Allows drivers to submit digital copies of driving licenses [16].
*   **Submitting required documents**: Allows drivers to upload national identity cards and professional cards [16].
*   **Viewing matching transport requests**: Lists open cargo requests matching the driver's vehicle type and location [16].
*   **Receiving direct cargo transport offers**: Receives exclusive shipping offers dispatched to the driver [16].
*   **Managing transport proposals**: Allows drivers to organize, review, and filter incoming load offers [16].
*   **Accepting transportation requests**: Allows drivers to accept a cargo request [17].
*   **Rejecting transportation requests**: Allows drivers to reject a cargo request [17].
*   **Viewing cargo parameters**: Displays details of cargo dimensions and weight to accepted drivers [17].
*   **Viewing route destinations**: Shows transit destinations on the map to accepted drivers [17].
*   **Managing active trip status**: Allows drivers to toggle trip state (e.g. Started, At Customs, Completed) [17].
*   **Logging transit checkpoints**: Allows drivers to register custom checkpoints during delivery [17].
*   **Viewing past trip history**: Displays a personal log of all historical trips completed by the driver [17].
*   **Viewing earnings history**: Displays a dashboard of driver's financial history and past completed payouts [17].

### 4. Shipment Tracking & Status Management (رهگیری و مدیریت وضعیت حمل‌ونقل)
*   **Displaying current shipment status**: Displays the active shipment's status on the user dashboard [18].
*   **Event log creation**: Allows users to log key shipment events (e.g., "Cargo Loaded", "Driver departed") [18].
*   **Displaying status history logs**: Shows a timestamped table of all past status changes for a shipment [18].
*   **Status transition notification**: Automatically dispatches alerts when a shipment shifts to a new state [19].
*   **Recording key events timestamp**: Stores exact time and date of major events like customs stop [19].
*   **Owner cargo tracking portal**: Provides a dedicated lookup feature for cargo owners to check active loads [19].

### 5. Web Administrator Panel (پنل مدیریت تحت وب)
*   **Registered user management**: Allows administrators to view, edit, block, or delete platform users [19].
*   **Registered driver management**: Allows administrators to manage driver accounts [19].
*   **Registered transport company management**: Provides basic dashboard to view transport companies [19].
*   **Cargo database management**: Allows administrators to oversee, edit, and cancel platform cargo postings [19].
*   **Transport requests overview**: Provides monitoring of all pending and active shipping requests [19].
*   **Active trip monitoring**: Tracks all active logistics journeys on the platform [19].
*   **Platform base data management**: Allows administrators to manage base tables, zones, and static platform variables [19].
*   **Driver document verification**: Provides interfaces to verify and approve uploaded driver documents [19].
*   **Company credential verification**: Provides interfaces to verify and approve transport company legal documents [19].
*   **Role-based access control (RBAC)**: Allows assigning custom admin roles and permissions [19].
*   **System settings configuration**: Provides controls to modify global platform rules and constraints [19].

### 6. Notification & Communication System (سامانه اعلان و ارتباطات)
*   **Push notifications engine**: Powers live app notifications on Android/iOS [20].
*   **Lifecycle-triggered alerts**: Sends automated notifications based on logistics status changes [20].

### 7. Core Integrations & APIs (ارتباط با سایر سامانه‌ها)
*   **Map and location services API**: Integrates base map APIs for visual address picking [21].

---

## Phase 2: Final Phase (Advanced & Corporate)
This phase introduces multi-tier corporate shipping workflows (Section 4.2.4), real-time background GPS tracking, advanced analytics dashboards, social automation integrations, and deferred gateway, trust, and verification systems [16, 17, 21].

### 1. Advanced Tracking & GPS Features
*   **Online vehicle GPS tracking**: Allows cargo owners to view live vehicle positions on maps [16].
*   **Continuous background GPS coordinates streaming**: Streams active coordinates from driver's device [17].
*   **Interactive map tracking**: Displays live coordinate-based movement inside the Web Admin Panel [18].

### 2. Transportation Companies Section (بخش شرکت‌های حمل‌ونقل)
*   **Shipping company registration**: Allows corporate logistics companies to register profiles [17].
*   **Shipping company data management**: Allows editing and updating corporate credentials [17].
*   **Corporate staff management**: Allows company admins to register and manage company personnel [17].
*   **Corporate operator management**: Allows assigning custom roles to internal company employees [17].
*   **Fleet management**: Provides registers to add, modify, and manage corporate trucks [17].
*   **Driver database management**: Allows tracking and organizing corporate-employed drivers [17].
*   **Searching open market cargo**: Allows corporate operators to look for cargoes matching fleet parameters [17].
*   **Viewing transportable cargo list**: Displays a dashboard of public cargoes open for bidding [17].
*   **Corporate transport request management**: Tracks and manages shipments assigned to the company [17].
*   **Allocating loads to vehicles**: Allows company admins to assign loads directly to specific trucks [17].
*   **Allocating loads to drivers**: Allows company admins to assign loads directly to specific drivers [17].
*   **Monitoring corporate shipment status**: Tracks all ongoing corporate logistics activities [17].
*   **Rating cargo owners by company**: Allows corporate entities to submit ratings for clients [18].
*   **Viewing company-related reviews**: Shows feedback written by drivers and owners about the company [18].
*   **Corporate activity reporting**: Generates operational reports on company shipping volume [18].
*   **Historical shipping logs**: Accesses a full historical log of corporate logistics transactions [18].

### 3. Ratings, Feedback & Mutual Social Trust System 
*   **Submitting ratings for partners**: Allows users to rate transport partners after completion [15].
*   **Submitting textual reviews for partners**: Allows users to write detailed feedback on transport partners [15].
*   **Viewing ratings of other users**: Allows users to view the rating score of prospective partners [15].
*   **Viewing textual reviews of other users**: Allows users to read written reviews on prospective partners [15].
*   **Submitting ratings on carriers**: Allows cargo owners to rate carriers [16].
*   **Viewing ratings of carriers**: Shows carrier rating scores given by other cargo owners [16].
*   **Viewing text feedback of carriers**: Shows textual feedback written about carriers by others [16].
*   **Submitting rating on cargo owners**: Allows drivers to rate cargo owners [17].
*   **Viewing ratings of cargo owners**: Shows cargo owner scores given by other drivers [17].
*   **Viewing reviews of cargo owners**: Shows textual reviews of cargo owners written by other drivers [17].
*   **Review moderation**: Allows administrators to moderate ratings, comments, and partner reviews [19].

### 4. Advanced Admin Web Panel Features
*   **Interactive business intelligence dashboards**: Provides visual charts on platform performance [19].
*   **Analytical operations reporting**: Generates system-level reports for platform owners [19].
*   **Admin activity logs (Audit Trail)**: Tracks and records all actions taken by administrators [19].
*   **User action logs**: Keeps chronological traces of critical user operations for security audit [19].
*   **Permission matrix management**: Allows fine-tuning administrative access across different sub-panels [19].

### 5. Advanced Notification & Messaging Systems 
*   **In-app notifications system**: Displays an notifications center in user profiles [20].
*   **Notification dispatch management**: Allows administrators to compose and broadcast system-wide alerts [19].
*   **In-app message broadcast**: Allows administrators to send mass text notifications to users [19].
*   **Email dispatch engine**: Sends automated email notifications for accounts and agreements [20].

### 6. User Activity Logs
*   **Viewing activity logs**: Allows users to view historical logs of their actions on the platform [15].

### 7. Advanced Integrations & API Endpoints
*   **Taticom ecosystem internal API**: Connects the platform to Taticom core system [21].
*   **External legal inquiry service integration**: Integrates automated background check APIs [21].
*   **External credit validation integration**: Integrates corporate credit checking web services [21].
*   **Telegram bot integrations**: Allows sending and receiving load data via a Telegram bot [21].
*   **WhatsApp bot integrations**: Allows sending and receiving shipment data via a WhatsApp bot [21].
*   **Automatic social channel broadcasting**: Broadcasts new open loads automatically to public channels [21].
*   **Interactive international payment gateway integration**: Integrates international banking portals for payments [21].
*   **Custom API hooks**: Connects the platform with external logistics/ERP software [21].

### 8. Identity Verification & KYC Features
*   **User identity authentication**: Facilitates verifying the profile and identities of platform users [14].
*   **Authentication API integrations**: Connects to secure user identity verification services [20].

### 9. Core Gateway Integrations
*   **SMS notifications engine**: Dispatches SMS alerts to user phones [20].
*   **SMS Gateway API integration**: Integrates with third-party SMS providers to send standard messages [20].
*   **Domestic payment gateway integration**: Integrates domestic banking portals for transactions [21].
