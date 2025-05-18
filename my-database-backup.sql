--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: budget_indication; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.budget_indication AS ENUM (
    'not_mentioned',
    'low',
    'medium',
    'high',
    'specific_amount'
);


ALTER TYPE public.budget_indication OWNER TO neondb_owner;

--
-- Name: communication_direction; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.communication_direction AS ENUM (
    'incoming',
    'outgoing',
    'internal'
);


ALTER TYPE public.communication_direction OWNER TO neondb_owner;

--
-- Name: communication_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.communication_type AS ENUM (
    'email',
    'call',
    'sms',
    'note',
    'meeting'
);


ALTER TYPE public.communication_type OWNER TO neondb_owner;

--
-- Name: identifier_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.identifier_type AS ENUM (
    'email',
    'phone'
);


ALTER TYPE public.identifier_type OWNER TO neondb_owner;

--
-- Name: lead_quality_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.lead_quality_category AS ENUM (
    'hot',
    'warm',
    'cold',
    'nurture'
);


ALTER TYPE public.lead_quality_category OWNER TO neondb_owner;

--
-- Name: lead_score; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.lead_score AS ENUM (
    '1',
    '2',
    '3',
    '4',
    '5'
);


ALTER TYPE public.lead_score OWNER TO neondb_owner;

--
-- Name: opportunity_priority; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.opportunity_priority AS ENUM (
    'hot',
    'high',
    'medium',
    'low'
);


ALTER TYPE public.opportunity_priority OWNER TO neondb_owner;

--
-- Name: raw_lead_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.raw_lead_status AS ENUM (
    'new',
    'under_review',
    'qualified',
    'archived',
    'junk',
    'parsing_failed',
    'needs_manual_review'
);


ALTER TYPE public.raw_lead_status OWNER TO neondb_owner;

--
-- Name: sentiment; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.sentiment AS ENUM (
    'positive',
    'neutral',
    'negative',
    'urgent'
);


ALTER TYPE public.sentiment OWNER TO neondb_owner;

--
-- Name: delete_questionnaire_conditional_logic(integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.delete_questionnaire_conditional_logic(rule_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Delete the conditional logic rule
    DELETE FROM questionnaire_conditional_logic
    WHERE id = rule_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.delete_questionnaire_conditional_logic(rule_id integer) OWNER TO neondb_owner;

--
-- Name: delete_questionnaire_definition(integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.delete_questionnaire_definition(def_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- First update any references from opportunities
    UPDATE opportunities 
    SET questionnaire_definition_id = NULL, questionnaire_submission_id = NULL
    WHERE questionnaire_definition_id = def_id;
    
    -- Update any references from raw_leads
    UPDATE raw_leads
    SET questionnaire_definition_id = NULL, questionnaire_submission_id = NULL
    WHERE questionnaire_definition_id = def_id;
    
    -- Delete any questionnaire submissions for this definition
    DELETE FROM questionnaire_submissions
    WHERE definition_id = def_id;
    
    -- Delete conditional logic rules
    DELETE FROM questionnaire_conditional_logic
    WHERE definition_id = def_id;
    
    -- Delete questions, options, matrix columns via cascading
    DELETE FROM questionnaire_questions
    WHERE page_id IN (SELECT id FROM questionnaire_pages WHERE definition_id = def_id);
    
    -- Delete pages
    DELETE FROM questionnaire_pages
    WHERE definition_id = def_id;
    
    -- Finally delete the definition
    DELETE FROM questionnaire_definitions
    WHERE id = def_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.delete_questionnaire_definition(def_id integer) OWNER TO neondb_owner;

--
-- Name: delete_questionnaire_page(integer); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.delete_questionnaire_page(page_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Delete all options for questions in this page
    DELETE FROM questionnaire_question_options
    WHERE question_id IN (SELECT id FROM questionnaire_questions WHERE page_id = page_id);
    
    -- Delete all matrix columns for questions in this page
    DELETE FROM questionnaire_matrix_columns
    WHERE question_id IN (SELECT id FROM questionnaire_questions WHERE page_id = page_id);
    
    -- Delete all questions in this page
    DELETE FROM questionnaire_questions
    WHERE page_id = page_id;
    
    -- Update any conditional logic that targets this page
    UPDATE questionnaire_conditional_logic
    SET target_page_id = NULL
    WHERE target_page_id = page_id;
    
    -- Finally delete the page itself
    DELETE FROM questionnaire_pages
    WHERE id = page_id;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.delete_questionnaire_page(page_id integer) OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    user_id integer,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    address text,
    city text,
    state text,
    zip text,
    notes text,
    opportunity_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clients OWNER TO neondb_owner;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO neondb_owner;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: communications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.communications (
    id integer NOT NULL,
    opportunity_id integer,
    client_id integer,
    user_id integer,
    type public.communication_type NOT NULL,
    direction public.communication_direction NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    source text,
    external_id text,
    subject text,
    from_address text,
    to_address text,
    body_raw text,
    body_summary text,
    duration_minutes integer,
    recording_url text,
    meta_data jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.communications OWNER TO neondb_owner;

--
-- Name: communications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.communications_id_seq OWNER TO neondb_owner;

--
-- Name: communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.communications_id_seq OWNED BY public.communications.id;


--
-- Name: contact_identifiers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contact_identifiers (
    id integer NOT NULL,
    opportunity_id integer,
    client_id integer,
    type public.identifier_type NOT NULL,
    value text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    source text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contact_identifiers OWNER TO neondb_owner;

--
-- Name: contact_identifiers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.contact_identifiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_identifiers_id_seq OWNER TO neondb_owner;

--
-- Name: contact_identifiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.contact_identifiers_id_seq OWNED BY public.contact_identifiers.id;


--
-- Name: estimates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.estimates (
    id integer NOT NULL,
    client_id integer NOT NULL,
    event_date timestamp without time zone,
    event_type text NOT NULL,
    guest_count integer,
    venue text,
    menu_id integer,
    items jsonb,
    additional_services jsonb,
    subtotal integer NOT NULL,
    tax integer NOT NULL,
    total integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    expires_at timestamp without time zone,
    sent_at timestamp without time zone,
    viewed_at timestamp without time zone,
    accepted_at timestamp without time zone,
    declined_at timestamp without time zone,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    zip_code text,
    venue_address text,
    venue_city text,
    venue_state text,
    venue_zip text,
    tax_rate double precision
);


ALTER TABLE public.estimates OWNER TO neondb_owner;

--
-- Name: estimates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.estimates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.estimates_id_seq OWNER TO neondb_owner;

--
-- Name: estimates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.estimates_id_seq OWNED BY public.estimates.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.events (
    id integer NOT NULL,
    client_id integer NOT NULL,
    estimate_id integer,
    event_date timestamp without time zone NOT NULL,
    start_time timestamp without time zone NOT NULL,
    end_time timestamp without time zone NOT NULL,
    event_type text NOT NULL,
    guest_count integer NOT NULL,
    venue text NOT NULL,
    menu_id integer,
    status text DEFAULT 'confirmed'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO neondb_owner;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO neondb_owner;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: gmail_sync_state; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gmail_sync_state (
    target_email text NOT NULL,
    last_history_id text NOT NULL,
    watch_expiration_timestamp timestamp without time zone,
    last_watch_attempt_timestamp timestamp without time zone DEFAULT now(),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.gmail_sync_state OWNER TO neondb_owner;

--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.opportunities (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    event_type text NOT NULL,
    event_date timestamp without time zone,
    guest_count integer,
    venue text,
    notes text,
    status text DEFAULT 'new'::text NOT NULL,
    opportunity_source text,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id integer,
    priority public.opportunity_priority DEFAULT 'medium'::public.opportunity_priority,
    questionnaire_submission_id integer,
    questionnaire_definition_id integer
);


ALTER TABLE public.opportunities OWNER TO neondb_owner;

--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leads_id_seq OWNER TO neondb_owner;

--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.opportunities.id;


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.menu_items (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    price numeric(10,2),
    ingredients text,
    is_vegetarian boolean DEFAULT false,
    is_vegan boolean DEFAULT false,
    is_gluten_free boolean DEFAULT false,
    is_dairy_free boolean DEFAULT false,
    is_nut_free boolean DEFAULT false,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.menu_items OWNER TO neondb_owner;

--
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.menu_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO neondb_owner;

--
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- Name: menus; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    items jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.menus OWNER TO neondb_owner;

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menus_id_seq OWNER TO neondb_owner;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- Name: processed_emails; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.processed_emails (
    id integer NOT NULL,
    message_id text NOT NULL,
    gmail_id text NOT NULL,
    service text NOT NULL,
    processed_at timestamp without time zone DEFAULT now() NOT NULL,
    email text NOT NULL,
    subject text,
    label_applied boolean DEFAULT false
);


ALTER TABLE public.processed_emails OWNER TO neondb_owner;

--
-- Name: processed_emails_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.processed_emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.processed_emails_id_seq OWNER TO neondb_owner;

--
-- Name: processed_emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.processed_emails_id_seq OWNED BY public.processed_emails.id;


--
-- Name: raw_leads; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_leads (
    id integer NOT NULL,
    source text NOT NULL,
    raw_data jsonb,
    extracted_prospect_name text,
    extracted_prospect_email text,
    extracted_prospect_phone text,
    event_summary text,
    received_at timestamp without time zone NOT NULL,
    status public.raw_lead_status DEFAULT 'new'::public.raw_lead_status NOT NULL,
    created_opportunity_id integer,
    internal_notes text,
    assigned_to_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    extracted_event_type text,
    extracted_event_date text,
    extracted_event_time text,
    extracted_guest_count integer,
    extracted_venue text,
    extracted_message_summary text,
    lead_source_platform text,
    ai_urgency_score public.lead_score,
    ai_budget_indication public.budget_indication,
    ai_budget_value integer,
    ai_clarity_of_request_score public.lead_score,
    ai_decision_maker_likelihood public.lead_score,
    ai_key_requirements jsonb,
    ai_potential_red_flags jsonb,
    ai_overall_lead_quality public.lead_quality_category,
    ai_suggested_next_step text,
    ai_sentiment public.sentiment,
    ai_confidence_score double precision,
    questionnaire_submission_id integer,
    questionnaire_definition_id integer,
    ai_calendar_conflict_assessment text
);


ALTER TABLE public.raw_leads OWNER TO neondb_owner;

--
-- Name: raw_leads_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.raw_leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.raw_leads_id_seq OWNER TO neondb_owner;

--
-- Name: raw_leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.raw_leads_id_seq OWNED BY public.raw_leads.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    role text DEFAULT 'staff'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: communications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.communications ALTER COLUMN id SET DEFAULT nextval('public.communications_id_seq'::regclass);


--
-- Name: contact_identifiers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_identifiers ALTER COLUMN id SET DEFAULT nextval('public.contact_identifiers_id_seq'::regclass);


--
-- Name: estimates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.estimates ALTER COLUMN id SET DEFAULT nextval('public.estimates_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- Name: opportunities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: processed_emails id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.processed_emails ALTER COLUMN id SET DEFAULT nextval('public.processed_emails_id_seq'::regclass);


--
-- Name: raw_leads id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads ALTER COLUMN id SET DEFAULT nextval('public.raw_leads_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.clients (id, user_id, first_name, last_name, email, phone, company, address, city, state, zip, notes, opportunity_id, created_at, updated_at) FROM stdin;
1	\N	asd	asd	adsf2@tjae2.com	asd	\N	\N	\N	\N	\N	\N	1	2025-05-13 23:32:15.957492	2025-05-13 23:32:15.957492
2	\N	PASCAL	MATTA	pascal.matta@gmail.com	7865993948	\N	\N	\N	\N	\N	\N	2	2025-05-13 23:36:17.398787	2025-05-13 23:36:17.398787
3	\N	qerf	adsf	sdsdsdf@gmail.com	2064105100	Kolmo constructions	4018 Northeast 125th Street	Seattle	Washington	98125		\N	2025-05-14 00:05:34.660656	2025-05-14 00:05:34.660656
4	\N	PASCAL	MATTA	projects@kolmo.io	7865993948	Kolmo	19233 98th Avenue South	Renton	WA	98055		\N	2025-05-15 07:04:13.602818	2025-05-15 07:04:13.602818
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.communications (id, opportunity_id, client_id, user_id, type, direction, "timestamp", source, external_id, subject, from_address, to_address, body_raw, body_summary, duration_minutes, recording_url, meta_data, created_at, updated_at) FROM stdin;
1	2	\N	1	email	outgoing	2025-05-14 05:30:36.104771	manual_entry	\N	Follow-up about your catering inquiry	staff@homebites.com	additional-email@example.com	Thank you for your inquiry about catering for your event. We would be happy to discuss this further.	Initial follow-up to lead inquiry	\N	\N	\N	2025-05-14 05:30:36.104771	2025-05-14 05:30:36.104771
2	2	\N	\N	email	outgoing	2025-05-14 05:38:07.726	\N	\N	Test communication	\N	\N	This is a test message	\N	\N	\N	\N	2025-05-14 05:38:07.747508	2025-05-14 05:38:07.747508
3	\N	1	\N	email	outgoing	2025-05-14 05:38:30.436	\N	\N	Test client communication	\N	\N	This is a test message for a client	\N	\N	\N	\N	2025-05-14 05:38:30.456177	2025-05-14 05:38:30.456177
4	2	\N	\N	email	outgoing	2025-05-14 05:47:45.796	direct_test	\N	Direct Test Email	\N	\N	This is a test communication created directly	\N	\N	\N	\N	2025-05-14 05:47:45.816057	2025-05-14 05:47:45.816057
5	\N	1	\N	call	incoming	2025-05-14 05:47:45.846	direct_test	\N	\N	\N	\N	This is a test call logged directly	\N	15	\N	\N	2025-05-14 05:47:45.865105	2025-05-14 05:47:45.865105
6	2	\N	\N	email	outgoing	2025-05-14 14:18:17.045	\N	\N	Test communication	\N	\N	This is a test message	\N	\N	\N	\N	2025-05-14 14:18:17.069719	2025-05-14 14:18:17.069719
7	2	\N	\N	email	outgoing	2025-05-14 14:18:30.642	direct_test	\N	Direct Test Email	\N	\N	This is a test communication created directly	\N	\N	\N	\N	2025-05-14 14:18:30.663597	2025-05-14 14:18:30.663597
8	\N	1	\N	call	incoming	2025-05-14 14:18:30.706	direct_test	\N	\N	\N	\N	This is a test call logged directly	\N	15	\N	\N	2025-05-14 14:18:30.726073	2025-05-14 14:18:30.726073
9	\N	\N	\N	email	incoming	2025-05-09 13:59:38	gmail_sync	<30192150.20250509135938.681e0a4a3cb662.13288207@mail133-197.atl131.mandrillapp.com>	Good news! Your Zola plan is ready to use	weddingvendors@zola.com	hello@eathomebites.com	https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiOTNycmhzdEpFS1N6NERoRzhZRkkxQ3g1ZkFJIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC8_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCZ1dG1fY2FtcGFpZ249bWFya2V0cGxhY2VfbGlzdGluZ3B1Ymxpc2hlZFwiLFwiaWRcIjpcIjBkYWM5YzliYThiZTQ2N2FiNTFlOGI0MGJkODc2ODg3XCIsXCJ1cmxfaWRzXCI6W1wiZTA3OWQ2NDIyMjdkZTVjZTEwOTFkNDQ0NTg3OGRjMWVjMjdjYjhiZlwiXSxcIm1zZ190c1wiOjE3NDY3OTkxNzh9In0\n\n ?utm_medium=email&utm_source=triggered&utm_campaign=marketplace_listingpublished Thanks for your order!\n\n Hi Mike,\n\nYou recently purchased a credit package from Zola. Please see the details of your transaction below. ORDER NUMBER: 41253969\nDATE OF PURCHASE: 5/9/2025\nLISTING NAME: Home Bites LLC\nPACKAGE PURCHASED: 3 Month Plan\nPAYMENT METHOD: Visa ending in 6203\nSUBTOTAL: $90\nTAX: $9.32\nTOTAL: $99.32\n\nBILLING ADDRESS\nCosmas Bisticas\n19233 98th Ave S, Renton, WA, USA\n Renton, WA 98055\n\nBUSINESS ADDRESS\nHome Bites LLC\n1005 Terrace St\n Seattle, WA 98104\nHead to the "Your Inquiries" page (https://www.zola.com/inspire/vendors/leads) to connect with couples using your credits anytime. Warm regards,\nTeam Zola\n\n https://mandrillapp.com/track/click/30192150/instagram.com?p=eyJzIjoiOUJtM1lNWVFDZm1jQ0VtSTlvWTRxNzhoeU5FIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvaW5zdGFncmFtLmNvbVxcXC96b2xhXFxcL1wiLFwiaWRcIjpcIjBkYWM5YzliYThiZTQ2N2FiNTFlOGI0MGJkODc2ODg3XCIsXCJ1cmxfaWRzXCI6W1wiYWMxNGYzMTg3ZTI1Mzk4MmI4YTM4NDlhMmNjM2Q3MzE3ZTQ4MmYyZFwiXSxcIm1zZ190c1wiOjE3NDY3OTkxNzh9In0 https://mandrillapp.com/track/click/30192150/www.pinterest.com?p=eyJzIjoic2VQbTdwSTB4M2h2RDFmNFlPOXF1YnYzWGt3IiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnBpbnRlcmVzdC5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcImM4OTJhYjA0OTk5ZTk5MDA4NDJmOWQzNjRjZWUwMmE2MjgyMjlmODVcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9 https://mandrillapp.com/track/click/30192150/www.facebook.com?p=eyJzIjoiRG9yOGVxa1FucERTZ01hWTZCTVRiM1hoVlBrIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy5mYWNlYm9vay5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcIjkzZmY0YTY4MzFmZWM2YzJhMmU5YWI2NDBmMTEwMmNlMzU0M2ZlNWZcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9 https://mandrillapp.com/track/click/30192150/twitter.com?p=eyJzIjoiUGxWTUplQVlaZS1Na3lTRk1xZlN3UG14VFljIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3R3aXR0ZXIuY29tXFxcL1pvbGFcIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcIjQ2NmVmMjJiOTk0NTUzMDMyYTI2NDViYjY5YjIxNThjNjRjNDdjMjNcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9\n\n We're Here to Help\nHave feedback? Questions? We're all ears.\nReach out to us anytime at weddingvendors@zola.com (mailto:weddingvendors@zola.com) .\n\n ZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)\n	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:23.616Z", "aiProcessing": "attempted"}	2025-05-15 00:16:23.634184	2025-05-15 00:16:23.634184
10	\N	\N	\N	email	incoming	2025-05-09 13:59:38	gmail_sync	<30192150.20250509135938.681e0a4a3cb662.13288207@mail133-197.atl131.mandrillapp.com>	Good news! Your Zola plan is ready to use	weddingvendors@zola.com	hello@eathomebites.com	https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiOTNycmhzdEpFS1N6NERoRzhZRkkxQ3g1ZkFJIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC8_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCZ1dG1fY2FtcGFpZ249bWFya2V0cGxhY2VfbGlzdGluZ3B1Ymxpc2hlZFwiLFwiaWRcIjpcIjBkYWM5YzliYThiZTQ2N2FiNTFlOGI0MGJkODc2ODg3XCIsXCJ1cmxfaWRzXCI6W1wiZTA3OWQ2NDIyMjdkZTVjZTEwOTFkNDQ0NTg3OGRjMWVjMjdjYjhiZlwiXSxcIm1zZ190c1wiOjE3NDY3OTkxNzh9In0\n\n ?utm_medium=email&utm_source=triggered&utm_campaign=marketplace_listingpublished Thanks for your order!\n\n Hi Mike,\n\nYou recently purchased a credit package from Zola. Please see the details of your transaction below. ORDER NUMBER: 41253969\nDATE OF PURCHASE: 5/9/2025\nLISTING NAME: Home Bites LLC\nPACKAGE PURCHASED: 3 Month Plan\nPAYMENT METHOD: Visa ending in 6203\nSUBTOTAL: $90\nTAX: $9.32\nTOTAL: $99.32\n\nBILLING ADDRESS\nCosmas Bisticas\n19233 98th Ave S, Renton, WA, USA\n Renton, WA 98055\n\nBUSINESS ADDRESS\nHome Bites LLC\n1005 Terrace St\n Seattle, WA 98104\nHead to the "Your Inquiries" page (https://www.zola.com/inspire/vendors/leads) to connect with couples using your credits anytime. Warm regards,\nTeam Zola\n\n https://mandrillapp.com/track/click/30192150/instagram.com?p=eyJzIjoiOUJtM1lNWVFDZm1jQ0VtSTlvWTRxNzhoeU5FIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvaW5zdGFncmFtLmNvbVxcXC96b2xhXFxcL1wiLFwiaWRcIjpcIjBkYWM5YzliYThiZTQ2N2FiNTFlOGI0MGJkODc2ODg3XCIsXCJ1cmxfaWRzXCI6W1wiYWMxNGYzMTg3ZTI1Mzk4MmI4YTM4NDlhMmNjM2Q3MzE3ZTQ4MmYyZFwiXSxcIm1zZ190c1wiOjE3NDY3OTkxNzh9In0 https://mandrillapp.com/track/click/30192150/www.pinterest.com?p=eyJzIjoic2VQbTdwSTB4M2h2RDFmNFlPOXF1YnYzWGt3IiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnBpbnRlcmVzdC5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcImM4OTJhYjA0OTk5ZTk5MDA4NDJmOWQzNjRjZWUwMmE2MjgyMjlmODVcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9 https://mandrillapp.com/track/click/30192150/www.facebook.com?p=eyJzIjoiRG9yOGVxa1FucERTZ01hWTZCTVRiM1hoVlBrIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy5mYWNlYm9vay5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcIjkzZmY0YTY4MzFmZWM2YzJhMmU5YWI2NDBmMTEwMmNlMzU0M2ZlNWZcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9 https://mandrillapp.com/track/click/30192150/twitter.com?p=eyJzIjoiUGxWTUplQVlaZS1Na3lTRk1xZlN3UG14VFljIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3R3aXR0ZXIuY29tXFxcL1pvbGFcIixcImlkXCI6XCIwZGFjOWM5YmE4YmU0NjdhYjUxZThiNDBiZDg3Njg4N1wiLFwidXJsX2lkc1wiOltcIjQ2NmVmMjJiOTk0NTUzMDMyYTI2NDViYjY5YjIxNThjNjRjNDdjMjNcIl0sXCJtc2dfdHNcIjoxNzQ2Nzk5MTc4fSJ9\n\n We're Here to Help\nHave feedback? Questions? We're all ears.\nReach out to us anytime at weddingvendors@zola.com (mailto:weddingvendors@zola.com) .\n\n ZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)\n	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:23.930Z", "aiProcessing": "attempted"}	2025-05-15 00:16:23.947471	2025-05-15 00:16:23.947471
11	\N	\N	\N	email	incoming	2025-05-08 02:21:29	gmail_sync	<30192150.20250508022129.681c1529b58c21.21787249@mail133-197.atl131.mandrillapp.com>	Madison D & Matthew G closed their inquiry	weddingvendors@zola.com	hello@eathomebites.com	We moved them to your “Closed” filter on your Inquiries tab for you.\n\nZola\n[https://mcusercontent.com/546021377172470de90f770c5/images/44b4cb13-a242-64bb-17da-073f727cc72e.jpg]\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieHdDSkctZmppaDNLMk5BYnp6alh6dTYwX3hNIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnpvbGEuY29tXFxcL2luc3BpcmVcXFwvdmVuZG9ycz91dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9dHJpZ2dlcmVkJiR3ZWJfb25seT10cnVlJm5vYXBwPXRydWVcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcIjI5ZWM3Y2JlMWFkODhjNzQ3MzRlODNkOWUzODc4Y2EzYThkMzc2ZWJcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9\n\n[https://d3g67pl7pwo7b.cloudfront.net/email/vendor_request/doves_vendor_request_couples.gif]\nMadison D & Matthew G closed their inquiry\n\nWe’re sorry this couple didn’t work out, as they went in another direction. We\ntook care of moving them to the "Closed" filter on your Inquiries tab for you.\nNo further action is needed on your end. You may be eligible to have your\ncredits returned to you under our Credit Protection Policy (see details\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiREtXNG5pTFdTZm1lZEhDR2h1SmZGVGk0Q1pJIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvY3JlZGl0LXByb3RlY3Rpb24tcG9saWN5XCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJlMDc5ZDY0MjIyN2RlNWNlMTA5MWQ0NDQ1ODc4ZGMxZWMyN2NiOGJmXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ].)\n\nNow let’s get back to finding the right couples for you.\n\nSEE YOUR DASHBOARD\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiNzNQdTY0WkVtejVsdnpKT3pLcFlkVEE1S2dBIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvbGVhZHNcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9]\n\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiNzNQdTY0WkVtejVsdnpKT3pLcFlkVEE1S2dBIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvbGVhZHNcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9]\n\nVendor Login\n[https://mcusercontent.com/546021377172470de90f770c5/images/a8651d9c-8952-4027-912f-cf6996995424.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieHdDSkctZmppaDNLMk5BYnp6alh6dTYwX3hNIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnpvbGEuY29tXFxcL2luc3BpcmVcXFwvdmVuZG9ycz91dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9dHJpZ2dlcmVkJiR3ZWJfb25seT10cnVlJm5vYXBwPXRydWVcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcIjI5ZWM3Y2JlMWFkODhjNzQ3MzRlODNkOWUzODc4Y2EzYThkMzc2ZWJcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9\nDashboard\n[https://mcusercontent.com/546021377172470de90f770c5/images/c2e798d9-0474-3f78-743f-a2d04a306430.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoic2ZPei1STHNHTzRIN1Zidjd5bmk1WWpqYkg0IiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvZGFzaGJvYXJkP3V0bV9tZWRpdW09ZW1haWwmdXRtX3NvdXJjZT10cmlnZ2VyZWQmJHdlYl9vbmx5PXRydWUmbm9hcHA9dHJ1ZVwiLFwiaWRcIjpcIjcxNjc0NDA0ZjAwMDQ2YTBhYjdkMzQ0NjIyMWNiNmZlXCIsXCJ1cmxfaWRzXCI6W1wiZTA3OWQ2NDIyMjdkZTVjZTEwOTFkNDQ0NTg3OGRjMWVjMjdjYjhiZlwiXSxcIm1zZ190c1wiOjE3NDY2NzA4ODl9In0\nFAQs\n[https://mcusercontent.com/546021377172470de90f770c5/images/fb8313a7-6c3d-4b21-5a4d-aff96962a620.jpg]https://mandrillapp.com/track/click/30192150/help.zola.com?p=eyJzIjoiTGI2SkFzckJUMURMcXJuWUN1WlIzZnBHTFRZIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL2hlbHAuem9sYS5jb21cXFwvaGNcXFwvZW4tdXNcXFwvY2F0ZWdvcmllc1xcXC8zNjAwMDAzMTAyNzEtVmVuZG9yLU1hcmtldHBsYWNlLWZvci1XZWRkaW5nLVByb2Zlc3Npb25hbHM_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCYkd2ViX29ubHk9dHJ1ZSZub2FwcD10cnVlXCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJmYTZlMjk5Nzc2ZDFkODg4MzNlYjZjMTZjZmM4NGQxNzdiMzc5ODRjXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ\nRefer a vendor\n[https://mcusercontent.com/546021377172470de90f770c5/images/54047650-27df-c403-7138-63919afa9ced.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiTEJfdGQ0bjg5WEZ4WW4yODFrd1RETXoxWnlVIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvcmVmZXItYS12ZW5kb3I_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCYkd2ViX29ubHk9dHJ1ZSZub2FwcD10cnVlXCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJlMDc5ZDY0MjIyN2RlNWNlMTA5MWQ0NDQ1ODc4ZGMxZWMyN2NiOGJmXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ\n\nZOLA\n7 World Trade Center, 39th Floor, New York, NY 10006\nReach out at weddingvendors@zola.com [weddingvendors@zola.com]\n\n\n[https://mandrillapp.com/track/open.php?u=30192150&id=71674404f00046a0ab7d3446221cb6fe]	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:24.270Z", "aiProcessing": "attempted"}	2025-05-15 00:16:24.287962	2025-05-15 00:16:24.287962
12	\N	\N	\N	email	incoming	2025-05-08 02:21:29	gmail_sync	<30192150.20250508022129.681c1529b58c21.21787249@mail133-197.atl131.mandrillapp.com>	Madison D & Matthew G closed their inquiry	weddingvendors@zola.com	hello@eathomebites.com	We moved them to your “Closed” filter on your Inquiries tab for you.\n\nZola\n[https://mcusercontent.com/546021377172470de90f770c5/images/44b4cb13-a242-64bb-17da-073f727cc72e.jpg]\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieHdDSkctZmppaDNLMk5BYnp6alh6dTYwX3hNIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnpvbGEuY29tXFxcL2luc3BpcmVcXFwvdmVuZG9ycz91dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9dHJpZ2dlcmVkJiR3ZWJfb25seT10cnVlJm5vYXBwPXRydWVcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcIjI5ZWM3Y2JlMWFkODhjNzQ3MzRlODNkOWUzODc4Y2EzYThkMzc2ZWJcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9\n\n[https://d3g67pl7pwo7b.cloudfront.net/email/vendor_request/doves_vendor_request_couples.gif]\nMadison D & Matthew G closed their inquiry\n\nWe’re sorry this couple didn’t work out, as they went in another direction. We\ntook care of moving them to the "Closed" filter on your Inquiries tab for you.\nNo further action is needed on your end. You may be eligible to have your\ncredits returned to you under our Credit Protection Policy (see details\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiREtXNG5pTFdTZm1lZEhDR2h1SmZGVGk0Q1pJIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvY3JlZGl0LXByb3RlY3Rpb24tcG9saWN5XCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJlMDc5ZDY0MjIyN2RlNWNlMTA5MWQ0NDQ1ODc4ZGMxZWMyN2NiOGJmXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ].)\n\nNow let’s get back to finding the right couples for you.\n\nSEE YOUR DASHBOARD\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiNzNQdTY0WkVtejVsdnpKT3pLcFlkVEE1S2dBIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvbGVhZHNcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9]\n\n[https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiNzNQdTY0WkVtejVsdnpKT3pLcFlkVEE1S2dBIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvbGVhZHNcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9]\n\nVendor Login\n[https://mcusercontent.com/546021377172470de90f770c5/images/a8651d9c-8952-4027-912f-cf6996995424.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieHdDSkctZmppaDNLMk5BYnp6alh6dTYwX3hNIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnpvbGEuY29tXFxcL2luc3BpcmVcXFwvdmVuZG9ycz91dG1fbWVkaXVtPWVtYWlsJnV0bV9zb3VyY2U9dHJpZ2dlcmVkJiR3ZWJfb25seT10cnVlJm5vYXBwPXRydWVcIixcImlkXCI6XCI3MTY3NDQwNGYwMDA0NmEwYWI3ZDM0NDYyMjFjYjZmZVwiLFwidXJsX2lkc1wiOltcIjI5ZWM3Y2JlMWFkODhjNzQ3MzRlODNkOWUzODc4Y2EzYThkMzc2ZWJcIl0sXCJtc2dfdHNcIjoxNzQ2NjcwODg5fSJ9\nDashboard\n[https://mcusercontent.com/546021377172470de90f770c5/images/c2e798d9-0474-3f78-743f-a2d04a306430.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoic2ZPei1STHNHTzRIN1Zidjd5bmk1WWpqYkg0IiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvZGFzaGJvYXJkP3V0bV9tZWRpdW09ZW1haWwmdXRtX3NvdXJjZT10cmlnZ2VyZWQmJHdlYl9vbmx5PXRydWUmbm9hcHA9dHJ1ZVwiLFwiaWRcIjpcIjcxNjc0NDA0ZjAwMDQ2YTBhYjdkMzQ0NjIyMWNiNmZlXCIsXCJ1cmxfaWRzXCI6W1wiZTA3OWQ2NDIyMjdkZTVjZTEwOTFkNDQ0NTg3OGRjMWVjMjdjYjhiZlwiXSxcIm1zZ190c1wiOjE3NDY2NzA4ODl9In0\nFAQs\n[https://mcusercontent.com/546021377172470de90f770c5/images/fb8313a7-6c3d-4b21-5a4d-aff96962a620.jpg]https://mandrillapp.com/track/click/30192150/help.zola.com?p=eyJzIjoiTGI2SkFzckJUMURMcXJuWUN1WlIzZnBHTFRZIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL2hlbHAuem9sYS5jb21cXFwvaGNcXFwvZW4tdXNcXFwvY2F0ZWdvcmllc1xcXC8zNjAwMDAzMTAyNzEtVmVuZG9yLU1hcmtldHBsYWNlLWZvci1XZWRkaW5nLVByb2Zlc3Npb25hbHM_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCYkd2ViX29ubHk9dHJ1ZSZub2FwcD10cnVlXCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJmYTZlMjk5Nzc2ZDFkODg4MzNlYjZjMTZjZmM4NGQxNzdiMzc5ODRjXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ\nRefer a vendor\n[https://mcusercontent.com/546021377172470de90f770c5/images/54047650-27df-c403-7138-63919afa9ced.jpg]https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiTEJfdGQ0bjg5WEZ4WW4yODFrd1RETXoxWnlVIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcXFwvcmVmZXItYS12ZW5kb3I_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCYkd2ViX29ubHk9dHJ1ZSZub2FwcD10cnVlXCIsXCJpZFwiOlwiNzE2NzQ0MDRmMDAwNDZhMGFiN2QzNDQ2MjIxY2I2ZmVcIixcInVybF9pZHNcIjpbXCJlMDc5ZDY0MjIyN2RlNWNlMTA5MWQ0NDQ1ODc4ZGMxZWMyN2NiOGJmXCJdLFwibXNnX3RzXCI6MTc0NjY3MDg4OX0ifQ\n\nZOLA\n7 World Trade Center, 39th Floor, New York, NY 10006\nReach out at weddingvendors@zola.com [weddingvendors@zola.com]\n\n\n[https://mandrillapp.com/track/open.php?u=30192150&id=71674404f00046a0ab7d3446221cb6fe]	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:24.460Z", "aiProcessing": "attempted"}	2025-05-15 00:16:24.477516	2025-05-15 00:16:24.477516
13	\N	\N	\N	email	incoming	2025-05-07 16:31:02	gmail_sync	<30192150.20250507163102.681b8ac6f15208.51796581@mail133-209.atl131.mandrillapp.com>	New message from Chantelle M & Joshua W for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	Reply now to keep the conversation going.\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieEMtbzM5MGE2S2JLN1RmbExzaWVadDRXVkNrIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcIixcImlkXCI6XCI3ZTBlYzE1N2U5Njg0MjYyODI3ODA3MjliZTYxZDE0YlwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjM1NDYyfSJ9\n#\nRespond to Chantelle M & Joshua W\nGetting married on June 6, 2026\nWedding budget of Up to $3,000\n\nChantelle's message\n\n" I think the taco truck is best option for us just want to make sure the venue and you are able to set up there comfortably "\n \n------------------------------------------------------------\n\nRespond on Zola (https://www.zola.com/inspire/vendors/leads/ready/b7f26c40-e59a-4173-a7ea-fc78123082e1?utm_medium=email&utm_source=triggered&utm_campaign=new_couple_message)\nOr reply to this email directly.\nYou can attach JPG, PNG, and PDF files under 20 MB in size.\nZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:24.807Z", "aiProcessing": "attempted"}	2025-05-15 00:16:24.825589	2025-05-15 00:16:24.825589
14	\N	\N	\N	email	incoming	2025-05-07 16:31:02	gmail_sync	<30192150.20250507163102.681b8ac6f15208.51796581@mail133-209.atl131.mandrillapp.com>	New message from Chantelle M & Joshua W for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	Reply now to keep the conversation going.\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoieEMtbzM5MGE2S2JLN1RmbExzaWVadDRXVkNrIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcIixcImlkXCI6XCI3ZTBlYzE1N2U5Njg0MjYyODI3ODA3MjliZTYxZDE0YlwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2NjM1NDYyfSJ9\n#\nRespond to Chantelle M & Joshua W\nGetting married on June 6, 2026\nWedding budget of Up to $3,000\n\nChantelle's message\n\n" I think the taco truck is best option for us just want to make sure the venue and you are able to set up there comfortably "\n \n------------------------------------------------------------\n\nRespond on Zola (https://www.zola.com/inspire/vendors/leads/ready/b7f26c40-e59a-4173-a7ea-fc78123082e1?utm_medium=email&utm_source=triggered&utm_campaign=new_couple_message)\nOr reply to this email directly.\nYou can attach JPG, PNG, and PDF files under 20 MB in size.\nZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:25.101Z", "aiProcessing": "attempted"}	2025-05-15 00:16:25.119868	2025-05-15 00:16:25.119868
15	\N	\N	\N	email	incoming	2025-05-02 13:18:41	gmail_sync	<1746191920910.0efa23dc-f1c2-4f87-a0cc-956942595124@bf01x.hubspotemail.net>	Response needed—You have a new inquiry!	weddingvendors@zola.com	hello@eathomebites.com	Don't leave your lead waiting\n\nZola for vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pbW7-QSpr6WWV1lN3MhyHQWsqr2N4JGR9qKhK3CW69f8bc1stZh3W8gXgYV7bMyxFW3qLr9X2Q9qmVW1t2G0l7Z29VwW9cGlFv55VgvdW6d6bTz7VdvgLW52KMRp7tT39LW1BVzT23wdjZfW5FKZs13MXXrmW830Crx3n-3TfW7S-VLS3VhCNcW8Wlqnn26cvKQVV7QdR4G8dWjW5PZb9p5j1rTSW2pXMLN5qKf4vW3H5QbD4Fv7GFW3w_Xpl6pQ7P8W54XL2K2DHMMvW2S8sPw3JkD57f6-6Dgs04 )\n\nHome Bites LLC,\n\nMadison D. and Matthew G. have sent an inquiry!\n\nHead to your dashboard and respond. You can connect with leads you think are a match, or politely decline.\n\n0405_Vendor Inquiry Reminder Series 1a-3 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nrespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nPro tip (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nfooter_login (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pbW7-QSpr6WWV1lN3MhyHQWsqr2N4JGR9qKhK3CW69f8bc1stZh3W8gXgYV7bMyxFW3qLr9X2Q9qmVW1t2G0l7Z29VwW9cGlFv55VgvdW6d6bTz7VdvgLW52KMRp7tT39LW1BVzT23wdjZfW5FKZs13MXXrmW830Crx3n-3TfW7S-VLS3VhCNcW8Wlqnn26cvKQVV7QdR4G8dWjW5PZb9p5j1rTSW2pXMLN5qKf4vW3H5QbD4Fv7GFW3w_Xpl6pQ7P8W54XL2K2DHMMvW2S8sPw3JkD57f6-6Dgs04 )\n\nfooter_dashboard (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3nKW4Hqlf_5vmGnZVBJbMh1P9FhRVSgdVq816BvDW1H_m9698v9dhW3YY9VD8Pl0H2W2lSYsX3Fgp1BW719ZNn4gQw7YW2J79Z67r7kNTW66jynl3bb9DPW4DnGqk1bxVXLW2KDJmG2-fnS3W2lnBDC1n3WpFVTQMKj6HvlRhN1bVhBP8H6QGW22cCxt8-4_dTW4SWs4p1fZKpMW82gwtF3szwZZW8RfYQG24jQXWW3n--ll3SrXMxW546G2K5Lw5WqW736N7Y3_9XypW6x9NKJ6jVz3Yf6qWPzH04 )\n\nfooter_FAQ (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3TT3l5QzW8wLKSR6lZ3mMW8rRPPJ1CkpKTN3vZ_k85grmSW4lQlG86qhKH9W7fnQ2745wZfqN4ZjSHVXJ3BZN2mKjBQkPqPgVcSWHB2rLny6W4lyFXF7b86myW7nPTbx6QXkHxW7JMh282Y4Z_nW7s2DQy55xTnhW4mNmkV5LC4JQVDWt1Y3f7sYSW286mxl4HSnF-W3QFqk238ZrvmW11fZmp7qykwhW8c8djK93YSSBW7Xc2yM3xnKgpW7Hy7Kf4ykYRZN6z2KPLfsyQFVt481X70d8h1W8TFT_79hx7bbW47Prcy8RBlTTW2gqhwy2_hzZKW68TP6-7jY_SRW5LmDqt4vFZltW8bWcWV7p2r87VYXPrD2rFVX-f1Q3mbC04 )\n\nfooter_Refer (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pMW4w14gs2yPSWlW3H__cL4M0YQgW3DPLsV5zqNDJW6LsNk55Kqj7KN75HV5nWGT7TN5fkmpqDwYfGW4w-tGN4gBRNCW1qjtzj1Ttv0mW3KlmP11lcVVFW4K6v0t5FJmG6W6p9j_W8Vc0S6N3RFDv9rSqlNW6WXrlp6s4cyKW8qL0Wr4qsSPDW7NQPb94gTX-0W7wWznK4tT8sZVW1K1Z2gtFVWW18l-2_3bdyhXW4ljxRF5c5c4jW8krbMP8gRtpNN4_tpzfn38jvN3h1j6X8p__Vf8zVP_F04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3kxW4THBVW7p50nFW3PD_wD5pNkSbW71zBV36tj0qtV1VLSR2nwlGwW6wJN0W4R19WfV5jnCs5nHgdLW6jTR_44WpVc-W3gF_704NM5cnW1cY2Hg7XNzqqW7pJjx_87SMFXW6TQsS63dvwt1VCDprz1qVx-hW5N2dYq5SJBJSW1jf-XG2xHb_1N7N8mWxD7jqXW5fGfGn436Nk1W1J067N3lxKdJW93dkCH5_b1J3W4KMbLg5qnwKqW5M1Fsm6Vbd8FW41K-762HhgkbW2DsxQ778byVYf4H1Jw204 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MNW2xPmB51S1VqFW4p7j2G3g97ZkW257Y-T4tBpsqW3ZJD7D3ZYy9YW1Qwt973gh04YW3XWGlF1XxWpcW3bsvm92t78myW36pf9832nNswW3_sstt4fG9x-W2zFjG22KV6GKW2-Hdnx2MQc3GW2-dWtj2YHnQXW3SRW_Y2xYlKdW4kptfT30sP2KW2-bqJr3dqgTqW3F9c4L3H8CkHW3FdYX62TQR2fW1WYpx_41rWCcW2Kz-KC3_-m86W4kvsmk2zM3wsW2x-Nx82qG-3xW2Hp_304rCSwQW2MB7d04fG9W8W38h6gq4tG89vW1Lpd3r2t1ksVW45FLZ_2YMx3mW1Zd3pT4pzY15W2-Mlv13XwsnyW4myW5F2-czpNW1XnzyV3W3BdHW4ppQYs30qJB1W2qXHXn2-tN4DW2vQp391BdtF2W30l56W1QxMgjW3yWC_t3NXW_ZW4pcmfN43FXj8W2WL6MG2YvT0vW2WJT_32xySdnW1_lwXD3gq30rW2YyhCx3XFVXDW2r6Y9v2YDSfrW1Vq1N62FYwydW1Vc9db3K2Y5jW45xWKK3C62CtW2nTZss2Pvqq_f3R3zhZ04&_hsenc=p2ANqtz-9cm1tV3zqaX5FushrDo_wlWf4YuvkAyn-5N3OW_4F9FupokcEZqu5zLB8-ynafiOCpZsHqm5dp2ElTUgiYp_IicM_B7A&_hsmi=305075840 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MNW2xPmB51S1VqFW4p7j2G3g97ZkW257Y-T4tBpsqW3ZJD7D3ZYy9YW1Qwt973gh04YW3XWGlF1XxWpcW3bsvm92t78myW36pf9832nNswW3_sstt4fG9x-W2zFjG22KV6GKW2-Hdnx2MQc3GW2-dWtj2YHnQXW3SRW_Y2xYlKdW4kptfT30sP2KW2-bqJr3dqgTqW3F9c4L3H8CkHW3FdYX62TQR2fW1WYpx_41rWCcW2Kz-KC3_-m86W4kvsmk2zM3wsW2x-Nx82qG-3xW2Hp_304rCSwQW2MB7d04fG9W8W38h6gq4tG89vW1Lpd3r2t1ksVW45FLZ_2YMx3mW1Zd3pT4pzY15W2-Mlv13XwsnyW4myW5F2-czpNW1XnzyV3W3BdHW4ppQYs30qJB1W2qXHXn2-tN4DW2vQp391BdtF2W30l56W1QxMgjW3yWC_t3NXW_ZW4pcmfN43FXj8W2WL6MG2YvT0vW2WJT_32xySdnW1_lwXD3gq30rW2YyhCx3XFVXDW2r6Y9v2YDSfrW1Vq1N62FYwydW1Vc9db3K2Y5jW45xWKK3C62CtW2nTZss2Pvqq_f3R3zhZ04&_hsenc=p2ANqtz-9cm1tV3zqaX5FushrDo_wlWf4YuvkAyn-5N3OW_4F9FupokcEZqu5zLB8-ynafiOCpZsHqm5dp2ElTUgiYp_IicM_B7A&_hsmi=305075840 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:25.399Z", "aiProcessing": "attempted"}	2025-05-15 00:16:25.417869	2025-05-15 00:16:25.417869
16	\N	\N	\N	email	incoming	2025-05-02 13:18:41	gmail_sync	<1746191920910.0efa23dc-f1c2-4f87-a0cc-956942595124@bf01x.hubspotemail.net>	Response needed—You have a new inquiry!	weddingvendors@zola.com	hello@eathomebites.com	Don't leave your lead waiting\n\nZola for vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pbW7-QSpr6WWV1lN3MhyHQWsqr2N4JGR9qKhK3CW69f8bc1stZh3W8gXgYV7bMyxFW3qLr9X2Q9qmVW1t2G0l7Z29VwW9cGlFv55VgvdW6d6bTz7VdvgLW52KMRp7tT39LW1BVzT23wdjZfW5FKZs13MXXrmW830Crx3n-3TfW7S-VLS3VhCNcW8Wlqnn26cvKQVV7QdR4G8dWjW5PZb9p5j1rTSW2pXMLN5qKf4vW3H5QbD4Fv7GFW3w_Xpl6pQ7P8W54XL2K2DHMMvW2S8sPw3JkD57f6-6Dgs04 )\n\nHome Bites LLC,\n\nMadison D. and Matthew G. have sent an inquiry!\n\nHead to your dashboard and respond. You can connect with leads you think are a match, or politely decline.\n\n0405_Vendor Inquiry Reminder Series 1a-3 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nrespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nPro tip (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3Tz3l5QzW7Y8-PT6lZ3m9W94pHtZ8N6ZYBW1wZWzK2BN6StW3BK8p93BCD6PW5GZc3t85FMxSW3f__tn97HDZ1W6FjDMl8wc0QqW4v8zBd1DPdxkW5Bj2yV2dfch-W3NSgrM43-qKnW8Bx0x45dVZJLW3819QX5mg-PnW1BdKXm3frz8fW7wngSB7CZP3BW8DTf0C1zskg8W24s-pn42Cwm-W3__VQH6MB3KFN8C44m5YrPClW5KF8Dh4gW_RCMqj2dNzWqRFW80XsfD1q3H-bW2g1fXw77bsvVW9lY_3m6BZ-PkW2Qx0wq72pgq7W5fCCYj6XDkrgW6Cw4CC6kMgypW1vqxdW3-wjgFf5V2mGY04 )\n\nfooter_login (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pbW7-QSpr6WWV1lN3MhyHQWsqr2N4JGR9qKhK3CW69f8bc1stZh3W8gXgYV7bMyxFW3qLr9X2Q9qmVW1t2G0l7Z29VwW9cGlFv55VgvdW6d6bTz7VdvgLW52KMRp7tT39LW1BVzT23wdjZfW5FKZs13MXXrmW830Crx3n-3TfW7S-VLS3VhCNcW8Wlqnn26cvKQVV7QdR4G8dWjW5PZb9p5j1rTSW2pXMLN5qKf4vW3H5QbD4Fv7GFW3w_Xpl6pQ7P8W54XL2K2DHMMvW2S8sPw3JkD57f6-6Dgs04 )\n\nfooter_dashboard (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3nKW4Hqlf_5vmGnZVBJbMh1P9FhRVSgdVq816BvDW1H_m9698v9dhW3YY9VD8Pl0H2W2lSYsX3Fgp1BW719ZNn4gQw7YW2J79Z67r7kNTW66jynl3bb9DPW4DnGqk1bxVXLW2KDJmG2-fnS3W2lnBDC1n3WpFVTQMKj6HvlRhN1bVhBP8H6QGW22cCxt8-4_dTW4SWs4p1fZKpMW82gwtF3szwZZW8RfYQG24jQXWW3n--ll3SrXMxW546G2K5Lw5WqW736N7Y3_9XypW6x9NKJ6jVz3Yf6qWPzH04 )\n\nfooter_FAQ (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3TT3l5QzW8wLKSR6lZ3mMW8rRPPJ1CkpKTN3vZ_k85grmSW4lQlG86qhKH9W7fnQ2745wZfqN4ZjSHVXJ3BZN2mKjBQkPqPgVcSWHB2rLny6W4lyFXF7b86myW7nPTbx6QXkHxW7JMh282Y4Z_nW7s2DQy55xTnhW4mNmkV5LC4JQVDWt1Y3f7sYSW286mxl4HSnF-W3QFqk238ZrvmW11fZmp7qykwhW8c8djK93YSSBW7Xc2yM3xnKgpW7Hy7Kf4ykYRZN6z2KPLfsyQFVt481X70d8h1W8TFT_79hx7bbW47Prcy8RBlTTW2gqhwy2_hzZKW68TP6-7jY_SRW5LmDqt4vFZltW8bWcWV7p2r87VYXPrD2rFVX-f1Q3mbC04 )\n\nfooter_Refer (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3pMW4w14gs2yPSWlW3H__cL4M0YQgW3DPLsV5zqNDJW6LsNk55Kqj7KN75HV5nWGT7TN5fkmpqDwYfGW4w-tGN4gBRNCW1qjtzj1Ttv0mW3KlmP11lcVVFW4K6v0t5FJmG6W6p9j_W8Vc0S6N3RFDv9rSqlNW6WXrlp6s4cyKW8qL0Wr4qsSPDW7NQPb94gTX-0W7wWznK4tT8sZVW1K1Z2gtFVWW18l-2_3bdyhXW4ljxRF5c5c4jW8krbMP8gRtpNN4_tpzfn38jvN3h1j6X8p__Vf8zVP_F04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVtlJ583YRbGW4ZCHTD3SH_1rW1k1H6J5w4mJ5MwF3S-3l5QzW6N1vHY6lZ3kxW4THBVW7p50nFW3PD_wD5pNkSbW71zBV36tj0qtV1VLSR2nwlGwW6wJN0W4R19WfV5jnCs5nHgdLW6jTR_44WpVc-W3gF_704NM5cnW1cY2Hg7XNzqqW7pJjx_87SMFXW6TQsS63dvwt1VCDprz1qVx-hW5N2dYq5SJBJSW1jf-XG2xHb_1N7N8mWxD7jqXW5fGfGn436Nk1W1J067N3lxKdJW93dkCH5_b1J3W4KMbLg5qnwKqW5M1Fsm6Vbd8FW41K-762HhgkbW2DsxQ778byVYf4H1Jw204 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MNW2xPmB51S1VqFW4p7j2G3g97ZkW257Y-T4tBpsqW3ZJD7D3ZYy9YW1Qwt973gh04YW3XWGlF1XxWpcW3bsvm92t78myW36pf9832nNswW3_sstt4fG9x-W2zFjG22KV6GKW2-Hdnx2MQc3GW2-dWtj2YHnQXW3SRW_Y2xYlKdW4kptfT30sP2KW2-bqJr3dqgTqW3F9c4L3H8CkHW3FdYX62TQR2fW1WYpx_41rWCcW2Kz-KC3_-m86W4kvsmk2zM3wsW2x-Nx82qG-3xW2Hp_304rCSwQW2MB7d04fG9W8W38h6gq4tG89vW1Lpd3r2t1ksVW45FLZ_2YMx3mW1Zd3pT4pzY15W2-Mlv13XwsnyW4myW5F2-czpNW1XnzyV3W3BdHW4ppQYs30qJB1W2qXHXn2-tN4DW2vQp391BdtF2W30l56W1QxMgjW3yWC_t3NXW_ZW4pcmfN43FXj8W2WL6MG2YvT0vW2WJT_32xySdnW1_lwXD3gq30rW2YyhCx3XFVXDW2r6Y9v2YDSfrW1Vq1N62FYwydW1Vc9db3K2Y5jW45xWKK3C62CtW2nTZss2Pvqq_f3R3zhZ04&_hsenc=p2ANqtz-9cm1tV3zqaX5FushrDo_wlWf4YuvkAyn-5N3OW_4F9FupokcEZqu5zLB8-ynafiOCpZsHqm5dp2ElTUgiYp_IicM_B7A&_hsmi=305075840 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MNW2xPmB51S1VqFW4p7j2G3g97ZkW257Y-T4tBpsqW3ZJD7D3ZYy9YW1Qwt973gh04YW3XWGlF1XxWpcW3bsvm92t78myW36pf9832nNswW3_sstt4fG9x-W2zFjG22KV6GKW2-Hdnx2MQc3GW2-dWtj2YHnQXW3SRW_Y2xYlKdW4kptfT30sP2KW2-bqJr3dqgTqW3F9c4L3H8CkHW3FdYX62TQR2fW1WYpx_41rWCcW2Kz-KC3_-m86W4kvsmk2zM3wsW2x-Nx82qG-3xW2Hp_304rCSwQW2MB7d04fG9W8W38h6gq4tG89vW1Lpd3r2t1ksVW45FLZ_2YMx3mW1Zd3pT4pzY15W2-Mlv13XwsnyW4myW5F2-czpNW1XnzyV3W3BdHW4ppQYs30qJB1W2qXHXn2-tN4DW2vQp391BdtF2W30l56W1QxMgjW3yWC_t3NXW_ZW4pcmfN43FXj8W2WL6MG2YvT0vW2WJT_32xySdnW1_lwXD3gq30rW2YyhCx3XFVXDW2r6Y9v2YDSfrW1Vq1N62FYwydW1Vc9db3K2Y5jW45xWKK3C62CtW2nTZss2Pvqq_f3R3zhZ04&_hsenc=p2ANqtz-9cm1tV3zqaX5FushrDo_wlWf4YuvkAyn-5N3OW_4F9FupokcEZqu5zLB8-ynafiOCpZsHqm5dp2ElTUgiYp_IicM_B7A&_hsmi=305075840 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:25.776Z", "aiProcessing": "attempted"}	2025-05-15 00:16:25.796112	2025-05-15 00:16:25.796112
19	\N	\N	\N	email	incoming	2025-04-28 22:57:09	gmail_sync	<1745881028554.e70f8b1e-74ad-40f5-b444-1672c980384c@20623097t.zola.com>	New Zola inquiry for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	The clock is ticking!\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPvP3prCCW6N1vHY6lZ3mXN7nt_RYbKJF3W7nWPVr5Hr7m0W1qtm9J8vKKVgVF9HLp3R3t1JW8Db79h2d_WMCW5gR5YG79QrvDW5VNSlv54yS-dW5lM1gp65sXNmW41jPLJ6Nz87qW4KMJ8m5XsZd1W6QvFmF6ZkZ_tW8XzRnC53XTMyW8-lHn_4LC7whW5tY6C_3XKL0hW7qPL_L5xXvLjV8FtBF1T8mt2N8zRPzD19yVdW99TFWk25ff7FW3brhxG6M45SzW3mpw__3mPsF3W45qDND4_dJX0VtFyzj8WgHjzf6yyGSg04 )\n\nsilvia chalwe & Richard Johnson sent you an inquiry!\n\nTo: Home Bites LLC\n\nRespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPwH3prCCW8wLKSR6lZ3lcW61bN5y2JVDdYN8clLd8L43ZQW6yYTzx47Pl84W3Cv0t61XmxxHW8Q7DyL357dD8W9bsQfK8zP5MdW2n9rTr3c1PymW6jF2s42b4xgkW7GZt8X92PWcVW4s8q-k7ts5ScW6_fCS651NCW_N1G5DyxR5T73W8jYwr17NZQ_wW8wh5Nm14hr8RW3Bs8Gl5N8DX-W6-vvQ690LHyCN35T8GjDzr7RW5lcyxL3wl2QpW7XVZJ984NnZjW5sZN453T-G7yW7W4kBZ6Qq8--W98qSZ1227-prN3tTDQ6KMJb3W5FYK2k5nn5svVHPSf37CRhKKW5ql0s33dTpYGW21R-4W6PMth3W6vP8v02jqLlwf6fKlRj04 )\n\nCouple email: chalwesilvia94@gmail.com\n\nCouple phone: 2069315683\n\nWedding Location: Arlington, WA\n\nDesired day: June 7, 2025\n\nTheir note to you\n\n“I saw the start price draw my attention and looking a reasonable pricing”\n\nConnect with confidence with our Connection Protection Policy (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPwn3prCCW7Y8-PT6lZ3nVVdjDNX2HKlsvN1B2kGV3k5MMW7JGjTG22WT1hW1XvKB42K8Z7YW7NRKJr5ZCFT3N7kB3Zbkc478W8JP5zP4nCdyqVmjgXb5d9VtYW85xnGG5tS_CgW8Q8JDF1Rv41vW80T1Nk1HCv4tW3Fj9Xp5bBh7WW3xR82S68g4Q3VvgjKQ8tpwv8W7HjVjb6GqCKNW1wdHLB5ffkMlW1R-VxQ1HZ9lZM-2scMVJTjSW7TwyLs3NF_2yW7tR2743rVr-fN728G8rZRBg4W4MR8-J2xGmxYW2-3TDk5Ytt4GW8sYNj88WtqfRW5P98sv1BsZMNN5f3MdFTCj7Pf59tZyT04 ) .\n\nVendor\nlogin (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPvP3cscvW6N1vHY6lZ3nkW8PDYgz5ktVxmN85Ykbj1KpQNW1GTS0p5qbyQYW7JlJWZ8d_vXcW6RRlzF4S5qsQN1K6PF2QQtq6V1S-sQ4Lrpn0W6tdCbj2p086kW3PgYw43GLsPhW5J-CM67Cy86FN7R2pM2Y1xbPW3f3pkN4s24S6Vk4wGP8k-3cvW88cybS2YgV4zW5MYr4f2LlpC6W8yb2wf2L1sV0W8gJj788nVSY3VrpNVn7cc05qW7RgSh11NMFbzW7M4fTQ6bQs3vW8CbXvq5dNqGHW57f8R517Xt5mf74CbsM04 )       Dashboard (#)\nFAQs (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPw-3cscvW95jsWP6lZ3mZW7Fsw032WGqZ4N6zyZ2f6jWLgW3gMTrl12dqyKN5DFR92pjfqjW26W4b-7BhDldW6_HL-l6VPrzYW4jLZzR2llDKtW3DzYrt2jFcyTW3T5WNt6Y7rFPW2wPW4b1TL-5GW2fG6JY3MSN6fVlkNf95fZklFW5mB8M23DSTCJW8yRqr210_-bgW7-Mfyn8h5vm6W7P9TLh6Jw-GTW4rbDnk3tP7cCW7tJh2m6-C3lbW5kMcSY6KkgJyM9PGtV-Rw1BW2dqVcT8HD35kW4fQSxS89dLr0W4pBvm74Xm-s4W1qJRLj7l-hhfW540sKZ8W1FfRW73_F4s5x2PMTW4pSSlj94XdlYW6mCNhM4t88pxW5h91yl3Bz82MW4nxzhM8V71Xxf7lzGC404 )\nRefer a\nvendor (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPw43cscvW7lCdLW6lZ3kBW8L71zh6RYbhCVHPbkz3zDYs4W4dJHy32HtyPVW2ghmdz5CRlyyVkZq5b7FcsZFW4yxMC-6pxnhXW5Dlczk1zd4PkV8vWdN7w864bW5xj1XC8NT9kjVzc2ys5FNbn7W3kg1qX7GjW1vW7SQC308RfqBpN71HZ6h5WhCjW3M7QZX6QFXl2W3JP44t1Z-kxvW1CPRbk14z0dQN8Bbl_s9-1NhW5BG_mX4RnQGlW6tzbzw42Kwl9W2vlvdj6W89r7W8jXd--4YKp7-W3254mh6_CRxNW7hl0cw8LRg3nW6nv1q-1jkB_Jf641QpT04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor,\nNew York, NY 10006\n\nReach out at\nweddingvendors@zola.com (mailto:weddingvendors@zola.com)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:26.864Z", "aiProcessing": "attempted"}	2025-05-15 00:16:26.882189	2025-05-15 00:16:26.882189
25	\N	\N	\N	email	incoming	2025-04-11 15:28:19	gmail_sync	<1744385299124.50855511-5209-4090-b0a3-ec9ce040bf77@bf01x.hubspotemail.net>	Big news: Officiants & Event Extras are now on Zola	weddingvendors@zola.com	hello@eathomebites.com	Tell one, tell all about these exciting additions!\n\nZola for vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8Nr03gP0xW7lCdLW6lZ3kPW1JFD4_1dgQWmVWBZHm2hW1y7W3S1PqC1tCPTKW3Pm0DJ38GcyhN80YN9Ll8C2xW1ZLClP7TjCMLW6-zGVv6T3ntdW3b4Tzd8tKQBQW4Zrwwq4C7t-ZW1ZKplK3Kc48bVRsC2Y2vzD7-W2gz8d44jM5VzW5kG48n22X79MW4l5dzN8MBVC0V3jlMN6Bd6sKW96X_DZ3_lyl0W58fwkY5l-F40W3k7MBd53P0XrW84JK3h1_zvx6W349VBw5Z26F_W6k_jZ_8x6DVLW4TSHPM8XR0gKW4NRv_J7846YBW8wMGBY6YGFzNf1Y51kg04 )\n\nWelcome to Zola: Officiants and Event Extras (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8Nrj3gP0xW7Y8-PT6lZ3l9W4dsT024cmZzxVpYrkk4G6jd8W4Tkz6n8nLhL_W32B9XL6v765zW3Cs2hy3DmMBkW7S8Xmx9cyKT0N1LBfv0hZBgDW6mWV2v6J3xPxW3Kp0xk1FK3qvW8f6vh3376nDCW8qfJ0B2SysrcW588NsR7yMVpMW8Dmf1w45BdJ8W7PHBbP8cKVzWW245jbp3BFX8BW44tSCG90-ZmhW29DhrZ5VV_XpW2q4r8w3CmvRqW5vxTgB1sMlGxW7Rh6RF4r3qGrW2L6y3r1Gf6f2N13WnzGZvXKSW8_lp313t0hFLN8JgHfdlqbRyW5m7mYT49Qp4qW93nLVq17P84bf8D7bF-04 )\n\n0325_Event_extras_and_officiant_3_03 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8Nrj3gP0xW7Y8-PT6lZ3l9W4dsT024cmZzxVpYrkk4G6jd8W4Tkz6n8nLhL_W32B9XL6v765zW3Cs2hy3DmMBkW7S8Xmx9cyKT0N1LBfv0hZBgDW6mWV2v6J3xPxW3Kp0xk1FK3qvW8f6vh3376nDCW8qfJ0B2SysrcW588NsR7yMVpMW8Dmf1w45BdJ8W7PHBbP8cKVzWW245jbp3BFX8BW44tSCG90-ZmhW29DhrZ5VV_XpW2q4r8w3CmvRqW5vxTgB1sMlGxW7Rh6RF4r3qGrW2L6y3r1Gf6f2N13WnzGZvXKSW8_lp313t0hFLN8JgHfdlqbRyW5m7mYT49Qp4qW93nLVq17P84bf8D7bF-04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8NrW3gP0xW95jsWP6lZ3m-W6SGJX-7VQhKQW31-Gqs6XDVvZW8-PHRt24cb03W14dm085hzzrcVHLlc626DCrSW9dVJVZ3xjCvmW4b4P1_4jgZCcVGW74M6GwCxbW6ghnWH6T5L23W7KnWtd2b15D1W8b7Zqy6zRqqKW7GfbQ-59gkxmW18yW5-3z6FS0N29fsHDfd5k0W6wQF5B198xbSN2BPGXmxNZ7dW4M9TD16S3BFbW8S9Tl96Rs41VN3k_Ztb4G4W-W250M1k1TWrgXW63vbfR6xHJsGT-R5s6Y1BLhW8n4Hcy9f1sR1W855SzM59-wQnW8f5Hsj3yZT00W655Rky7z0x_PVLMLK44_g6XHW3Qdq5w2T0SmTW7hWXvK5BcqmfW2cpc7x3MPpJtdXJgPH04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8NrC3prCCW8wLKSR6lZ3nLW5RDrwn99xmbbN8TwMn0D3H76W8w6vTz8DyMVzW4jsjf28FbvmxW6YVLzd9k8XnRW60XV0V3JRVgDW4J6XGw6bPGR7W7Gdptd1LJcn1VbrV2G4rJCDyW5WjMJ25Ww-h6V7y3wF1nTqjkW97jnQC5vJHv4W97xZC15TfRhpW88GHPd5nqH8HW6KQ92s8XwPt-W8rFf1f5PRnKcW2WB9_P7WGlh8W6vJkZx2FP1Z8W2PWdg52Fr05jW9jT6ZD16lCNVW1hrHpM8Q2STnW1nknx431HF60W3Qw4jg22mkl9W8MDhR23szv8VW8jxnSX1vyBr1N5F22lj_bvljN4zd53_kDkkFW8m5v5m5V_sGYf4JKFRj04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8Nq65m_5PW5BWr2F6lZ3pKW2LLt4p6_XySDW34T5zq99htp2W4NRg686vPmTjW1XZD7b4shWt5W7r0Z364j-r93W1WW0LY3XKhbzVXrNLY8DzJ0XW4xg5jZ6kHxpjW1zWdL-2_-CwPN6hC5XYCc2Z6W1cBlD01sgklCW6D_tg-3cyl0PW2llPGy4ZDJNbV-P3Nf5W6NKdW756Bjl8Mqg-0W1XDq_C3Pgv-sW8qDz8p90g6xCW7gLwKT7TV-Z4W98_l1S48hBkNW81HJq68M9t4xW4q5k9M4gyKVcW249bZY4rjV6FW7mxv8F2NB8cbW3LcN0g1WC11dN5C1HRMF6tXGW7TP9yQ2MyxRvN1Lw5s3ztSjVW8PNQvk6w5fC0W2rJ-yG6d_RQCW6RbClq4F_k39W57Crxh1Z2dDLW40Kf147YKM6JW8xSNv3667VyqW4zfQkW6Fwf0kf5MscKj04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8NrC3prCCW8wLKSR6lZ3pHVH2kX-2bJK7-W1GC8g98_ply2W2m3Xj94C-ht6W6GvVWM8BZLR7W2h13gD98l6MHN6q28T5w9xNdW5J6Fx37NTvR3W85J6B630jdjFW86W18z1KNgLKW8xt_JX8G5lccW3_R8-K8kp4VQN8MD0mHWw67tW9dcYXf40vrFYN2px-tN5MYlyVGYs4K21bPnJW7vPB801ClscFW7Cjc6d3x0l58W1CSnHd1d5XP5W182_-m2tGK-qW8_z6Kg1X8MNBW5FDKhk4MFLxlW15RXww5MrHbjW17ncN76cqkjXW403bsP4mMHc2W4DCg-059PvNzW9g4JNq28r9zsW95C0T0227WKyW8DTMTb63tB3jf7w1PF404 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MV-DMXF9rhFW5hvbqC5LxzxVW4lQ0X35vfyyMN6B8NrC3prCCW8wLKSR6lZ3l1W1W68d48rBNdyVzVYJX7-t1THM8Gy6kYtFtVW8vmDB72PSkHPW7Kp-545PSxj1MdVjmT2tPrTW2S8cRq3QyKPWW71Clb64GFjCxVZkCqQ1QLZrRW6mXKtT4wWl49W3dJb4L6t_bJ1W8fxf3X8mJrHxW3HPkdL63Ydk9W2-7WnY8pTGHqW36KMK81RyVXqW25RvVg2bkbLtW4yXyM83dlxbfW3K63Mh4Rv7SDW3-4kgz19NQvRW5b79sF91SKqDW7K23jz3p51rkW7lM6_G9dtvvTW2QxnYF8QScjFVRSr0v2_86FcVNL8dc5RtLlRVTJq5_7TcSVXW52jRjt8svbzbW3k6zNj7kfMsMf4kBdZq04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MkW3jc01j3F0vVrW24RPCX3G_T9ZW47w2mF1NG92GW4fDWhJ4rmwC-W4cP1kS3VWtgQW34z7Mz1V3hxcW3dyj7x2CZCj7W32rdg_3j4Ks4W3XvFj341SymwW38B29R30ppPKW2q_s8G2YKVj6W2RJpyc2KYsyPW3g9c513byWm7W4fRgtt2CYLMxW1L93Xf3XND60W2Pxr_c34r6WQW36pDD81BKKvzW3S_9Jz1S3vHsW1QgW1s2WPrqqW45PFWW4rnqlJW49LK4643Rv2nW2WzJ_x25nnRPW4fM9dS2-g8qGW2TtXyV43Xx5GW3jpqH02-CVqYW49mJZJ3484v_W36w3x_43YP21W3_Kc4Y2RSL_PW2KSsYy22VxL1W1_7fDb3P6j3XW2HFVq03yYjpHW3H5Htp3Xy448W2sQ8PY4mpGxYW1BqSsL3_RsXxW1Vs7W92KRLx5W3CfZKS4mjdppW3Swsdt3VJCsCW2Rk3s345Vzj9W38BrJy47xDNpW2KVyGM2TBLY6W36CQb11QyXnzW4ttz0q2HH8CKW3dnFKQ1XqK9dW1Q2xm03QTPV0W2MLWZb4rrGqhf3JJl_P04&_hsenc=p2ANqtz-_EGtk6PgZ369skJBTv4SxnH2y60YCC90emCwPqMfT6tvbHOx2zPLBn5oh5SdybyceJVOz4EhWMGBeqd_jCVaPJQ-z7gg&_hsmi=356162278 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MkW3jc01j3F0vVrW24RPCX3G_T9ZW47w2mF1NG92GW4fDWhJ4rmwC-W4cP1kS3VWtgQW34z7Mz1V3hxcW3dyj7x2CZCj7W32rdg_3j4Ks4W3XvFj341SymwW38B29R30ppPKW2q_s8G2YKVj6W2RJpyc2KYsyPW3g9c513byWm7W4fRgtt2CYLMxW1L93Xf3XND60W2Pxr_c34r6WQW36pDD81BKKvzW3S_9Jz1S3vHsW1QgW1s2WPrqqW45PFWW4rnqlJW49LK4643Rv2nW2WzJ_x25nnRPW4fM9dS2-g8qGW2TtXyV43Xx5GW3jpqH02-CVqYW49mJZJ3484v_W36w3x_43YP21W3_Kc4Y2RSL_PW2KSsYy22VxL1W1_7fDb3P6j3XW2HFVq03yYjpHW3H5Htp3Xy448W2sQ8PY4mpGxYW1BqSsL3_RsXxW1Vs7W92KRLx5W3CfZKS4mjdppW3Swsdt3VJCsCW2Rk3s345Vzj9W38BrJy47xDNpW2KVyGM2TBLY6W36CQb11QyXnzW4ttz0q2HH8CKW3dnFKQ1XqK9dW1Q2xm03QTPV0W2MLWZb4rrGqhf3JJl_P04&_hsenc=p2ANqtz-_EGtk6PgZ369skJBTv4SxnH2y60YCC90emCwPqMfT6tvbHOx2zPLBn5oh5SdybyceJVOz4EhWMGBeqd_jCVaPJQ-z7gg&_hsmi=356162278 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:28.667Z", "aiProcessing": "attempted"}	2025-05-15 00:16:28.684163	2025-05-15 00:16:28.684163
17	\N	\N	\N	email	incoming	2025-05-01 22:01:01	gmail_sync	<30192150.20250501220101.6813ef1d5dd785.81191871@mail133-209.atl131.mandrillapp.com>	New message from Chantelle M & Joshua W for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	Reply now to keep the conversation going.\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiRnR3Q2t3VHBaeTM4cmRfek5ETHc5aXdKdGRvIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcIixcImlkXCI6XCI5NmMzYWI0M2RhNTY0N2U3Yjk4MWM2NWY5Mjk3YmEwNVwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ2MTM2ODYxfSJ9\n#\nRespond to Chantelle M & Joshua W\nGetting married on June 6, 2026\nWedding budget of Up to $3,000\n\nChantelle's message\n\n" I looked over everything if I do the food truck option what do I need to provide for you ? \nSame question if we do buffet style we have the kitchen but would set up and take down plates all that type stuff included ? "\n \n------------------------------------------------------------\n\nRespond on Zola (https://www.zola.com/inspire/vendors/leads/ready/b7f26c40-e59a-4173-a7ea-fc78123082e1?utm_medium=email&utm_source=triggered&utm_campaign=new_couple_message)\nOr reply to this email directly.\nYou can attach JPG, PNG, and PDF files under 20 MB in size.\nZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:25.974Z", "aiProcessing": "attempted"}	2025-05-15 00:16:25.993266	2025-05-15 00:16:25.993266
18	\N	\N	\N	email	incoming	2025-04-28 22:57:09	gmail_sync	<1745881028554.e70f8b1e-74ad-40f5-b444-1672c980384c@20623097t.zola.com>	New Zola inquiry for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	The clock is ticking!\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPvP3prCCW6N1vHY6lZ3mXN7nt_RYbKJF3W7nWPVr5Hr7m0W1qtm9J8vKKVgVF9HLp3R3t1JW8Db79h2d_WMCW5gR5YG79QrvDW5VNSlv54yS-dW5lM1gp65sXNmW41jPLJ6Nz87qW4KMJ8m5XsZd1W6QvFmF6ZkZ_tW8XzRnC53XTMyW8-lHn_4LC7whW5tY6C_3XKL0hW7qPL_L5xXvLjV8FtBF1T8mt2N8zRPzD19yVdW99TFWk25ff7FW3brhxG6M45SzW3mpw__3mPsF3W45qDND4_dJX0VtFyzj8WgHjzf6yyGSg04 )\n\nsilvia chalwe & Richard Johnson sent you an inquiry!\n\nTo: Home Bites LLC\n\nRespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPwH3prCCW8wLKSR6lZ3lcW61bN5y2JVDdYN8clLd8L43ZQW6yYTzx47Pl84W3Cv0t61XmxxHW8Q7DyL357dD8W9bsQfK8zP5MdW2n9rTr3c1PymW6jF2s42b4xgkW7GZt8X92PWcVW4s8q-k7ts5ScW6_fCS651NCW_N1G5DyxR5T73W8jYwr17NZQ_wW8wh5Nm14hr8RW3Bs8Gl5N8DX-W6-vvQ690LHyCN35T8GjDzr7RW5lcyxL3wl2QpW7XVZJ984NnZjW5sZN453T-G7yW7W4kBZ6Qq8--W98qSZ1227-prN3tTDQ6KMJb3W5FYK2k5nn5svVHPSf37CRhKKW5ql0s33dTpYGW21R-4W6PMth3W6vP8v02jqLlwf6fKlRj04 )\n\nCouple email: chalwesilvia94@gmail.com\n\nCouple phone: 2069315683\n\nWedding Location: Arlington, WA\n\nDesired day: June 7, 2025\n\nTheir note to you\n\n“I saw the start price draw my attention and looking a reasonable pricing”\n\nConnect with confidence with our Connection Protection Policy (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPwn3prCCW7Y8-PT6lZ3nVVdjDNX2HKlsvN1B2kGV3k5MMW7JGjTG22WT1hW1XvKB42K8Z7YW7NRKJr5ZCFT3N7kB3Zbkc478W8JP5zP4nCdyqVmjgXb5d9VtYW85xnGG5tS_CgW8Q8JDF1Rv41vW80T1Nk1HCv4tW3Fj9Xp5bBh7WW3xR82S68g4Q3VvgjKQ8tpwv8W7HjVjb6GqCKNW1wdHLB5ffkMlW1R-VxQ1HZ9lZM-2scMVJTjSW7TwyLs3NF_2yW7tR2743rVr-fN728G8rZRBg4W4MR8-J2xGmxYW2-3TDk5Ytt4GW8sYNj88WtqfRW5P98sv1BsZMNN5f3MdFTCj7Pf59tZyT04 ) .\n\nVendor\nlogin (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPvP3cscvW6N1vHY6lZ3nkW8PDYgz5ktVxmN85Ykbj1KpQNW1GTS0p5qbyQYW7JlJWZ8d_vXcW6RRlzF4S5qsQN1K6PF2QQtq6V1S-sQ4Lrpn0W6tdCbj2p086kW3PgYw43GLsPhW5J-CM67Cy86FN7R2pM2Y1xbPW3f3pkN4s24S6Vk4wGP8k-3cvW88cybS2YgV4zW5MYr4f2LlpC6W8yb2wf2L1sV0W8gJj788nVSY3VrpNVn7cc05qW7RgSh11NMFbzW7M4fTQ6bQs3vW8CbXvq5dNqGHW57f8R517Xt5mf74CbsM04 )       Dashboard (#)\nFAQs (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPw-3cscvW95jsWP6lZ3mZW7Fsw032WGqZ4N6zyZ2f6jWLgW3gMTrl12dqyKN5DFR92pjfqjW26W4b-7BhDldW6_HL-l6VPrzYW4jLZzR2llDKtW3DzYrt2jFcyTW3T5WNt6Y7rFPW2wPW4b1TL-5GW2fG6JY3MSN6fVlkNf95fZklFW5mB8M23DSTCJW8yRqr210_-bgW7-Mfyn8h5vm6W7P9TLh6Jw-GTW4rbDnk3tP7cCW7tJh2m6-C3lbW5kMcSY6KkgJyM9PGtV-Rw1BW2dqVcT8HD35kW4fQSxS89dLr0W4pBvm74Xm-s4W1qJRLj7l-hhfW540sKZ8W1FfRW73_F4s5x2PMTW4pSSlj94XdlYW6mCNhM4t88pxW5h91yl3Bz82MW4nxzhM8V71Xxf7lzGC404 )\nRefer a\nvendor (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX7h4B164ZmYW8-PVMv4bv82xW2NZxg55vYGcNN7nzPw43cscvW7lCdLW6lZ3kBW8L71zh6RYbhCVHPbkz3zDYs4W4dJHy32HtyPVW2ghmdz5CRlyyVkZq5b7FcsZFW4yxMC-6pxnhXW5Dlczk1zd4PkV8vWdN7w864bW5xj1XC8NT9kjVzc2ys5FNbn7W3kg1qX7GjW1vW7SQC308RfqBpN71HZ6h5WhCjW3M7QZX6QFXl2W3JP44t1Z-kxvW1CPRbk14z0dQN8Bbl_s9-1NhW5BG_mX4RnQGlW6tzbzw42Kwl9W2vlvdj6W89r7W8jXd--4YKp7-W3254mh6_CRxNW7hl0cw8LRg3nW6nv1q-1jkB_Jf641QpT04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor,\nNew York, NY 10006\n\nReach out at\nweddingvendors@zola.com (mailto:weddingvendors@zola.com)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:26.509Z", "aiProcessing": "attempted"}	2025-05-15 00:16:26.529112	2025-05-15 00:16:26.529112
20	\N	\N	\N	email	incoming	2025-04-24 15:32:45	gmail_sync	<1745508763651.257c260b-70c8-4f39-a964-10ca124a99ed@bf01x.hubspotemail.net>	Your latest Vendor View 📰	weddingvendors@zola.com	hello@eathomebites.com	Hot off the press.\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kd3gP0xW7lCdLW6lZ3lJW3cw3RV3lcXdjN8GV6d9nPptqW15LdHf3LkTQ2W6fnqXm70H48JW1YngW-3jSfBWW85ZTmv76YyLWW4t8KnK4Wq1YyW2M5t0k2w9PZSN746WXv2JTvyW3BVXsn37DjxhV_t8gg1hK5tPW8r9pnN1G9hNkW8cGfVc6P9cJBW8C0NTN7M4tCPW56GvVF5gFjHmW97d8pt6pqT9nW8SpP5X7J-sxnMmgTX9flpXCW4F5Dsn90G6R0W8H1mnK5SPzFpW4V3Fc-65bZ9DW4sHLH64jfhpyW2mWbNH34SbqgW79HG1Q5Q2cWff918S1604 )\n\nThe Vendor View (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kd3gP0xW7lCdLW6lZ3kzW6v393D7HtQsXW5PqhVq2YMqV2W7gXVvv2XY2hzW3Rnnt152sLv-V9rMdx1ffZ9sW8nL6vL6F6Jv5W5WzcWN34LLzVW8qZFwp6GHdNYW8tkMgN6054bcW68n1GR74gcfJN7rfdgrgBXDWW5L30nz7WPjxXV6gsdV9fqGZrW4z3tWz3FrB_VW5vMvZn9097YQVp0W1f9c1w_2W1fL3JX1sR-rpW6Q338h38jNh7W4fJR9-4Sl_mqW9l4SDy1TqPrbW5jspRT2x2j9tW2Mxn1W4MhK-lW8ZDBXL5CXxJJW70HPtM2CdgTVf6tY86x04 )\n\nTest drive a few of our favorite follow-up message prompts (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3l63gP0xW95jsWP6lZ3nHW7YhWm33L-3g2W8Ys5225PtFRCW21r9Sr4SWDFdW6ps7S21_TzqPW5nnhSH6NxdzLW8LtGq35TPyDDW4Dxyh71QvKMVVNQWyy3QQQTbW6qYqfG9d1n1DW5VkcFJ7KcjsKW5vPJQd7td5wGW8VQrgJ6nyS2sW8QQsH82Xn5H6W4-DgW41fBFyXW4HrFWj98XTcQW82nDWn2pN8NsW59BHQT3wMN_ZW7kflyL2FthqyVjTDwc1M7QgwW1XZqRW8Yf1c5W7FktX555Cp6sW9fX9xv6v5-Y8N8RXYMB60C2CW8P4ZT55WPvc7W970ML31D_W25W26qNYt4ZS2KQW68gygr3dfSqGN8QKjnR249ClW5PRF2F6NV7pmW4sY92x7gprSgf3fJ74404 )\n\nOur Marketplace lead answered some of our vendors burning questions (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kR3gP0xW8wLKSR6lZ3m_W8bFLsM5ZNhFRW2KtW598302N_VZ1rXz8JyJpbW7tdBHT6BlM3XW6W4hNv8WrpXlDLd6NtyV0FW1H2xBx1rwHRLW5jchj17c9k6dN5BFH2HzLb5ZW8tJM0b7699g9W8n3wcW3lN1zBVZTlp25z0GB5W3fkjmZ21L-k3W2DS2RN2cLyL5W3lvzJL4k8HtMW5dFXNB8Hng3VW91DqrW8zvgNgW3ck9vQ6jF2S5W5-91-44qdj9FW3h_Z-D3jxTV6W39m-Qx27VZPQW1CcNcn7qhBS6W1Jc_Ns2CZJMxW16rqlC1svHr_W79byz81vscW-W145hXg7v3J-ZW6qDbw25_pFLXW51NXQ05mMCH0f70fjCM04 )\n\nhow to be upfront with costs and manage expectations from day one (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3l63gP0xW95jsWP6lZ3nmW7B49q33jrhHVW5bFVQ479XnsWW5cb1sG9cG6lPN5Qkz6wWHtYXW8Pm8Rp1sr9WCW4D_tRY3R3bHhW5Xr92l4snWzwW7nLBLh9dTHDJW1hHK2l4c9pd9W6K9m5H78khHHW4lpQX16W5wjkW5yYN_F3nFnTtW5G7dRS51ZfrfVGNCYY28rRqfVQx7KD3lKYBmW63zL7k2wq65SW6CNZKM3GpY8kN93kL4TsxJx6W1b3fS14Qv4lzW8YX9wt6h_4gLW1cLRd_7WzczMW72b5n36T7465W5MGd2W4Djdv5W8PTGnx4JMx-SW8DnYmk4kg4F9N8CK_fVmcG5jW3qNdNF7Xq-Q_W6ZrGV65JgpLsW52j0_T1_MRdgN3JDTtW_XBBrf8c1R0804 )\n\nPhilip-updated (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kx3gP0xW7Y8-PT6lZ3n9W243hV15Q5K90W1lHn5z5LZ-RPW8zJNG561pSH6W9gWw3Q5RwJ9DW7fQthS1QdFQbW2kXTCt86ykz_W3fLkD_5vhfgnW5x62nR3njDLgN85fZFPrmDPxVrfZYh8KdypyV_Kc9j9b4tQxN15P0YG-yTMQW2MC_176s0N5wV_V-r14p4kLJW8KprT05560-hW6LWdgp1KxJl0N3s8jVRW48f9N5lXcNZq2KMZN9gX46bn1rtXW4pNVlK69CY7WVHcnRt9cmC5nW2djXTm1bzL8YW7JBcj67N3LLGW40vWcx1DMsFTN1gnzK-FBxkVW9bYq824G8cw2f5fWxTR04 )\n\nbody-6---Insta (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kR3gNXPW8wLKSR6lZ3mKW4gfNs993TyjmW2wVrdw69pmsnW8JVYHv4r6pz8W7Hsw_8328T2nW3nWyDv2JWvrmW6XsF-_2LY5DbW7T1s_08wmN67W1z2nRM56xfhTW6Q8vFV71HJJFM9frZFjl1CFW5nP3Kp4JHklpW7qQf401g6K_nW1WWhKj3FPC20W2CKYBq12qpppW51VDdM3wt54SV_cTbr34WyyhW59q1ZD72mF6vW7gGn3v5Wm0XDW7mzCp42q460nN7ZLQHFzTGSWW8Z2P1t7-ZvmWW5-T8_P722PRJW7lKL_v3wHSxhVKtT3c2tJ2DXW2rvJN84Ls6BYW85X6cD1pmP2KMq97fxHMSxmW19Hfny2N0hS-f7M-Hx804 )\n\n1103_NewReviewNotification-Bottom-Menu_08 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3jF3l5QzW69sMD-6lZ3mCW3DM-p_97L2DHW4PrMK-4rVTbtW4Wh1YG7JXxxtVLTrrM32Y71HW1ZLJBr387RnRW87m6F6340wWhW4Ym8db58mhQMW20YzCH7Nc_mTW5HkcL76xyGtnW214g467Z8Gl0W2SxgMn2Djw02W1PZNM52GKzLcW1CYw_q6LpdH-N4MBw1n78RG5N1hcV18zyj8MW351LVn6kfXsbW1D_JBJ8vdBYVW1w_Kqg6nlzDMW3f0r6L6bzPctW4Pwb9z2CkZ-cf6yKWMW04 )\n\n1103_NewReviewNotification-Bottom-Menu_10 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3jY3l5QzW6N1vHY6lZ3mvW8k8pyY3jlV5NW8bLmdC7XpdszW184wkB7v0YxMW84smT424Yf6rW2pcvNC5J3NywW1cJP-98M5ss4W38BXSg1BMwcgW1vr_PY4PGsvnW6D0FqK2D7N56W6lLZ-B860M8NN3nClsv4y--zW3YtGfQ2VnHsCW4sfXbN5b2rWkW63n_Bf4w-L-qW6r_yL34yfHw7N79C9zJmSD3GW5LWZ6g3rTWWdW1QQN9b5Wzq6gW6zZ7XK5d6x5LVxtbYF3JgL6MW6jpCFg4h5FmjW3ZhY1n1yWvCNf8dpdpP04 )\n\n1103_NewReviewNotification-Bottom-Menu_12 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3kR3l5QzW8wLKSR6lZ3lqV2rhwP3w3mXrW2DkbKW3XBQgxV9V4yg1cnbm5W6gWk8q8znL_9W8rt9Xd4zsSFSW7rgrsN3xtY3MW4xSJ008JNyXrW4jz74H49nnJpW4N54Dc3FW6tYW7863B83DdZcSW6rQyxp3xqvlbW6DznKs7LH8PLW7K8bTx5VT2ZTVXr57f7_rXl0W8nDz9b2rN_glW4Q3rrb4h53WWW4m2rxv5N6BWKV390Kt6BlKhKW7jmYFR8smGDFN3DzxZRKPDxRVXfnW03rkk0WW2nNpWd9cm6FzW8d7zgF2_N_VdN7LN3Nnm4JFtW5M5JDm51JbxqW6GZvtt3BgS22VgyNcS5WydtkW5Dj9xW4qm7k4f2B6Z8H04 )\n\n1103_NewReviewNotification-Bottom-Menu_14 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3jY3l5QzW6N1vHY6lZ3krVD5LGV4lvXFfW5KFSfX2q19fdW945LHz2lNGF0W3X7ZYn9k-kY6W3RFRy267ZDHhW8Ln8JC85lnHHW7v2tjJ3_6XsbW2NbK0n5SDt_HW2rLqmM2kvXVhW69bW7T6RHCFRW7FCTdv6MWCklW2yjtnr6hSzDhW80k3z88n7sMmW8hVmtx2wGRygW8Cgh2877xXx1Vyfwy483YTn8W4G--DS8kWz1FW6YH6Ry3v5y89W9f3wRk4hNF6mW7dr6TF98hhqWW7xXgh73pJFdVN8jScQxRD3kPf3h5zTd04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVFKyjqzZh9W25NFJl7nJ-PpW8GDvjX5vNqxWM5Y3jY3l5QzW6N1vHY6lZ3l5W5dwT_34Q6ClBV4gf9Z6z8Qm1VHPJw782XZ8pN4HRVVWwbKm0W30VL2W6clPnSW6Z9Txz76_bF1W6qlFlw3CY0GGW1qzrxh8Df1Q7N7bpPnvKK00GW2fq7lX2nD2q0W7s-Kgp1bWhyMW7Gldm14dmVgyW71YHvV4QT6rMW1pz3Db2lpzr2N4hlMPY-JQ5bW7LH47q5wRx0SN3FKjQXv3qwVW2b4sd17Xk7p9V1wwYm1MMZrVW3MRLDQ3RpptrN1g3v934jBryW92dWP95xwHf9f38XS5K04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-SjW3bkvqh4k8s33W2WqVK11ZsvRQW2RyvwY47kVRLW2RNYv93yN2ZxW1Scqjr3BLJQ8W47Gpgk1Bp6S_W4mcFjg2TCcXlW3CjvMs3dtzLVW3C0f_332rHqZW1XsLn_41_1XnW4chlf91Xx5WkW49D2R_3dr6NPW1SjRd64hfLtNW3SPm9B4rDLDPW3j8XKX1QflKkW2YJH083ZWWw7W2vzwYK3LYZySW38gnMC22WSLRW4ckrjf3FcdhMW36g5SJ1VtQrNW3QKWFS4hDgc6W2PW2Mw30c26_W41Y2yh1_9L2NW24-LLq2FTPwcW2zP_ZT1SvVFTW2KHqhd3Y04q5W4kNn5K1XpVpLW3_GN2c45plzGW3ZvLnj3d7FBtW1T_znP45HPGXW2KD1k547kRTcW217V_S3NFX5_W3QzvRJ1Xx6qRW36dWJ249xRcXW4fM8VR2YtCk0W3zgxPn2t4C_5W3LSv6W41FN6LW3g9YrL4hFvXqW3VG7FK2TsjbSW2RCn093yQBV_W3d9lNf2RQCn5W4hgynL3Z-F3RW4hswf_30JHdCW32s2V24pHnp0W1QmWCf2MT9WDf2qGyYR04&_hsenc=p2ANqtz-9_VzNv4_79dXJJefxv6D4F2GRCpFkdw8j0ZdPX8qWn2BLc-L8hSfziYMWMcLl_q35hDdXxHGwCw65F3WqsHeg0OonwuA&_hsmi=357659212 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-SjW3bkvqh4k8s33W2WqVK11ZsvRQW2RyvwY47kVRLW2RNYv93yN2ZxW1Scqjr3BLJQ8W47Gpgk1Bp6S_W4mcFjg2TCcXlW3CjvMs3dtzLVW3C0f_332rHqZW1XsLn_41_1XnW4chlf91Xx5WkW49D2R_3dr6NPW1SjRd64hfLtNW3SPm9B4rDLDPW3j8XKX1QflKkW2YJH083ZWWw7W2vzwYK3LYZySW38gnMC22WSLRW4ckrjf3FcdhMW36g5SJ1VtQrNW3QKWFS4hDgc6W2PW2Mw30c26_W41Y2yh1_9L2NW24-LLq2FTPwcW2zP_ZT1SvVFTW2KHqhd3Y04q5W4kNn5K1XpVpLW3_GN2c45plzGW3ZvLnj3d7FBtW1T_znP45HPGXW2KD1k547kRTcW217V_S3NFX5_W3QzvRJ1Xx6qRW36dWJ249xRcXW4fM8VR2YtCk0W3zgxPn2t4C_5W3LSv6W41FN6LW3g9YrL4hFvXqW3VG7FK2TsjbSW2RCn093yQBV_W3d9lNf2RQCn5W4hgynL3Z-F3RW4hswf_30JHdCW32s2V24pHnp0W1QmWCf2MT9WDf2qGyYR04&_hsenc=p2ANqtz-9_VzNv4_79dXJJefxv6D4F2GRCpFkdw8j0ZdPX8qWn2BLc-L8hSfziYMWMcLl_q35hDdXxHGwCw65F3WqsHeg0OonwuA&_hsmi=357659212 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:27.020Z", "aiProcessing": "attempted"}	2025-05-15 00:16:27.038009	2025-05-15 00:16:27.038009
21	\N	\N	\N	email	incoming	2025-04-17 03:01:02	gmail_sync	<30192150.20250417030102.68006eee006840.38326211@mail133-209.atl131.mandrillapp.com>	New message from Chantelle M & Joshua W for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	Reply now to keep the conversation going.\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiZ0FCT3lWUHJiNDVXZU13Sl9XVGhwVzQzMTZnIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcIixcImlkXCI6XCJhMDBkYzE2NWMxNDA0MzFjODkzYjJjNTIwNTMyNmRmNlwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ0ODU4ODYxfSJ9\n#\nRespond to Chantelle M & Joshua W\nGetting married on June 6, 2026\nWedding budget of Up to $3,000\n\nChantelle's message\n\n" Thank you I’ll get back to you after i look it over (: "\n\n------------------------------------------------------------\n\nRespond on Zola (https://www.zola.com/inspire/vendors/leads/ready/b7f26c40-e59a-4173-a7ea-fc78123082e1?utm_medium=email&utm_source=triggered&utm_campaign=new_couple_message)\nOr reply to this email directly.\nYou can attach JPG, PNG, and PDF files under 20 MB in size.\nZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)\n	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:27.556Z", "aiProcessing": "attempted"}	2025-05-15 00:16:27.574964	2025-05-15 00:16:27.574964
22	\N	\N	\N	email	incoming	2025-04-17 03:01:02	gmail_sync	<30192150.20250417030102.68006eee006840.38326211@mail133-209.atl131.mandrillapp.com>	New message from Chantelle M & Joshua W for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	Reply now to keep the conversation going.\nhttps://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoiZ0FCT3lWUHJiNDVXZU13Sl9XVGhwVzQzMTZnIiwidiI6MiwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoyLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC9pbnNwaXJlXFxcL3ZlbmRvcnNcIixcImlkXCI6XCJhMDBkYzE2NWMxNDA0MzFjODkzYjJjNTIwNTMyNmRmNlwiLFwidXJsX2lkc1wiOltcImUwNzlkNjQyMjI3ZGU1Y2UxMDkxZDQ0NDU4NzhkYzFlYzI3Y2I4YmZcIl0sXCJtc2dfdHNcIjoxNzQ0ODU4ODYxfSJ9\n#\nRespond to Chantelle M & Joshua W\nGetting married on June 6, 2026\nWedding budget of Up to $3,000\n\nChantelle's message\n\n" Thank you I’ll get back to you after i look it over (: "\n\n------------------------------------------------------------\n\nRespond on Zola (https://www.zola.com/inspire/vendors/leads/ready/b7f26c40-e59a-4173-a7ea-fc78123082e1?utm_medium=email&utm_source=triggered&utm_campaign=new_couple_message)\nOr reply to this email directly.\nYou can attach JPG, PNG, and PDF files under 20 MB in size.\nZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)\n	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:27.656Z", "aiProcessing": "attempted"}	2025-05-15 00:16:27.67466	2025-05-15 00:16:27.67466
23	\N	\N	\N	email	incoming	2025-04-15 23:04:25	gmail_sync	<1744758261691.5d448fa1-7753-449e-8003-4bccc914a7bb@20623097t.zola.com>	New Zola inquiry for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	The clock is ticking!\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZ03prCCW6N1vHY6lZ3nhN5lZRMgLdYVQW3HsQT32CcTFqW76tWXC57W5bNW6LrZ9Q7-wsK_W6GR1t37T0zCqVTpYzJ8V_bgyW5n8P8P1hQBBTW88cWK-5mzv2DVDmr8h5BxHm1W2nX-tC3kfwwkW2kv8Sf5BSzLXW2pyPJZ4K7D77W7DDF6b814Mn3W8JJh5S5Sz0KXW5-7NhV3YvGdMMMGp9ldHy8SW3-Bg204JTTcNW52WmL67WMP0RW138tMP98-KcTW8yG0ry1sXTfRW23wPmn4CMq24W8tJbHq2pw6sYf3WNXJq04 )\n\nChantelle Mccabe & Joshua Wallace sent you an inquiry!\n\nTo: Home Bites LLC\n\nRespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZW3prCCW8wLKSR6lZ3mZW94TX_t6kGbZlW7n75Fk2jC9DKW1cHTBM2TVTv0W3ckMK84dLRk-W76KnCv7vRGdjW29xmRd6rSd9RW9cq7Qk9kySzLW7rgCs65gZ-DwW7SWS0T2g3DP_W2fClLH5rD_6KW9kv7-j8lTNmrW8N12L64fn3NvW4tkdtW8F1qlwW6SZzSq7ngyRFW417h215Zc_YjW33YFbb5gWr2RW1P-9b06l_HPnW5VvTpf4QM6BbW7xrY1H3kvqqJW5qYM7v7mzDqMW8HSGds4n67_JW6qlNKN8ccZ8mW1q26077r9gZ6W8Fm3Bq3VZ7z8Vn32wY3Ts0l3W2Vl1xl65NsnTW4WsBr893XrLlW167kqT2sb-Tyf2V96DP04 )\n\nCouple email: mchantelle017@gmail.com\n\nCouple phone: 4255518512\n\nWedding Location: Seattle, WA\n\nTheir date is flexible\n\n•  Desired day: June 6, 2026\n\nTheir note to you\n\n“Hi just looking into catering prices around Seattle area please let me know (:”\n\nConnect with confidence with our Connection Protection Policy (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZC3prCCW7Y8-PT6lZ3pZW8WGZ6V1dlqB4W1R-Y4558QLRfW35nw2W1316hRW5-sK0W3MP5sgW3zgfTw2N8-rRW7qLdwn6QCCzZW73xVbr3gW5M1W5-6KX_4fyqmnW5chfts61mCq0W4ngHds7bCTxCW8vKJ3D2nJb5dW7SLc9P4m0YWBN2TqLGRDrCLBW5n_N8H9kYvFTN28jqzL6pTkKW65-ckJ1KCx_9W5Jy2wC3-BpxdN2GgQ6x5mwMrW7cYtHn7y66_MW5r3xJS2wWNdfW4s7GDv1n_N7FW2TCBp48pm2fVW7C-3vW4jbShHW7zprQ37g5lmYW7jM4rK59VGJpW8VqS383wt5Hlf7KGnT-04 ) .\n\nVendor\nlogin (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZ03cscvW6N1vHY6lZ3mwW7t6bKt680-LtW85QVLS6sQrflW2BKsTy7tZpy_W8l6p_h8y0VvjW1tvPl14-x__LW2vG1MQ2tzs3XW5XB0482SMc__W52xfQx3Sf3RZW3L5QZz5KsDGxW6q-f4L9kK2HDW8TNhfH6GMzvGW52Wmt-6fJrljN7_vwyFm4vdQW7S8YZQ6jXz3-W1ssTPY1Mb-7QW72DhYC1XpWB0W1Lkwfg8kcB9gW3SngYn5JVyWFMmGXXD7ZsDbN6k7Fg26QQ1FW8qQnHd7vGSHtW5QsB0m6CGJnCf2s_KZT04 )       Dashboard (#)\nFAQs (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-B-b3cscvW95jsWP6lZ3myW3s__ys147ctKW30wj5n6P1PNpW5Mf2tv33CrjhW14-JhN2Y76sfW5z4L616lLm9hW1FvT6y3n3CRsW4kQ7q27TXF3tN3kPQBkxz6fnW8Jz5965VGG2ZVPBhH04R66XlW2Nfl4n3Xd6DxW22lzSj9jH0xKW15TDzn7QlSmjW4lRldS4wLC9DW5Z5YrW6wcGlSN6JjVDWpCrBJW82nWSX6WRs2nW4mr7W35TGkf4W1fN0bD2jGt2HW2JgKtF6fh3cpW23wLdh3B40_9W5mz0wF6D43z0W2hHwXx3wR9fTW3NmMsv1_Q2txW3RZVZ466gd8wW8F_hwk8v9ymGN6KZmlpYvFmbW63CbDm2ZP5fwW4fhRZ-48_4-SW4jF3M81WKw17f6ClHl-04 )\nRefer a\nvendor (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZj3cscvW7lCdLW6lZ3mtW4NmZwd5z-bzqW323Z1m1cTrPDW1wFr8m5NC1QLN7rdnt8dqNw-W13rSBr5ywyJLW7mm_x89hTK76W1kBQW26tkjvNW5v8bgH2XQ090W6G8dw97FLL13W7Yr9z26711QcW8lqqQL8JZn_zW82lYjm4rJq77W8KCVf_3rF0H5W7KCX2M30_s6mVfPfwj1xZl91W6m0zDp2FxQZ7W3sMMXJ5wjlQfW7JzBHm9kwLM3W5WxyQQ8srZYYW1mLnZk5xwJk_W89zQ_D8kT-PFW2mLDBq3bd8XgW3FTKt71Rf6DxW7ml-wg5GV8VJd24tkK04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor,\nNew York, NY 10006\n\nReach out at\nweddingvendors@zola.com (mailto:weddingvendors@zola.com)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:28.097Z", "aiProcessing": "attempted"}	2025-05-15 00:16:28.115822	2025-05-15 00:16:28.115822
24	\N	\N	\N	email	incoming	2025-04-15 23:04:25	gmail_sync	<1744758261691.5d448fa1-7753-449e-8003-4bccc914a7bb@20623097t.zola.com>	New Zola inquiry for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	The clock is ticking!\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZ03prCCW6N1vHY6lZ3nhN5lZRMgLdYVQW3HsQT32CcTFqW76tWXC57W5bNW6LrZ9Q7-wsK_W6GR1t37T0zCqVTpYzJ8V_bgyW5n8P8P1hQBBTW88cWK-5mzv2DVDmr8h5BxHm1W2nX-tC3kfwwkW2kv8Sf5BSzLXW2pyPJZ4K7D77W7DDF6b814Mn3W8JJh5S5Sz0KXW5-7NhV3YvGdMMMGp9ldHy8SW3-Bg204JTTcNW52WmL67WMP0RW138tMP98-KcTW8yG0ry1sXTfRW23wPmn4CMq24W8tJbHq2pw6sYf3WNXJq04 )\n\nChantelle Mccabe & Joshua Wallace sent you an inquiry!\n\nTo: Home Bites LLC\n\nRespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZW3prCCW8wLKSR6lZ3mZW94TX_t6kGbZlW7n75Fk2jC9DKW1cHTBM2TVTv0W3ckMK84dLRk-W76KnCv7vRGdjW29xmRd6rSd9RW9cq7Qk9kySzLW7rgCs65gZ-DwW7SWS0T2g3DP_W2fClLH5rD_6KW9kv7-j8lTNmrW8N12L64fn3NvW4tkdtW8F1qlwW6SZzSq7ngyRFW417h215Zc_YjW33YFbb5gWr2RW1P-9b06l_HPnW5VvTpf4QM6BbW7xrY1H3kvqqJW5qYM7v7mzDqMW8HSGds4n67_JW6qlNKN8ccZ8mW1q26077r9gZ6W8Fm3Bq3VZ7z8Vn32wY3Ts0l3W2Vl1xl65NsnTW4WsBr893XrLlW167kqT2sb-Tyf2V96DP04 )\n\nCouple email: mchantelle017@gmail.com\n\nCouple phone: 4255518512\n\nWedding Location: Seattle, WA\n\nTheir date is flexible\n\n•  Desired day: June 6, 2026\n\nTheir note to you\n\n“Hi just looking into catering prices around Seattle area please let me know (:”\n\nConnect with confidence with our Connection Protection Policy (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZC3prCCW7Y8-PT6lZ3pZW8WGZ6V1dlqB4W1R-Y4558QLRfW35nw2W1316hRW5-sK0W3MP5sgW3zgfTw2N8-rRW7qLdwn6QCCzZW73xVbr3gW5M1W5-6KX_4fyqmnW5chfts61mCq0W4ngHds7bCTxCW8vKJ3D2nJb5dW7SLc9P4m0YWBN2TqLGRDrCLBW5n_N8H9kYvFTN28jqzL6pTkKW65-ckJ1KCx_9W5Jy2wC3-BpxdN2GgQ6x5mwMrW7cYtHn7y66_MW5r3xJS2wWNdfW4s7GDv1n_N7FW2TCBp48pm2fVW7C-3vW4jbShHW7zprQ37g5lmYW7jM4rK59VGJpW8VqS383wt5Hlf7KGnT-04 ) .\n\nVendor\nlogin (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZ03cscvW6N1vHY6lZ3mwW7t6bKt680-LtW85QVLS6sQrflW2BKsTy7tZpy_W8l6p_h8y0VvjW1tvPl14-x__LW2vG1MQ2tzs3XW5XB0482SMc__W52xfQx3Sf3RZW3L5QZz5KsDGxW6q-f4L9kK2HDW8TNhfH6GMzvGW52Wmt-6fJrljN7_vwyFm4vdQW7S8YZQ6jXz3-W1ssTPY1Mb-7QW72DhYC1XpWB0W1Lkwfg8kcB9gW3SngYn5JVyWFMmGXXD7ZsDbN6k7Fg26QQ1FW8qQnHd7vGSHtW5QsB0m6CGJnCf2s_KZT04 )       Dashboard (#)\nFAQs (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-B-b3cscvW95jsWP6lZ3myW3s__ys147ctKW30wj5n6P1PNpW5Mf2tv33CrjhW14-JhN2Y76sfW5z4L616lLm9hW1FvT6y3n3CRsW4kQ7q27TXF3tN3kPQBkxz6fnW8Jz5965VGG2ZVPBhH04R66XlW2Nfl4n3Xd6DxW22lzSj9jH0xKW15TDzn7QlSmjW4lRldS4wLC9DW5Z5YrW6wcGlSN6JjVDWpCrBJW82nWSX6WRs2nW4mr7W35TGkf4W1fN0bD2jGt2HW2JgKtF6fh3cpW23wLdh3B40_9W5mz0wF6D43z0W2hHwXx3wR9fTW3NmMsv1_Q2txW3RZVZ466gd8wW8F_hwk8v9ymGN6KZmlpYvFmbW63CbDm2ZP5fwW4fhRZ-48_4-SW4jF3M81WKw17f6ClHl-04 )\nRefer a\nvendor (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW3Yf15WBDSvW5PLCBt7v37XfW6R-97G5vqQ95N6R-BZj3cscvW7lCdLW6lZ3mtW4NmZwd5z-bzqW323Z1m1cTrPDW1wFr8m5NC1QLN7rdnt8dqNw-W13rSBr5ywyJLW7mm_x89hTK76W1kBQW26tkjvNW5v8bgH2XQ090W6G8dw97FLL13W7Yr9z26711QcW8lqqQL8JZn_zW82lYjm4rJq77W8KCVf_3rF0H5W7KCX2M30_s6mVfPfwj1xZl91W6m0zDp2FxQZ7W3sMMXJ5wjlQfW7JzBHm9kwLM3W5WxyQQ8srZYYW1mLnZk5xwJk_W89zQ_D8kT-PFW2mLDBq3bd8XgW3FTKt71Rf6DxW7ml-wg5GV8VJd24tkK04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor,\nNew York, NY 10006\n\nReach out at\nweddingvendors@zola.com (mailto:weddingvendors@zola.com)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T00:16:28.505Z", "aiProcessing": "attempted"}	2025-05-15 00:16:28.524079	2025-05-15 00:16:28.524079
26	2	\N	\N	sms	internal	2025-05-15 03:14:30.56	\N	\N	this is a test subject	\N	\N	\N	\N	\N	\N	\N	2025-05-15 03:14:30.726938	2025-05-15 03:14:30.726938
27	\N	\N	\N	email	incoming	2024-12-04 21:33:24	gmail_sync	<1733347996589.098f5610-5573-453a-ac60-ff5ec92ea7c0@bf01x.hubspotemail.net>	You're Invited: Virtual Webinar with Renee Dalo	weddingvendors@zola.com	hello@eathomebites.com	Prep for a new era of leads in 2025\n\n1126_Webinar_Renee_Dalo_email_01 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYWq3l5QzW6N1vHY6lZ3lwW7rncvW2KkMgMW1rK_w23vlvXGW4cW7Gz82hks_W2pPvN82J-BrWW76pWjz18zHq8W7zV_0s38PXkzW61my7v138dK_W2syw_z4d7cZZW413gVV5lkq1fV_st9G6QgLjYW2VhlTZ4MGqZsW6mP70R4cQfHlVVR0LZ6G1BkPW2Cr0wM16gR7-W5zgH8c90D-B6W1zJXkP6HbCxyV4B_J57r5ghYW5TS0Cn6H-QNLVTTgCL7Pjh_1W5hxFj14D4hk3W3TNXy91x98mKW4BF0pN11Fk61f7sLyJq04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYW63l5QzW69sMD-6lZ3q7W9gb8wD4pl5C3W7HR94h6x3H3YW4-hbhb43d6SJW7RKr0b3xxr5yW3GP2wG1dQc_CTsSzW5zfdYpW4KSS5W2pdS8_W2KCH_66mQV4WV_VT-34M5N2pW92kk3R8fBZcgVjcn2T8xMjWkN5FswWtggzgpW2qMmrL25tBMFW91GScQ2PXR0PW764HqG21kSyNN7FBg296yqkjW84sv6c6hzYxnW7Jw85D10rXhGW3ltgSk6wqbh4VBxBFV4tzv-xf2kgkFj04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYWq3l5QzW6N1vHY6lZ3nXW5P8x6q2_zC5FW88y3Q63WGGfzW5wXkhZ3-CtmfVTYv_-3KQGlwW3zm--v92ByDxW17Gm4P612NnBW6SSPRh4d_gw6W4z5m7f8Kjl9RW8q6Hrf406zsJN8_cq30nKJDNW2FBpqv5ZwxN9W1WZcHM6vSLb9V4xM0K3bNYnQN2YnnvrDdNyfW83lnGp5QVz6nN7LjpzyFjg2vW2GB4HQ5pz5ZYW8KTm0N3bCWdFW7tdXgc6Kpw6KW2x7ppr1BFG7hN3blQ9dKlPFvN8mJVZHc9gqPf1WSMC804 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYXj3l5QzW8wLKSR6lZ3kCN7g8PjSz7yKsW3xNQ6t6dd2MhW8X0Ms55vQtNLW3t74CN7xvJhZV3gs-q60HJXCW1Vc53s435GH2V7CQbf7qkNW3VLF9tH8ZH9gxW65jGRM3d6mVSN559p47HH1nwW5L5D-M3Y8czCW7DP7bj41lYR5W3v1m6N8_F14BW8CQXwd3MH2tyW6YT3Yk2hp2rDW2DMTP71sgT5RW2CCNJY8tRB2KW5rRKlG6mWymhW1p47pX3wK5q-N74znmpGpLLmW2SytvB3BtkvYW31RV_T4KGNcTW623H1J4nmxCKVqP8q43N4mFRW9hjmkV40lVhGW7rWjDc8jyZ1pW2cSPs-8tYL55W87zRJL7nyYxrf7hFbnC04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYWq3l5QzW6N1vHY6lZ3kZW4t91vQ1_NhdHN6_fV3F9JsfPW3jwqWt5-bDj-W53Dvqm3VpQqLW2G3P5J91_p9lW4fB6BM55pskmN2HRbywgKRVtN44rghyg50rpW2955Dt2Tn4tJW2p3SLf61Yjy6W4R7w324mDMzMW8xbgjS1sPv8xW1lfXxq6lf92wW25_2Zz7RT5bFMGDnQzpkrBMW6lTNg1600csZW604Z3x7rxvgBN7q_msqX85HWW7XSgqb65MnjtW4DjrSV4_P0khN8dgrydfXFxqW8rNxbY2FPF9Jf6GDnN204 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/MVr4YFCdjwZW27NrlV3t14R7W70RWGB5p9M3NN6klYWq3l5QzW6N1vHY6lZ3mgW73ngcC5tcM47W3nGM9T80gy_2W8BMZDt3pHnRVW5CcG-Q4V2FgJW4MGGHr2V8zpyMW6x_JRHctcW8fVYb79bV1H7W5skdhv7QTbJ7M11JfCNBg55W8sndLl62M89rW1MNw6n5v-Ml8MFV7P3btSRTW8t1vwT8VCnLdW85-2DK4rQq16W6BfjyJ7PM23ZW2bvnsb44k7K8W2y8b2H3NZ2J7W4ly6Tb3ZCS7hN7v-jF_7QGjrVgBFrr5BSykLW91T-wN3b2L22W5kvTR13KT0mhf3LBzZg04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MvW1Nh9253ZJ9DKW382J9K4hrfSHW3ZYWk23R0JmnW1QbryW3f_5B5W2WJRm72-fMzdW1-YrDR1-_jYdW4p9pMr30dKF6W1ZrGVL2-FXsbW3Y1gRD4kdGrwW1Y-gBr45Wt1vW43QctV3LP9y-W2RsYsn2Pw86KW21m-t-3QKnKrW2WLWR71Lp-nLW3P5rgt3R5KscW3Z_3r32HCN1rW30h-zy21rJ9wW3bg48l3R0d37W2xy3PM41C-_yW3W42-v3ZGXvnW3JYjP_1XrvHyW3SJSLY2FSTQfW43wPGN3dsM85W3JL1D83_RTJjW45yh3Z3Fg_mKW2zVzpp4hn0s4W2nP06n3gm459W1BfLvM4knyN1W3VYymp38kdWVW2RV1Dk38Dt3RW22XCGl2TQrM_W3_VQHz4pGbLkW3j64KQ30zY8KW36jHyZ34js_2W45XHTx3DYJ9mW49hY1q3S_8bjW3yZt3Y47T4LPW4pG6J63g6G5SW4kmj862Tz9yHW3yXTwY41-_gzW20XqRQ1Zvg46W4mCs5W3_N96ZW3JWzC42TM6kHW4klxrT21n15CW36mzt-3VHpdSf47QGdN04&_hsenc=p2ANqtz-9kpGUGYtasHzxOvw4M3h4skItI1LK4vaStdSZjT3yeOYtlLaY1Wnt450sbd0Kxd3NLUjYzzse1TQgBUU8dtP6LUPQu4A&_hsmi=337051867 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MvW1Nh9253ZJ9DKW382J9K4hrfSHW3ZYWk23R0JmnW1QbryW3f_5B5W2WJRm72-fMzdW1-YrDR1-_jYdW4p9pMr30dKF6W1ZrGVL2-FXsbW3Y1gRD4kdGrwW1Y-gBr45Wt1vW43QctV3LP9y-W2RsYsn2Pw86KW21m-t-3QKnKrW2WLWR71Lp-nLW3P5rgt3R5KscW3Z_3r32HCN1rW30h-zy21rJ9wW3bg48l3R0d37W2xy3PM41C-_yW3W42-v3ZGXvnW3JYjP_1XrvHyW3SJSLY2FSTQfW43wPGN3dsM85W3JL1D83_RTJjW45yh3Z3Fg_mKW2zVzpp4hn0s4W2nP06n3gm459W1BfLvM4knyN1W3VYymp38kdWVW2RV1Dk38Dt3RW22XCGl2TQrM_W3_VQHz4pGbLkW3j64KQ30zY8KW36jHyZ34js_2W45XHTx3DYJ9mW49hY1q3S_8bjW3yZt3Y47T4LPW4pG6J63g6G5SW4kmj862Tz9yHW3yXTwY41-_gzW20XqRQ1Zvg46W4mCs5W3_N96ZW3JWzC42TM6kHW4klxrT21n15CW36mzt-3VHpdSf47QGdN04&_hsenc=p2ANqtz-9kpGUGYtasHzxOvw4M3h4skItI1LK4vaStdSZjT3yeOYtlLaY1Wnt450sbd0Kxd3NLUjYzzse1TQgBUU8dtP6LUPQu4A&_hsmi=337051867 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:02.204Z", "aiProcessing": "attempted"}	2025-05-15 07:21:02.228448	2025-05-15 07:21:02.228448
28	\N	\N	\N	email	incoming	2024-12-04 15:32:31	gmail_sync	<1733326347519.0c3643a9-8fd9-4cab-a850-8215a9e4cae0@bf01x.hubspotemail.net>	Become the Best of Zola	weddingvendors@zola.com	hello@eathomebites.com	Looking for a sign? This is it.\n\nhero-1 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3lbN5SDyq7gdSYGW3GDlRM6lcX56V-ftfW96gDBbW4XZSvZ8d0Qs8W93G1yP1fcJc4W25Jq843yhfZPW18Sxb83yp8spW57YM5M91BXGNW68KW7w7xFS7jW4L6TXr40GVJLW2gKHJj1C99sgW95dRLP27RrV1W5w28vD1nk7LjW6tZJ_x3sZGPyW5Q_CC1234wcVVK1SK11KtMg4N6C4CtQr1dJmW5pR8sk6xyqcVN2ZlZ6R7szNDW787gSH13N3g3W6GSBzZ29R7yPW6NjcW88_Lhtcf2wwH9l04 )\n\n2-badge (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3mSW1hNY6w573GJ4N4w_kyQx9tCYW8PnJMj7bhqnsW4DvqCv8N-tyWN23JQNMRhRFQW6PT6562RhfjXW8995v19fYMFjW6J8j2R4y_ZJCW5jxHBj1M09vGW2nKcy91nyHnXW74cws02P0QB-W8RCDL93FL5XFN58p9vm8s_nhW6395_v1BD_BCW7BTZXt4_Gk3WN2BCtv0HVbw9W68mW_7360F4pW2NLvhh2KC810W3_yYKs2dXjTgW7Yjbw26LGL_MW51w0km5mrPdVW33Nbzj8lsnCSf7XTYXF04 )\n\n3.-discover (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3lbN5SDyq7gdSYGW3GDlRM6lcX56V-ftfW96gDBbW4XZSvZ8d0Qs8W93G1yP1fcJc4W25Jq843yhfZPW18Sxb83yp8spW57YM5M91BXGNW68KW7w7xFS7jW4L6TXr40GVJLW2gKHJj1C99sgW95dRLP27RrV1W5w28vD1nk7LjW6tZJ_x3sZGPyW5Q_CC1234wcVVK1SK11KtMg4N6C4CtQr1dJmW5pR8sk6xyqcVN2ZlZ6R7szNDW787gSH13N3g3W6GSBzZ29R7yPW6NjcW88_Lhtcf2wwH9l04 )\n\n4.-reviews (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3lbN5SDyq7gdSYGW3GDlRM6lcX56V-ftfW96gDBbW4XZSvZ8d0Qs8W93G1yP1fcJc4W25Jq843yhfZPW18Sxb83yp8spW57YM5M91BXGNW68KW7w7xFS7jW4L6TXr40GVJLW2gKHJj1C99sgW95dRLP27RrV1W5w28vD1nk7LjW6tZJ_x3sZGPyW5Q_CC1234wcVVK1SK11KtMg4N6C4CtQr1dJmW5pR8sk6xyqcVN2ZlZ6R7szNDW787gSH13N3g3W6GSBzZ29R7yPW6NjcW88_Lhtcf2wwH9l04 )\n\nFAQ-1 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7MbP3l5QzW95jsWP6lZ3m4W1dlzdx2T-fp6VxtBn04D7cD7N27g7SVv1_GpW2n9qw61tZGzWW3k-drS7jw1tMW9jy74d3fsKq3W1mjVBz93zHWNW5qNP3r56grkGVzlJkp6z-MhBW27fFQ53PNvWSW8h6xjv2xNLfvW4nfBQj7pDg-9W6wKw1R6r3mW5W6mLTCX2883jhW5xLrkX5s13R5W8nhXRM6nn-cZW5fPblv4pCpcFW5h55y17vdRYtW1SVGp71ym95WW3xxZkf283FPLW2jWJxv4tjnwBW6lmzmG7Kk8p1W2xWKZ54Q2PMlVDB2NC6qB-C9W58whS31mz7ZbW1mfjjX56NcRZN3KYpTSx3XwDW93wp6M8v_kxqW8LsRY_9flxYxW6lJK8S5DlGY7f4csm0H04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9j3l5QzW69sMD-6lZ3kYW7nhdvj2X-fWwW4jp2nV7P_sWzN899Y1qHXdzsW1P3sW95QfqCwW6rZBFV4q-QZXW6TH-J23vHPKQW123CDq6JVGm_W7bDbyh4py7tHN2lPbfZzHTr5W3HV5834_Tl3xW2x-bYH4Lf6rjW5kjnGG4vD_gcW1NY-tc1Wng1JVDglPZ1BvRbwW6HDkzW1CWXw0W3fcJm-59n_NhW5H583c2hzWjPW5_nwNq4lDWLtW6HGlhZ4CfdLdW52lDP47yP2Gkf81XGvW04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3mfN83rPRtGqL9dVFYXnb9gdK6MVfs8098w21XfW96fD3k2mzk0dW9gDcqc2zjPV0W53vm_m84XMHzW3GmPyQ9lXDT3W1tl41t3x_rXwW82g6Sw5M0v8hW3bLb9t4bWQV3W147Q1T4MQvCkN7tMhGLngBGkN6YyJlBwVN7MN7B2CvvsfbQLVzdPG32SWvymW1DP3wM8k3GYDW2mhsY-2pCJ9MW3V1df_4sLMLWVPZwvR3cYGh6W5w5KrM1XMvC3W3LJt606j03MxW20HfkR6MyxCDd2Mdcz04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7Mbv3l5QzW8wLKSR6lZ3ncW74wbzX2gWkFHW2mLRMW3-cTmKN27vjHFLJFBrW76zLcC10FjXDW7Hbm-h3GW23rN97H_FJNDKw_W9fptpR5xN_zPV15j-82TlxXJW7mM8M_6xXm5HW7zc1j25PY4dJW39b3006CLBPvW6XLqYl5pHWjPW6y3FGH8dBhfJW5_VgCk7mbj8yW76gq287FXx16W806ry07tWz5FW5sZWr92v4M36W5l8C3s3z2zTJW2s0CCF4cRK9GW6JSnYv27qfWmN3Xbyy346wVLW4C2mFF1B40tHW5dGj863JgQdTW8X6H3k4HPczMW76D9_35VxlkNW688tRv1RDGtjW3Lh6MM2-tT08W20S9FG8SVR80f77RtK804 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3m6W2mpmbc55lsSlW8nGh4P99RY0tW4TX1R-8Lm2wcW31PVKl69MBVKN36F9zmb0PMfVK_1fn6Lq60dVLMHbh6rmmY0W6FwmZ07R6N-kW6j3q5x6DXPtQW66_4WJ5Tgph8VZ80244pKrskW2596K02dgnqmW81_hJB8dQHZYW5RVgw48lb0hpW7m9k-J2FJwPQN1mfqmb3xSy4VRryV36BgCvlVKXdzz3fmp0NN75S4DpnYrgKW7tXM493XmVTfN63-SBZqzdqZW4VH2KQ50NT-kf3WKY8s04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VVsbyf6bzc1vN6gJtW6PM9TYW89-nNw5p9c3KN9k7M9C3l5QzW6N1vHY6lZ3pGW3yPS6b2CDRNTW6Y3B8D47zMGxW6D5N7h6dt2qvW1y8PGF8JZMgZVtfL8c42g6X3W52Ctbm7CdnnpW1cWjV06ZG2lNW77yKBB29rGbSW2fJM9T57mp32V1V90p71ZYNSW4l3fHd5BhmmHW2zz4MK5trRVBW3vJRH69j__7cW5ScKq16_K1l6W75lRKJ7Fwtw5N8qpXtjKLPdhV5FTlg6-WMw_W7MzY-27zcJ8ZW87tPqV22h8m0TCzwN1W84fhW6jpFnD8VlNtGW2xqNQn66FZdNf1l3Gpz04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-GQW4r9y0y2pb0j6W4rp8nW45WWyJW4kf6tn2vJdNNW3BV9X836tN1JW349K1N3JPMcMW2qRJpg2sZBDRW3dnzZw45FHz2W49QtFL2y2zx8W4ftCh32r1YjvW3W3Zgh47RX1fW3d38Pl3ZPGQYW45QnSd2xLs3zW2PKtY_3DYHcNW1YX1g24t636HW2149YR4rflL8W1QxL_Z2nHwz6W4mFtvt3Vx3pCW3g6GmP1NsP3XW1LF4ZK4mdsFmW45nCQ42RL0Q8W3JRQml3_-TDJW2Pn8JG253h0HW3b96271BsvGLW2MH75b3zfgkbW30jrSw3R62mwW4pkj7h2-bln_W3_J1-K2Wfft4W1NpR1J4m6_M1W3ZXdJl43R2SCW1Sf6BJ4hF4_jW3Kcjks1QzMfQW2HDJwh2MxKYQW2qNPJH3XJM-8W4cwpRy2z-91NW1XbZ072YLFG-W4fjQN54cC0DWW1Vq5972-FsCDW2FWRf52s_byRW1Nv1B32-cFP8W45zYtd21hR-4W41zzh4213mCQW4cHbDb2Yrs9qW3ZM_cX1LBc_-W1Qgydk38n5YWW2TJ9NK3FfnrMf2RmWFG04&_hsenc=p2ANqtz--42BH5LseQ0Dn5HfORYshOsJXeejk8R8x63Gi2639gbj5DsLWqvNt2bcobjOUuZbI8IHqWidIWUkt2hOXMGilepBJNPA&_hsmi=336859660 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-GQW4r9y0y2pb0j6W4rp8nW45WWyJW4kf6tn2vJdNNW3BV9X836tN1JW349K1N3JPMcMW2qRJpg2sZBDRW3dnzZw45FHz2W49QtFL2y2zx8W4ftCh32r1YjvW3W3Zgh47RX1fW3d38Pl3ZPGQYW45QnSd2xLs3zW2PKtY_3DYHcNW1YX1g24t636HW2149YR4rflL8W1QxL_Z2nHwz6W4mFtvt3Vx3pCW3g6GmP1NsP3XW1LF4ZK4mdsFmW45nCQ42RL0Q8W3JRQml3_-TDJW2Pn8JG253h0HW3b96271BsvGLW2MH75b3zfgkbW30jrSw3R62mwW4pkj7h2-bln_W3_J1-K2Wfft4W1NpR1J4m6_M1W3ZXdJl43R2SCW1Sf6BJ4hF4_jW3Kcjks1QzMfQW2HDJwh2MxKYQW2qNPJH3XJM-8W4cwpRy2z-91NW1XbZ072YLFG-W4fjQN54cC0DWW1Vq5972-FsCDW2FWRf52s_byRW1Nv1B32-cFP8W45zYtd21hR-4W41zzh4213mCQW4cHbDb2Yrs9qW3ZM_cX1LBc_-W1Qgydk38n5YWW2TJ9NK3FfnrMf2RmWFG04&_hsenc=p2ANqtz--42BH5LseQ0Dn5HfORYshOsJXeejk8R8x63Gi2639gbj5DsLWqvNt2bcobjOUuZbI8IHqWidIWUkt2hOXMGilepBJNPA&_hsmi=336859660 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:02.945Z", "aiProcessing": "attempted"}	2025-05-15 07:21:02.982867	2025-05-15 07:21:02.982867
29	\N	\N	\N	email	incoming	2024-11-30 07:20:37	gmail_sync	<1732951234807.8cc95fa2-abf2-4bbb-af6b-53159e6fb84a@20623097t.zola.com>	New Zola inquiry for Home Bites LLC	weddingvendors@zola.com	hello@eathomebites.com	The clock is ticking!\n\nZola for Vendors (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn863prCCW6N1vHY6lZ3p8N8rwWSkVYQlWW2Ym_H96Z80kLW5w3CxK5fKCdNW6GLsJR60s6JZW6Z6J9p3_nN0qW68RV6649_CVwW4Cjyv74_Hs8BMT2W3vqhnlRW6dKRv41VWXmgW2y9L_11CTtxwN3jjCpmvt7ldW7ddhK45m6C3ZW1d92Lh5N8jj3V-FMRh2bvJ9_W7mFN0N5VBB-0VvH4SX3lWTcDW8qz0WT5HQb6nW2HHk312FD48jW5hsPd837s_ThW76dJBX6t5khtW4d14c66VRDBZW2vF4BD4bh3J2f3yXQBF04 )\n\nJayvee Engracio & Jem Torres sent you an inquiry!\n\nTo: Home Bites LLC\n\nRespond now (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn903prCCW8wLKSR6lZ3lVW6y4Nw28Q4KVwW1MhxZ93dqBThW2LktCS6hY-JCN6shGt-r56-YW55Bsqj7WsbnYW7NNGgT8sMzQdW7mD8YM5qT1sKW4w1w_F8h1W7WW4hst4X2r9m_nW61TTz82vCsQgW3T9LTq1xNlG5W8cbZjt79thrXW38TQQN2wBRgDW5P73jN955VXkW1J-Qcr7q4F-6W3XSQj_9cPTPWW5bF4Mc2Gp5HZW4S_v5C8cHRZCN3lPqjVglZsWW3Kblpy3mwp76W8nyNG0369glDW83YbXX29YZLxW2T-XYx36x-9_W2kl8-J1dJF5tV1QjNf4CKfF8W37Bd__324tBfW9cWHY11KcFxfW2JKTKW7SnsJ2f5cVPH804 )\n\nCouple email: kingjayvee91@gmail.com\n\nCouple phone: 8082685399\n\nTheir note to you\n\n“Would like to know how much is the full service cause including some rentals of plates and other stuff.”\n\nConnect with confidence with our Connection Protection Policy (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn8K3prCCW7Y8-PT6lZ3l4W1WXvKP1bGYKFW7gdrSR10BC1dN76wSn8yJLMpN1KNnBkT60tNW4GgszF6NhV7sW472Lnz9hby7RW3JLMMb74qv5bW501nGV2C4L--W1h3Ys54B8ln9W1rM_mX1ZBVT-W76Q5LW3PXf3yW8G4vsp2v4GpHW6qJdCS3Nf9MHW6ZGwC057BS0bVhQ-Vg3d7NRwW2QzFCq7zwq4hW8vCW1P8VCm7BW11DsZd4svlgcVQ2Vny5cJTq7W5HZHLF9kkKdqW6F-hBZ7KRGF0N9jtGhbCNTZNVZNp1B29dc8RW8r1yhG7Dh2MRW40cBz18gNhqZW9lYV3y3Mk9Yff1jNPj004 ) .\n\nVendor\nlogin (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn863cscvW6N1vHY6lZ3pQW8LClk99l890-W6dklwf3HnG5jW2Zj3Xb5891vcW7N--_S89jjqjW8N6XQY7Q93X_W7Rcfz98lFrRkW7RWycF3M3jsYW6rwlsC5d6r9cW94g3xD2dcC7CW2B0BcS50VC8QVMrxXc54m2TcVmpCMc4HFhkVVdL1jy4WYd_6W7cCTVk8jhSD8W5qSQhW5szf1zN38TZYWPCp-bW5BxJB_60MrNjW8wXwM97m8D8vW5tmvGf8jc5x-W7MtY9392Y5TNW5XWfXN4rCwXYW113w-2169hKVf8dRPdW04 )       Dashboard (#)\nFAQs (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn9j3cscvW95jsWP6lZ3n3N52BD4_z8gB2W5cMB0L91vhwBW1mb3zr4y8-2fW76Q_B38q4yrsW3r4qNq7874dtW2l9PSb7p7hNkW3Hr12P5tDzHlV2Kp_26KDkf4VRgCzT9hStg2W1HN8bM4Sjw5vW4-Pfmt2Y5W0rW2w9rFf20zTtFN1_5h27Y8-2NW9gfWBX3D-FdlW2tcws38Z_F18W4jlc-P1qY5S4W5B8Z9Z3mk85yW23bYj_30PqThW8SPsHZ1Zrhr8W7q-71b1LMlBBW2WtsnQ7wqjQfW4y6nqh666g78VPW_j01R9SClW58QnvQ4sxGp2W4bTJPH5X97q6W13d6HY58DWZ9W3DX6KK3KVMJtW8lYlPW7zfZbkW8GdY2_8zhlwNW3jR5L94YNMvMdMf3VY04 )\nRefer a\nvendor (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrKcf5Y-3_kN6Tk9DDPGqn0W2K0rfL5n_WzRN91mn8q3cscvW7lCdLW6lZ3lyW6NCKZM4C3Jf6W2tGDnP6fDsCPW3P9-HH4RFlgcW86tZtP449MLRW308P_q4NpvjhW75rXZZ903BFYW85910N67-cQFVrjWPc5X828wW1716Xz4SzT_YW3QDS341wr8_rW1cFz7r8QR6rTW27MSWn6s5DxlW1d9DXR1xTgQ4W2yG4zk7B2J0wW3ymPh09bgQTJW6yx95469YsMRW4Kcm_3773x-_Vyjv386DtMh5W82YvGj8vjJr7W2cdMjb7f3kmRW6jzZ5g7wm2xkW8NY1g58Qn1WfW1_jrV389ZKZJW8NcdwZ1_cSncf7qX7N604 )\n\nZOLA\n\n7 World Trade Center, 39th Floor,\nNew York, NY 10006\n\nReach out at\nweddingvendors@zola.com (mailto:weddingvendors@zola.com)	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:03.777Z", "aiProcessing": "attempted"}	2025-05-15 07:21:03.794862	2025-05-15 07:21:03.794862
30	\N	\N	\N	email	incoming	2024-11-28 16:00:01	gmail_sync	<1732809601463.c0b1f759-5c4a-4149-8e40-158a6c3a1e12@bf01x.hubspotemail.net>	Featured spots coming soon!	weddingvendors@zola.com	hello@eathomebites.com	Zola for Vendors Logo 2022 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pYz3prCCW7lCdLW6lZ3pJVmmGd93yN6NrW725Twj2Mr2L1N145y8V7BS3ZW5ScK4v9dt-PgVpP65L5f3nvVW7khydM7wwRDQW1WQRfV4WJkY7W6RzPZX8vYRYFW2sMhR51P7TrYW9dWgCL5wwVy9W7ldBMB89c8rPW7prS9X8gGlFsN1clgybD5c3tW6m_f5b3DT0ZcW7dLjCx796wFPN7wrTL9l5VhtW8ZRPnV3QRK9yW19v6zL8pmVHpW7LJkpJ1ZmLRrW6H2Cyf9hJMJFW2xzZDH46gDhfW7Gslw73Qq6JKW64NL4L5CH4FzW2cPcJ-6KBbwPcf-Gq04 )\n\nFeatured spots go live on December 5th!\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pYz3prCCW7lCdLW6lZ3pJVmmGd93yN6NrW725Twj2Mr2L1N145y8V7BS3ZW5ScK4v9dt-PgVpP65L5f3nvVW7khydM7wwRDQW1WQRfV4WJkY7W6RzPZX8vYRYFW2sMhR51P7TrYW9dWgCL5wwVy9W7ldBMB89c8rPW7prS9X8gGlFsN1clgybD5c3tW6m_f5b3DT0ZcW7dLjCx796wFPN7wrTL9l5VhtW8ZRPnV3QRK9yW19v6zL8pmVHpW7LJkpJ1ZmLRrW6H2Cyf9hJMJFW2xzZDH46gDhfW7Gslw73Qq6JKW64NL4L5CH4FzW2cPcJ-6KBbwPcf-Gq04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pYz3prCCW7lCdLW6lZ3mjW7Q82n58KNjXdW3HWmP98ycMdMW8wjw0K80FVDwW5lKSmT95G84KW8mkMgV2tNhtHW4bFl448Fkh-jW1K1K4s5-p6ybW7bsqc87GcGNjW857wrz8k14qzN9d-KcLBrg81W6gX9z_3gxrj8W97ysDG35FHc8W3L0tlg2TDvmkW2dpWMg8Q-R6RN6qgQwrRnGGnW1H2vMh8cLK3TW7MH3rk3szs6NW8fzWwD3CCK2YW5skqcm7Kx8H3W7ZWTVN2kwnMLW3jqWhn4yW1DYW5jCktc78w-fVN7r-sPgtnzDHW910Y1w7t_v1tf6ryWld04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pXn5m_5PW50kH_H6lZ3lqW2W2_S999wbjfW8gx74P7ySQBXW69p-t838GwMdW5ljWqx8PsthvW2m8BY826RNQHW7fn0F94pD2LcW4hSL4t3nSptxW6DGm-C3H6s-3W3y6hJ437m348VflPdp4RW-nRW1nW91s4Y6ytjN4J_w7kwhHC2MJfdhxsx0b7Vv8XPr76NlgWW18B-JF9h-fhsW693Fjv16pTQ1VnCTh-2xK2Z7W2lYCbd7qpbwhVr0pW08zhnLcW1-9T3P39nX98W8K_PDn5mTGcGW4tFKCB1YJs9mW3dGDJT77XtTKW48GSzP4c7Kz9N6K3_Z31xX06W8LK0fP12msp7W72kBbz2Sxbw9VfshlT5Fk2d_W6m-nZJ92Yc-7W1WN5zF4zw94wW4qr2RR2tDVg2W6PLBb94PzvFnf7kvqFx04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pYT3prCCW7Y8-PT6lZ3kNW94t9Y-8vXStNW9k5vgl76M_fTW1Y4ZP67H61FbW7m49bS6mTBWJV7h8rj2tlJBGW7GvRZ62krBr4W7P1JfM4BzNZSW1Dbw7s2zssKVW6-z79S1f7NwvW9jz0Q-1zy2XsW8zTMLm4DMdtYVJsx683_rNswW2Mnf7p6VGPG2W72wVMn4dwltxW10TH4T5lnqj0W7TtC0z6qZs-3W3mgkCt8JX5wKVgjlsF98ln9YW7J2q3j6L1g51W5_p_9x8VVRscW8RZv5k6VQNrHW52j15_58SR4XVlz0hZ3Qrts_V-W0FP7JhQgCW1ZcC8M52Gt-PW45Ppnc1hVwNFf5mFqDY04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWSjS13gk1_rW2J74NL536rS4VGwS3m5nYnSmN6J4pYz3prCCW7lCdLW6lZ3pCV8_nH17D4kbZW6lTV1_9hffJnW40HXhY2JRbKCW6HzJ3-3NLMmQW64ZSh53zBcrmW3lcf-b8fxF6SW4SKdQ_9kDqLrW6BQ_C37rlgTgW1mHGzT6HHCGDMXtGMk8Ttt7M62tHfQc-QTN7lD0wZR2XZJW2kRg9Q8DsdHKW8hFmQY83sbq3W7G2W3z4XdRdRW617XH38cq3KQW5GBQW538pmw0W42dRp78z20NmW1Wtgft1zcdQlW3YJ-Pt9jwH3mW3RJ53w9bH-sTW6QVtb64Y8vHMW53N37B3RPbtcW6m2wbm49-BfKf9jglnj04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/20381002/en/direct?data=W2nXS-N30h-zCW3dfYw61LpGHMW3brd3t3R2Ly0W2xSgKS2HpC-4W1BMHWG3ZKvtNW2-BcL01Q5mbCW2nSktV3Sy3dgW1SqF3s4hrJLVW3JH7qJ3Cg0ljW1Vnpgc3C15DLW45NRz44cqVHSW3P0vGL4p85CCW25jHTC4cSQnfW2Tz6SF3K8p4rW3Y30qS3gdZhyW2RKdpM3gpcrGW49z-l_1VsC5-W1V9x6f3BLd9MW24X2JF2WgyxDW3_X21X4ppqQ6W47R6Dm47Tc3QW43lF8h2HZwf_W2-pyK62F_qVfW4hPSv91N5dylW2r5g1432sYG2W1BqSbH231TcqW38cPKz34j2qxW34G_V73Szj_4W4myZ-H3DN8DtW3G_0xY4r96mjW34Cc3r2nMJD1W3NMN414rkT42W1XvrpR4hPn9TW1N7drZ2KB0t5W2qFk2k1XtzvZW3bqvtg4t7cF3W3_YNbt43H_zxW2RkvgV2t74ZFW30CH9X3F77f3W1NCHLy47TcJCW3P8kWz4fM72pW2RPpw225fmYpW1NkbJV3K1GV1W3HctFy4rDkMnW24QbGp2Wjf55W2zPDfJ4cNcZZW3CdKhm4tyLcgf4pl-Bs04&_hsenc=p2ANqtz-9f-kJv5tAGHVu30PZtKGN3FSsAV7uSBtgS4YHCSMwBpbnn1jGwO7C4qsJwWiBQ6dOaOWINZRkrV6hF6ATwRWEifuzsRg&_hsmi=334924816 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/20381002/en/page?data=W2nXS-N30h-zCW3dfYw61LpGHMW3brd3t3R2Ly0W2xSgKS2HpC-4W1BMHWG3ZKvtNW2-BcL01Q5mbCW2nSktV3Sy3dgW1SqF3s4hrJLVW3JH7qJ3Cg0ljW1Vnpgc3C15DLW45NRz44cqVHSW3P0vGL4p85CCW25jHTC4cSQnfW2Tz6SF3K8p4rW3Y30qS3gdZhyW2RKdpM3gpcrGW49z-l_1VsC5-W1V9x6f3BLd9MW24X2JF2WgyxDW3_X21X4ppqQ6W47R6Dm47Tc3QW43lF8h2HZwf_W2-pyK62F_qVfW4hPSv91N5dylW2r5g1432sYG2W1BqSbH231TcqW38cPKz34j2qxW34G_V73Szj_4W4myZ-H3DN8DtW3G_0xY4r96mjW34Cc3r2nMJD1W3NMN414rkT42W1XvrpR4hPn9TW1N7drZ2KB0t5W2qFk2k1XtzvZW3bqvtg4t7cF3W3_YNbt43H_zxW2RkvgV2t74ZFW30CH9X3F77f3W1NCHLy47TcJCW3P8kWz4fM72pW2RPpw225fmYpW1NkbJV3K1GV1W3HctFy4rDkMnW24QbGp2Wjf55W2zPDfJ4cNcZZW3CdKhm4tyLcgf4pl-Bs04&_hsenc=p2ANqtz-9f-kJv5tAGHVu30PZtKGN3FSsAV7uSBtgS4YHCSMwBpbnn1jGwO7C4qsJwWiBQ6dOaOWINZRkrV6hF6ATwRWEifuzsRg&_hsmi=334924816 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:04.499Z", "aiProcessing": "attempted"}	2025-05-15 07:21:04.520045	2025-05-15 07:21:04.520045
31	\N	\N	\N	email	incoming	2024-11-21 21:32:32	gmail_sync	<1732224752027.e266b9ac-534e-47b9-8bb7-630b5f133f5f@bf01x.hubspotemail.net>	Now's your chance: Become the Best of Zola🏆	weddingvendors@zola.com	hello@eathomebites.com	Here's how to qualify\n\n1113_Best_of_Zola_2025_how-to_hero (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S43l5QzW6N1vHY6lZ3mKW675B9T2FdqCWW16Jwrg5DBFjBW88Zr_q7jT2bBN7ftVV7jtQlgW3VjRGx5mpd4pN2XgFRX5BMP2W4-CgQ07SGQ93W37Nbd06tlWd6VNvHFX3ZzCcKN4TvntDjJ-BnN2WPxFnPRJ0CW4HBVZ382tTk2W5tywXX2cv8hpW1QZvwH6gwqJrW3ysgHd8jTBzdW8zf0493x6qTlW11cZFC6Dw2qpW6r9Whh6hHPb0W8NXjHR7WRbLfW4VjsgT79N8D_VVfZqf51Y-qfW5KNQp722kkwVf6Kdhzj04 )\n\nbody-1 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S43l5QzW6N1vHY6lZ3mKW675B9T2FdqCWW16Jwrg5DBFjBW88Zr_q7jT2bBN7ftVV7jtQlgW3VjRGx5mpd4pN2XgFRX5BMP2W4-CgQ07SGQ93W37Nbd06tlWd6VNvHFX3ZzCcKN4TvntDjJ-BnN2WPxFnPRJ0CW4HBVZ382tTk2W5tywXX2cv8hpW1QZvwH6gwqJrW3ysgHd8jTBzdW8zf0493x6qTlW11cZFC6Dw2qpW6r9Whh6hHPb0W8NXjHR7WRbLfW4VjsgT79N8D_VVfZqf51Y-qfW5KNQp722kkwVf6Kdhzj04 )\n\nFAQ-1 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5Tg3l5QzW95jsWP6lZ3lPW64ZBmv23H2mtW3-9c9q7F2HYfW2Pj3CX4q2vWbN3b__byZJLp3N1z91kPw4xZlW7LrVdp50MT-LW5F60_y42qWc2W2_CFBR1Cm6hRW5HBKTP31g3_jW2Y8-mX7ZZ5nSW2zjX1j4PXS5sW7g88x1535xxVN472r4hwl96BW4Nq2-32f0pzmW3RsjC-5jw2w4V7bltL53sWFyW3nYjb67M9r_xW8Vt6LY4qCbXSW2jzcJ_3gwtkjW6PqmC_5kTJkrW99tzF526mBGXW21ZXkT93SrDwW8MHgl-13YBDfW4J2V--2dxGQtW7317q085QcvfW4pmZBz8hz_RSN3KqSH4zK_r1W4Zd8dQ5YCtBpN6RwSxjPw25sW1LF26621XYltf6Ln0M004 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5RP3l5QzW69sMD-6lZ3nwW1jWR9l1bWL9SN8d_08pmzLFhW76j_yc46K_Y3W14bqFc75D8YcW5cbGJk58nnRjW1b7qdZ8LbNDKW4r3cGJ5q0WgSW3sxDNN7N4FrwW6vSQH12xY0qlW1yyNk81yy1_zW4LCVpf3jHyZnW1hQPhY9bMhlpW9j7mX18bN98tW67R8LH47YLG7W3WbWzq6XwlgPW93dtKY79zR8BV3jmCH4ZyNwHN7_KtG6rdGQ9W2vTcRR2n3d5sVt04YQ6w9fcLf7qfbTR04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S43l5QzW6N1vHY6lZ3l1N5lb0YFh2d-rN6pt3-sMXxz0W546Gf11x3N7BW2HkGsV772BF7W6TCw5k5k6cHtW1Cw4nd6H6k58W2xPngN2zbjcxN46Yb0qdFL2FW3Xw2YN7BMf5bW7sPS1H8cVWCQN76dP8gcBNdWVtVwy77VBcLnW2Ys_9G1KD09lW4zwF-y69V1yvW3Rk2PC2HKLW2W6jzn7G71bkpWW62T9sy2kY3JrW4NMncv3cP3cnW7prY2b2MP6gXN5sbMWnz3sqvW8LmT1V1zS5wDW7d-h1F58Js1rf11WLwF04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S-3l5QzW8wLKSR6lZ3lhW7kXX9p643LbvW4SzP1l8ZgJ0zW5mjRS49lz-MQW1L2TD24J2_VDW2tQ11d2tsH0pVjkjqF2j8Fv3W6t9wxD59sHkZW4lCY9Q8L_JNDW5R9rrG5GGrvSW7z3Rfq1mgWcXW43wMBz25zxtCW59ybFN7WN8_NW2GHw-X3q10FBW6cgQG45XQxFDW6Dc-4Q4p6mBlVf6w3r1pwQv-W4TDL-_5xvQ6SN6Pmcsy-RFhkW3_wzDt875M24V5SStf3bSYmtW6cgMB62qqn8wW4m02Pf7Pfj70W7fSCd35zHFYzVJnyj278CcCMW3yDSKT8vrwp_W5jtRwZ1s5p7bW4bmr9791S5JdW5WdNGQ7VqtGgf3rfMH004 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S43l5QzW6N1vHY6lZ3nvW7pnD_Q4YyPyMW2JJMHy5VjTTVW5kVD5N7Qvm8pVhSVGH7WdwWmW7pY86N6hzhcHVHYnLb1Nv_WHW8pxkwQ2wldLTW15yz3J46XYM4W4VFQMT99PXxFVf1dQY28GlHkW10r9fh7YZ6cVW5SV41v5gTQkYW3bDdZS9bWPYZW4_QvGF7_qTS4W8lX1rc1VS4R6VCC-bG3NQkq1Vv-0G_3z_vggN76yjCKz1cgfVQbcNX6jf5zPW4lGhH85xk244N22mx93f0KB-W5lzt1B76HtmNd3PMFn04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VX5lmL6j0FTcN6P5dc9qrBk5W3trWRD5nGVnyN5GS5S43l5QzW6N1vHY6lZ3kTW8BgMPG4jgDcyW43_fH02rQKdlW6y6gyL13bbVvW3rSN687Dmd78W7-cHkz26pvf2W3Nvf5N1HxdQxW3txYw04_dfMxW8qsFPP5TpY0YW3phvYq1hBmlRW5nYjWX4MrYfwW864bpM4Nk9-QW3Jbz701DQTmdW7pSb824RC3gnVrcDXr4LjqfzW38C6vZ3S1_70N3sGs72MZ1cXW3klVJt7zFtsDVnpFXT79yn99N1P_cJXfpNMCW2xTgzF4tP8LfW3lW9816lvqxhW9chPrN6VRCm6f5-CCnM04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-H7W4rk4z01ZpcXLW383YTB3H0cMZW2-c8hx3j0bQPW3d9L_L20YG6gW2sZ-D52r3-6PW3jf_1_3VY4gRW4cj_3N3VPZMhW1Nfv-f385CNLW3K3KML4rfjK0W2qDnhv2H-0RSW2w3zwC2KC9d4W2Kr4tm3jcvmsW4hs7JC4fNk6DW34jR_N2RPVpZW1S3zgy4phZ5DW3ggwtr3S_zwqW1S0_Rr2TdHtFW2PkF112PKtBPW1St6LX2YDV4BW3M5gZp3K5PQ1W2zZHP42HCmlZW3BNLmd1X821bW1BN5x_1VqStSW3BM-0X2TpQ4qW253jfc2vP8TFW3_WbYf3H6t2lW3z1hX43LGzkVW47DKtG250TtyW2Pz3wM1_v27gW2RjdNg3XDDW7W3_sxZ22x_GFxW3h_k363SYMg_W2CKJcz4pqFFrW3CbbsL3Vz8hcW3bjGv64tmmD-W2B2Jmy4hF3LTW34nywn2362PjW22V8V53LHQd_W3VHLYt2xYh_dW3_v-Qg1Q48T9W3S_gld2zFF1rW2HH5KB30K36cW49mL6z3BXcXGW2WfjxD2nXt9WW1L7wn-36F74Vf2qTPnN04&_hsenc=p2ANqtz--n--K83uRWo_CvtJVNsmxRgXvUbx9IfO1U3l3NX2qScyJIB6TFRsxszyfHzqlEZArnb1GtTPWTDphjp8zoIBIX5fxvTw&_hsmi=335122009 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-H7W4rk4z01ZpcXLW383YTB3H0cMZW2-c8hx3j0bQPW3d9L_L20YG6gW2sZ-D52r3-6PW3jf_1_3VY4gRW4cj_3N3VPZMhW1Nfv-f385CNLW3K3KML4rfjK0W2qDnhv2H-0RSW2w3zwC2KC9d4W2Kr4tm3jcvmsW4hs7JC4fNk6DW34jR_N2RPVpZW1S3zgy4phZ5DW3ggwtr3S_zwqW1S0_Rr2TdHtFW2PkF112PKtBPW1St6LX2YDV4BW3M5gZp3K5PQ1W2zZHP42HCmlZW3BNLmd1X821bW1BN5x_1VqStSW3BM-0X2TpQ4qW253jfc2vP8TFW3_WbYf3H6t2lW3z1hX43LGzkVW47DKtG250TtyW2Pz3wM1_v27gW2RjdNg3XDDW7W3_sxZ22x_GFxW3h_k363SYMg_W2CKJcz4pqFFrW3CbbsL3Vz8hcW3bjGv64tmmD-W2B2Jmy4hF3LTW34nywn2362PjW22V8V53LHQd_W3VHLYt2xYh_dW3_v-Qg1Q48T9W3S_gld2zFF1rW2HH5KB30K36cW49mL6z3BXcXGW2WfjxD2nXt9WW1L7wn-36F74Vf2qTPnN04&_hsenc=p2ANqtz--n--K83uRWo_CvtJVNsmxRgXvUbx9IfO1U3l3NX2qScyJIB6TFRsxszyfHzqlEZArnb1GtTPWTDphjp8zoIBIX5fxvTw&_hsmi=335122009 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:05.220Z", "aiProcessing": "attempted"}	2025-05-15 07:21:05.237865	2025-05-15 07:21:05.237865
32	\N	\N	\N	email	incoming	2024-11-19 21:02:33	gmail_sync	<1732050152942.6711c3ff-ecd1-4224-a206-572fd10a3bd2@bf01x.hubspotemail.net>	It’s back! Get ready for the “Best of Zola”!	weddingvendors@zola.com	hello@eathomebites.com	Our favorite season? Awards.\n\n1113_Best_of_Zola_2025_announcement_hero (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsDs3l5QzW6N1vHY6lZ3q5W4ytgxB63d0LtW7vYnWx565lhJW13bkbJ38j1YjW8cRGF11nRQdRW2P06Dr5cDKkDW3LBZNQ7CnJLsW2nkqyd2Xz2LFVB-ZWs2Rx_MPW1gy2bl4bmhzFW1QpzFp7XGQ-qW7d9QSc938fhQMy3jcVB9dmcW9blQgs2TRHJ7W27W1Rg7r08gVW2KzhlS4jXl0yW4rqYJb3NPdZKW7d88GG880F-HW8895l15Mq0nfW6qWK3L67gxzNV2cVy68Dfn5KV2dWNL3N80zYW806Td98N-8kQf8JyzsW04 )\n\n1113_Best_of_Zola_2025_announcement-(1)-(1)_02 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsDs3l5QzW6N1vHY6lZ3q5W4ytgxB63d0LtW7vYnWx565lhJW13bkbJ38j1YjW8cRGF11nRQdRW2P06Dr5cDKkDW3LBZNQ7CnJLsW2nkqyd2Xz2LFVB-ZWs2Rx_MPW1gy2bl4bmhzFW1QpzFp7XGQ-qW7d9QSc938fhQMy3jcVB9dmcW9blQgs2TRHJ7W27W1Rg7r08gVW2KzhlS4jXl0yW4rqYJb3NPdZKW7d88GG880F-HW8895l15Mq0nfW6qWK3L67gxzNV2cVy68Dfn5KV2dWNL3N80zYW806Td98N-8kQf8JyzsW04 )\n\n1113_Best_of_Zola_2025_announcement-(1)-(1)_03 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsFF3l5QzW95jsWP6lZ3nRW4tTm6h18nfCdW3Pb5cy4l2h1LVX47Ql6Rq5jTVGZqvv6wkXvmW2YB-dL5RdFJcW5gxC8y6sfSpkW418rGM2kygL_W62ndBc2512L0W6mCNGl3snXGyVBMbFZ78l_MJW6gQ6Rh26h54NW3YHnMV5RQcNtW3BMcjZ3cZvJjW2dtB7J432fRrW6PZwk626_g10W6k2DXw8rLJ1yW2yrf6Y19b-lTW2k7Khh39Vkd1W2f4W7Z3_sf48W70Bx4G8RNlgVW232N706fQ5WdVdDQzV2q-Q38W7q7fR_2RbyjDW88mzsv2jgb9dW4VskkN1FG9G8W40V1xY7zj_7lW5jGy2Q6xfd0wN33RD1SLgSSfW7qdG877m82QmW5052tB4sstQqdk94XY04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsD83l5QzW69sMD-6lZ3kwW4yZFYX5F0CGNN8J7kpcdZbmkW26bbwH2Dy16PW6SXrn58wHV5jW8z5hQc8v9qyvW3nH6Dn1CvfNqW2tNnS75MC-Q8W4bpdky3tKRGjW6KXXwM432t0MW86twb21z2V6HW93lScr7G-lk-W2VBBFP3s_pmnMSzK-qDhw-JW2QbQxf5Jstw5W66Mrqd7NfG7pW587QTp6vKWQxW7ggndk88ZLr7W5N_mfd29j3wwW6zYvR84jcKdSW1txqTQ3MT28Hf62LPvn04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsDs3l5QzW6N1vHY6lZ3nQW59TTB258xwnKV4PRlH2MSLQ4VKqpNJ6_Zk6HW4yyzcN5f9lpqW4lLwsN3KBpktN8JXdrgZGJR2W59Gtz111rn1sW7-vZxl6cWhbSW3YVC2Z1Tr_PGW2zsGH02pt7nXW7XRlP35PkkH8W2LcWnD4nN2fRV1tcPX95RcXvW8J7w028l-11fW7txw5B7JQ4NvW1yw0Nt5x3Bn8W5hVRwh6Fl-lrW7Szyws3hbfK_W3B7xNn1_MhGxV5BNs-4V_k3KW4YJFjF8BcgvnVkk4kB2mcN34f8RTjSY04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsFl3l5QzW8wLKSR6lZ3n-W7kmKZL1gdtyLW8g5WK-1ThfrJW8lZ3n_1VCrfpW37wwtW98sz4YW3R73BL4dF2x3W2G-nDr2M4rPvW8FMlMH9155d5V2h5n_3csgycW6-_y9y8ghFrHW3r4r-C31ZbNyW4DBmpr5rNWxGW5GF85f3lPNB0W22HC_l46Mh3CW4pF5bV2xxrxpW7vXc7B7XhKMFN2yGpCcrJ93cW5Jp2LM9hm6YtN6Cd1rqm4LMXW8L-bl421sS-DV6rQGh6HM90hW2h5pB-1vr0p1W3R--MT6tlYjKW6pXMFr54wxBYW37c4QT7zpljNN4578W4WgHGWV1VRNp748dg1W27GHM21skHzYW1ksX8l3DG1nSf17CyTM04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsDs3l5QzW6N1vHY6lZ3p_W5XbjJS1PzHB0VpFk6X7wYpm4W8C6B2R7_6gzzW333Y6H41MHPRW7P1pC43L87vXW3pNMP938LC1VW3zC2s93BGXxsW21ytVW3KN0kGW3jm0Y24TykpJV8prQ88FhsPCVfYZL149wN1-W51vSs65qysB2W4NDJnn3n3s9bW1SP8j42xW5lqW9jzJkF63dhGJVNRFLD68WX_0W5Xb5gc3H-pPFW3MZ1RN6vDzTMW203pXy1RS9wyN5341R5cYmzVW3mC4ld5jfGGQW5mVC2J3MqfGNf2_FZJ604 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VW80xw9lZVMTW1lh5zL1MlHMQW7HlLKX5nByvpN8JCsDs3l5QzW6N1vHY6lZ3nqW2x8dQ11YV162W1H0dKW573T-nW2km2J946w_kZW3B2nKw3lY8dvW7X3yVf715N3RVS00DK11N4rSW2FtbWY6btM8yW3rt6PS3H4lyxW74kZlz44TwKgN8zZVGxfRSmPW3RHdt07lRsQ9W9czddn1wXpsBW2wBPwf594GmcVPng5h8TGklVW2bp-sz8W2M_RW8kkV8r53gl1cW5HZM0272Rc04W2RRjb28lp63vW9cBggZ8rnwV1W43Z3dz3Q-12JW4FpM2V5xD2hJW1xYg1N3FJRFhf7SPcW-04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MRW2357-L49K2lgW2PMBVX384kvqW362sbw2t283HW20VPq01NhZh7W2Wwtyw4pxS_zW1V7vFz2B1w9bW3M8Cvn20ZxxmW328fnM2PN04GW4fnyC01Bs87GW2TGB6k38z-dvW2WJN-C3NWGBfW3GKRtl2x_FvmW1_shHd3Xzmf7W1ShFSt2r8-KqW4hxfb-36t0B2W1LC0RX45RJrqW43F3Ql4kG4-pW2MvC_j237jcMW2TBlZv3yYctsW2CJSS83JJQkhW36wS7V4r6DxDW4tdG7r47N7NzW47Vpfz3QPFLXW25kSyw2B35zcW1-X8012vBMSgW41n4hf2CZyGTW3VxS064fjR11W2zGB1Z38Bq11W3M0cS62t2th3W1SvQm52FFJNVW4pFNyV38ygpHW3hZKky3VxnPmW2RMKVT3H3D4mW3_GJmt4tn7vxW3__8HR4mcGwSW2xL5hd3GS2ydW24WcM62MC2R9W2D03p12RRWCKW2w0hDR3K7wYqW3DN3-w2KPx_DW43ZBNw3H7jrgW2p3K_847wRSgW2KYY4K3R0Kd2W3brlvd30J90sW3_pBZX21qvLjf38vm4n04&_hsenc=p2ANqtz-8tVdYeatj2qYs36mfzKI8PQ4_PwkrUaOvPjl7_TloyPHuj5k6f1dTE3kr-bdzIJckyT0XnMtsuG-zBXLBEGa5IuCz2mw&_hsmi=334714694 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MRW2357-L49K2lgW2PMBVX384kvqW362sbw2t283HW20VPq01NhZh7W2Wwtyw4pxS_zW1V7vFz2B1w9bW3M8Cvn20ZxxmW328fnM2PN04GW4fnyC01Bs87GW2TGB6k38z-dvW2WJN-C3NWGBfW3GKRtl2x_FvmW1_shHd3Xzmf7W1ShFSt2r8-KqW4hxfb-36t0B2W1LC0RX45RJrqW43F3Ql4kG4-pW2MvC_j237jcMW2TBlZv3yYctsW2CJSS83JJQkhW36wS7V4r6DxDW4tdG7r47N7NzW47Vpfz3QPFLXW25kSyw2B35zcW1-X8012vBMSgW41n4hf2CZyGTW3VxS064fjR11W2zGB1Z38Bq11W3M0cS62t2th3W1SvQm52FFJNVW4pFNyV38ygpHW3hZKky3VxnPmW2RMKVT3H3D4mW3_GJmt4tn7vxW3__8HR4mcGwSW2xL5hd3GS2ydW24WcM62MC2R9W2D03p12RRWCKW2w0hDR3K7wYqW3DN3-w2KPx_DW43ZBNw3H7jrgW2p3K_847wRSgW2KYY4K3R0Kd2W3brlvd30J90sW3_pBZX21qvLjf38vm4n04&_hsenc=p2ANqtz-8tVdYeatj2qYs36mfzKI8PQ4_PwkrUaOvPjl7_TloyPHuj5k6f1dTE3kr-bdzIJckyT0XnMtsuG-zBXLBEGa5IuCz2mw&_hsmi=334714694 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:05.896Z", "aiProcessing": "attempted"}	2025-05-15 07:21:05.914346	2025-05-15 07:21:05.914346
33	\N	\N	\N	email	incoming	2024-11-01 22:48:22	gmail_sync	<30192150.20241101224822.67255ab6479f61.01147346@mail133-197.atl131.mandrillapp.com>	Good news! Your Zola plan is ready to use	weddingvendors@zola.com	hello@eathomebites.com	https://mandrillapp.com/track/click/30192150/www.zola.com?p=eyJzIjoielJieWtBcWE0X2tDZzdfU3otRnVkZm1lWWxNIiwidiI6MSwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoxLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy56b2xhLmNvbVxcXC8_dXRtX21lZGl1bT1lbWFpbCZ1dG1fc291cmNlPXRyaWdnZXJlZCZ1dG1fY2FtcGFpZ249bWFya2V0cGxhY2VfbGlzdGluZ3B1Ymxpc2hlZFwiLFwiaWRcIjpcImQyYmM4NDVhNjJkNDRmZjJhMjkwMDJhYjQyMTFjOGYwXCIsXCJ1cmxfaWRzXCI6W1wiZTA3OWQ2NDIyMjdkZTVjZTEwOTFkNDQ0NTg3OGRjMWVjMjdjYjhiZlwiXX0ifQ\n\n ?utm_medium=email&utm_source=triggered&utm_campaign=marketplace_listingpublished Thanks for your order!\n\n Hi Mike,\n\nYou recently purchased a credit package from Zola. Please see the details of your transaction below. ORDER NUMBER: 39009716\nDATE OF PURCHASE: 11/1/2024\nLISTING NAME: Home Bites LLC\nPACKAGE PURCHASED: Premium 3 Month Plan\nPAYMENT METHOD: Visa ending in 1532\nSUBTOTAL: $105\nTAX: $10.87\nTOTAL: $115.87\n\nBILLING ADDRESS\nCosmas Bisticas\n19233 98th Ave S, Renton, WA, USA\n Renton, WA 98055\n\nBUSINESS ADDRESS\nHome Bites LLC\n1005 Terrace St\n Seattle, WA 98104\nHead to the "Your Inquiries" page (https://www.zola.com/inspire/vendors/leads) to connect with couples using your credits anytime. Warm regards,\nTeam Zola\n\n https://mandrillapp.com/track/click/30192150/instagram.com?p=eyJzIjoiOHZLVDhYaTY3Wmc1ZDRYR19DZnVuSDdTQzZRIiwidiI6MSwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoxLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvaW5zdGFncmFtLmNvbVxcXC96b2xhXFxcL1wiLFwiaWRcIjpcImQyYmM4NDVhNjJkNDRmZjJhMjkwMDJhYjQyMTFjOGYwXCIsXCJ1cmxfaWRzXCI6W1wiYWMxNGYzMTg3ZTI1Mzk4MmI4YTM4NDlhMmNjM2Q3MzE3ZTQ4MmYyZFwiXX0ifQ https://mandrillapp.com/track/click/30192150/www.pinterest.com?p=eyJzIjoiUUw2Wmw2YTJHQ2JtbHNXNFBTNTVDcGM5VmZZIiwidiI6MSwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoxLFwidXJsXCI6XCJodHRwOlxcXC9cXFwvd3d3LnBpbnRlcmVzdC5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCJkMmJjODQ1YTYyZDQ0ZmYyYTI5MDAyYWI0MjExYzhmMFwiLFwidXJsX2lkc1wiOltcImM4OTJhYjA0OTk5ZTk5MDA4NDJmOWQzNjRjZWUwMmE2MjgyMjlmODVcIl19In0 https://mandrillapp.com/track/click/30192150/www.facebook.com?p=eyJzIjoiblJMVGRmNTR0UUt4N0dyTmhJUXFZdDRleVZNIiwidiI6MSwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoxLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3d3dy5mYWNlYm9vay5jb21cXFwvem9sYVxcXC9cIixcImlkXCI6XCJkMmJjODQ1YTYyZDQ0ZmYyYTI5MDAyYWI0MjExYzhmMFwiLFwidXJsX2lkc1wiOltcIjkzZmY0YTY4MzFmZWM2YzJhMmU5YWI2NDBmMTEwMmNlMzU0M2ZlNWZcIl19In0 https://mandrillapp.com/track/click/30192150/twitter.com?p=eyJzIjoiU0RjaTllWlY2aTJGV01UU2tUUWJRUkd2YWhNIiwidiI6MSwicCI6IntcInVcIjozMDE5MjE1MCxcInZcIjoxLFwidXJsXCI6XCJodHRwczpcXFwvXFxcL3R3aXR0ZXIuY29tXFxcL1pvbGFcIixcImlkXCI6XCJkMmJjODQ1YTYyZDQ0ZmYyYTI5MDAyYWI0MjExYzhmMFwiLFwidXJsX2lkc1wiOltcIjQ2NmVmMjJiOTk0NTUzMDMyYTI2NDViYjY5YjIxNThjNjRjNDdjMjNcIl19In0\n\n We're Here to Help\nHave feedback? Questions? We're all ears.\nReach out to us anytime at weddingvendors@zola.com (mailto:weddingvendors@zola.com) .\n\n ZOLA, INC.\n250 Greenwich St. 39th Floor, New York, NY 10007 (#)\n	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:06.612Z", "aiProcessing": "attempted"}	2025-05-15 07:21:06.634154	2025-05-15 07:21:06.634154
34	\N	\N	\N	email	incoming	2024-11-01 15:32:19	gmail_sync	<1730475138791.8cf9821e-592e-43df-a4b3-a1ae8b84f711@bf01x.hubspotemail.net>	Review reminder: Help more leads find you!	weddingvendors@zola.com	hello@eathomebites.com	Collect more reviews to attract more leads to your listing\n\nB2B_email_header_stem (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3l1VwY4kL8dv0tNN5bmLngJtQQnW72jHtL8fbHbzW6Bd8g37jswFzW5ykCTy3ZGx9HW5j9jTS1kh2VkW1pG7M51lvGbSVVwjwQ7cq1gkW5CY4sG7Btg-BVH2w3Q4h_mpLN5zH3gwtcp6vW8P9qWx3ctsr2W6lj8r349lVFwW97zQ7k4nc8FYW3PQsW68Vl_8fW3v00Zp8_XQC2W1fDg6t6kNsG6W97X9W160GLtDW8FqlNt4Lbty9W95LY_C4r4ZCxW7sGq384ShVSrW7dshfG2HG0xCW23Z61J4w80mXN3mFxTBsKGRZW2xJxBb3vwfFWW8F3W1J7Q_RHqf5_FJbj04 )\n\nDon't forget to request reviews (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3l1VwY4kL8dv0tNN5bmLngJtQQnW72jHtL8fbHbzW6Bd8g37jswFzW5ykCTy3ZGx9HW5j9jTS1kh2VkW1pG7M51lvGbSVVwjwQ7cq1gkW5CY4sG7Btg-BVH2w3Q4h_mpLN5zH3gwtcp6vW8P9qWx3ctsr2W6lj8r349lVFwW97zQ7k4nc8FYW3PQsW68Vl_8fW3v00Zp8_XQC2W1fDg6t6kNsG6W97X9W160GLtDW8FqlNt4Lbty9W95LY_C4r4ZCxW7sGq384ShVSrW7dshfG2HG0xCW23Z61J4w80mXN3mFxTBsKGRZW2xJxBb3vwfFWW8F3W1J7Q_RHqf5_FJbj04 )\n\nRequest reviews (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3l1VwY4kL8dv0tNN5bmLngJtQQnW72jHtL8fbHbzW6Bd8g37jswFzW5ykCTy3ZGx9HW5j9jTS1kh2VkW1pG7M51lvGbSVVwjwQ7cq1gkW5CY4sG7Btg-BVH2w3Q4h_mpLN5zH3gwtcp6vW8P9qWx3ctsr2W6lj8r349lVFwW97zQ7k4nc8FYW3PQsW68Vl_8fW3v00Zp8_XQC2W1fDg6t6kNsG6W97X9W160GLtDW8FqlNt4Lbty9W95LY_C4r4ZCxW7sGq384ShVSrW7dshfG2HG0xCW23Z61J4w80mXN3mFxTBsKGRZW2xJxBb3vwfFWW8F3W1J7Q_RHqf5_FJbj04 )\n\nPro tip: why reviews matter (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF6l3prCCW95jsWP6lZ3kzW6h4DjH7fql1yW284BLw1jSCgVW2WSJ1P2gD_RZW1678_d4JKrK2W7YlBf44cvSWwW8zwK0n48sH-FW7cTsN-76f-F3W2cL3v24-2QGrV3GGTf1LTcdGW1vzM5H7k8P_qN6GKFYjc8hkRW5XCvHv5Vfk-XW6XXG7_8f3rMrW8bG-xy3tRCZbW8X7_d95Fz2-dW2J-DxJ8tV9sWMX9hW6w2vl7V2hf0-7H2TB8VFtwLm7rH1jTW4rKMcv1DddMjW8P7QpT6YdLWKW4YCD6X3v_7jYW3P0mt-4X60rvN2KxpVtTmNn7VzXxM11Bnv16N1xRZzFy8sdmW7btWp47Ss2Q1W6GRfb11HQf1LW5MxV7v8bnjVwW5WncV888GnY-d8N90H04 )\n\nb2b_footer_stem_login (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3pSW6GfckR8cm7CGW4DdFmB29tR_VN3_v89Smytj7W3ppxcp6ynvFpW1_d5NB3_yyVPVKGx8s7W4fz8W8dLlsv83btHKN853rMJyH_SqW7F1fKT6x4mw5W8kpq9918dmh2W83yRXr9gN920N7skm_RCt29YW1Kk-tr1ypzHgW11yZnd2k7ZVWW44DkrF3_GdRxVsypgV8ZhJ1mW5d8RDV4rWFy0W80s5vs5pks92W6ZqGSF7cTXbyW2sGMys5Hcf-7W8-K0Wm2pGnfcW1-fm8t5sprwQW7YqDPT8RSW2nW3WrBMm6r0yHwW6dpsG23wPNdVW790pvp7Dd5y2f6zy7LY04 )\n\nb2b_footer_stem_dashboard (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3l1VwY4kL8dv0tNN5bmLngJtQQnW72jHtL8fbHbzW6Bd8g37jswFzW5ykCTy3ZGx9HW5j9jTS1kh2VkW1pG7M51lvGbSVVwjwQ7cq1gkW5CY4sG7Btg-BVH2w3Q4h_mpLN5zH3gwtcp6vW8P9qWx3ctsr2W6lj8r349lVFwW97zQ7k4nc8FYW3PQsW68Vl_8fW3v00Zp8_XQC2W1fDg6t6kNsG6W97X9W160GLtDW8FqlNt4Lbty9W95LY_C4r4ZCxW7sGq384ShVSrW7dshfG2HG0xCW23Z61J4w80mXN3mFxTBsKGRZW2xJxBb3vwfFWW8F3W1J7Q_RHqf5_FJbj04 )\n\nb2b_footer_stem_faq (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF4g5m_5PW50kH_H6lZ3ptW5LczvR6Lyc7lW3xHZgt3ZptBFW6fyTsw4B79PCW6l2CDw2tjdJMVXtXtY2shLpBW8jgFdN3Mk9yvW7hvWcp6gqkPxW82ZXQG3950mGW67VSpX5NtXzDW2YN5g98Qj4CgN79SLbJc9QmPM8VXZzxWnRxW4pP7pC5fRSgqW2Dc35h1xfJT2W37s5WZ8JfRnJW3Qcg7g5Ttk3hW4JQTfl3dtf39W39FnNY6wjlltW5j5Jzg4H58FBW8wP5xJ3PbVgjW22z-nq5mGBTXW3MXQGW6W7J1FN5SlB20x1LRjVXm0Dp1N727KW1Pkvr328DhKFW5VyfyT7fB10KW2886lk6bS6L1W6__wP362DvwRW5snzfQ2ffRf1W55fbTb73b62vN1bdy2rgKC_jW1v9BgR7pqYc7f8S67wY04 )\n\nb2b_footer_stem_refer (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3pSW4y3Rd64JhB96W5-GL755DK-5kW70JtVw4kFzrvN7Py23t95tWgW5dyQLh5vYGwxW255HTf1dsW9mW6wJ8vD45q71xW5HVvM06-l_sFW1hjH7w74cQrlW43PfmQ9754NlW1kXK2d3L5yFTW1jV1Wn8Y2nSfW9chFX47_MPlXW5JQDp961ZPG2W76gmV71ZQXQ7VF_RNF5Yk9bpN2Y78sfcDHBJW8SZ90x4j_gTzW8yBkPn77QvvWW3qKbNS3dPvvkW6_rzrc8t_cDYN628-yJ22S0NW5WzP3p2T2FGxW2bNT4L681s9rN3G0WBLsYhjtW1bvDg_3V1CZZd6jpV204 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWrPrs15VwpXW89gnV76np7f5VDyhz95mTtD4N8rPF5M3prCCW7Y8-PT6lZ3mgN5P4_n34LzjdW3lvW7t3S1WgdW4Sb6v56cLHfwN5HmN0TJrkl8W69p5Z59kMydwW8X0sCw3MGms0W93w9bC3WtsKMN5s-ttBQ6Kb3N6ZFB3xNQx5LW6-RcNt4H_-LnW7vmSrt1mZwVVW2998Ks5ljpR5W8PrWNg1gLbJTW2ZGxvb8h0SL1W3D_8gQ8fRDySW8_yHBY38V2rwW4w5nQ92Gp16nW3CTCrP3P4lVKW6gqM2r3V0J-QW2fl3M76_h6X-W8G9H9D3frLPyW4b6FL18NFDbrW7m5Zkc70BgdTW3qF8BR7fdL3rW50C1J06xJNPVW56wbHC6B3wPHf4Nmc8R04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-B4W2r8C8-2xLW6yW2p6gKw4kwKjHW2FVzG42-FZQCW3dhzQF2WKdbSW4m97xM3bBcc7W4hFY5g4tFnbwW1BfHkm2YgKGcW3_sV663f-P4LW3d3-qy36xHQTW1NFMqq2zTMYmW2zyfr94hN6qzW3T2XJl3_tJ9LW2KJZNv3XWBMxW3T2wBn3CfzXgW1-VzcC1BCW6mW1SkH212FFfz2W41Y4Xc3T47bXW2PyHDG2FrQk9W4hd53j4mtRbGW3X-qMz1NdbzSW2zP70G2YLdykW2KPG353VZLLJW3QVbDt30mmb0W32gwQJ3XL1DXW1Vv-633dcn7BW20ZytJ21s6JxW1L7pYX3GTN7qW2KQSzL47s_vdW4hNFdT2CL67tW4rzKZx1SzyZ_W3_RxCh3zfkcpW2nT7WJ4p8y78W3bsYJ22PRktgW383V-v3KcF7JW2WpbqG3bcFbyW3z9cR83VJcjTW2WPV111QmYJ2W2xH9mk49BqYrW2-9-WR1BLThYW2Wg7GK2Ry3JVW3M5gf43H3XvKW1WYrbv2r7NnTW30jr7F4mtpgsW3644NG1LnRXxW2-Kh4X32GQDDf2TQTpV04&_hsenc=p2ANqtz-9AQsCToLzzumUMslJGn3w6c0VKJymrvD3nuOKLQpF28Sg4hzfPROmQAk2_ThQWFRgPfOy6Erh3smd1_UC275jX1cyS2A&_hsmi=313007256 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-B4W2r8C8-2xLW6yW2p6gKw4kwKjHW2FVzG42-FZQCW3dhzQF2WKdbSW4m97xM3bBcc7W4hFY5g4tFnbwW1BfHkm2YgKGcW3_sV663f-P4LW3d3-qy36xHQTW1NFMqq2zTMYmW2zyfr94hN6qzW3T2XJl3_tJ9LW2KJZNv3XWBMxW3T2wBn3CfzXgW1-VzcC1BCW6mW1SkH212FFfz2W41Y4Xc3T47bXW2PyHDG2FrQk9W4hd53j4mtRbGW3X-qMz1NdbzSW2zP70G2YLdykW2KPG353VZLLJW3QVbDt30mmb0W32gwQJ3XL1DXW1Vv-633dcn7BW20ZytJ21s6JxW1L7pYX3GTN7qW2KQSzL47s_vdW4hNFdT2CL67tW4rzKZx1SzyZ_W3_RxCh3zfkcpW2nT7WJ4p8y78W3bsYJ22PRktgW383V-v3KcF7JW2WpbqG3bcFbyW3z9cR83VJcjTW2WPV111QmYJ2W2xH9mk49BqYrW2-9-WR1BLThYW2Wg7GK2Ry3JVW3M5gf43H3XvKW1WYrbv2r7NnTW30jr7F4mtpgsW3644NG1LnRXxW2-Kh4X32GQDDf2TQTpV04&_hsenc=p2ANqtz-9AQsCToLzzumUMslJGn3w6c0VKJymrvD3nuOKLQpF28Sg4hzfPROmQAk2_ThQWFRgPfOy6Erh3smd1_UC275jX1cyS2A&_hsmi=313007256 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:07.279Z", "aiProcessing": "attempted"}	2025-05-15 07:21:07.2972	2025-05-15 07:21:07.2972
35	\N	\N	\N	email	incoming	2024-10-23 12:03:54	gmail_sync	<1729685034220.7498efa7-99e0-411e-a313-c43d2c7c134a@bf01x.hubspotemail.net>	Don’t lead leads on	weddingvendors@zola.com	hello@eathomebites.com	Keep your contact info up to date, and you’ll never miss a beat.\n\n0820_Contact_Self-service_announcement-1 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3nbW8FdwNC3bqlw_W4j4ktj242knnN3HSFpc70ghtVPv9Zn6ZY4r2W7QWsWd3cTp8LW2WhWvW1m5BcHW3kL2vp3HdL3fW6fp6M93j-h1bW8VQ41v7Y287kW2crgkT61wwTzW1yqr2l1chZvRW30XZ8S4ZFFcbW4WHfZ035VyQ8W1b9Kvd5-h7QlW2CSk-Y92DtsgN8F4N-Ym-Lx_W1zVDtc58k1DBW63rPM04W_ZwRV2CZq22WwvYCVNh6JM136BCmW3g6gxl4FY6FXW8Jj6Tp3lKXVdf2xX3d-04 )\n\nstay in contact (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3kqW5jn08n6K195SW1DCPsP8hJDQDW4tjqRf6VDK6JW3pb6hW5vc2qMVGL5WZ2GK-xhW4Rvx7q3vWSLhW427kjf7lK715V3BKgx2T9q2NW4T1xgQ25dcBzW5Bv8yx75vzwLW8V9-Ts1n-53tW8Y65kr7BKp2ZW7p7Zcv1FXV-3W5gmTHp6RbKD0W3rJ9F-46yMZLW86wm6_5yH-0CW6Nljgj5hGwR1VbRTxl2NwQnbW6XZP318T2FyDVGX0P083Xmb7W4pGHyd7cp7Z5N1bszmQ57gpvf1F47tz04 )\n\nemails arent your thing (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3mbW7gdpvC37cjFpW4_KYSN8JtGB3W1DFD-g1bydPLW7yqC5K11gm2jW8D9p5l6BKmhmW5Mn-mV4xJHKjW2Zkpxc32m3_CN5lhp6cP0wmkW7JzvP55NBMjSVGr9lY3FBFbwW8kWqKm555b3GM16vbNnp5JRM21zgnfxmNZW5L1pHR25jGQJW3ZLTHx8zXZCZN3P6ttvHVqZLW9g_6GJ1PFbfpW8dNlDX3M1NwCW47smDD3XdsdxW6LQFtN81bVl_W5pxdjt4tzHp7N2Y220J22Dw-dpK6Z604 )\n\nfirst comes inquiry (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmDn3l5QzW7lCdLW6lZ3p9W8K9wrx3JN8BwVpkW7j85D3NKW1z_KlT8Q2xtdW8LsvYW773zNLW5Ptv3_3gQdSNW2pVvmq32NvKlW6wfw7S2gH9LxW3tPmLT5GBMQWW3lWCn05gnQtmW2ZzVPm10fYBPW58pNxL5Y683sW6w8XmH1PNyrYW2g_PVw80zYKcW1d1LZ08WTzPcW4VNP1_7btZrmW3gXpR347l9CnW8kHTkv46Fm68W3wltBD57kJ23W1VGKq61KjXyDW6fD6Ws1Nfqn7W4m4nLN25txv-Vycxjv4gXBfzW1gXnBr2zwsP5W3HNZQL7_V3g9f1Ql98d04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3nbW8FdwNC3bqlw_W4j4ktj242knnN3HSFpc70ghtVPv9Zn6ZY4r2W7QWsWd3cTp8LW2WhWvW1m5BcHW3kL2vp3HdL3fW6fp6M93j-h1bW8VQ41v7Y287kW2crgkT61wwTzW1yqr2l1chZvRW30XZ8S4ZFFcbW4WHfZ035VyQ8W1b9Kvd5-h7QlW2CSk-Y92DtsgN8F4N-Ym-Lx_W1zVDtc58k1DBW63rPM04W_ZwRV2CZq22WwvYCVNh6JM136BCmW3g6gxl4FY6FXW8Jj6Tp3lKXVdf2xX3d-04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3mbW7gdpvC37cjFpW4_KYSN8JtGB3W1DFD-g1bydPLW7yqC5K11gm2jW8D9p5l6BKmhmW5Mn-mV4xJHKjW2Zkpxc32m3_CN5lhp6cP0wmkW7JzvP55NBMjSVGr9lY3FBFbwW8kWqKm555b3GM16vbNnp5JRM21zgnfxmNZW5L1pHR25jGQJW3ZLTHx8zXZCZN3P6ttvHVqZLW9g_6GJ1PFbfpW8dNlDX3M1NwCW47smDD3XdsdxW6LQFtN81bVl_W5pxdjt4tzHp7N2Y220J22Dw-dpK6Z604 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD-3l5QzW8wLKSR6lZ3mYW6NtZnB25TSXnMXD6k5z9PpLN4Zn5LNVBClsW2qgQzX89KvymVBllKv8CmQgxN5BJ4NWB3D1pW1WWzl95JpBVHW2sFyqs3k2bJ8W8V24_X12zZ1cW2dBfJx6rDxVJW1hFrrg5BhWM0W5nc3Y_4vDjywW8yXjTK5K-FzCW1wRCrP5Pc9wfW2VY-zS8YKrx0W2ZxjzY7HS7CCW2X33Lc1kTwwrW52bPFb7_Gy9vVcqSwX509yxLW4tSF3q7y4d97W4gDBWG86PZdfW9grFQl5_-QLgW6Kg1-L5KMb9vW84QG8k7dY4fdW4zKjTz3KFKCdN8vcZHg6kbgwW2bQTZH8_0b-VW53HGsv2tXb20f2DZhMx04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3kNW8yytmd6ghCpsW11BFdf7_gDMjW375dm24_w5wqW7BnH6p6_8W1YW6C6pvl6pryd7W24H1lb2G0Mp9W8vTW0s2fP1jZW18pq4P4RBjcBN2T6H5Qpl2c1W1Q9ScT41Xb8gW5NcX791fMpFgW67jcZP7J9QjGW5Zswwj4Zn4rHW7k15W56Zm5n3W7QLwJl1rzv28VTgkBN2lDwdGTR5Y793dn_qW2SJxsm6gtCbpW1htHpw8X-p-HW8vWfy87gBKyCTSf7r5_-TgtW59Nk3T6S_0MZf3kJSkT04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VWfFzw66JhnpW16sgbW2dJSvcW2K0rfL5mvVbxN8DGmD43l5QzW6N1vHY6lZ3kLW6PYq7L7sPwx3W4x8kYn2zt1WmW2ylZz81_Fy9HW4Jz73T7c21BxW7vX1F967dJZrW8mKDMk73KYjVVcNvXW8_FdC9W6GmW2G6LV0BqW6_1PFg1bLCMCW4PKqgp1SpZc6W4dJV8Q98ZZ14V_n25Q4sL4ghW6DKtnK4k25PHW1qNC0N5g9vFhW1JpCfg5H0-QDW1Zrg157J3mNfW2ln3_921BDx2W4NcfSj4sbmWnW8tk4VY8vhXq5W7Tp7T25WxTWxW3mz22T51YkDvW2hL4hB7c32BTf22Bkdd04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-MNW47mvv84rm5z-W3FdvJw347bX9W3z2sT91Qw3BbW3H4qPf22V8k_W2nHYpD2Mmsm3W2qBMf034CDgrW32zl_03XFYj8W22XG-p25fh_GW30kJ-G4rBFVTW3g5MWk1BvzNsW3BJCFr2MV0YvW45P9mZ3DXqfnW2xPngK3LS19tW3JJQdX1_6s3-W3ZFk5X3Q-Dr0W3yR0Fh3FgcvqW41rX6_2WN_xjW2p8hC54fNNxVW22WNP_2r61y0W2vMrFw41G-DYW3M4mZD4mqrkFW3LXD_x49z8_6W2nTxsp47RWRvW4kltRT4kDxZtW32J0T92RT9VgW4kcSs61BBZ1vW4tmLmY3jbyw_W237kZZ4fJHXZW3K8QRh49gjHCW4crFqg2WhNbLW32lhtW4hq08sW1VzlW21Z7XCrW4t5cp73DKzPmW2HR1wj2HzJ9vW1BthPp2HLxGXW2zP7W83jfVYvW3g6HNV3BVYhSW2qRKnt4fslpPW3gbkH723gpNyW364DdR3_JSNjW2zJx_Y306QZ9W2nQD1h4ktYD1W32J1bB41Y2bBW4mC2rh3Hbf3JW1_9hTB32gBS9f3Y01Tr04&_hsenc=p2ANqtz-_2ABAIcfO8dUkcrZIvldg1RqxbsOTm-gSog-2Xy6GhlYHjGZWUJeBeOF45DoBqxD3s6S1NmzHDtb4b7KPtkae1wfy-1Q&_hsmi=323509430 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-MNW47mvv84rm5z-W3FdvJw347bX9W3z2sT91Qw3BbW3H4qPf22V8k_W2nHYpD2Mmsm3W2qBMf034CDgrW32zl_03XFYj8W22XG-p25fh_GW30kJ-G4rBFVTW3g5MWk1BvzNsW3BJCFr2MV0YvW45P9mZ3DXqfnW2xPngK3LS19tW3JJQdX1_6s3-W3ZFk5X3Q-Dr0W3yR0Fh3FgcvqW41rX6_2WN_xjW2p8hC54fNNxVW22WNP_2r61y0W2vMrFw41G-DYW3M4mZD4mqrkFW3LXD_x49z8_6W2nTxsp47RWRvW4kltRT4kDxZtW32J0T92RT9VgW4kcSs61BBZ1vW4tmLmY3jbyw_W237kZZ4fJHXZW3K8QRh49gjHCW4crFqg2WhNbLW32lhtW4hq08sW1VzlW21Z7XCrW4t5cp73DKzPmW2HR1wj2HzJ9vW1BthPp2HLxGXW2zP7W83jfVYvW3g6HNV3BVYhSW2qRKnt4fslpPW3gbkH723gpNyW364DdR3_JSNjW2zJx_Y306QZ9W2nQD1h4ktYD1W32J1bB41Y2bBW4mC2rh3Hbf3JW1_9hTB32gBS9f3Y01Tr04&_hsenc=p2ANqtz-_2ABAIcfO8dUkcrZIvldg1RqxbsOTm-gSog-2Xy6GhlYHjGZWUJeBeOF45DoBqxD3s6S1NmzHDtb4b7KPtkae1wfy-1Q&_hsmi=323509430 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:08.159Z", "aiProcessing": "attempted"}	2025-05-15 07:21:08.181463	2025-05-15 07:21:08.181463
36	\N	\N	\N	email	incoming	2024-10-21 12:04:23	gmail_sync	<1729512262309.ef539aa3-5ebb-4f2a-8306-dfea1e86b87c@bf01x.hubspotemail.net>	Say Hello first with our prospecting tool	weddingvendors@zola.com	hello@eathomebites.com	Do less work, get more bookings\n\nZola for Vendors Logo 2022 (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzTY3l5QzW6N1vHY6lZ3mKW1r2TgH3D5z8TW5LKs9m2Pl2XjW1S_C8h8pZy3wW9bFpYj4CjXVTW3jMGfD5qqys9W40qxSC1lVk9KW3T-F0X48fhfHW257JcV7GNq1jW1Rl5mR8ZHjXZW4DQ-Kj5ndv3gW9lQsXh5gJGhnW7FYKNz5qJBsPW1qst992W75tGW4scnXf8Q7p89W8T0vHc5QmxBCW9jb0P01H0K05W41gxjH1mhz7xW5MFZNc8jtxR-W3Wj1_t4rjznSW4w-ZNh4CJ-wsW5qrv0X4kp1FwW4yf6ct8th7mWf5g8bpP04 )\n\n0216_B2B Onboarding - email5__1001update (1) (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzVd3l5QzW7lCdLW6lZ3lQW62rDfh5dFzjjW4pYG2H3KYzrMW6sk8CH3jcnQLW38CSLQ6lxVZ1N6qP6cPY3v41W5zW1WX3J3H75W90tMbP6DktfMW8ZGwZj7Ktl66W4KpV9K7Rtmd-W7_BhP27ygfVrW4VmDwf3QrD5GW6780-B7JLYg_W4NKP5H1tg_j3W5JZNV_7v3pbXW7z3vws4h-7WJW5Lf1jz5S_p_nW86--QW2C6X-dW3nZsVl2hRwt_W40zd4C5ZRjqpW8Jhy0943xDGkW3xF-Jf77t5flW5rcYZy2gm9MMW3TMVGl3PW17gVCvgv94NGFCqf57W8Kd04 )\n\nVendor login\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzTY3l5QzW6N1vHY6lZ3mKW1r2TgH3D5z8TW5LKs9m2Pl2XjW1S_C8h8pZy3wW9bFpYj4CjXVTW3jMGfD5qqys9W40qxSC1lVk9KW3T-F0X48fhfHW257JcV7GNq1jW1Rl5mR8ZHjXZW4DQ-Kj5ndv3gW9lQsXh5gJGhnW7FYKNz5qJBsPW1qst992W75tGW4scnXf8Q7p89W8T0vHc5QmxBCW9jb0P01H0K05W41gxjH1mhz7xW5MFZNc8jtxR-W3Wj1_t4rjznSW4w-ZNh4CJ-wsW5qrv0X4kp1FwW4yf6ct8th7mWf5g8bpP04 )\n\nDashboard\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzTY3l5QzW6N1vHY6lZ3kHN1QXcLKfpTqsW53qpCt23sGY6W3PtG7v8ZqbQfW8-N2qY3vXLwgN42-7yPSWMB4W1qjdbs80yJVRN68Mqf_mRZjHW3KhxP51tNsfGW8hbXLL1zX6FTW23YYyR2S8KDcW3Qy1kg3pDVs8W1MJHVw3tP-CQW7hfLYY2R2w7_W2ZljdD44RJnkW32PQlp7-N-cbW3lxt2V2BvXgDW1GrVF13-zzrTW69S6Kb1VXNsPW85BBlm6vzTPfW2Q9Lqz2rdc50VXy-3G2fqt2xW5bblFN9cgbmlf8sNfdd04 )\n\nFAQs\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzVR3l5QzW8wLKSR6lZ3mSW8XkFV-2k0cSwW54yyc23ZSJ_bW2qNS2H6dldXkW2SB9Jy2SgNPSW46dCvp84nfJjW8LDqsJ2nHmXJW2jnB_J6DBJpJW2jpNh_144XJ8W8-590V56lX6nW3m3CDW15RSmjVLHNts5MkZM4VT2MHT4qqRPfW1l3tR392hk8-W2nbH_z540ZhTW8xxDWc1XjtZbW2FgJrm5Q6P32W5n0b616VMm2rW1958yM5kfLcxW9kvyd47LzzLwW8nCzTL6qqpYzW97yYx38vNpyKW89Gxvy6xn8HNVsN1S-3hwKBpW5kMfWn2zYD82W56vzKV6n-gZtW5rfyYG5FLtJHN4-GN4z-JmqYN60pKMTpytQ_f6hjRsj04 )\n\nRefer a vendor\n(https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzTY3l5QzW6N1vHY6lZ3kGW1Zx-4R5czdbQW76VjLp6nvRjJW71_LH92D7WN2W7X-qZq5cf0DXW3cKlWH5HNSxtW2FmNBr31K-XtW8NjcmL3pg4TtW2Tz05k90m6cMW6f0sDR2M0lg8W57Sjqd6FD_SnW6GY7JP2Pq9v2W5htRk-2k9dHyW5RhxjF49w5_xW86mGB88qVmn7W5l4ngB1LyC0xW3h0K8P2t-D8FM9GFx9SWnNqW8pMj-m7RnxfGV5BTDk4QxDYjN2kd-6VWLxM2W5t-wHP3fnrMRW56B7Jb56CXlYf882BWn04 )\n\nZOLA\n\n7 World Trade Center, 39th Floor, New York,NY, 10006\n\nReach out at weddingvendors@zola.com (mailto:weddingvendors@zola.com)\n\nUnsubscribe (https://learn.zola.com/e3t/Ctc/UB+113/d2q-pc04/VXbKTg5-lv6mW1yVtXS8yYyTWW4xGMq_5mqBMzN61zzTY3l5QzW6N1vHY6lZ3ncW4r0Ff44lmMr1W8zM8_p65Hl18N8PDyvrxbXvHW7HdSdL92zkJdW9gHFT31KWtVRW3g1HY-6gJ6mhW12BCkh3cccwFW11VKDw4nFM99Vyz_lj17ZFGhN84t0lj-1M6xW97vx4f7K5xLDN1fw49sJ--2FW2xgkTj4vD_5WN6TBCFnZ2xymW5t9fRN3CPRxbW6js8X_5zZNHLW54670b2Kf00cW2qrBx16N1xhzVNF_0c2mZ5sbW6smk3B8TnRWZW1LC5qM7vc-3LW8rcqkf1qd8BQf8ZbMsW04 )\n\nUnsubscribe (https://learn.zola.com/hs/preferences-center/en/direct?data=W2nXS-N30h-FSW49tBv-3DJQ44W2-pD2z4pn7J8W1XnYRS347GC3W25mCrX38gpmSW2zZK-V2MqnbXW2RSPhx235d1zW329Yf84rpDpjW3yXS_g2YgN0lW2PkfgV4hp7t5W4cSMn11L9wFsW1Lhmfc1BmXDBW2q_1dV2PkFrxW3ZFksj1LznwSW2KFgjk2Yd9T-W4kdK4l3-1XwCW3XGNw12vz8KpW3LP-_Y1NBq-gW49HQ-G3XWGVMW1Bdr0d3QWsdmW2CvzcM2t1KPYW3ZWV5j23nB2bW3F9Dtl4hF-6rW45LGmG3_-1p9W2RDCXb34yhtrW2WnMVg47C23gW3GJ60Z1LljdhW3NLtyx2Kz5RTW40012y3JX05zW3K295G30skclW41Q2rQ3XxdJrW212YYF1Zmx4tW2RlKLG3ND90dW2z-7-V34r5JDW23rylk4mm3kjW4p9mKP2xQCyJW3VMybL2t7ygHW2Wsx7g2CLtVBW3C3bx-3zdYNrW2-FXC-3NFqr3W41Q1bz4hfkPyW1S8-mF45qg4NW1Xnc3849kdPqW3_tlcR4tdDWxW2YxV1D32GlBSW4kHpb_217Syff4pJc8K04&_hsenc=p2ANqtz-9pW3oUw7w-rFfxwjTfjPNTKtLBbqeTJaxpCNENQ_NwZ-3PK3JjXYDbMLzqrdh3bB-Bu6eWFZvnd96XZ3Vr4Q4CrTq0zw&_hsmi=327507358 ) Manage Preferences (https://learn.zola.com/hs/preferences-center/en/page?data=W2nXS-N30h-FSW49tBv-3DJQ44W2-pD2z4pn7J8W1XnYRS347GC3W25mCrX38gpmSW2zZK-V2MqnbXW2RSPhx235d1zW329Yf84rpDpjW3yXS_g2YgN0lW2PkfgV4hp7t5W4cSMn11L9wFsW1Lhmfc1BmXDBW2q_1dV2PkFrxW3ZFksj1LznwSW2KFgjk2Yd9T-W4kdK4l3-1XwCW3XGNw12vz8KpW3LP-_Y1NBq-gW49HQ-G3XWGVMW1Bdr0d3QWsdmW2CvzcM2t1KPYW3ZWV5j23nB2bW3F9Dtl4hF-6rW45LGmG3_-1p9W2RDCXb34yhtrW2WnMVg47C23gW3GJ60Z1LljdhW3NLtyx2Kz5RTW40012y3JX05zW3K295G30skclW41Q2rQ3XxdJrW212YYF1Zmx4tW2RlKLG3ND90dW2z-7-V34r5JDW23rylk4mm3kjW4p9mKP2xQCyJW3VMybL2t7ygHW2Wsx7g2CLtVBW3C3bx-3zdYNrW2-FXC-3NFqr3W41Q1bz4hfkPyW1S8-mF45qg4NW1Xnc3849kdPqW3_tlcR4tdDWxW2YxV1D32GlBSW4kHpb_217Syff4pJc8K04&_hsenc=p2ANqtz-9pW3oUw7w-rFfxwjTfjPNTKtLBbqeTJaxpCNENQ_NwZ-3PK3JjXYDbMLzqrdh3bB-Bu6eWFZvnd96XZ3Vr4Q4CrTq0zw&_hsmi=327507358 )	Error generating summary.	\N	\N	{"cc": [], "processedAt": "2025-05-15T07:21:08.837Z", "aiProcessing": "attempted"}	2025-05-15 07:21:08.860174	2025-05-15 07:21:08.860174
37	1	\N	\N	sms	incoming	2025-05-15 13:52:09.613	\N	\N	hi	\N	\N	\N	\N	\N	\N	\N	2025-05-15 13:52:12.202315	2025-05-15 13:52:12.202315
38	\N	\N	\N	email	incoming	2025-05-15 14:01:50	gmail_sync	<CAE+Pkq5tocF4z0NRWBAT9BiFCam_odLNZcUKBTUKUUtGZzg8AA@mail.gmail.com>	test	projects@kolmo.io	hello@eathomebites.com	\n	No content to summarize.	\N	\N	{"cc": [], "processedAt": "2025-05-15T14:07:53.032Z", "aiProcessing": "attempted"}	2025-05-15 14:07:53.051183	2025-05-15 14:07:53.051183
39	\N	\N	\N	email	incoming	2025-05-15 13:47:47	gmail_sync	<CAE+Pkq4XmqRb9ozt8TaWMPJ7+TAyGcaMyTPkaCFT5AbXKkE23w@mail.gmail.com>	catering	projects@kolmo.io	hello@eathomebites.com	\n	No content to summarize.	\N	\N	{"cc": [], "processedAt": "2025-05-15T14:07:53.598Z", "aiProcessing": "attempted"}	2025-05-15 14:07:53.615784	2025-05-15 14:07:53.615784
\.


--
-- Data for Name: contact_identifiers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contact_identifiers (id, opportunity_id, client_id, type, value, is_primary, source, created_at) FROM stdin;
1	2	\N	email	additional-email@example.com	t	manual_entry	2025-05-14 05:30:08.041257
2	2	\N	email	secondary-test@example.com	f	test	2025-05-14 05:38:07.516883
3	\N	1	email	client-secondary@example.com	t	updated_source	2025-05-14 05:38:30.264695
7	\N	1	phone	555-123-4567	f	direct_test	2025-05-14 05:47:45.455787
8	2	\N	email	secondary-test@example.com	f	test	2025-05-14 14:18:16.820929
10	\N	1	phone	555-123-4567	f	direct_test	2025-05-14 14:18:30.275237
\.


--
-- Data for Name: estimates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.estimates (id, client_id, event_date, event_type, guest_count, venue, menu_id, items, additional_services, subtotal, tax, total, status, notes, expires_at, sent_at, viewed_at, accepted_at, declined_at, created_by, created_at, updated_at, zip_code, venue_address, venue_city, venue_state, venue_zip, tax_rate) FROM stdin;
1	2	2025-05-15 07:00:00	Corporate	995	19233 98th ave S	1	"[]"	\N	0	0	0	draft		\N	2025-05-14 02:42:35.207	\N	\N	\N	1	2025-05-14 02:42:35.585702	2025-05-14 02:42:35.585702	98055	\N	\N	\N	\N	\N
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.events (id, client_id, estimate_id, event_date, start_time, end_time, event_type, guest_count, venue, menu_id, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: gmail_sync_state; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.gmail_sync_state (target_email, last_history_id, watch_expiration_timestamp, last_watch_attempt_timestamp, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.menu_items (id, name, description, category, price, ingredients, is_vegetarian, is_vegan, is_gluten_free, is_dairy_free, is_nut_free, image, created_at, updated_at) FROM stdin;
16	Korean Pork Belly Bites	Seared pork belly cubes glazed in Korean BBQ sauce.	Small Bites	\N	Pork Belly, Korean BBQ Sauce (soy, sugar, garlic, ginger)	f	f	f	t	t	\N	2025-05-15 20:04:35.67849	2025-05-15 20:04:35.67849
17	Sesame Tofu Bites	Tofu coated with sesame seeds, served with choice of Teriyaki, garlic honey, or sweet Thai chili sauce.	Small Bites	\N	Tofu, Sesame Seeds, Choice of Sauce: Teriyaki, Garlic Honey, Sweet Thai Chili	t	t	t	t	f	\N	2025-05-15 20:04:35.67849	2025-05-15 20:04:35.67849
18	The Big Cheese	7oz beef patty with cheddar, Monterey, Swiss, lettuce, tomato, red onion, and Bang-Bang sauce on a brioche bun.	Big Bites	\N	Beef Patty (7oz), Cheddar Cheese, Monterey Jack Cheese, Swiss Cheese, Lettuce, Tomato, Red Onion, Bang-Bang Sauce, Brioche Bun (flour, eggs, butter)	f	f	f	f	t	\N	2025-05-15 20:04:35.67849	2025-05-15 20:04:35.67849
19	Delirious Mushroom Burger	7oz beef patty with sautéed mushrooms, bacon, Gruyère, caramelized onions, arugula, and harissa aioli.	Big Bites	\N	Beef Patty (7oz), Sautéed Mushrooms, Bacon, Gruyère Cheese, Caramelized Onions, Arugula, Harissa Aioli, Brioche Bun (flour, eggs, butter)	f	f	f	f	t	\N	2025-05-15 20:04:50.398569	2025-05-15 20:04:50.398569
20	California Dreaming Chicken Burger	Grilled chicken breast with red onion, lettuce, tomato, avocado, mozzarella, and citrus aioli.	Big Bites	\N	Grilled Chicken Breast, Red Onion, Lettuce, Tomato, Avocado, Mozzarella Cheese, Citrus Aioli, Bun (flour)	f	f	f	f	t	\N	2025-05-15 20:04:50.398569	2025-05-15 20:04:50.398569
21	Mike's Reuben	Corned beef with Swiss cheese and Bang-Bang slaw on grilled rye.	Big Bites	\N	Corned Beef, Swiss Cheese, Bang-Bang Slaw (cabbage, Bang-Bang sauce), Grilled Rye Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:04:50.398569	2025-05-15 20:04:50.398569
22	The Rachael	Roasted turkey, Swiss cheese, coleslaw, and thousand island dressing on marble rye.	Big Bites	\N	Roasted Turkey, Swiss Cheese, Coleslaw (cabbage, mayonnaise), Thousand Island Dressing, Marble Rye Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:04:50.398569	2025-05-15 20:04:50.398569
23	Cubano	Roasted pork tenderloin, black forest ham, Swiss cheese, pickles, and mustard on Cuban bread.	Big Bites	\N	Roasted Pork Tenderloin, Black Forest Ham, Swiss Cheese, Pickles, Mustard, Cuban Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:05:03.193186	2025-05-15 20:05:03.193186
24	Cajun Salmon Sandwich	Blackened Sockeye salmon with cabbage/fennel slaw and citrus aioli on Cuban bread.	Big Bites	\N	Blackened Sockeye Salmon, Cabbage/Fennel Slaw, Citrus Aioli, Cuban Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:05:03.193186	2025-05-15 20:05:03.193186
25	Banh Mi	Choice of chicken, pork, or sesame tofu with hoisin sauce, pickled vegetables, cucumbers, and habanero/cilantro aioli on French bread.	Big Bites	\N	Choice of: Chicken, Pork, or Sesame Tofu, Hoisin Sauce, Pickled Vegetables (carrots, daikon), Cucumbers, Habanero/Cilantro Aioli, French Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:05:03.193186	2025-05-15 20:05:03.193186
26	Nikki's Chicken Bites	Gluten-free chicken nuggets made with rice panko and potato starch, served with choice of sauce.	Big Bites	\N	Chicken, Rice Panko, Potato Starch, Choice of Sauce	f	f	t	t	t	\N	2025-05-15 20:05:03.193186	2025-05-15 20:05:03.193186
27	The Real Greek Gyro Wrap	Homemade beef gyro meat with tomato, onions, and tzatziki in grilled pita.	Big Bites	\N	Beef Gyro Meat, Tomato, Onions, Tzatziki Sauce (yogurt, cucumber, garlic), Grilled Pita Bread (flour)	f	f	f	f	t	\N	2025-05-15 20:05:17.563157	2025-05-15 20:05:17.563157
28	Barbacoa Quesadilla	Beef, fried onions, and cheese in a toasted flour tortilla, served with pico de gallo.	Big Bites	\N	Beef Barbacoa, Fried Onions, Cheese (Monterey Jack or similar), Toasted Flour Tortilla, Pico de Gallo (tomatoes, onions, cilantro, lime)	f	f	f	f	t	\N	2025-05-15 20:05:17.563157	2025-05-15 20:05:17.563157
29	Crispy Chicken Wings	Nine wings seasoned with rotisserie spice rub, served with choice of sauce.	Big Bites	\N	Chicken Wings (9 pieces), Rotisserie Spice Rub, Choice of Sauce	f	f	t	t	t	\N	2025-05-15 20:05:17.563157	2025-05-15 20:05:17.563157
30	Korean Pork Belly Sandwich	Pork belly with Asian slaw and cucumber slices on a brioche bun, drizzled with Korean BBQ sauce.	Big Bites	\N	Pork Belly, Asian Slaw (cabbage, carrots, dressing), Cucumber Slices, Brioche Bun (flour, eggs, butter), Korean BBQ Sauce	f	f	f	f	t	\N	2025-05-15 20:05:17.563157	2025-05-15 20:05:17.563157
11	Cajun Fries	Fries with Cajun seasoning and harissa aioli.	Small Bites	12.00	Potatoes, Vegetable Oil, Cajun Seasoning, Harissa Aioli (eggs, oil, harissa)	t	f	t	f	t	\N	2025-05-15 20:04:23.235008	2025-05-15 20:04:23.235008
31	Test Decimal Price Item 1	This is a test item with a decimal price.	Small Bites	9.99	Test ingredients	f	f	f	f	t	\N	2025-05-15 20:13:04.794215	2025-05-15 20:13:04.794215
32	Test Decimal Price Item 2	This is another test item with a decimal price.	Small Bites	15.50	More test ingredients	t	f	f	f	t	\N	2025-05-15 20:13:04.794215	2025-05-15 20:13:04.794215
9	Shoestring Fries	Crispy fries with sea salt.	Small Bites	9.99	Potatoes, Vegetable Oil, Sea Salt	t	t	t	t	t	\N	2025-05-15 20:00:03.749236	2025-05-15 20:00:03.749236
10	Asian Street Fries	Fries topped with tangy chili-garlic sauce and peanut powder.	Small Bites	9.99	Potatoes, Vegetable Oil, Tangy Chili-Garlic Sauce, Peanut Powder	t	f	t	t	f	\N	2025-05-15 20:00:03.749236	2025-05-15 20:00:03.749236
12	Greek Fries	Fries with feta, onions, oregano, and yogurt sauce.	Small Bites	9.99	Potatoes, Vegetable Oil, Feta Cheese, Onions, Oregano, Yogurt Sauce	t	f	t	f	t	\N	2025-05-15 20:04:23.235008	2025-05-15 20:04:23.235008
13	Mac n' Cheese - edited	Elbow pasta with cheddar, cream, green onions, and breadcrumbs; optional chorizo, bacon, or jalapeños.	Small Bites - edited	0.00	Elbow Pasta, Cheddar Cheese, Cream, Green Onions, Breadcrumbs, Optional: Chorizo, Bacon, Jalapeños	t	f	f	f	t	\N	2025-05-15 20:04:23.235008	2025-05-15 20:04:23.235008
14	Spanakopita Samosas	Samosas filled with spinach, Swiss chard, leeks, herbs, and feta, served with minted yogurt sauce.	Small Bites	99.00	Samosa Pastry (flour), Spinach, Swiss Chard, Leeks, Herbs, Feta Cheese, Minted Yogurt Sauce	t	f	f	f	t	\N	2025-05-15 20:04:23.235008	2025-05-15 20:04:23.235008
15	Bang-Bang Popcorn Shrimp	Crispy shrimp tossed in sweet and spicy Bang-Bang sauce.	Small Bites	11.00	Shrimp, Batter (flour, spices), Bang-Bang Sauce (mayonnaise, sweet chili sauce, sriracha)	f	f	f	t	t	\N	2025-05-15 20:04:35.67849	2025-05-15 20:04:35.67849
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.menus (id, name, description, type, items, created_at, updated_at) FROM stdin;
1	Sample Appetizer Menu	A sample menu with appetizers	standard	[{"id": 1, "quantity": 2}, {"id": 2, "quantity": 1}]	2025-05-14 00:19:41.03843	2025-05-14 00:19:41.03843
7	test menu	test menu	customized	[{"id": 13, "quantity": 1}]	2025-05-16 16:45:02.21292	2025-05-16 16:45:02.21292
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.opportunities (id, first_name, last_name, email, phone, event_type, event_date, guest_count, venue, notes, status, opportunity_source, assigned_to, created_at, updated_at, client_id, priority, questionnaire_submission_id, questionnaire_definition_id) FROM stdin;
4	PASCAL	MATTA	adsf2@tjae2.com	asd	Corporate	\N	\N			new		\N	2025-05-13 23:57:25.314044	2025-05-13 23:57:25.314044	2	medium	\N	\N
3	PASCAL	MATTA	pascal.matta@gmail.com	7865993948	Fundraiser	\N	\N			new		\N	2025-05-13 23:48:41.828503	2025-05-13 23:48:41.828503	4	medium	\N	\N
2	PASCAL	MATTA	pascal.matta@gmail.com	7865993948	Other	\N	\N			new		\N	2025-05-13 23:36:17.232556	2025-05-13 23:36:17.232556	2	medium	\N	\N
1	PASCAL	MATTA	projects@kolmo.io	asd	Corporate	\N	\N			new		\N	2025-05-13 23:32:15.687552	2025-05-13 23:32:15.687552	2	medium	\N	\N
5	Samantha	Johnson	samantha.johnson@example.com	(206) 555-1234	Wedding	2025-08-15 00:00:00	120	The Overlook Venue, Seattle	Client Message: Couple seeking Mediterranean/PNW fusion menu for wedding. Budget $8,500-$10,000. Need appetizers, plated dinner, and late-night snacks.\n\nKey Requirements:\n• Mediterranean and Pacific Northwest fusion cuisine\n• Appetizers during cocktail hour\n• Plated dinner service\n• Late-night snacks option\n• Catering for 120 guests\n• Services within budget range of $8,500-$10,000\n\nPotential Concerns:\n• Decision timeline is only one month\n• Premium services requested with mid-range budget\n\nBudget: $9000 (specific_amount)\n\nCalendar Assessment: No conflicts detected for August 15, 2025. This date is currently available.\n\nInternal Notes: This lead came through the website contact form	new	website_form	\N	2025-05-18 06:44:19.941334	2025-05-18 06:44:19.941334	\N	high	\N	\N
\.


--
-- Data for Name: processed_emails; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.processed_emails (id, message_id, gmail_id, service, processed_at, email, subject, label_applied) FROM stdin;
\.


--
-- Data for Name: raw_leads; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.raw_leads (id, source, raw_data, extracted_prospect_name, extracted_prospect_email, extracted_prospect_phone, event_summary, received_at, status, created_opportunity_id, internal_notes, assigned_to_user_id, created_at, updated_at, extracted_event_type, extracted_event_date, extracted_event_time, extracted_guest_count, extracted_venue, extracted_message_summary, lead_source_platform, ai_urgency_score, ai_budget_indication, ai_budget_value, ai_clarity_of_request_score, ai_decision_maker_likelihood, ai_key_requirements, ai_potential_red_flags, ai_overall_lead_quality, ai_suggested_next_step, ai_sentiment, ai_confidence_score, questionnaire_submission_id, questionnaire_definition_id, ai_calendar_conflict_assessment) FROM stdin;
994	website_form	"{\\"subject\\":\\"Wedding Catering Inquiry - Aug 15, 2025\\",\\"body\\":\\"Hello,\\\\n\\\\nMy fiancé and I are planning our wedding for August 15, 2025, at The Overlook Venue in Seattle. We're expecting around 120 guests and looking for catering options. We're particularly interested in a mix of Mediterranean and local Pacific Northwest cuisine.\\\\n\\\\nOur budget is flexible but ideally around $8,500-$10,000 for food and service. We would need appetizers during cocktail hour, a plated dinner, and possibly late-night snacks.\\\\n\\\\nCould you send us information about your wedding packages? We're hoping to make a decision within the next month.\\\\n\\\\nThank you,\\\\nSamantha Johnson\\\\nPhone: (206) 555-1234\\\\nEmail: samantha.johnson@example.com\\"}"	Samantha Johnson	samantha.johnson@example.com	(206) 555-1234	Wedding catering for 120 guests on Aug 15, 2025	2025-05-18 06:44:19.73	qualified	\N	This lead came through the website contact form	\N	2025-05-18 06:44:19.750029	2025-05-18 06:44:19.97	Wedding	2025-08-15	Not specified	120	The Overlook Venue, Seattle	Couple seeking Mediterranean/PNW fusion menu for wedding. Budget $8,500-$10,000. Need appetizers, plated dinner, and late-night snacks.	\N	4	specific_amount	9000	5	5	"[\\"Mediterranean and Pacific Northwest fusion cuisine\\",\\"Appetizers during cocktail hour\\",\\"Plated dinner service\\",\\"Late-night snacks option\\",\\"Catering for 120 guests\\",\\"Services within budget range of $8,500-$10,000\\"]"	"[\\"Decision timeline is only one month\\",\\"Premium services requested with mid-range budget\\"]"	hot	\N	\N	\N	\N	\N	No conflicts detected for August 15, 2025. This date is currently available.
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
YR_sQtbn1d-DYvLa8HSxhDHTH1dQbb-X	{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-19T06:21:17.453Z","secure":false,"httpOnly":true,"path":"/"},"userId":1}	2025-05-19 06:21:18
RDFTrMoxo5yR2egujeBx0fncU2slurMU	{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-19T06:25:47.584Z","secure":false,"httpOnly":true,"path":"/"},"userId":1}	2025-05-19 06:45:29
W5cOc0Fx0YMu0jxcPQe6zNqaJhXZ2I_b	{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-19T06:44:19.324Z","secure":false,"httpOnly":true,"domain":"92ed9d8f-9dd8-44f4-aac7-8c91fe7c1778-00-14uj8qsv2ipx.riker.replit.dev","path":"/","sameSite":"lax"},"userId":1}	2025-05-19 06:44:21
Gu7aqptXzodzEXmGz0BfoUFoY9MQb_m2	{"cookie":{"originalMaxAge":86400000,"expires":"2025-05-19T05:24:21.649Z","secure":false,"httpOnly":true,"path":"/"},"userId":1}	2025-05-19 05:24:22
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, first_name, last_name, email, phone, role, created_at) FROM stdin;
1	admin	$2b$10$njGm0yb22TxH77Kv4t6zH.rn/88xgcccGtzy6kxh9sPr5evFda5sC	Admin	User	admin@homebites.net	\N	admin	2025-05-13 23:12:24.024026
\.


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.clients_id_seq', 4, true);


--
-- Name: communications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.communications_id_seq', 39, true);


--
-- Name: contact_identifiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.contact_identifiers_id_seq', 10, true);


--
-- Name: estimates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.estimates_id_seq', 1, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.events_id_seq', 1, false);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.leads_id_seq', 5, true);


--
-- Name: menu_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.menu_items_id_seq', 32, true);


--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.menus_id_seq', 7, true);


--
-- Name: processed_emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.processed_emails_id_seq', 1, false);


--
-- Name: raw_leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.raw_leads_id_seq', 994, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: contact_identifiers contact_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_identifiers
    ADD CONSTRAINT contact_identifiers_pkey PRIMARY KEY (id);


--
-- Name: estimates estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: gmail_sync_state gmail_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gmail_sync_state
    ADD CONSTRAINT gmail_sync_state_pkey PRIMARY KEY (target_email);


--
-- Name: opportunities leads_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_questionnaire_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_questionnaire_submission_id_key UNIQUE (questionnaire_submission_id);


--
-- Name: processed_emails processed_emails_message_id_service_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.processed_emails
    ADD CONSTRAINT processed_emails_message_id_service_unique UNIQUE (message_id, service);


--
-- Name: processed_emails processed_emails_message_id_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.processed_emails
    ADD CONSTRAINT processed_emails_message_id_unique UNIQUE (message_id);


--
-- Name: processed_emails processed_emails_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.processed_emails
    ADD CONSTRAINT processed_emails_pkey PRIMARY KEY (id);


--
-- Name: raw_leads raw_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_pkey PRIMARY KEY (id);


--
-- Name: raw_leads raw_leads_questionnaire_submission_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_questionnaire_submission_id_key UNIQUE (questionnaire_submission_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: clients clients_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: clients clients_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: communications communications_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: communications communications_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;


--
-- Name: communications communications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: contact_identifiers contact_identifiers_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_identifiers
    ADD CONSTRAINT contact_identifiers_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: contact_identifiers contact_identifiers_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_identifiers
    ADD CONSTRAINT contact_identifiers_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: estimates estimates_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: estimates estimates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: estimates estimates_menu_id_menus_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.estimates
    ADD CONSTRAINT estimates_menu_id_menus_id_fk FOREIGN KEY (menu_id) REFERENCES public.menus(id);


--
-- Name: events events_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: events events_estimate_id_estimates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_estimate_id_estimates_id_fk FOREIGN KEY (estimate_id) REFERENCES public.estimates(id);


--
-- Name: events events_menu_id_menus_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_menu_id_menus_id_fk FOREIGN KEY (menu_id) REFERENCES public.menus(id);


--
-- Name: opportunities opportunities_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: raw_leads raw_leads_assigned_to_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_assigned_to_user_id_users_id_fk FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);


--
-- Name: raw_leads raw_leads_created_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_created_opportunity_id_opportunities_id_fk FOREIGN KEY (created_opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

