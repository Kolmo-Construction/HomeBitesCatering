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
-- Name: condition_action_type_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.condition_action_type_enum AS ENUM (
    'show_question',
    'hide_question',
    'require_question',
    'unrequire_question',
    'skip_to_page',
    'enable_option',
    'disable_option'
);


ALTER TYPE public.condition_action_type_enum OWNER TO neondb_owner;

--
-- Name: condition_trigger_operator_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.condition_trigger_operator_enum AS ENUM (
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
    'is_empty',
    'is_not_empty',
    'is_selected',
    'is_not_selected'
);


ALTER TYPE public.condition_trigger_operator_enum OWNER TO neondb_owner;

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
-- Name: question_type_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.question_type_enum AS ENUM (
    'text',
    'textarea',
    'select',
    'radio',
    'checkbox',
    'checkbox_group',
    'date',
    'time',
    'number',
    'matrix_single',
    'matrix_multi',
    'info_text',
    'name',
    'address',
    'phone',
    'email',
    'toggle',
    'slider',
    'time_picker',
    'incrementer'
);


ALTER TYPE public.question_type_enum OWNER TO neondb_owner;

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
-- Name: submission_status_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.submission_status_enum AS ENUM (
    'draft',
    'submitted',
    'archived'
);


ALTER TYPE public.submission_status_enum OWNER TO neondb_owner;

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
-- Name: questionnaire_conditional_logic; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_conditional_logic (
    id integer NOT NULL,
    definition_id integer NOT NULL,
    trigger_question_key text NOT NULL,
    trigger_condition public.condition_trigger_operator_enum NOT NULL,
    trigger_value text,
    action_type public.condition_action_type_enum NOT NULL,
    target_question_key text,
    target_page_id integer,
    target_option_value text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_conditional_logic OWNER TO neondb_owner;

--
-- Name: questionnaire_conditional_logic_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_conditional_logic_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_conditional_logic_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_conditional_logic_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_conditional_logic_id_seq OWNED BY public.questionnaire_conditional_logic.id;


--
-- Name: questionnaire_definitions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_definitions (
    id integer NOT NULL,
    version_name text NOT NULL,
    description text,
    is_active boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_definitions OWNER TO neondb_owner;

--
-- Name: questionnaire_definitions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_definitions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_definitions_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_definitions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_definitions_id_seq OWNED BY public.questionnaire_definitions.id;


--
-- Name: questionnaire_matrix_columns; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_matrix_columns (
    id integer NOT NULL,
    question_id integer NOT NULL,
    column_text text NOT NULL,
    column_value text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_matrix_columns OWNER TO neondb_owner;

--
-- Name: questionnaire_matrix_columns_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_matrix_columns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_matrix_columns_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_matrix_columns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_matrix_columns_id_seq OWNED BY public.questionnaire_matrix_columns.id;


--
-- Name: questionnaire_pages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_pages (
    id integer NOT NULL,
    definition_id integer NOT NULL,
    title text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_pages OWNER TO neondb_owner;

--
-- Name: questionnaire_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_pages_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_pages_id_seq OWNED BY public.questionnaire_pages.id;


--
-- Name: questionnaire_question_options; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_question_options (
    id integer NOT NULL,
    question_id integer NOT NULL,
    option_text text NOT NULL,
    option_value text NOT NULL,
    "order" integer NOT NULL,
    default_selection_indicator text,
    related_menu_item_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_question_options OWNER TO neondb_owner;

--
-- Name: questionnaire_question_options_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_question_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_question_options_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_question_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_question_options_id_seq OWNED BY public.questionnaire_question_options.id;


--
-- Name: questionnaire_questions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_questions (
    id integer NOT NULL,
    page_id integer NOT NULL,
    question_text text NOT NULL,
    question_key text NOT NULL,
    question_type public.question_type_enum NOT NULL,
    "order" integer NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    placeholder_text text,
    help_text text,
    validation_rules jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_questions OWNER TO neondb_owner;

--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_questions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_questions_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_questions_id_seq OWNED BY public.questionnaire_questions.id;


--
-- Name: questionnaire_submissions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.questionnaire_submissions (
    id integer NOT NULL,
    definition_id integer NOT NULL,
    submitted_data jsonb NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    client_identifier text,
    user_id integer,
    raw_lead_id integer,
    submitted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questionnaire_submissions OWNER TO neondb_owner;

--
-- Name: questionnaire_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.questionnaire_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.questionnaire_submissions_id_seq OWNER TO neondb_owner;

--
-- Name: questionnaire_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.questionnaire_submissions_id_seq OWNED BY public.questionnaire_submissions.id;


--
-- Name: raw_leads; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.raw_leads (
    id integer NOT NULL,
    source text NOT NULL,
    raw_data jsonb,
    extracted_name text,
    extracted_email text,
    extracted_phone text,
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
    questionnaire_definition_id integer
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
-- Name: questionnaire_conditional_logic id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_conditional_logic ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_conditional_logic_id_seq'::regclass);


--
-- Name: questionnaire_definitions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_definitions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_definitions_id_seq'::regclass);


--
-- Name: questionnaire_matrix_columns id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_matrix_columns ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_matrix_columns_id_seq'::regclass);


--
-- Name: questionnaire_pages id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_pages ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_pages_id_seq'::regclass);


--
-- Name: questionnaire_question_options id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_question_options ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_question_options_id_seq'::regclass);


--
-- Name: questionnaire_questions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_questions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_questions_id_seq'::regclass);


--
-- Name: questionnaire_submissions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions ALTER COLUMN id SET DEFAULT nextval('public.questionnaire_submissions_id_seq'::regclass);


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
\.


--
-- Data for Name: processed_emails; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.processed_emails (id, message_id, gmail_id, service, processed_at, email, subject, label_applied) FROM stdin;
\.


--
-- Data for Name: questionnaire_conditional_logic; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_conditional_logic (id, definition_id, trigger_question_key, trigger_condition, trigger_value, action_type, target_question_key, target_page_id, target_option_value, created_at, updated_at) FROM stdin;
82	27	id_38	equals	american_bbq_bronze	show_question	id_89	\N	\N	2025-05-16 20:34:23.178238	2025-05-16 20:34:23.178238
9	27	event_type	equals	wedding	show_question	id_564	\N	\N	2025-05-16 19:25:03.507812	2025-05-16 19:25:03.507812
10	27	event_type	not_equals	corporate_event	show_question	id_5	\N	\N	2025-05-16 20:00:57.545851	2025-05-16 20:00:57.545851
11	27	event_type	equals	corporate_event	show_question	id_14	\N	\N	2025-05-16 20:01:09.604526	2025-05-16 20:01:09.604526
12	27	event_type	equals	wedding	show_question	id_564	\N	\N	2025-05-16 20:04:24.634843	2025-05-16 20:04:24.634843
13	27	id_15	is_not_empty	\N	show_question	id_710	\N	\N	2025-05-16 20:05:47.928615	2025-05-16 20:05:47.928615
15	27	id_710	equals	no	show_question	id_20	\N	\N	2025-05-16 20:09:14.705382	2025-05-16 20:09:14.705382
16	27	id_711	is_not_empty	\N	show_question	id_712	\N	\N	2025-05-16 20:09:14.751767	2025-05-16 20:09:14.751767
17	27	id_20	equals	yes	show_question	id_430	\N	\N	2025-05-16 20:09:14.80321	2025-05-16 20:09:14.80321
18	27	id_430	is_not_empty	\N	show_question	id_21	\N	\N	2025-05-16 20:09:14.850217	2025-05-16 20:09:14.850217
19	27	id_514	is_not_empty	\N	show_question	id_604	\N	\N	2025-05-16 20:09:14.89832	2025-05-16 20:09:14.89832
20	27	id_39	equals	buffet_standard	show_question	id_710	\N	\N	2025-05-16 20:09:14.948355	2025-05-16 20:09:14.948355
21	27	id_564	is_not_empty	\N	show_question	id_565	\N	\N	2025-05-16 20:09:14.994786	2025-05-16 20:09:14.994786
22	27	id_565	is_not_empty	\N	show_question	id_566	\N	\N	2025-05-16 20:09:15.048085	2025-05-16 20:09:15.048085
23	27	id_604	equals	yes	show_question	id_605	\N	\N	2025-05-16 20:09:15.102445	2025-05-16 20:09:15.102445
24	27	id_604	equals	no	show_question	id_607	\N	\N	2025-05-16 20:10:13.897327	2025-05-16 20:10:13.897327
25	27	id_606	is_not_empty	\N	show_question	id_607	\N	\N	2025-05-16 20:10:13.963287	2025-05-16 20:10:13.963287
26	27	id_607	equals	yes	show_question	id_17	\N	\N	2025-05-16 20:10:14.010787	2025-05-16 20:10:14.010787
28	27	id_17	is_not_empty	\N	show_question	id_16	\N	\N	2025-05-16 20:10:14.111302	2025-05-16 20:10:14.111302
30	27	id_19	is_not_empty	\N	show_question	id_39	\N	\N	2025-05-16 20:10:14.205695	2025-05-16 20:10:14.205695
31	27	id_19	is_not_empty	\N	show_question	id_23	\N	\N	2025-05-16 20:10:14.252295	2025-05-16 20:10:14.252295
32	27	id_605	is_not_empty	\N	show_question	id_606	\N	\N	2025-05-16 20:13:52.809986	2025-05-16 20:13:52.809986
33	27	id_23	equals	taco_fiesta	show_question	id_25	\N	\N	2025-05-16 20:16:24.475195	2025-05-16 20:16:24.475195
34	27	id_23	equals	taco_fiesta	show_question	id_52	\N	\N	2025-05-16 20:16:24.54934	2025-05-16 20:16:24.54934
35	27	id_23	equals	taco_fiesta	skip_to_page	\N	72	\N	2025-05-16 20:16:24.59975	2025-05-16 20:16:24.59975
36	27	id_23	equals	american_bbq	show_question	id_38	\N	\N	2025-05-16 20:16:24.659706	2025-05-16 20:16:24.659706
37	27	id_23	equals	american_bbq	skip_to_page	\N	73	\N	2025-05-16 20:16:24.717018	2025-05-16 20:16:24.717018
38	27	id_23	equals	a_taste_of_greece	show_question	id_91	\N	\N	2025-05-16 20:16:24.768862	2025-05-16 20:16:24.768862
39	27	id_23	equals	a_taste_of_greece	skip_to_page	\N	74	\N	2025-05-16 20:16:24.825637	2025-05-16 20:16:24.825637
40	27	id_23	equals	kebab_party	show_question	id_94	\N	\N	2025-05-16 20:16:24.879158	2025-05-16 20:16:24.879158
41	27	id_23	equals	kebab_party	skip_to_page	\N	75	\N	2025-05-16 20:16:24.926157	2025-05-16 20:16:24.926157
42	27	id_23	equals	a_taste_of_italy	show_question	id_418	\N	\N	2025-05-16 20:16:24.976967	2025-05-16 20:16:24.976967
43	27	id_23	equals	a_taste_of_italy	skip_to_page	\N	76	\N	2025-05-16 20:16:25.029792	2025-05-16 20:16:25.029792
44	27	id_23	equals	custom_menu	skip_to_page	\N	78	\N	2025-05-16 20:16:25.080131	2025-05-16 20:16:25.080131
45	27	id_25	equals	taco_fiesta_bronze	show_question	id_8	\N	\N	2025-05-16 20:17:06.917812	2025-05-16 20:17:06.917812
46	27	id_25	equals	taco_fiesta_bronze	show_question	id_29	\N	\N	2025-05-16 20:17:06.978663	2025-05-16 20:17:06.978663
47	27	id_25	equals	taco_fiesta_bronze	show_question	id_31	\N	\N	2025-05-16 20:17:07.023888	2025-05-16 20:17:07.023888
48	27	id_25	equals	taco_fiesta_bronze	show_question	id_33	\N	\N	2025-05-16 20:17:07.073767	2025-05-16 20:17:07.073767
49	27	id_8	is_not_empty	\N	show_question	id_29	\N	\N	2025-05-16 20:17:07.120607	2025-05-16 20:17:07.120607
50	27	id_29	is_not_empty	\N	show_question	id_31	\N	\N	2025-05-16 20:17:07.173884	2025-05-16 20:17:07.173884
51	27	id_31	is_not_empty	\N	show_question	id_33	\N	\N	2025-05-16 20:17:07.225318	2025-05-16 20:17:07.225318
52	27	id_25	equals	taco_fiesta_silver	show_question	id_57	\N	\N	2025-05-16 20:17:59.7897	2025-05-16 20:17:59.7897
53	27	id_25	equals	taco_fiesta_silver	show_question	id_62	\N	\N	2025-05-16 20:17:59.849132	2025-05-16 20:17:59.849132
54	27	id_25	equals	taco_fiesta_silver	show_question	id_70	\N	\N	2025-05-16 20:17:59.899444	2025-05-16 20:17:59.899444
55	27	id_25	equals	taco_fiesta_silver	show_question	id_77	\N	\N	2025-05-16 20:17:59.953096	2025-05-16 20:17:59.953096
56	27	id_57	is_not_empty	\N	show_question	id_62	\N	\N	2025-05-16 20:17:59.998843	2025-05-16 20:17:59.998843
57	27	id_62	is_not_empty	\N	show_question	id_70	\N	\N	2025-05-16 20:18:00.051099	2025-05-16 20:18:00.051099
58	27	id_70	is_not_empty	\N	show_question	id_77	\N	\N	2025-05-16 20:18:00.104904	2025-05-16 20:18:00.104904
59	27	id_25	equals	taco_fiesta_gold	show_question	id_58	\N	\N	2025-05-16 20:18:27.465073	2025-05-16 20:18:27.465073
60	27	id_25	equals	taco_fiesta_gold	show_question	id_61	\N	\N	2025-05-16 20:18:27.530938	2025-05-16 20:18:27.530938
61	27	id_25	equals	taco_fiesta_gold	show_question	id_75	\N	\N	2025-05-16 20:18:27.581235	2025-05-16 20:18:27.581235
62	27	id_25	equals	taco_fiesta_gold	show_question	id_81	\N	\N	2025-05-16 20:18:27.633434	2025-05-16 20:18:27.633434
63	27	id_58	is_not_empty	\N	show_question	id_61	\N	\N	2025-05-16 20:18:27.68558	2025-05-16 20:18:27.68558
64	27	id_61	is_not_empty	\N	show_question	id_75	\N	\N	2025-05-16 20:18:27.736012	2025-05-16 20:18:27.736012
65	27	id_75	is_not_empty	\N	show_question	id_81	\N	\N	2025-05-16 20:18:27.783828	2025-05-16 20:18:27.783828
66	27	id_25	equals	taco_fiesta_diamond	show_question	id_59	\N	\N	2025-05-16 20:19:30.190901	2025-05-16 20:19:30.190901
67	27	id_25	equals	taco_fiesta_diamond	show_question	id_60	\N	\N	2025-05-16 20:19:30.250727	2025-05-16 20:19:30.250727
68	27	id_25	equals	taco_fiesta_diamond	show_question	id_76	\N	\N	2025-05-16 20:19:30.300687	2025-05-16 20:19:30.300687
69	27	id_25	equals	taco_fiesta_diamond	show_question	id_82	\N	\N	2025-05-16 20:19:30.355169	2025-05-16 20:19:30.355169
70	27	id_59	is_not_empty	\N	show_question	id_60	\N	\N	2025-05-16 20:19:30.411166	2025-05-16 20:19:30.411166
71	27	id_60	is_not_empty	\N	show_question	id_76	\N	\N	2025-05-16 20:19:30.460111	2025-05-16 20:19:30.460111
72	27	id_76	is_not_empty	\N	show_question	id_82	\N	\N	2025-05-16 20:19:30.509374	2025-05-16 20:19:30.509374
73	27	id_38	equals	american_bbq_bronze	show_question	id_89	\N	\N	2025-05-16 20:20:13.737283	2025-05-16 20:20:13.737283
74	27	id_38	equals	american_bbq_bronze	show_question	id_118	\N	\N	2025-05-16 20:20:13.798835	2025-05-16 20:20:13.798835
75	27	id_38	equals	american_bbq_bronze	show_question	id_119	\N	\N	2025-05-16 20:20:13.850466	2025-05-16 20:20:13.850466
76	27	id_38	equals	american_bbq_bronze	show_question	id_120	\N	\N	2025-05-16 20:20:13.905122	2025-05-16 20:20:13.905122
77	27	id_38	equals	american_bbq_bronze	show_question	id_121	\N	\N	2025-05-16 20:20:13.978706	2025-05-16 20:20:13.978706
78	27	id_89	is_not_empty	\N	show_question	id_118	\N	\N	2025-05-16 20:20:14.045678	2025-05-16 20:20:14.045678
79	27	id_118	is_not_empty	\N	show_question	id_119	\N	\N	2025-05-16 20:20:14.094226	2025-05-16 20:20:14.094226
80	27	id_119	is_not_empty	\N	show_question	id_120	\N	\N	2025-05-16 20:20:14.147035	2025-05-16 20:20:14.147035
81	27	id_120	is_not_empty	\N	show_question	id_121	\N	\N	2025-05-16 20:20:14.199561	2025-05-16 20:20:14.199561
83	27	id_38	equals	american_bbq_bronze	show_question	id_118	\N	\N	2025-05-16 20:34:23.245668	2025-05-16 20:34:23.245668
84	27	id_38	equals	american_bbq_bronze	show_question	id_119	\N	\N	2025-05-16 20:34:23.286515	2025-05-16 20:34:23.286515
85	27	id_38	equals	american_bbq_bronze	show_question	id_120	\N	\N	2025-05-16 20:34:23.328369	2025-05-16 20:34:23.328369
86	27	id_38	equals	american_bbq_bronze	show_question	id_121	\N	\N	2025-05-16 20:34:23.369251	2025-05-16 20:34:23.369251
87	27	id_89	is_not_empty	\N	show_question	id_118	\N	\N	2025-05-16 20:34:23.4101	2025-05-16 20:34:23.4101
88	27	id_118	is_not_empty	\N	show_question	id_119	\N	\N	2025-05-16 20:34:23.450315	2025-05-16 20:34:23.450315
89	27	id_119	is_not_empty	\N	show_question	id_120	\N	\N	2025-05-16 20:34:23.492365	2025-05-16 20:34:23.492365
90	27	id_120	is_not_empty	\N	show_question	id_121	\N	\N	2025-05-16 20:34:23.532676	2025-05-16 20:34:23.532676
91	27	id_38	equals	american_bbq_silver	show_question	id_115	\N	\N	2025-05-16 20:35:07.748116	2025-05-16 20:35:07.748116
92	27	id_38	equals	american_bbq_silver	show_question	id_122	\N	\N	2025-05-16 20:35:07.805642	2025-05-16 20:35:07.805642
93	27	id_38	equals	american_bbq_silver	show_question	id_123	\N	\N	2025-05-16 20:35:07.855019	2025-05-16 20:35:07.855019
94	27	id_38	equals	american_bbq_silver	show_question	id_124	\N	\N	2025-05-16 20:35:07.907177	2025-05-16 20:35:07.907177
95	27	id_38	equals	american_bbq_silver	show_question	id_125	\N	\N	2025-05-16 20:35:07.959459	2025-05-16 20:35:07.959459
96	27	id_115	is_not_empty	\N	show_question	id_122	\N	\N	2025-05-16 20:35:08.008789	2025-05-16 20:35:08.008789
97	27	id_122	is_not_empty	\N	show_question	id_123	\N	\N	2025-05-16 20:35:08.070072	2025-05-16 20:35:08.070072
98	27	id_123	is_not_empty	\N	show_question	id_124	\N	\N	2025-05-16 20:35:08.116863	2025-05-16 20:35:08.116863
99	27	id_124	is_not_empty	\N	show_question	id_125	\N	\N	2025-05-16 20:35:08.164738	2025-05-16 20:35:08.164738
100	27	id_38	equals	american_bbq_gold	show_question	id_126	\N	\N	2025-05-16 20:35:44.235157	2025-05-16 20:35:44.235157
101	27	id_38	equals	american_bbq_gold	show_question	id_127	\N	\N	2025-05-16 20:35:44.282065	2025-05-16 20:35:44.282065
102	27	id_38	equals	american_bbq_gold	show_question	id_128	\N	\N	2025-05-16 20:35:44.328935	2025-05-16 20:35:44.328935
103	27	id_38	equals	american_bbq_gold	show_question	id_129	\N	\N	2025-05-16 20:35:44.376478	2025-05-16 20:35:44.376478
104	27	id_38	equals	american_bbq_gold	show_question	id_130	\N	\N	2025-05-16 20:35:44.426684	2025-05-16 20:35:44.426684
105	27	id_126	is_not_empty	\N	show_question	id_127	\N	\N	2025-05-16 20:35:44.473699	2025-05-16 20:35:44.473699
106	27	id_127	is_not_empty	\N	show_question	id_128	\N	\N	2025-05-16 20:35:44.519361	2025-05-16 20:35:44.519361
107	27	id_128	is_not_empty	\N	show_question	id_129	\N	\N	2025-05-16 20:35:44.568908	2025-05-16 20:35:44.568908
108	27	id_129	is_not_empty	\N	show_question	id_130	\N	\N	2025-05-16 20:35:44.616689	2025-05-16 20:35:44.616689
109	27	id_38	equals	american_bbq_diamond	show_question	id_131	\N	\N	2025-05-16 20:36:35.112528	2025-05-16 20:36:35.112528
110	27	id_38	equals	american_bbq_diamond	show_question	id_132	\N	\N	2025-05-16 20:36:35.158119	2025-05-16 20:36:35.158119
111	27	id_38	equals	american_bbq_diamond	show_question	id_133	\N	\N	2025-05-16 20:36:35.2045	2025-05-16 20:36:35.2045
112	27	id_38	equals	american_bbq_diamond	show_question	id_134	\N	\N	2025-05-16 20:36:35.248938	2025-05-16 20:36:35.248938
113	27	id_38	equals	american_bbq_diamond	show_question	id_135	\N	\N	2025-05-16 20:36:35.295236	2025-05-16 20:36:35.295236
114	27	id_131	is_not_empty	\N	show_question	id_132	\N	\N	2025-05-16 20:36:35.345766	2025-05-16 20:36:35.345766
115	27	id_132	is_not_empty	\N	show_question	id_133	\N	\N	2025-05-16 20:36:35.39212	2025-05-16 20:36:35.39212
116	27	id_133	is_not_empty	\N	show_question	id_134	\N	\N	2025-05-16 20:36:35.437686	2025-05-16 20:36:35.437686
117	27	id_134	is_not_empty	\N	show_question	id_135	\N	\N	2025-05-16 20:36:35.483758	2025-05-16 20:36:35.483758
118	27	id_91	equals	greece_bronze	show_question	id_191	\N	\N	2025-05-16 20:37:17.433956	2025-05-16 20:37:17.433956
119	27	id_91	equals	greece_bronze	show_question	id_92	\N	\N	2025-05-16 20:37:17.482568	2025-05-16 20:37:17.482568
120	27	id_91	equals	greece_bronze	show_question	id_194	\N	\N	2025-05-16 20:37:17.528219	2025-05-16 20:37:17.528219
121	27	id_191	is_not_empty	\N	show_question	id_92	\N	\N	2025-05-16 20:37:17.574546	2025-05-16 20:37:17.574546
122	27	id_92	is_not_empty	\N	show_question	id_194	\N	\N	2025-05-16 20:37:17.628039	2025-05-16 20:37:17.628039
123	27	id_91	equals	greece_silver	show_question	id_192	\N	\N	2025-05-16 20:37:55.935262	2025-05-16 20:37:55.935262
124	27	id_91	equals	greece_silver	show_question	id_195	\N	\N	2025-05-16 20:37:55.979143	2025-05-16 20:37:55.979143
125	27	id_91	equals	greece_silver	show_question	id_197	\N	\N	2025-05-16 20:37:56.022172	2025-05-16 20:37:56.022172
126	27	id_192	is_not_empty	\N	show_question	id_195	\N	\N	2025-05-16 20:37:56.062876	2025-05-16 20:37:56.062876
127	27	id_195	is_not_empty	\N	show_question	id_197	\N	\N	2025-05-16 20:37:56.105307	2025-05-16 20:37:56.105307
128	27	id_91	equals	greece_gold	show_question	id_193	\N	\N	2025-05-16 20:39:03.893521	2025-05-16 20:39:03.893521
129	27	id_91	equals	greece_gold	show_question	id_196	\N	\N	2025-05-16 20:39:03.941313	2025-05-16 20:39:03.941313
130	27	id_91	equals	greece_gold	show_question	id_198	\N	\N	2025-05-16 20:39:03.989638	2025-05-16 20:39:03.989638
131	27	id_193	is_not_empty	\N	show_question	id_196	\N	\N	2025-05-16 20:39:04.038664	2025-05-16 20:39:04.038664
132	27	id_196	is_not_empty	\N	show_question	id_198	\N	\N	2025-05-16 20:39:04.089119	2025-05-16 20:39:04.089119
133	27	id_91	equals	greece_diamond	show_question	id_200	\N	\N	2025-05-16 20:39:50.57757	2025-05-16 20:39:50.57757
134	27	id_91	equals	greece_diamond	show_question	id_203	\N	\N	2025-05-16 20:39:50.625779	2025-05-16 20:39:50.625779
135	27	id_91	equals	greece_diamond	show_question	id_206	\N	\N	2025-05-16 20:39:50.674621	2025-05-16 20:39:50.674621
136	27	id_200	is_not_empty	\N	show_question	id_203	\N	\N	2025-05-16 20:39:50.717757	2025-05-16 20:39:50.717757
137	27	id_203	is_not_empty	\N	show_question	id_206	\N	\N	2025-05-16 20:39:50.761895	2025-05-16 20:39:50.761895
138	27	id_94	equals	kebab_party_bronze	show_question	id_95	\N	\N	2025-05-16 20:40:35.91269	2025-05-16 20:40:35.91269
139	27	id_94	equals	kebab_party_bronze	show_question	id_211	\N	\N	2025-05-16 20:40:35.965623	2025-05-16 20:40:35.965623
140	27	id_94	equals	kebab_party_bronze	show_question	id_218	\N	\N	2025-05-16 20:40:36.014128	2025-05-16 20:40:36.014128
141	27	id_95	is_not_empty	\N	show_question	id_211	\N	\N	2025-05-16 20:40:36.074897	2025-05-16 20:40:36.074897
142	27	id_211	is_not_empty	\N	show_question	id_218	\N	\N	2025-05-16 20:40:36.132156	2025-05-16 20:40:36.132156
143	27	id_94	equals	kebab_party_silver	show_question	id_212	\N	\N	2025-05-16 20:41:34.046294	2025-05-16 20:41:34.046294
144	27	id_94	equals	kebab_party_silver	show_question	id_215	\N	\N	2025-05-16 20:41:34.094484	2025-05-16 20:41:34.094484
145	27	id_94	equals	kebab_party_silver	show_question	id_219	\N	\N	2025-05-16 20:41:34.149516	2025-05-16 20:41:34.149516
146	27	id_212	is_not_empty	\N	show_question	id_215	\N	\N	2025-05-16 20:41:34.214262	2025-05-16 20:41:34.214262
147	27	id_215	is_not_empty	\N	show_question	id_219	\N	\N	2025-05-16 20:41:34.273963	2025-05-16 20:41:34.273963
148	27	id_94	equals	kebab_party_gold	show_question	id_213	\N	\N	2025-05-16 20:42:26.470085	2025-05-16 20:42:26.470085
149	27	id_94	equals	kebab_party_gold	show_question	id_216	\N	\N	2025-05-16 20:42:26.522471	2025-05-16 20:42:26.522471
150	27	id_94	equals	kebab_party_gold	show_question	id_220	\N	\N	2025-05-16 20:42:26.569254	2025-05-16 20:42:26.569254
151	27	id_213	is_not_empty	\N	show_question	id_216	\N	\N	2025-05-16 20:42:26.623274	2025-05-16 20:42:26.623274
152	27	id_216	is_not_empty	\N	show_question	id_220	\N	\N	2025-05-16 20:42:26.67452	2025-05-16 20:42:26.67452
153	27	id_94	equals	kebab_party_diamond	show_question	id_214	\N	\N	2025-05-16 20:43:20.373921	2025-05-16 20:43:20.373921
154	27	id_94	equals	kebab_party_diamond	show_question	id_217	\N	\N	2025-05-16 20:43:20.427572	2025-05-16 20:43:20.427572
155	27	id_94	equals	kebab_party_diamond	show_question	id_221	\N	\N	2025-05-16 20:43:20.474096	2025-05-16 20:43:20.474096
156	27	id_214	is_not_empty	\N	show_question	id_217	\N	\N	2025-05-16 20:43:20.521593	2025-05-16 20:43:20.521593
157	27	id_217	is_not_empty	\N	show_question	id_221	\N	\N	2025-05-16 20:43:20.56916	2025-05-16 20:43:20.56916
158	27	id_418	equals	italy_bronze	show_question	id_398	\N	\N	2025-05-16 20:43:47.928347	2025-05-16 20:43:47.928347
159	27	id_418	equals	italy_bronze	show_question	id_399	\N	\N	2025-05-16 20:43:47.980005	2025-05-16 20:43:47.980005
160	27	id_418	equals	italy_bronze	show_question	id_400	\N	\N	2025-05-16 20:43:48.026376	2025-05-16 20:43:48.026376
161	27	id_418	equals	italy_bronze	show_question	id_401	\N	\N	2025-05-16 20:43:48.072556	2025-05-16 20:43:48.072556
162	27	id_398	is_not_empty	\N	show_question	id_399	\N	\N	2025-05-16 20:43:48.118692	2025-05-16 20:43:48.118692
163	27	id_399	is_not_empty	\N	show_question	id_400	\N	\N	2025-05-16 20:43:48.168212	2025-05-16 20:43:48.168212
164	27	id_400	is_not_empty	\N	show_question	id_401	\N	\N	2025-05-16 20:43:48.215347	2025-05-16 20:43:48.215347
165	27	id_418	equals	italy_silver	show_question	id_402	\N	\N	2025-05-16 20:44:42.500369	2025-05-16 20:44:42.500369
166	27	id_418	equals	italy_silver	show_question	id_403	\N	\N	2025-05-16 20:44:42.547412	2025-05-16 20:44:42.547412
167	27	id_418	equals	italy_silver	show_question	id_404	\N	\N	2025-05-16 20:44:42.596288	2025-05-16 20:44:42.596288
168	27	id_418	equals	italy_silver	show_question	id_405	\N	\N	2025-05-16 20:44:42.64909	2025-05-16 20:44:42.64909
169	27	id_402	is_not_empty	\N	show_question	id_403	\N	\N	2025-05-16 20:44:42.697517	2025-05-16 20:44:42.697517
170	27	id_403	is_not_empty	\N	show_question	id_404	\N	\N	2025-05-16 20:44:42.742625	2025-05-16 20:44:42.742625
171	27	id_404	is_not_empty	\N	show_question	id_405	\N	\N	2025-05-16 20:44:42.797388	2025-05-16 20:44:42.797388
172	27	id_418	equals	italy_gold	show_question	id_406	\N	\N	2025-05-16 20:45:26.786078	2025-05-16 20:45:26.786078
173	27	id_418	equals	italy_gold	show_question	id_407	\N	\N	2025-05-16 20:45:26.837019	2025-05-16 20:45:26.837019
174	27	id_418	equals	italy_gold	show_question	id_408	\N	\N	2025-05-16 20:45:26.88479	2025-05-16 20:45:26.88479
175	27	id_418	equals	italy_gold	show_question	id_409	\N	\N	2025-05-16 20:45:26.93228	2025-05-16 20:45:26.93228
176	27	id_406	is_not_empty	\N	show_question	id_407	\N	\N	2025-05-16 20:45:26.978623	2025-05-16 20:45:26.978623
177	27	id_407	is_not_empty	\N	show_question	id_408	\N	\N	2025-05-16 20:45:27.032437	2025-05-16 20:45:27.032437
178	27	id_408	is_not_empty	\N	show_question	id_409	\N	\N	2025-05-16 20:45:27.077712	2025-05-16 20:45:27.077712
179	27	id_418	equals	italy_diamond	show_question	id_410	\N	\N	2025-05-16 20:46:10.093202	2025-05-16 20:46:10.093202
180	27	id_418	equals	italy_diamond	show_question	id_411	\N	\N	2025-05-16 20:46:10.135569	2025-05-16 20:46:10.135569
181	27	id_418	equals	italy_diamond	show_question	id_412	\N	\N	2025-05-16 20:46:10.176944	2025-05-16 20:46:10.176944
182	27	id_418	equals	italy_diamond	show_question	id_413	\N	\N	2025-05-16 20:46:10.21778	2025-05-16 20:46:10.21778
183	27	id_410	is_not_empty	\N	show_question	id_411	\N	\N	2025-05-16 20:46:10.258296	2025-05-16 20:46:10.258296
184	27	id_411	is_not_empty	\N	show_question	id_412	\N	\N	2025-05-16 20:46:10.299633	2025-05-16 20:46:10.299633
185	27	id_412	is_not_empty	\N	show_question	id_413	\N	\N	2025-05-16 20:46:10.340087	2025-05-16 20:46:10.340087
186	27	id_418	equals	italy_diamond	show_question	id_410	\N	\N	2025-05-16 20:47:41.722929	2025-05-16 20:47:41.722929
187	27	id_418	equals	italy_diamond	show_question	id_411	\N	\N	2025-05-16 20:47:41.794209	2025-05-16 20:47:41.794209
188	27	id_418	equals	italy_diamond	show_question	id_412	\N	\N	2025-05-16 20:47:41.838388	2025-05-16 20:47:41.838388
189	27	id_418	equals	italy_diamond	show_question	id_413	\N	\N	2025-05-16 20:47:41.882754	2025-05-16 20:47:41.882754
190	27	id_410	is_not_empty	\N	show_question	id_411	\N	\N	2025-05-16 20:47:41.926844	2025-05-16 20:47:41.926844
191	27	id_411	is_not_empty	\N	show_question	id_412	\N	\N	2025-05-16 20:47:41.971793	2025-05-16 20:47:41.971793
192	27	id_412	is_not_empty	\N	show_question	id_413	\N	\N	2025-05-16 20:47:42.016549	2025-05-16 20:47:42.016549
193	27	id_466	equals	custom_american_bbq	skip_to_page	\N	79	\N	2025-05-16 20:48:06.937392	2025-05-16 20:48:06.937392
194	27	id_473_bbq_custom_nav	equals	custom_taco_fiesta_nav	skip_to_page	\N	78	\N	2025-05-16 20:48:46.291208	2025-05-16 20:48:46.291208
195	27	id_473_bbq_custom_nav	equals	custom_taste_of_greece_nav	skip_to_page	\N	80	\N	2025-05-16 21:04:28.747516	2025-05-16 21:04:28.747516
196	27	id_19	less_than	50	hide_question	id_8	\N	\N	2025-05-16 21:09:28.628373	2025-05-16 21:09:28.628373
197	27	id_19	less_than	50	hide_question	id_29	\N	\N	2025-05-16 21:09:28.705749	2025-05-16 21:09:28.705749
198	27	id_19	less_than	50	hide_question	id_31	\N	\N	2025-05-16 21:09:28.77334	2025-05-16 21:09:28.77334
199	27	id_19	less_than	50	hide_question	id_33	\N	\N	2025-05-16 21:09:28.829483	2025-05-16 21:09:28.829483
200	27	id_19	less_than	50	hide_question	id_89	\N	\N	2025-05-16 21:09:28.886312	2025-05-16 21:09:28.886312
201	27	id_19	less_than	50	hide_question	id_118	\N	\N	2025-05-16 21:09:28.938927	2025-05-16 21:09:28.938927
202	27	id_19	less_than	50	hide_question	id_119	\N	\N	2025-05-16 21:09:28.997836	2025-05-16 21:09:28.997836
203	27	id_19	less_than	50	hide_question	id_120	\N	\N	2025-05-16 21:09:29.049703	2025-05-16 21:09:29.049703
204	27	id_19	less_than	50	hide_question	id_121	\N	\N	2025-05-16 21:09:29.100068	2025-05-16 21:09:29.100068
205	27	id_19	less_than	50	hide_question	id_191	\N	\N	2025-05-16 21:09:29.14993	2025-05-16 21:09:29.14993
206	27	id_19	less_than	50	hide_question	id_92	\N	\N	2025-05-16 21:09:29.200201	2025-05-16 21:09:29.200201
207	27	id_19	less_than	50	hide_question	id_194	\N	\N	2025-05-16 21:09:29.251079	2025-05-16 21:09:29.251079
208	27	id_19	less_than	50	hide_question	id_95	\N	\N	2025-05-16 21:09:29.319145	2025-05-16 21:09:29.319145
209	27	id_19	less_than	50	hide_question	id_211	\N	\N	2025-05-16 21:09:29.388191	2025-05-16 21:09:29.388191
210	27	id_19	less_than	50	hide_question	id_218	\N	\N	2025-05-16 21:09:29.448121	2025-05-16 21:09:29.448121
211	27	id_19	less_than	50	hide_question	id_398	\N	\N	2025-05-16 21:09:29.495424	2025-05-16 21:09:29.495424
212	27	id_19	less_than	50	hide_question	id_399	\N	\N	2025-05-16 21:09:29.542953	2025-05-16 21:09:29.542953
213	27	id_19	less_than	50	hide_question	id_400	\N	\N	2025-05-16 21:09:29.592965	2025-05-16 21:09:29.592965
214	27	id_19	less_than	50	hide_question	id_401	\N	\N	2025-05-16 21:09:29.648562	2025-05-16 21:09:29.648562
215	27	id_466	equals	custom_kebabs	skip_to_page	\N	81	\N	2025-05-16 21:49:48.930425	2025-05-16 21:49:48.930425
216	27	id_473_bbq_custom_nav	equals	custom_kebab_party_nav	skip_to_page	\N	81	\N	2025-05-16 21:49:48.999392	2025-05-16 21:49:48.999392
217	27	id_479_greece_custom_nav	equals	custom_kebab_party_nav_from_greece	skip_to_page	\N	81	\N	2025-05-16 21:49:49.041658	2025-05-16 21:49:49.041658
218	27	id_466	equals	custom_taste_of_italy	skip_to_page	\N	82	\N	2025-05-16 21:55:18.563898	2025-05-16 21:55:18.563898
219	27	id_473_bbq_custom_nav	equals	custom_taste_of_italy_nav	skip_to_page	\N	82	\N	2025-05-16 21:55:18.62355	2025-05-16 21:55:18.62355
220	27	id_479_greece_custom_nav	equals	custom_taste_of_italy_nav_from_greece	skip_to_page	\N	82	\N	2025-05-16 21:55:18.669471	2025-05-16 21:55:18.669471
221	27	id_485_kebab_custom_nav	equals	custom_taste_of_italy_nav_from_kebab	skip_to_page	\N	82	\N	2025-05-16 21:55:18.714793	2025-05-16 21:55:18.714793
222	27	id_466	equals	custom_vegan_menu	skip_to_page	\N	83	\N	2025-05-16 22:03:01.366205	2025-05-16 22:03:01.366205
223	27	id_473_bbq_custom_nav	equals	custom_vegan_menu_nav	skip_to_page	\N	83	\N	2025-05-16 22:03:01.427978	2025-05-16 22:03:01.427978
224	27	id_479_greece_custom_nav	equals	custom_vegan_menu_nav_from_greece	skip_to_page	\N	83	\N	2025-05-16 22:03:01.475022	2025-05-16 22:03:01.475022
225	27	id_485_kebab_custom_nav	equals	custom_vegan_menu_nav_from_kebab	skip_to_page	\N	83	\N	2025-05-16 22:03:01.521867	2025-05-16 22:03:01.521867
226	27	id_491_italy_custom_nav	equals	custom_vegan_menu_nav_from_italy	skip_to_page	\N	83	\N	2025-05-16 22:03:01.568952	2025-05-16 22:03:01.568952
227	27	id_459_from_hor_d_oeuvres_nav	equals	nav_to_custom_taco_fiesta	skip_to_page	\N	78	\N	2025-05-16 22:10:57.788968	2025-05-16 22:10:57.788968
228	27	id_459_from_hor_d_oeuvres_nav	equals	nav_to_custom_american_bbq	skip_to_page	\N	79	\N	2025-05-16 22:10:57.852915	2025-05-16 22:10:57.852915
229	27	id_459_from_hor_d_oeuvres_nav	equals	nav_to_custom_taste_of_greece	skip_to_page	\N	80	\N	2025-05-16 22:10:57.901623	2025-05-16 22:10:57.901623
230	27	id_459_from_hor_d_oeuvres_nav	equals	nav_to_custom_kebab_party	skip_to_page	\N	81	\N	2025-05-16 22:10:57.950232	2025-05-16 22:10:57.950232
231	27	id_459_from_hor_d_oeuvres_nav	equals	nav_to_custom_taste_of_italy	skip_to_page	\N	82	\N	2025-05-16 22:10:57.999455	2025-05-16 22:10:57.999455
232	27	id_567	equals	alcoholic	show_question	id_353	\N	\N	2025-05-16 22:37:33.334908	2025-05-16 22:37:33.334908
233	27	id_567	equals	non_alcoholic	show_question	id_591	\N	\N	2025-05-16 22:37:33.408633	2025-05-16 22:37:33.408633
234	27	id_567	equals	both	show_question	id_591	\N	\N	2025-05-16 22:37:33.451796	2025-05-16 22:37:33.451796
235	27	id_569	is_not_empty	\N	show_question	id_591	\N	\N	2025-05-16 22:37:33.505837	2025-05-16 22:37:33.505837
236	27	id_591	is_not_empty	\N	show_question	id_585	\N	\N	2025-05-16 22:37:33.55743	2025-05-16 22:37:33.55743
237	27	id_721	equals	dry_hire	show_question	id_582	\N	\N	2025-05-16 22:37:33.606924	2025-05-16 22:37:33.606924
238	27	id_721	equals	wet_hire	show_question	id_722	\N	\N	2025-05-16 22:37:33.654771	2025-05-16 22:37:33.654771
239	27	id_582	is_selected	dry_hire_mocktails	show_question	id_719	\N	\N	2025-05-16 22:38:52.44731	2025-05-16 22:38:52.44731
240	27	id_582	is_selected	dry_hire_cocktails_x2	show_question	id_719	\N	\N	2025-05-16 22:38:52.52352	2025-05-16 22:38:52.52352
241	27	id_719	equals	yes	show_question	id_720	\N	\N	2025-05-16 22:38:52.576942	2025-05-16 22:38:52.576942
242	27	id_722	is_selected	wet_hire_cocktails_x2	show_question	id_724	\N	\N	2025-05-16 22:38:52.625441	2025-05-16 22:38:52.625441
243	27	id_724	equals	yes	show_question	id_723	\N	\N	2025-05-16 22:38:52.673682	2025-05-16 22:38:52.673682
244	27	id_722	is_selected	wet_hire_cocktails_x2	show_question	id_726	\N	\N	2025-05-16 22:38:52.723642	2025-05-16 22:38:52.723642
245	27	id_722	is_selected	wet_hire_open_bar	show_question	id_726	\N	\N	2025-05-16 22:38:52.769629	2025-05-16 22:38:52.769629
246	27	id_726	equals	mid_shelf	show_question	id_727	\N	\N	2025-05-16 22:38:52.821946	2025-05-16 22:38:52.821946
247	27	id_726	equals	top_shelf	show_question	id_727	\N	\N	2025-05-16 22:38:52.869278	2025-05-16 22:38:52.869278
248	27	id_595	equals	yes	show_question	id_597	\N	\N	2025-05-16 22:39:34.337373	2025-05-16 22:39:34.337373
249	27	id_595	equals	no	show_question	id_594	\N	\N	2025-05-16 22:39:34.383171	2025-05-16 22:39:34.383171
250	27	id_594	equals	yes	show_question	id_353	\N	\N	2025-05-16 22:39:34.425543	2025-05-16 22:39:34.425543
251	27	id_730	equals	yes	show_question	id_732	\N	\N	2025-05-16 22:39:34.467677	2025-05-16 22:39:34.467677
253	27	id_495	equals	yes	skip_to_page	\N	84	\N	2025-05-16 22:49:48.585194	2025-05-16 22:49:48.585194
254	27	id_495	equals	no	skip_to_page	\N	88	\N	2025-05-16 22:49:48.658918	2025-05-16 22:49:48.658918
255	27	id_39	equals	buffet_full_service	show_question	id_516	\N	\N	2025-05-16 22:54:08.170909	2025-05-16 22:54:08.170909
256	27	id_39	equals	buffet_standard	show_question	id_717	\N	\N	2025-05-16 22:54:08.243176	2025-05-16 22:54:08.243176
257	27	id_736	equals	sandwich_factory_bronze	skip_to_page	\N	92	\N	2025-05-16 23:00:20.798733	2025-05-16 23:00:20.798733
258	27	id_736	equals	sandwich_factory_silver	skip_to_page	\N	93	\N	2025-05-16 23:03:42.708681	2025-05-16 23:03:42.708681
259	27	id_736	equals	sandwich_factory_gold	skip_to_page	\N	94	\N	2025-05-16 23:06:26.040081	2025-05-16 23:06:26.040081
260	27	id_736	equals	sandwich_factory_diamond	skip_to_page	\N	95	\N	2025-05-16 23:09:42.982365	2025-05-16 23:09:42.982365
261	27	id_607	equals	no	skip_to_page	\N	86	\N	2025-05-16 23:11:24.947953	2025-05-16 23:11:24.947953
262	27	id_466	equals	custom_finished_choices	skip_to_page	\N	88	\N	2025-05-16 23:12:20.845293	2025-05-16 23:12:20.845293
263	27	id_473_bbq_custom_nav	equals	custom_finished_choices_nav_from_bbq	skip_to_page	\N	88	\N	2025-05-16 23:12:20.8986	2025-05-16 23:12:20.8986
264	27	id_479_greece_custom_nav	equals	custom_finished_choices_nav_from_greece	skip_to_page	\N	88	\N	2025-05-16 23:12:20.946484	2025-05-16 23:12:20.946484
265	27	id_485_kebab_custom_nav	equals	custom_finished_choices_nav_from_kebab	skip_to_page	\N	88	\N	2025-05-16 23:12:20.997588	2025-05-16 23:12:20.997588
266	27	id_491_italy_custom_nav	equals	custom_finished_choices_nav_from_italy	skip_to_page	\N	88	\N	2025-05-16 23:12:21.049631	2025-05-16 23:12:21.049631
267	27	id_528_vegan_custom_nav	equals	custom_finished_choices_nav_from_vegan	skip_to_page	\N	88	\N	2025-05-16 23:12:21.097776	2025-05-16 23:12:21.097776
268	27	id_473_bbq_custom_nav	equals	custom_taste_of_greece_nav	skip_to_page	\N	80	\N	2025-05-16 23:14:04.998309	2025-05-16 23:14:04.998309
269	27	id_473_bbq_custom_nav	equals	custom_kebab_party_nav	skip_to_page	\N	81	\N	2025-05-16 23:14:05.07307	2025-05-16 23:14:05.07307
270	27	id_473_bbq_custom_nav	equals	custom_taste_of_italy_nav	skip_to_page	\N	82	\N	2025-05-16 23:14:05.115889	2025-05-16 23:14:05.115889
271	27	id_473_bbq_custom_nav	equals	custom_vegan_menu_nav	skip_to_page	\N	83	\N	2025-05-16 23:14:05.158815	2025-05-16 23:14:05.158815
272	27	id_479_greece_custom_nav	equals	custom_taco_fiesta_nav_from_greece	skip_to_page	\N	78	\N	2025-05-16 23:14:05.201941	2025-05-16 23:14:05.201941
273	27	id_479_greece_custom_nav	equals	custom_american_bbq_nav_from_greece	skip_to_page	\N	79	\N	2025-05-16 23:14:05.245281	2025-05-16 23:14:05.245281
274	27	id_479_greece_custom_nav	equals	custom_taste_of_italy_nav_from_greece	skip_to_page	\N	82	\N	2025-05-16 23:14:05.288371	2025-05-16 23:14:05.288371
275	27	id_479_greece_custom_nav	equals	custom_vegan_menu_nav_from_greece	skip_to_page	\N	83	\N	2025-05-16 23:14:05.330767	2025-05-16 23:14:05.330767
276	27	id_485_kebab_custom_nav	equals	custom_taco_fiesta_nav_from_kebab	skip_to_page	\N	78	\N	2025-05-16 23:14:05.375698	2025-05-16 23:14:05.375698
277	27	id_485_kebab_custom_nav	equals	custom_american_bbq_nav_from_kebab	skip_to_page	\N	79	\N	2025-05-16 23:14:05.417627	2025-05-16 23:14:05.417627
278	27	id_485_kebab_custom_nav	equals	custom_taste_of_greece_nav_from_kebab	skip_to_page	\N	80	\N	2025-05-16 23:16:48.243303	2025-05-16 23:16:48.243303
279	27	id_485_kebab_custom_nav	equals	custom_taste_of_italy_nav_from_kebab	skip_to_page	\N	82	\N	2025-05-16 23:16:48.320842	2025-05-16 23:16:48.320842
280	27	id_485_kebab_custom_nav	equals	custom_vegan_menu_nav_from_kebab	skip_to_page	\N	83	\N	2025-05-16 23:16:48.367041	2025-05-16 23:16:48.367041
281	27	id_491_italy_custom_nav	equals	custom_taco_fiesta_nav_from_italy	skip_to_page	\N	78	\N	2025-05-16 23:16:48.416282	2025-05-16 23:16:48.416282
282	27	id_491_italy_custom_nav	equals	custom_american_bbq_nav_from_italy	skip_to_page	\N	79	\N	2025-05-16 23:16:48.466732	2025-05-16 23:16:48.466732
283	27	id_491_italy_custom_nav	equals	custom_taste_of_greece_nav_from_italy	skip_to_page	\N	80	\N	2025-05-16 23:16:48.518495	2025-05-16 23:16:48.518495
284	27	id_491_italy_custom_nav	equals	custom_kebab_party_nav_from_italy	skip_to_page	\N	81	\N	2025-05-16 23:16:48.564885	2025-05-16 23:16:48.564885
285	27	id_491_italy_custom_nav	equals	custom_vegan_menu_nav_from_italy	skip_to_page	\N	83	\N	2025-05-16 23:16:48.612434	2025-05-16 23:16:48.612434
286	27	id_528_vegan_custom_nav	equals	custom_taco_fiesta_nav_from_vegan	skip_to_page	\N	78	\N	2025-05-16 23:16:48.660447	2025-05-16 23:16:48.660447
287	27	id_528_vegan_custom_nav	equals	custom_american_bbq_nav_from_vegan	skip_to_page	\N	79	\N	2025-05-16 23:16:48.70947	2025-05-16 23:16:48.70947
288	27	id_528_vegan_custom_nav	equals	custom_taste_of_greece_nav_from_vegan	skip_to_page	\N	80	\N	2025-05-16 23:16:48.758987	2025-05-16 23:16:48.758987
289	27	id_528_vegan_custom_nav	equals	custom_kebab_party_nav_from_vegan	skip_to_page	\N	81	\N	2025-05-16 23:16:48.80535	2025-05-16 23:16:48.80535
290	27	id_528_vegan_custom_nav	equals	custom_taste_of_italy_nav_from_vegan	skip_to_page	\N	82	\N	2025-05-16 23:16:48.859913	2025-05-16 23:16:48.859913
291	27	id_23	equals	hor_d_oeuvres_only	skip_to_page	\N	84	\N	2025-05-16 23:16:48.906751	2025-05-16 23:16:48.906751
292	27	id_19	less_than	75	hide_question	id_558	\N	\N	2025-05-16 23:19:53.612103	2025-05-16 23:19:53.612103
293	27	id_19	less_than	100	hide_question	id_559	\N	\N	2025-05-16 23:19:53.663613	2025-05-16 23:19:53.663613
294	27	id_526	equals	yes	skip_to_page	\N	86	\N	2025-05-16 23:23:04.346963	2025-05-16 23:23:04.346963
295	27	id_526	equals	no	skip_to_page	\N	89	\N	2025-05-16 23:23:04.398347	2025-05-16 23:23:04.398347
296	27	id_582	is_selected	dry_hire_cocktails_x2	show_question	id_593	\N	\N	2025-05-16 23:25:19.841233	2025-05-16 23:25:19.841233
297	27	id_722	is_not_empty	\N	show_question	id_725	\N	\N	2025-05-16 23:25:19.889114	2025-05-16 23:25:19.889114
298	27	id_722	is_selected	wet_hire_cash_bar	show_question	id_728	\N	\N	2025-05-16 23:25:19.940294	2025-05-16 23:25:19.940294
299	27	id_597	is_not_empty	\N	show_question	id_588	\N	\N	2025-05-16 23:25:19.993159	2025-05-16 23:25:19.993159
300	27	id_594	equals	no	show_question	id_599	\N	\N	2025-05-16 23:25:20.043436	2025-05-16 23:25:20.043436
301	27	id_353	is_not_empty	\N	show_question	id_354	\N	\N	2025-05-16 23:25:20.095814	2025-05-16 23:25:20.095814
302	27	id_593	is_not_empty	\N	show_question	id_595	\N	\N	2025-05-16 23:26:28.643708	2025-05-16 23:26:28.643708
303	27	id_588	is_not_empty	\N	show_question	id_594	\N	\N	2025-05-16 23:26:28.692607	2025-05-16 23:26:28.692607
304	27	id_354	is_not_empty	\N	show_question	id_730	\N	\N	2025-05-16 23:26:28.742651	2025-05-16 23:26:28.742651
305	27	event_type	equals	food_truck	skip_to_page	\N	88	\N	2025-05-16 23:27:59.711568	2025-05-16 23:27:59.711568
306	27	id_538	equals	yes	skip_to_page	\N	87	\N	2025-05-16 23:29:14.203844	2025-05-16 23:29:14.203844
307	27	id_538	equals	no	skip_to_page	\N	88	\N	2025-05-16 23:29:14.250811	2025-05-16 23:29:14.250811
252	27	event_type	equals	food_truck	skip_to_page	\N	96	\N	2025-05-16 22:45:16.649404	2025-05-16 23:38:06.596
308	27	id_591	is_not_empty	\N	show_question	id_590_bar_period_note	\N	\N	2025-05-16 23:42:30.237071	2025-05-16 23:42:30.237071
311	27	id_710	equals	true	show_question	id_711	\N	\N	2025-05-17 16:11:51.445302	2025-05-17 16:11:51.445302
\.


--
-- Data for Name: questionnaire_definitions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_definitions (id, version_name, description, is_active, created_at, updated_at) FROM stdin;
28	ttest	asdf	f	2025-05-17 05:18:01.755582	2025-05-17 05:18:01.755582
29	Testining	tesintin	f	2025-05-17 15:29:03.159239	2025-05-17 15:29:03.159239
30	1.0.0 (Copy)	A comprehensive questionnaire to gather details for Home Bites catering quotations for various events in 2025, including themed menus and food truck options.	f	2025-05-17 20:01:24.590102	2025-05-17 20:27:31.916
27	1.0.0	A comprehensive questionnaire to gather details for Home Bites catering quotations for various events in 2025, including themed menus and food truck options.	t	2025-05-16 17:24:50.378299	2025-05-17 20:27:49.134
\.


--
-- Data for Name: questionnaire_matrix_columns; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_matrix_columns (id, question_id, column_text, column_value, "order", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: questionnaire_pages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_pages (id, definition_id, title, "order", created_at, updated_at) FROM stdin;
86	27	Beverage Service	16	2025-05-16 22:12:57.727827	2025-05-16 22:12:57.727827
87	27	Equipment Rentals & Serving Ware	17	2025-05-16 22:40:58.805447	2025-05-16 22:40:58.805447
88	27	Desserts / Add-ons / Dietary Notes	18	2025-05-16 22:43:00.938384	2025-05-16 22:43:00.938384
89	27	Final Notes & Review	19	2025-05-16 22:46:26.612059	2025-05-16 22:46:26.612059
90	27	Totals / Final Summary	20	2025-05-16 22:51:48.058314	2025-05-16 22:51:48.058314
91	27	Sandwich Factory	21	2025-05-16 22:54:56.174605	2025-05-16 22:54:56.174605
92	27	Sandwich Factory - Bronze Package	22	2025-05-16 22:57:55.092863	2025-05-16 22:57:55.092863
93	27	Sandwich Factory - Silver Package	23	2025-05-16 23:01:39.377983	2025-05-16 23:01:39.377983
94	27	Sandwich Factory - Gold Package	24	2025-05-16 23:04:24.804902	2025-05-16 23:04:24.804902
95	27	Sandwich Factory - Diamond Package	25	2025-05-16 23:07:13.569272	2025-05-16 23:07:13.569272
96	27	Food Truck Menu Options	26	2025-05-16 23:30:52.73239	2025-05-16 23:30:52.73239
97	28	first page	0	2025-05-17 05:18:11.858737	2025-05-17 05:18:11.858737
70	27	Initial Information	1	2025-05-16 17:25:32.599104	2025-05-16 17:25:32.599104
71	27	Contact and Event Details	2	2025-05-16 17:56:10.517846	2025-05-16 17:56:10.517846
72	27	Taco Fiesta Menu	3	2025-05-16 18:06:48.10055	2025-05-16 18:06:48.10055
73	27	American BBQ Menu	4	2025-05-16 18:19:49.781052	2025-05-16 18:19:49.781052
74	27	A Taste of Greece Menu	5	2025-05-16 18:40:35.919719	2025-05-16 18:40:35.919719
75	27	Kebab Party Menu	6	2025-05-16 18:46:54.488074	2025-05-16 18:46:54.488074
76	27	A Taste of Italy Menu	7	2025-05-16 18:51:15.174958	2025-05-16 18:51:15.174958
77	27	Custom Menu - Taco Fiesta Selections	8	2025-05-16 18:54:48.620986	2025-05-16 18:54:48.620986
78	27	Custom Menu - Taco Fiesta Selections	8	2025-05-16 18:55:12.521273	2025-05-16 18:55:12.521273
79	27	Custom Menu - American BBQ Selections	9	2025-05-16 18:58:19.077472	2025-05-16 18:58:19.077472
80	27	Custom Menu - Taste of Greece Selections	10	2025-05-16 20:49:16.597376	2025-05-16 20:49:16.597376
81	27	Custom Menu - Kebab Party Selections	11	2025-05-16 21:40:22.837439	2025-05-16 21:40:22.837439
82	27	Custom Menu - Taste of Italy Selections	12	2025-05-16 21:50:24.341824	2025-05-16 21:50:24.341824
83	27	Custom Menu - Vegan Menu Selections	13	2025-05-16 22:01:10.239693	2025-05-16 22:01:10.239693
84	27	Hor d' oeuvres Menu	14	2025-05-16 22:03:51.216816	2025-05-16 22:03:51.216816
85	27	Custom Menu - Next Category Selection (after Hor d'oeuvres)	15	2025-05-16 22:09:17.197499	2025-05-16 22:09:17.197499
\.


--
-- Data for Name: questionnaire_question_options; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_question_options (id, question_id, option_text, option_value, "order", default_selection_indicator, related_menu_item_id, created_at, updated_at) FROM stdin;
42	54	Corporate event	corporate_event	1	\N	\N	2025-05-16 17:54:07.824872	2025-05-16 17:54:07.824872
43	54	Engagement	engagement	2	\N	\N	2025-05-16 17:54:07.883388	2025-05-16 17:54:07.883388
44	54	Wedding	wedding	3	\N	\N	2025-05-16 17:54:07.932616	2025-05-16 17:54:07.932616
45	54	Birthday	birthday	4	\N	\N	2025-05-16 17:54:07.979092	2025-05-16 17:54:07.979092
46	54	Other Private Party	other_private_party	5	\N	\N	2025-05-16 17:54:08.025127	2025-05-16 17:54:08.025127
47	54	Food Truck	food_truck	6	\N	\N	2025-05-16 17:54:08.07369	2025-05-16 17:54:08.07369
48	61	YES	yes	1	\N	\N	2025-05-16 18:00:40.910117	2025-05-16 18:00:40.910117
49	61	NO	no	2	\N	\N	2025-05-16 18:00:41.007087	2025-05-16 18:00:41.007087
50	65	YES	yes	1	\N	\N	2025-05-16 18:02:43.830637	2025-05-16 18:02:43.830637
51	65	NO	no	2	\N	\N	2025-05-16 18:02:43.886069	2025-05-16 18:02:43.886069
52	72	YES	yes	1	\N	\N	2025-05-16 18:03:34.060688	2025-05-16 18:03:34.060688
53	72	NO	no	2	\N	\N	2025-05-16 18:03:34.108969	2025-05-16 18:03:34.108969
54	73	YES	yes	1	\N	\N	2025-05-16 18:03:34.215369	2025-05-16 18:03:34.215369
55	73	NO	no	2	\N	\N	2025-05-16 18:03:34.26205	2025-05-16 18:03:34.26205
56	76	YES	yes	1	\N	\N	2025-05-16 18:03:34.480541	2025-05-16 18:03:34.480541
57	76	NO	no	2	\N	\N	2025-05-16 18:03:34.528565	2025-05-16 18:03:34.528565
58	80	Drop-off	drop_off	1	\N	\N	2025-05-16 18:04:50.328337	2025-05-16 18:04:50.328337
59	80	Buffet Standard	buffet_standard	2	\N	\N	2025-05-16 18:04:50.38568	2025-05-16 18:04:50.38568
60	80	Buffet Full Service	buffet_full_service	3	\N	\N	2025-05-16 18:04:50.436355	2025-05-16 18:04:50.436355
61	80	Buffet Full Service no setup	buffet_full_service_no_setup	4	\N	\N	2025-05-16 18:04:50.490664	2025-05-16 18:04:50.490664
62	80	Family Style Service- (not available for Taco Fiesta)	family_style_service	5	\N	\N	2025-05-16 18:04:50.543758	2025-05-16 18:04:50.543758
63	80	Plated Dinner	plated_dinner	6	\N	\N	2025-05-16 18:04:50.591673	2025-05-16 18:04:50.591673
64	80	Cocktail Party	cocktail_party	7	\N	\N	2025-05-16 18:04:50.658644	2025-05-16 18:04:50.658644
65	80	Food Truck	food_truck_service	8	\N	\N	2025-05-16 18:04:50.714206	2025-05-16 18:04:50.714206
66	81	Taco Fiesta	taco_fiesta	1	\N	\N	2025-05-16 18:04:50.811494	2025-05-16 18:04:50.811494
67	81	American BBQ	american_bbq	2	\N	\N	2025-05-16 18:04:50.858707	2025-05-16 18:04:50.858707
68	81	A taste of Greece	a_taste_of_greece	3	\N	\N	2025-05-16 18:04:50.906128	2025-05-16 18:04:50.906128
69	81	Kebab Party	kebab_party	4	\N	\N	2025-05-16 18:04:50.95169	2025-05-16 18:04:50.95169
70	81	A taste of Italy	a_taste_of_italy	5	\N	\N	2025-05-16 18:04:50.998733	2025-05-16 18:04:50.998733
71	81	Custom Menu	custom_menu	6	\N	\N	2025-05-16 18:04:51.049098	2025-05-16 18:04:51.049098
72	81	Hor d' oeuvres only (Cocktail party)	hor_d_oeuvres_only	7	\N	\N	2025-05-16 18:04:51.101503	2025-05-16 18:04:51.101503
73	81	Food Truck	food_truck_menu	8	\N	\N	2025-05-16 18:04:51.15169	2025-05-16 18:04:51.15169
74	83	Bronze - $28 per person 3 proteins, 2 sides, 3 salsas, 4 condiments	taco_fiesta_bronze	1	\N	\N	2025-05-16 18:07:42.455245	2025-05-16 18:07:42.455245
75	83	Silver - $34 per person 4 proteins, 3 sides, 4 salsas, 6 condiments	taco_fiesta_silver	2	\N	\N	2025-05-16 18:07:42.522309	2025-05-16 18:07:42.522309
76	83	Gold - $40 per person 4 proteins, 4 sides, 4 salsas, 5 condiments	taco_fiesta_gold	3	\N	\N	2025-05-16 18:07:42.568082	2025-05-16 18:07:42.568082
77	83	Diamond - $46 per person 5 proteins, 5 sides, 5 salsas, 8 condiments	taco_fiesta_diamond	4	\N	\N	2025-05-16 18:07:42.614328	2025-05-16 18:07:42.614328
78	84	Barbacoa	barbacoa	1	\N	\N	2025-05-16 18:09:12.85574	2025-05-16 18:09:12.85574
79	84	Flank steak Fajitas upcharge of $2.00 pp	flank_steak_fajitas_upcharge	2	\N	\N	2025-05-16 18:09:12.913299	2025-05-16 18:09:12.913299
80	84	Ground Beef	ground_beef	3	\N	\N	2025-05-16 18:09:12.962491	2025-05-16 18:09:12.962491
81	84	Pork Carnitas	pork_carnitas	4	\N	\N	2025-05-16 18:09:13.009703	2025-05-16 18:09:13.009703
82	84	Pork Belly	pork_belly	5	\N	\N	2025-05-16 18:09:13.063548	2025-05-16 18:09:13.063548
83	84	Chorizo	chorizo	6	\N	\N	2025-05-16 18:09:13.12469	2025-05-16 18:09:13.12469
84	84	Beef Birria	beef_birria	7	\N	\N	2025-05-16 18:09:13.199529	2025-05-16 18:09:13.199529
85	84	Mexican Chicken	mexican_chicken	8	\N	\N	2025-05-16 18:09:13.261481	2025-05-16 18:09:13.261481
86	84	Cod	cod	9	\N	\N	2025-05-16 18:09:13.342137	2025-05-16 18:09:13.342137
87	84	Shrimp	shrimp	10	\N	\N	2025-05-16 18:09:13.434078	2025-05-16 18:09:13.434078
88	84	Tofu	tofu	11	\N	\N	2025-05-16 18:09:13.490575	2025-05-16 18:09:13.490575
89	84	Roasted Vegetables	roasted_vegetables	12	\N	\N	2025-05-16 18:09:13.560354	2025-05-16 18:09:13.560354
90	84	Escabeche - House-made picked vegetable medley	escabeche	13	\N	\N	2025-05-16 18:09:13.610369	2025-05-16 18:09:13.610369
91	85	Refried Beans	refried_beans	1	\N	\N	2025-05-16 18:09:13.743166	2025-05-16 18:09:13.743166
92	85	Mexican Street corn (Elotes)	elotes	2	\N	\N	2025-05-16 18:09:13.81563	2025-05-16 18:09:13.81563
93	85	Queso Dip	queso_dip	3	\N	\N	2025-05-16 18:09:13.891856	2025-05-16 18:09:13.891856
94	85	Chorizo Queso Dip	chorizo_queso_dip	4	\N	\N	2025-05-16 18:09:13.945528	2025-05-16 18:09:13.945528
95	85	Stuffed Poblano peppers	stuffed_poblano_peppers	5	\N	\N	2025-05-16 18:09:14.013772	2025-05-16 18:09:14.013772
96	85	Mexican Rice	mexican_rice	6	\N	\N	2025-05-16 18:09:14.062448	2025-05-16 18:09:14.062448
97	85	Cilantro Lime Rice	cilantro_lime_rice	7	\N	\N	2025-05-16 18:09:14.111261	2025-05-16 18:09:14.111261
98	85	Rice and Beans	rice_and_beans	8	\N	\N	2025-05-16 18:09:14.158201	2025-05-16 18:09:14.158201
99	85	Jalapeno cornbread	jalapeno_cornbread	9	\N	\N	2025-05-16 18:09:14.209556	2025-05-16 18:09:14.209556
100	85	Grilled Vegetables	grilled_vegetables	10	\N	\N	2025-05-16 18:09:14.26371	2025-05-16 18:09:14.26371
101	85	Mexican Slaw with Mango	mexican_slaw_mango	11	\N	\N	2025-05-16 18:09:14.315411	2025-05-16 18:09:14.315411
102	85	Vegetarian Empanadas	vegetarian_empanadas	12	\N	\N	2025-05-16 18:09:14.370761	2025-05-16 18:09:14.370761
103	86	Classic Pico de Gallo	pico_de_gallo	1	\N	\N	2025-05-16 18:09:14.469475	2025-05-16 18:09:14.469475
104	86	Fresh Mango Salsa	mango_salsa	2	\N	\N	2025-05-16 18:09:14.517684	2025-05-16 18:09:14.517684
105	86	Pineapple Habanero Salsa	pineapple_habanero_salsa	3	\N	\N	2025-05-16 18:09:14.567003	2025-05-16 18:09:14.567003
106	86	Cucumber & Apple Salsa	cucumber_apple_salsa	4	\N	\N	2025-05-16 18:09:14.617332	2025-05-16 18:09:14.617332
107	86	Jicama and Papaya Salsa	jicama_papaya_salsa	5	\N	\N	2025-05-16 18:09:14.668112	2025-05-16 18:09:14.668112
108	86	Salsa Roja (red sauce)	salsa_roja	6	\N	\N	2025-05-16 18:09:14.715579	2025-05-16 18:09:14.715579
109	86	Salsa Verde (green sauce)	salsa_verde	7	\N	\N	2025-05-16 18:09:14.763204	2025-05-16 18:09:14.763204
110	86	Creamy Salsa Verde (green sauce)	creamy_salsa_verde	8	\N	\N	2025-05-16 18:09:14.812538	2025-05-16 18:09:14.812538
111	86	Salsa Macha -(contains peanuts and sesame seeds)	salsa_macha	9	\N	\N	2025-05-16 18:09:14.860595	2025-05-16 18:09:14.860595
112	87	Shredded cheese	shredded_cheese	1	\N	\N	2025-05-16 18:09:14.956446	2025-05-16 18:09:14.956446
113	87	Shredded vegan cheese	shredded_vegan_cheese	2	\N	\N	2025-05-16 18:09:15.011682	2025-05-16 18:09:15.011682
114	87	Diced Onions	diced_onions	3	\N	\N	2025-05-16 18:09:15.067698	2025-05-16 18:09:15.067698
115	87	Lime wedges	lime_wedges	4	\N	\N	2025-05-16 18:09:15.138995	2025-05-16 18:09:15.138995
116	87	Jalapeños	jalapenos	5	\N	\N	2025-05-16 18:09:15.220812	2025-05-16 18:09:15.220812
117	87	Sour Cream	sour_cream	6	\N	\N	2025-05-16 18:09:15.298836	2025-05-16 18:09:15.298836
118	87	Diced bell peppers	diced_bell_peppers	7	\N	\N	2025-05-16 18:09:15.366496	2025-05-16 18:09:15.366496
119	87	Guacamole	guacamole	8	\N	\N	2025-05-16 18:09:15.493149	2025-05-16 18:09:15.493149
120	87	Fire roasted bell peppers	fire_roasted_bell_peppers	9	\N	\N	2025-05-16 18:09:15.586274	2025-05-16 18:09:15.586274
121	87	Sliced radish	sliced_radish	10	\N	\N	2025-05-16 18:09:15.711114	2025-05-16 18:09:15.711114
122	87	Cilantro	cilantro	11	\N	\N	2025-05-16 18:09:15.859145	2025-05-16 18:09:15.859145
123	87	Pickled cabbage	pickled_cabbage	12	\N	\N	2025-05-16 18:09:15.986712	2025-05-16 18:09:15.986712
124	87	Escabeche - House-made picked vegetable medley	escabeche_condiment	13	\N	\N	2025-05-16 18:09:16.053596	2025-05-16 18:09:16.053596
125	88	Barbacoa	barbacoa	1	\N	\N	2025-05-16 18:11:06.172097	2025-05-16 18:11:06.172097
126	88	Flank steak Fajitas upcharge of $2.00 pp	flank_steak_fajitas_upcharge	2	\N	\N	2025-05-16 18:11:06.224522	2025-05-16 18:11:06.224522
127	88	Ground Beef	ground_beef	3	\N	\N	2025-05-16 18:11:06.269464	2025-05-16 18:11:06.269464
128	88	Pork Carnitas	pork_carnitas	4	\N	\N	2025-05-16 18:11:06.313184	2025-05-16 18:11:06.313184
129	88	Pork Belly	pork_belly	5	\N	\N	2025-05-16 18:11:06.360146	2025-05-16 18:11:06.360146
130	88	Chorizo	chorizo	6	\N	\N	2025-05-16 18:11:06.403898	2025-05-16 18:11:06.403898
131	88	Beef Birria	beef_birria	7	\N	\N	2025-05-16 18:11:06.454866	2025-05-16 18:11:06.454866
132	88	Mexican Chicken	mexican_chicken	8	\N	\N	2025-05-16 18:11:06.50235	2025-05-16 18:11:06.50235
133	88	Cod	cod	9	\N	\N	2025-05-16 18:11:06.546662	2025-05-16 18:11:06.546662
134	88	Shrimp	shrimp	10	\N	\N	2025-05-16 18:11:06.590133	2025-05-16 18:11:06.590133
135	88	Tofu	tofu	11	\N	\N	2025-05-16 18:11:06.6356	2025-05-16 18:11:06.6356
136	88	Roasted Vegetables	roasted_vegetables	12	\N	\N	2025-05-16 18:11:06.67831	2025-05-16 18:11:06.67831
137	88	Escabeche - House-made picked vegetable medley	escabeche	13	\N	\N	2025-05-16 18:11:06.725506	2025-05-16 18:11:06.725506
138	89	Refried Beans	refried_beans	1	\N	\N	2025-05-16 18:11:06.829119	2025-05-16 18:11:06.829119
139	89	Mexican Street corn (Elotes)	elotes	2	\N	\N	2025-05-16 18:11:06.874154	2025-05-16 18:11:06.874154
140	89	Queso Dip	queso_dip	3	\N	\N	2025-05-16 18:11:06.917053	2025-05-16 18:11:06.917053
141	89	Chorizo Queso Dip	chorizo_queso_dip	4	\N	\N	2025-05-16 18:11:06.961041	2025-05-16 18:11:06.961041
142	89	Stuffed Poblano peppers	stuffed_poblano_peppers	5	\N	\N	2025-05-16 18:11:07.007876	2025-05-16 18:11:07.007876
143	89	Mexican Rice	mexican_rice	6	\N	\N	2025-05-16 18:11:07.060453	2025-05-16 18:11:07.060453
144	89	Cilantro Lime Rice	cilantro_lime_rice	7	\N	\N	2025-05-16 18:11:07.105463	2025-05-16 18:11:07.105463
145	89	Rice and Beans	rice_and_beans	8	\N	\N	2025-05-16 18:11:07.153824	2025-05-16 18:11:07.153824
146	89	Jalapeno cornbread	jalapeno_cornbread	9	\N	\N	2025-05-16 18:11:07.228025	2025-05-16 18:11:07.228025
147	89	Grilled Vegetables	grilled_vegetables	10	\N	\N	2025-05-16 18:11:07.286641	2025-05-16 18:11:07.286641
148	89	Mexican Slaw with Mango	mexican_slaw_mango	11	\N	\N	2025-05-16 18:11:07.332959	2025-05-16 18:11:07.332959
149	89	Vegetarian Empanadas	vegetarian_empanadas	12	\N	\N	2025-05-16 18:11:07.388696	2025-05-16 18:11:07.388696
150	90	Classic Pico de Gallo	pico_de_gallo	1	\N	\N	2025-05-16 18:11:07.482119	2025-05-16 18:11:07.482119
151	90	Fresh Mango Salsa	mango_salsa	2	\N	\N	2025-05-16 18:11:07.53583	2025-05-16 18:11:07.53583
152	90	Pineapple Habanero Salsa	pineapple_habanero_salsa	3	\N	\N	2025-05-16 18:11:07.593411	2025-05-16 18:11:07.593411
153	90	Cucumber & Apple Salsa	cucumber_apple_salsa	4	\N	\N	2025-05-16 18:11:07.653884	2025-05-16 18:11:07.653884
154	90	Jicama and Papaya Salsa	jicama_papaya_salsa	5	\N	\N	2025-05-16 18:11:07.752696	2025-05-16 18:11:07.752696
155	90	Salsa Roja (red sauce)	salsa_roja	6	\N	\N	2025-05-16 18:11:07.82472	2025-05-16 18:11:07.82472
156	90	Salsa Verde (green sauce)	salsa_verde	7	\N	\N	2025-05-16 18:11:07.908413	2025-05-16 18:11:07.908413
157	90	Creamy Salsa Verde (green sauce)	creamy_salsa_verde	8	\N	\N	2025-05-16 18:11:07.976697	2025-05-16 18:11:07.976697
158	90	Salsa Macha -(contains peanuts and sesame seeds)	salsa_macha	9	\N	\N	2025-05-16 18:11:08.082516	2025-05-16 18:11:08.082516
159	91	Shredded cheese	shredded_cheese	1	\N	\N	2025-05-16 18:11:08.394939	2025-05-16 18:11:08.394939
160	91	Shredded vegan cheese	shredded_vegan_cheese	2	\N	\N	2025-05-16 18:11:08.657408	2025-05-16 18:11:08.657408
161	91	Diced Onions	diced_onions	3	\N	\N	2025-05-16 18:11:08.770137	2025-05-16 18:11:08.770137
162	91	Lime wedges	lime_wedges	4	\N	\N	2025-05-16 18:11:08.851061	2025-05-16 18:11:08.851061
163	91	Jalapeños	jalapenos	5	\N	\N	2025-05-16 18:11:08.927021	2025-05-16 18:11:08.927021
164	91	Sour Cream	sour_cream	6	\N	\N	2025-05-16 18:11:08.9868	2025-05-16 18:11:08.9868
165	91	Diced bell peppers	diced_bell_peppers	7	\N	\N	2025-05-16 18:11:09.057127	2025-05-16 18:11:09.057127
166	91	Guacamole	guacamole	8	\N	\N	2025-05-16 18:11:09.218517	2025-05-16 18:11:09.218517
167	91	Fire roasted bell peppers	fire_roasted_bell_peppers	9	\N	\N	2025-05-16 18:11:09.37715	2025-05-16 18:11:09.37715
168	91	Sliced radish	sliced_radish	10	\N	\N	2025-05-16 18:11:09.469897	2025-05-16 18:11:09.469897
169	91	Cilantro	cilantro	11	\N	\N	2025-05-16 18:11:09.781668	2025-05-16 18:11:09.781668
170	91	Pickled cabbage	pickled_cabbage	12	\N	\N	2025-05-16 18:11:09.92814	2025-05-16 18:11:09.92814
171	91	Escabeche - House-made picked vegetable medley	escabeche_condiment	13	\N	\N	2025-05-16 18:11:10.051412	2025-05-16 18:11:10.051412
172	92	Barbacoa	barbacoa	1	\N	\N	2025-05-16 18:19:01.348132	2025-05-16 18:19:01.348132
173	92	Flank steak Fajitas upcharge of $2.00 pp	flank_steak_fajitas_upcharge	2	\N	\N	2025-05-16 18:19:01.401816	2025-05-16 18:19:01.401816
174	92	Ground Beef	ground_beef	3	\N	\N	2025-05-16 18:19:01.446392	2025-05-16 18:19:01.446392
175	92	Pork Carnitas	pork_carnitas	4	\N	\N	2025-05-16 18:19:01.492996	2025-05-16 18:19:01.492996
176	92	Pork Belly	pork_belly	5	\N	\N	2025-05-16 18:19:01.54092	2025-05-16 18:19:01.54092
177	92	Chorizo	chorizo	6	\N	\N	2025-05-16 18:19:01.586012	2025-05-16 18:19:01.586012
178	92	Beef Birria	beef_birria	7	\N	\N	2025-05-16 18:19:01.635752	2025-05-16 18:19:01.635752
179	92	Mexican Chicken	mexican_chicken	8	\N	\N	2025-05-16 18:19:01.688509	2025-05-16 18:19:01.688509
180	92	Cod	cod	9	\N	\N	2025-05-16 18:19:01.734437	2025-05-16 18:19:01.734437
181	92	Shrimp	shrimp	10	\N	\N	2025-05-16 18:19:01.781026	2025-05-16 18:19:01.781026
182	92	Tofu	tofu	11	\N	\N	2025-05-16 18:19:01.828435	2025-05-16 18:19:01.828435
183	92	Roasted Vegetables	roasted_vegetables	12	\N	\N	2025-05-16 18:19:01.876051	2025-05-16 18:19:01.876051
184	92	Escabeche - House-made picked vegetable medley	escabeche	13	\N	\N	2025-05-16 18:19:01.920984	2025-05-16 18:19:01.920984
185	93	Refried Beans	refried_beans	1	\N	\N	2025-05-16 18:19:02.01563	2025-05-16 18:19:02.01563
186	93	Mexican Street corn (Elotes)	elotes	2	\N	\N	2025-05-16 18:19:02.062867	2025-05-16 18:19:02.062867
187	93	Queso Dip	queso_dip	3	\N	\N	2025-05-16 18:19:02.109569	2025-05-16 18:19:02.109569
188	93	Chorizo Queso Dip	chorizo_queso_dip	4	\N	\N	2025-05-16 18:19:02.156322	2025-05-16 18:19:02.156322
189	93	Stuffed Poblano peppers	stuffed_poblano_peppers	5	\N	\N	2025-05-16 18:19:02.20302	2025-05-16 18:19:02.20302
190	93	Mexican Rice	mexican_rice	6	\N	\N	2025-05-16 18:19:02.250143	2025-05-16 18:19:02.250143
191	93	Cilantro Lime Rice	cilantro_lime_rice	7	\N	\N	2025-05-16 18:19:02.304832	2025-05-16 18:19:02.304832
192	93	Rice and Beans	rice_and_beans	8	\N	\N	2025-05-16 18:19:02.352557	2025-05-16 18:19:02.352557
193	93	Jalapeno cornbread	jalapeno_cornbread	9	\N	\N	2025-05-16 18:19:02.413705	2025-05-16 18:19:02.413705
194	93	Grilled Vegetables	grilled_vegetables	10	\N	\N	2025-05-16 18:19:02.465632	2025-05-16 18:19:02.465632
195	93	Mexican Slaw with Mango	mexican_slaw_mango	11	\N	\N	2025-05-16 18:19:02.513966	2025-05-16 18:19:02.513966
196	93	Vegetarian Empanadas	vegetarian_empanadas	12	\N	\N	2025-05-16 18:19:02.561128	2025-05-16 18:19:02.561128
197	94	Classic Pico de Gallo	pico_de_gallo	1	\N	\N	2025-05-16 18:19:02.679126	2025-05-16 18:19:02.679126
198	94	Fresh Mango Salsa	mango_salsa	2	\N	\N	2025-05-16 18:19:02.731029	2025-05-16 18:19:02.731029
199	94	Pineapple Habanero Salsa	pineapple_habanero_salsa	3	\N	\N	2025-05-16 18:19:02.785851	2025-05-16 18:19:02.785851
200	94	Cucumber & Apple Salsa	cucumber_apple_salsa	4	\N	\N	2025-05-16 18:19:02.842137	2025-05-16 18:19:02.842137
201	94	Jicama and Papaya Salsa	jicama_papaya_salsa	5	\N	\N	2025-05-16 18:19:02.894971	2025-05-16 18:19:02.894971
202	94	Salsa Roja (red sauce)	salsa_roja	6	\N	\N	2025-05-16 18:19:02.948861	2025-05-16 18:19:02.948861
203	94	Salsa Verde (green sauce)	salsa_verde	7	\N	\N	2025-05-16 18:19:02.999761	2025-05-16 18:19:02.999761
204	94	Creamy Salsa Verde (green sauce)	creamy_salsa_verde	8	\N	\N	2025-05-16 18:19:03.047128	2025-05-16 18:19:03.047128
205	94	Salsa Macha -(contains peanuts and sesame seeds)	salsa_macha	9	\N	\N	2025-05-16 18:19:03.098951	2025-05-16 18:19:03.098951
206	95	Shredded cheese	shredded_cheese	1	\N	\N	2025-05-16 18:19:03.199392	2025-05-16 18:19:03.199392
207	95	Shredded vegan cheese	shredded_vegan_cheese	2	\N	\N	2025-05-16 18:19:03.246959	2025-05-16 18:19:03.246959
208	95	Diced Onions	diced_onions	3	\N	\N	2025-05-16 18:19:03.299546	2025-05-16 18:19:03.299546
209	95	Lime wedges	lime_wedges	4	\N	\N	2025-05-16 18:19:03.355163	2025-05-16 18:19:03.355163
210	95	Jalapeños	jalapenos	5	\N	\N	2025-05-16 18:19:03.401414	2025-05-16 18:19:03.401414
211	95	Sour Cream	sour_cream	6	\N	\N	2025-05-16 18:19:03.454403	2025-05-16 18:19:03.454403
212	95	Diced bell peppers	diced_bell_peppers	7	\N	\N	2025-05-16 18:19:03.503145	2025-05-16 18:19:03.503145
213	95	Guacamole	guacamole	8	\N	\N	2025-05-16 18:19:03.549522	2025-05-16 18:19:03.549522
214	95	Fire roasted bell peppers	fire_roasted_bell_peppers	9	\N	\N	2025-05-16 18:19:03.594618	2025-05-16 18:19:03.594618
215	95	Sliced radish	sliced_radish	10	\N	\N	2025-05-16 18:19:03.644412	2025-05-16 18:19:03.644412
216	95	Cilantro	cilantro	11	\N	\N	2025-05-16 18:19:03.691904	2025-05-16 18:19:03.691904
217	95	Pickled cabbage	pickled_cabbage	12	\N	\N	2025-05-16 18:19:03.738722	2025-05-16 18:19:03.738722
218	95	Escabeche - House-made picked vegetable medley	escabeche_condiment	13	\N	\N	2025-05-16 18:19:03.809445	2025-05-16 18:19:03.809445
219	96	Bronze - $30 per person 3 proteins, 2 sides, 2 salads, 2 sauces, 3 condiments	american_bbq_bronze	1	\N	\N	2025-05-16 18:22:34.980406	2025-05-16 18:22:34.980406
220	96	Silver - $36 per person 4 proteins, 3 sides, 2 salads, 3 sauces, 4 condiments	american_bbq_silver	2	\N	\N	2025-05-16 18:22:35.039554	2025-05-16 18:22:35.039554
221	96	Gold - $42 per person 4 proteins, 4 sides, 3 salads, 3 sauces, 5 condiments	american_bbq_gold	3	\N	\N	2025-05-16 18:22:35.085807	2025-05-16 18:22:35.085807
222	96	Diamond - $48 per person 5 proteins, 5 sides, 4 salads, 4 sauces, 6 condiments	american_bbq_diamond	4	\N	\N	2025-05-16 18:22:35.133303	2025-05-16 18:22:35.133303
223	97	Prime Rib - Boneless -Carving station (upcharge of $4.00 pp)	prime_rib_upcharge	1	\N	\N	2025-05-16 18:24:25.998148	2025-05-16 18:24:25.998148
224	97	Smoked Brisket (upcharge $3.00 pp)	smoked_brisket_upcharge	2	\N	\N	2025-05-16 18:24:26.059221	2025-05-16 18:24:26.059221
225	97	Beef Ribs (upcharge $4.00 pp)	beef_ribs_upcharge	3	\N	\N	2025-05-16 18:24:26.114921	2025-05-16 18:24:26.114921
226	97	Guinness Braised Boneless Short Ribs (upcharge $2.00 pp)	short_ribs_upcharge	4	\N	\N	2025-05-16 18:24:26.168137	2025-05-16 18:24:26.168137
227	97	Bacon Wrapped Fillet Mingon - (upcharge of $4.00 pp)	filet_mignon_upcharge	5	\N	\N	2025-05-16 18:24:26.219411	2025-05-16 18:24:26.219411
228	97	Flank Steak with Chimichurri	flank_steak_chimichurri	6	\N	\N	2025-05-16 18:24:26.271263	2025-05-16 18:24:26.271263
229	97	Sausage Medley	sausage_medley	7	\N	\N	2025-05-16 18:24:26.322618	2025-05-16 18:24:26.322618
230	97	Hamburger Bar (upcharge of $2.50 pp)	hamburger_bar_upcharge	8	\N	\N	2025-05-16 18:24:26.375004	2025-05-16 18:24:26.375004
231	97	Lamb Chops (upcharge of $4.00 pp)	lamb_chops_upcharge	9	\N	\N	2025-05-16 18:24:26.432641	2025-05-16 18:24:26.432641
232	97	Smoked Leg of Lamb (Family Style only)	smoked_leg_lamb	10	\N	\N	2025-05-16 18:24:26.480965	2025-05-16 18:24:26.480965
233	97	Pulled Pork	pulled_pork	11	\N	\N	2025-05-16 18:24:26.53477	2025-05-16 18:24:26.53477
234	97	Smoked pork Belly	smoked_pork_belly	12	\N	\N	2025-05-16 18:24:26.58515	2025-05-16 18:24:26.58515
235	97	Baby Back Ribs	baby_back_ribs	13	\N	\N	2025-05-16 18:24:26.636015	2025-05-16 18:24:26.636015
236	97	Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze	pork_chop_korean_bbq	14	\N	\N	2025-05-16 18:24:26.684902	2025-05-16 18:24:26.684902
237	97	BBQ Guiness Chicken	bbq_guiness_chicken	15	\N	\N	2025-05-16 18:24:26.742604	2025-05-16 18:24:26.742604
238	97	Carolina BBQ Chicken	carolina_bbq_chicken	16	\N	\N	2025-05-16 18:24:26.795584	2025-05-16 18:24:26.795584
239	97	Rotisserie Chicken	rotisserie_chicken	17	\N	\N	2025-05-16 18:24:26.844492	2025-05-16 18:24:26.844492
240	97	BBQ Prawns (upcharge of $2.00 pp)	bbq_prawns_upcharge	18	\N	\N	2025-05-16 18:24:26.900862	2025-05-16 18:24:26.900862
241	97	Salmon steak	salmon_steak	19	\N	\N	2025-05-16 18:24:26.964486	2025-05-16 18:24:26.964486
242	97	Tofu	tofu_bbq	20	\N	\N	2025-05-16 18:24:27.018345	2025-05-16 18:24:27.018345
243	97	Vegetable kebabs	vegetable_kebabs_bbq	21	\N	\N	2025-05-16 18:24:27.069571	2025-05-16 18:24:27.069571
244	97	Grilled Cauliflower Steaks	grilled_cauliflower_steaks	22	\N	\N	2025-05-16 18:24:27.120762	2025-05-16 18:24:27.120762
245	98	Ham hock baked Beans	ham_hock_baked_beans	1	\N	\N	2025-05-16 18:24:27.223118	2025-05-16 18:24:27.223118
246	98	Avocado deviled Eggs	avocado_deviled_eggs	2	\N	\N	2025-05-16 18:24:27.275182	2025-05-16 18:24:27.275182
247	98	Mac n' Cheese	mac_n_cheese	3	\N	\N	2025-05-16 18:24:27.324631	2025-05-16 18:24:27.324631
248	98	Stuffed Poblano peppers	stuffed_poblano_peppers_bbq	4	\N	\N	2025-05-16 18:24:27.377239	2025-05-16 18:24:27.377239
249	98	Baked Potato Bar (upcharge $1.50 pp)	baked_potato_bar_upcharge	5	\N	\N	2025-05-16 18:24:27.426369	2025-05-16 18:24:27.426369
250	98	Garlic Mashed Potatoes	garlic_mashed_potatoes	6	\N	\N	2025-05-16 18:24:27.47528	2025-05-16 18:24:27.47528
251	98	Mini Smashed Potatoes	mini_smashed_potatoes	7	\N	\N	2025-05-16 18:24:27.535302	2025-05-16 18:24:27.535302
252	98	Twice Baked Potatoes (upcharge $0.75 pp)	twice_baked_potatoes_upcharge	8	\N	\N	2025-05-16 18:24:27.589061	2025-05-16 18:24:27.589061
253	98	Corn on the Cob	corn_on_the_cob	9	\N	\N	2025-05-16 18:24:27.638404	2025-05-16 18:24:27.638404
254	98	Creamed Corn	creamed_corn	10	\N	\N	2025-05-16 18:24:27.695023	2025-05-16 18:24:27.695023
255	98	Jalapeño Poppers	jalapeno_poppers	11	\N	\N	2025-05-16 18:24:27.748006	2025-05-16 18:24:27.748006
256	98	Roasted Brussels Sprouts	roasted_brussels_sprouts	12	\N	\N	2025-05-16 18:24:27.797944	2025-05-16 18:24:27.797944
257	98	Corn Bread	corn_bread	13	\N	\N	2025-05-16 18:24:27.84888	2025-05-16 18:24:27.84888
258	98	Jalapeno cornbread	jalapeno_cornbread_bbq	14	\N	\N	2025-05-16 18:24:27.897237	2025-05-16 18:24:27.897237
259	98	Grilled Vegetables	grilled_vegetables_bbq	15	\N	\N	2025-05-16 18:24:27.959299	2025-05-16 18:24:27.959299
260	98	Grilled Asparagus	grilled_asparagus	16	\N	\N	2025-05-16 18:24:28.008329	2025-05-16 18:24:28.008329
261	99	Caesar	caesar_salad	1	\N	\N	2025-05-16 18:24:28.113642	2025-05-16 18:24:28.113642
262	99	Coleslaw	coleslaw	2	\N	\N	2025-05-16 18:24:28.163049	2025-05-16 18:24:28.163049
263	99	Garden Salad	garden_salad	3	\N	\N	2025-05-16 18:24:28.220487	2025-05-16 18:24:28.220487
264	99	Pasta Salad	pasta_salad	4	\N	\N	2025-05-16 18:24:28.273069	2025-05-16 18:24:28.273069
265	99	Bacon Jalapeño Corn Salad	bacon_jalapeno_corn_salad	5	\N	\N	2025-05-16 18:24:28.321693	2025-05-16 18:24:28.321693
266	99	Wedge Salad	wedge_salad	6	\N	\N	2025-05-16 18:24:28.384363	2025-05-16 18:24:28.384363
267	99	German cucumber salad	german_cucumber_salad	7	\N	\N	2025-05-16 18:24:28.437854	2025-05-16 18:24:28.437854
268	99	Crunchy Asian Slaw	crunchy_asian_slaw	8	\N	\N	2025-05-16 18:24:28.489181	2025-05-16 18:24:28.489181
269	99	Tossed Cobb Salad	tossed_cobb_salad	9	\N	\N	2025-05-16 18:24:28.550126	2025-05-16 18:24:28.550126
270	99	Classic Potato Salad	classic_potato_salad	10	\N	\N	2025-05-16 18:24:28.601096	2025-05-16 18:24:28.601096
271	99	German Potato Salad	german_potato_salad	11	\N	\N	2025-05-16 18:24:28.65245	2025-05-16 18:24:28.65245
272	99	Macaroni Salad	macaroni_salad	12	\N	\N	2025-05-16 18:24:28.703873	2025-05-16 18:24:28.703873
273	99	Hawaiian Macaroni Salad	hawaiian_macaroni_salad	13	\N	\N	2025-05-16 18:24:28.756351	2025-05-16 18:24:28.756351
274	99	Fruit Salad	fruit_salad	14	\N	\N	2025-05-16 18:24:28.812091	2025-05-16 18:24:28.812091
275	100	Kansas City BBQ Sauce	kansas_city_bbq	1	\N	\N	2025-05-16 18:24:28.916199	2025-05-16 18:24:28.916199
276	100	South Carolina Gold BBQ Sauce	sc_gold_bbq	2	\N	\N	2025-05-16 18:24:28.964549	2025-05-16 18:24:28.964549
277	100	North Carolina Vinegar based BBQ Sauce	nc_vinegar_bbq	3	\N	\N	2025-05-16 18:24:29.01498	2025-05-16 18:24:29.01498
278	100	Alabama White BBQ Sauce	alabama_white_bbq	4	\N	\N	2025-05-16 18:24:29.069146	2025-05-16 18:24:29.069146
279	100	Texas BBQ Sauce	texas_bbq	5	\N	\N	2025-05-16 18:24:29.125607	2025-05-16 18:24:29.125607
280	100	Very Berry BBQ Sauce	very_berry_bbq	6	\N	\N	2025-05-16 18:24:29.182944	2025-05-16 18:24:29.182944
281	100	Smoky bourbon BBQ Sauce	smoky_bourbon_bbq	7	\N	\N	2025-05-16 18:24:29.237682	2025-05-16 18:24:29.237682
282	101	Ketchup	ketchup	1	\N	\N	2025-05-16 18:24:29.348324	2025-05-16 18:24:29.348324
283	101	Stone Ground Mustard	stone_ground_mustard	2	\N	\N	2025-05-16 18:24:29.401441	2025-05-16 18:24:29.401441
284	101	Dijon Mustard	dijon_mustard	3	\N	\N	2025-05-16 18:24:29.463552	2025-05-16 18:24:29.463552
285	101	Yellow Mustard	yellow_mustard	4	\N	\N	2025-05-16 18:24:29.529996	2025-05-16 18:24:29.529996
286	101	Mayonnaise	mayonnaise	5	\N	\N	2025-05-16 18:24:29.587765	2025-05-16 18:24:29.587765
287	101	Sweet pickle Chips	sweet_pickle_chips	6	\N	\N	2025-05-16 18:24:29.648603	2025-05-16 18:24:29.648603
288	101	Dill pickle Chips	dill_pickle_chips	7	\N	\N	2025-05-16 18:24:29.696764	2025-05-16 18:24:29.696764
289	101	Sliced radish	sliced_radish_bbq	8	\N	\N	2025-05-16 18:24:29.749994	2025-05-16 18:24:29.749994
290	101	Sweet Relish	sweet_relish	9	\N	\N	2025-05-16 18:24:29.810997	2025-05-16 18:24:29.810997
291	101	Cranberry Relish	cranberry_relish	10	\N	\N	2025-05-16 18:24:29.86282	2025-05-16 18:24:29.86282
292	101	Kimchi	kimchi	11	\N	\N	2025-05-16 18:24:29.915992	2025-05-16 18:24:29.915992
293	101	Mixed Pickled Vegetables - Giardiniera	giardiniera	12	\N	\N	2025-05-16 18:24:29.964729	2025-05-16 18:24:29.964729
294	103	Prime Rib - Boneless -Carving station (upcharge of $4.00 pp)	prime_rib_upcharge	1	\N	\N	2025-05-16 18:37:35.862531	2025-05-16 18:37:35.862531
295	103	Smoked Brisket (upcharge $3.00 pp)	smoked_brisket_upcharge	2	\N	\N	2025-05-16 18:37:35.930881	2025-05-16 18:37:35.930881
296	103	Beef Ribs (upcharge $4.00 pp)	beef_ribs_upcharge	3	\N	\N	2025-05-16 18:37:35.985016	2025-05-16 18:37:35.985016
297	103	Guinness Braised Boneless Short Ribs (upcharge $2.00 pp)	short_ribs_upcharge	4	\N	\N	2025-05-16 18:37:36.037864	2025-05-16 18:37:36.037864
298	103	Bacon Wrapped Fillet Mingon - (upcharge of $4.00 pp)	filet_mignon_upcharge	5	\N	\N	2025-05-16 18:37:36.094509	2025-05-16 18:37:36.094509
299	103	Flank Steak with Chimichurri	flank_steak_chimichurri	6	\N	\N	2025-05-16 18:37:36.171141	2025-05-16 18:37:36.171141
300	103	Sausage Medley	sausage_medley	7	\N	\N	2025-05-16 18:37:36.224692	2025-05-16 18:37:36.224692
301	103	Hamburger Bar (upcharge of $2.50 pp)	hamburger_bar_upcharge	8	\N	\N	2025-05-16 18:37:36.27659	2025-05-16 18:37:36.27659
302	103	Lamb Chops (upcharge of $4.00 pp)	lamb_chops_upcharge	9	\N	\N	2025-05-16 18:37:36.326254	2025-05-16 18:37:36.326254
303	103	Smoked Leg of Lamb (Family Style only)	smoked_leg_lamb	10	\N	\N	2025-05-16 18:37:36.375206	2025-05-16 18:37:36.375206
304	103	Pulled Pork	pulled_pork	11	\N	\N	2025-05-16 18:37:36.422565	2025-05-16 18:37:36.422565
305	103	Smoked pork Belly	smoked_pork_belly	12	\N	\N	2025-05-16 18:37:36.478367	2025-05-16 18:37:36.478367
306	103	Baby Back Ribs	baby_back_ribs	13	\N	\N	2025-05-16 18:37:36.532528	2025-05-16 18:37:36.532528
307	103	Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze	pork_chop_korean_bbq	14	\N	\N	2025-05-16 18:37:36.585415	2025-05-16 18:37:36.585415
308	103	BBQ Guiness Chicken	bbq_guiness_chicken	15	\N	\N	2025-05-16 18:37:36.635512	2025-05-16 18:37:36.635512
309	103	Carolina BBQ Chicken	carolina_bbq_chicken	16	\N	\N	2025-05-16 18:37:36.684763	2025-05-16 18:37:36.684763
310	103	Rotisserie Chicken	rotisserie_chicken	17	\N	\N	2025-05-16 18:37:36.736355	2025-05-16 18:37:36.736355
311	103	BBQ Prawns (upcharge of $2.00 pp)	bbq_prawns_upcharge	18	\N	\N	2025-05-16 18:37:36.787678	2025-05-16 18:37:36.787678
312	103	Salmon steak	salmon_steak	19	\N	\N	2025-05-16 18:37:36.836696	2025-05-16 18:37:36.836696
313	103	Tofu	tofu_bbq	20	\N	\N	2025-05-16 18:37:36.888542	2025-05-16 18:37:36.888542
314	103	Vegetable kebabs	vegetable_kebabs_bbq	21	\N	\N	2025-05-16 18:37:36.93578	2025-05-16 18:37:36.93578
315	103	Grilled Cauliflower Steaks	grilled_cauliflower_steaks	22	\N	\N	2025-05-16 18:37:36.984074	2025-05-16 18:37:36.984074
316	104	Ham hock baked Beans	ham_hock_baked_beans	1	\N	\N	2025-05-16 18:37:37.084936	2025-05-16 18:37:37.084936
317	104	Avocado deviled Eggs	avocado_deviled_eggs	2	\N	\N	2025-05-16 18:37:37.143013	2025-05-16 18:37:37.143013
318	104	Mac n' Cheese	mac_n_cheese	3	\N	\N	2025-05-16 18:37:37.195166	2025-05-16 18:37:37.195166
839	163	Classic Pico de Gallo	pico_de_gallo	1	\N	\N	2025-05-16 18:56:31.202635	2025-05-16 18:56:31.202635
319	104	Stuffed Poblano peppers	stuffed_poblano_peppers_bbq	4	\N	\N	2025-05-16 18:37:37.244966	2025-05-16 18:37:37.244966
320	104	Baked Potato Bar (upcharge $1.50 pp)	baked_potato_bar_upcharge	5	\N	\N	2025-05-16 18:37:37.298013	2025-05-16 18:37:37.298013
321	104	Garlic Mashed Potatoes	garlic_mashed_potatoes	6	\N	\N	2025-05-16 18:37:37.351599	2025-05-16 18:37:37.351599
322	104	Mini Smashed Potatoes	mini_smashed_potatoes	7	\N	\N	2025-05-16 18:37:37.401508	2025-05-16 18:37:37.401508
323	104	Twice Baked Potatoes (upcharge $0.75 pp)	twice_baked_potatoes_upcharge	8	\N	\N	2025-05-16 18:37:37.451011	2025-05-16 18:37:37.451011
324	104	Corn on the Cob	corn_on_the_cob	9	\N	\N	2025-05-16 18:37:37.500389	2025-05-16 18:37:37.500389
325	104	Creamed Corn	creamed_corn	10	\N	\N	2025-05-16 18:37:37.550329	2025-05-16 18:37:37.550329
326	104	Jalapeño Poppers	jalapeno_poppers	11	\N	\N	2025-05-16 18:37:37.60003	2025-05-16 18:37:37.60003
327	104	Roasted Brussels Sprouts	roasted_brussels_sprouts	12	\N	\N	2025-05-16 18:37:37.647634	2025-05-16 18:37:37.647634
328	104	Corn Bread	corn_bread	13	\N	\N	2025-05-16 18:37:37.696996	2025-05-16 18:37:37.696996
329	104	Jalapeno cornbread	jalapeno_cornbread_bbq	14	\N	\N	2025-05-16 18:37:37.748806	2025-05-16 18:37:37.748806
330	104	Grilled Vegetables	grilled_vegetables_bbq	15	\N	\N	2025-05-16 18:37:37.796119	2025-05-16 18:37:37.796119
331	104	Grilled Asparagus	grilled_asparagus	16	\N	\N	2025-05-16 18:37:37.845155	2025-05-16 18:37:37.845155
332	105	Caesar	caesar_salad	1	\N	\N	2025-05-16 18:37:37.944115	2025-05-16 18:37:37.944115
333	105	Coleslaw	coleslaw	2	\N	\N	2025-05-16 18:37:37.992768	2025-05-16 18:37:37.992768
334	105	Garden Salad	garden_salad	3	\N	\N	2025-05-16 18:37:38.047159	2025-05-16 18:37:38.047159
335	105	Pasta Salad	pasta_salad	4	\N	\N	2025-05-16 18:37:38.097764	2025-05-16 18:37:38.097764
336	105	Bacon Jalapeño Corn Salad	bacon_jalapeno_corn_salad	5	\N	\N	2025-05-16 18:37:38.145272	2025-05-16 18:37:38.145272
337	105	Wedge Salad	wedge_salad	6	\N	\N	2025-05-16 18:37:38.194509	2025-05-16 18:37:38.194509
338	105	German cucumber salad	german_cucumber_salad	7	\N	\N	2025-05-16 18:37:38.244303	2025-05-16 18:37:38.244303
339	105	Crunchy Asian Slaw	crunchy_asian_slaw	8	\N	\N	2025-05-16 18:37:38.294734	2025-05-16 18:37:38.294734
340	105	Tossed Cobb Salad	tossed_cobb_salad	9	\N	\N	2025-05-16 18:37:38.34746	2025-05-16 18:37:38.34746
341	105	Classic Potato Salad	classic_potato_salad	10	\N	\N	2025-05-16 18:37:38.396465	2025-05-16 18:37:38.396465
342	105	German Potato Salad	german_potato_salad	11	\N	\N	2025-05-16 18:37:38.443563	2025-05-16 18:37:38.443563
343	105	Macaroni Salad	macaroni_salad	12	\N	\N	2025-05-16 18:37:38.494833	2025-05-16 18:37:38.494833
344	105	Hawaiian Macaroni Salad	hawaiian_macaroni_salad	13	\N	\N	2025-05-16 18:37:38.544529	2025-05-16 18:37:38.544529
345	105	Fruit Salad	fruit_salad	14	\N	\N	2025-05-16 18:37:38.597024	2025-05-16 18:37:38.597024
346	106	Kansas City BBQ Sauce	kansas_city_bbq	1	\N	\N	2025-05-16 18:37:38.701333	2025-05-16 18:37:38.701333
347	106	South Carolina Gold BBQ Sauce	sc_gold_bbq	2	\N	\N	2025-05-16 18:37:38.749906	2025-05-16 18:37:38.749906
348	106	North Carolina Vinegar based BBQ Sauce	nc_vinegar_bbq	3	\N	\N	2025-05-16 18:37:38.797982	2025-05-16 18:37:38.797982
349	106	Alabama White BBQ Sauce	alabama_white_bbq	4	\N	\N	2025-05-16 18:37:38.845864	2025-05-16 18:37:38.845864
350	106	Texas BBQ Sauce	texas_bbq	5	\N	\N	2025-05-16 18:37:38.894602	2025-05-16 18:37:38.894602
351	106	Very Berry BBQ Sauce	very_berry_bbq	6	\N	\N	2025-05-16 18:37:38.948023	2025-05-16 18:37:38.948023
352	106	Smoky bourbon BBQ Sauce	smoky_bourbon_bbq	7	\N	\N	2025-05-16 18:37:38.994801	2025-05-16 18:37:38.994801
353	107	Ketchup	ketchup	1	\N	\N	2025-05-16 18:37:39.092946	2025-05-16 18:37:39.092946
354	107	Stone Ground Mustard	stone_ground_mustard	2	\N	\N	2025-05-16 18:37:39.141114	2025-05-16 18:37:39.141114
355	107	Dijon Mustard	dijon_mustard	3	\N	\N	2025-05-16 18:37:39.193873	2025-05-16 18:37:39.193873
356	107	Yellow Mustard	yellow_mustard	4	\N	\N	2025-05-16 18:37:39.24079	2025-05-16 18:37:39.24079
357	107	Mayonnaise	mayonnaise	5	\N	\N	2025-05-16 18:37:39.331312	2025-05-16 18:37:39.331312
358	107	Sweet pickle Chips	sweet_pickle_chips	6	\N	\N	2025-05-16 18:37:39.383176	2025-05-16 18:37:39.383176
359	107	Dill pickle Chips	dill_pickle_chips	7	\N	\N	2025-05-16 18:37:39.43007	2025-05-16 18:37:39.43007
360	107	Sliced radish	sliced_radish_bbq	8	\N	\N	2025-05-16 18:37:39.476433	2025-05-16 18:37:39.476433
361	107	Sweet Relish	sweet_relish	9	\N	\N	2025-05-16 18:37:39.524697	2025-05-16 18:37:39.524697
362	107	Cranberry Relish	cranberry_relish	10	\N	\N	2025-05-16 18:37:39.573536	2025-05-16 18:37:39.573536
363	107	Kimchi	kimchi	11	\N	\N	2025-05-16 18:37:39.622873	2025-05-16 18:37:39.622873
364	107	Mixed Pickled Vegetables - Giardiniera	giardiniera	12	\N	\N	2025-05-16 18:37:39.669666	2025-05-16 18:37:39.669666
365	108	Prime Rib - Boneless -Carving station (upcharge of $4.00 pp)	prime_rib_upcharge	1	\N	\N	2025-05-16 18:38:54.152299	2025-05-16 18:38:54.152299
366	108	Smoked Brisket (upcharge $3.00 pp)	smoked_brisket_upcharge	2	\N	\N	2025-05-16 18:38:54.201889	2025-05-16 18:38:54.201889
367	108	Beef Ribs (upcharge $4.00 pp)	beef_ribs_upcharge	3	\N	\N	2025-05-16 18:38:54.251591	2025-05-16 18:38:54.251591
368	108	Guinness Braised Boneless Short Ribs (upcharge $2.00 pp)	short_ribs_upcharge	4	\N	\N	2025-05-16 18:38:54.301357	2025-05-16 18:38:54.301357
369	108	Bacon Wrapped Fillet Mingon - (upcharge of $4.00 pp)	filet_mignon_upcharge	5	\N	\N	2025-05-16 18:38:54.354395	2025-05-16 18:38:54.354395
370	108	Flank Steak with Chimichurri	flank_steak_chimichurri	6	\N	\N	2025-05-16 18:38:54.409965	2025-05-16 18:38:54.409965
371	108	Sausage Medley	sausage_medley	7	\N	\N	2025-05-16 18:38:54.457923	2025-05-16 18:38:54.457923
372	108	Hamburger Bar (upcharge of $2.50 pp)	hamburger_bar_upcharge	8	\N	\N	2025-05-16 18:38:54.504551	2025-05-16 18:38:54.504551
373	108	Lamb Chops (upcharge of $4.00 pp)	lamb_chops_upcharge	9	\N	\N	2025-05-16 18:38:54.549885	2025-05-16 18:38:54.549885
374	108	Smoked Leg of Lamb (Family Style only)	smoked_leg_lamb	10	\N	\N	2025-05-16 18:38:54.599612	2025-05-16 18:38:54.599612
375	108	Pulled Pork	pulled_pork	11	\N	\N	2025-05-16 18:38:54.646639	2025-05-16 18:38:54.646639
376	108	Smoked pork Belly	smoked_pork_belly	12	\N	\N	2025-05-16 18:38:54.693281	2025-05-16 18:38:54.693281
377	108	Baby Back Ribs	baby_back_ribs	13	\N	\N	2025-05-16 18:38:54.741782	2025-05-16 18:38:54.741782
378	108	Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze	pork_chop_korean_bbq	14	\N	\N	2025-05-16 18:38:54.786622	2025-05-16 18:38:54.786622
379	108	BBQ Guiness Chicken	bbq_guiness_chicken	15	\N	\N	2025-05-16 18:38:54.838279	2025-05-16 18:38:54.838279
380	108	Carolina BBQ Chicken	carolina_bbq_chicken	16	\N	\N	2025-05-16 18:38:54.889256	2025-05-16 18:38:54.889256
381	108	Rotisserie Chicken	rotisserie_chicken	17	\N	\N	2025-05-16 18:38:54.935644	2025-05-16 18:38:54.935644
382	108	BBQ Prawns (upcharge of $2.00 pp)	bbq_prawns_upcharge	18	\N	\N	2025-05-16 18:38:54.981753	2025-05-16 18:38:54.981753
383	108	Salmon steak	salmon_steak	19	\N	\N	2025-05-16 18:38:55.028974	2025-05-16 18:38:55.028974
384	108	Tofu	tofu_bbq	20	\N	\N	2025-05-16 18:38:55.0771	2025-05-16 18:38:55.0771
385	108	Vegetable kebabs	vegetable_kebabs_bbq	21	\N	\N	2025-05-16 18:38:55.124667	2025-05-16 18:38:55.124667
386	108	Grilled Cauliflower Steaks	grilled_cauliflower_steaks	22	\N	\N	2025-05-16 18:38:55.173648	2025-05-16 18:38:55.173648
387	109	Ham hock baked Beans	ham_hock_baked_beans	1	\N	\N	2025-05-16 18:38:55.278465	2025-05-16 18:38:55.278465
388	109	Avocado deviled Eggs	avocado_deviled_eggs	2	\N	\N	2025-05-16 18:38:55.333311	2025-05-16 18:38:55.333311
389	109	Mac n' Cheese	mac_n_cheese	3	\N	\N	2025-05-16 18:38:55.38722	2025-05-16 18:38:55.38722
390	109	Stuffed Poblano peppers	stuffed_poblano_peppers_bbq	4	\N	\N	2025-05-16 18:38:55.436231	2025-05-16 18:38:55.436231
391	109	Baked Potato Bar (upcharge $1.50 pp)	baked_potato_bar_upcharge	5	\N	\N	2025-05-16 18:38:55.482051	2025-05-16 18:38:55.482051
392	109	Garlic Mashed Potatoes	garlic_mashed_potatoes	6	\N	\N	2025-05-16 18:38:55.532921	2025-05-16 18:38:55.532921
393	109	Mini Smashed Potatoes	mini_smashed_potatoes	7	\N	\N	2025-05-16 18:38:55.585655	2025-05-16 18:38:55.585655
394	109	Twice Baked Potatoes (upcharge $0.75 pp)	twice_baked_potatoes_upcharge	8	\N	\N	2025-05-16 18:38:55.632053	2025-05-16 18:38:55.632053
395	109	Corn on the Cob	corn_on_the_cob	9	\N	\N	2025-05-16 18:38:55.681276	2025-05-16 18:38:55.681276
396	109	Creamed Corn	creamed_corn	10	\N	\N	2025-05-16 18:38:55.737968	2025-05-16 18:38:55.737968
397	109	Jalapeño Poppers	jalapeno_poppers	11	\N	\N	2025-05-16 18:38:55.786835	2025-05-16 18:38:55.786835
398	109	Roasted Brussels Sprouts	roasted_brussels_sprouts	12	\N	\N	2025-05-16 18:38:55.835626	2025-05-16 18:38:55.835626
399	109	Corn Bread	corn_bread	13	\N	\N	2025-05-16 18:38:55.88892	2025-05-16 18:38:55.88892
400	109	Jalapeno cornbread	jalapeno_cornbread_bbq	14	\N	\N	2025-05-16 18:38:55.94055	2025-05-16 18:38:55.94055
401	109	Grilled Vegetables	grilled_vegetables_bbq	15	\N	\N	2025-05-16 18:38:55.988981	2025-05-16 18:38:55.988981
402	109	Grilled Asparagus	grilled_asparagus	16	\N	\N	2025-05-16 18:38:56.043082	2025-05-16 18:38:56.043082
403	110	Caesar	caesar_salad	1	\N	\N	2025-05-16 18:38:56.140133	2025-05-16 18:38:56.140133
404	110	Coleslaw	coleslaw	2	\N	\N	2025-05-16 18:38:56.189675	2025-05-16 18:38:56.189675
405	110	Garden Salad	garden_salad	3	\N	\N	2025-05-16 18:38:56.239812	2025-05-16 18:38:56.239812
406	110	Pasta Salad	pasta_salad	4	\N	\N	2025-05-16 18:38:56.285384	2025-05-16 18:38:56.285384
407	110	Bacon Jalapeño Corn Salad	bacon_jalapeno_corn_salad	5	\N	\N	2025-05-16 18:38:56.341787	2025-05-16 18:38:56.341787
408	110	Wedge Salad	wedge_salad	6	\N	\N	2025-05-16 18:38:56.391566	2025-05-16 18:38:56.391566
409	110	German cucumber salad	german_cucumber_salad	7	\N	\N	2025-05-16 18:38:56.449484	2025-05-16 18:38:56.449484
410	110	Crunchy Asian Slaw	crunchy_asian_slaw	8	\N	\N	2025-05-16 18:38:56.502332	2025-05-16 18:38:56.502332
411	110	Tossed Cobb Salad	tossed_cobb_salad	9	\N	\N	2025-05-16 18:38:56.581517	2025-05-16 18:38:56.581517
412	110	Classic Potato Salad	classic_potato_salad	10	\N	\N	2025-05-16 18:38:56.637083	2025-05-16 18:38:56.637083
413	110	German Potato Salad	german_potato_salad	11	\N	\N	2025-05-16 18:38:56.693124	2025-05-16 18:38:56.693124
414	110	Macaroni Salad	macaroni_salad	12	\N	\N	2025-05-16 18:38:56.760418	2025-05-16 18:38:56.760418
415	110	Hawaiian Macaroni Salad	hawaiian_macaroni_salad	13	\N	\N	2025-05-16 18:38:56.840581	2025-05-16 18:38:56.840581
416	110	Fruit Salad	fruit_salad	14	\N	\N	2025-05-16 18:38:56.922558	2025-05-16 18:38:56.922558
417	111	Kansas City BBQ Sauce	kansas_city_bbq	1	\N	\N	2025-05-16 18:38:57.03635	2025-05-16 18:38:57.03635
418	111	South Carolina Gold BBQ Sauce	sc_gold_bbq	2	\N	\N	2025-05-16 18:38:57.087878	2025-05-16 18:38:57.087878
419	111	North Carolina Vinegar based BBQ Sauce	nc_vinegar_bbq	3	\N	\N	2025-05-16 18:38:57.134013	2025-05-16 18:38:57.134013
420	111	Alabama White BBQ Sauce	alabama_white_bbq	4	\N	\N	2025-05-16 18:38:57.182293	2025-05-16 18:38:57.182293
421	111	Texas BBQ Sauce	texas_bbq	5	\N	\N	2025-05-16 18:38:57.231057	2025-05-16 18:38:57.231057
422	111	Very Berry BBQ Sauce	very_berry_bbq	6	\N	\N	2025-05-16 18:38:57.27905	2025-05-16 18:38:57.27905
423	111	Smoky bourbon BBQ Sauce	smoky_bourbon_bbq	7	\N	\N	2025-05-16 18:38:57.325078	2025-05-16 18:38:57.325078
424	112	Ketchup	ketchup	1	\N	\N	2025-05-16 18:38:57.421758	2025-05-16 18:38:57.421758
425	112	Stone Ground Mustard	stone_ground_mustard	2	\N	\N	2025-05-16 18:38:57.471703	2025-05-16 18:38:57.471703
426	112	Dijon Mustard	dijon_mustard	3	\N	\N	2025-05-16 18:38:57.518634	2025-05-16 18:38:57.518634
427	112	Yellow Mustard	yellow_mustard	4	\N	\N	2025-05-16 18:38:57.56377	2025-05-16 18:38:57.56377
428	112	Mayonnaise	mayonnaise	5	\N	\N	2025-05-16 18:38:57.623098	2025-05-16 18:38:57.623098
429	112	Sweet pickle Chips	sweet_pickle_chips	6	\N	\N	2025-05-16 18:38:57.671311	2025-05-16 18:38:57.671311
430	112	Dill pickle Chips	dill_pickle_chips	7	\N	\N	2025-05-16 18:38:57.725356	2025-05-16 18:38:57.725356
431	112	Sliced radish	sliced_radish_bbq	8	\N	\N	2025-05-16 18:38:57.770347	2025-05-16 18:38:57.770347
432	112	Sweet Relish	sweet_relish	9	\N	\N	2025-05-16 18:38:57.821286	2025-05-16 18:38:57.821286
433	112	Cranberry Relish	cranberry_relish	10	\N	\N	2025-05-16 18:38:57.867797	2025-05-16 18:38:57.867797
434	112	Kimchi	kimchi	11	\N	\N	2025-05-16 18:38:57.920636	2025-05-16 18:38:57.920636
435	112	Mixed Pickled Vegetables - Giardiniera	giardiniera	12	\N	\N	2025-05-16 18:38:57.981206	2025-05-16 18:38:57.981206
436	113	Prime Rib - Boneless -Carving station (upcharge of $4.00 pp)	prime_rib_upcharge	1	\N	\N	2025-05-16 18:40:02.968707	2025-05-16 18:40:02.968707
437	113	Smoked Brisket (upcharge $3.00 pp)	smoked_brisket_upcharge	2	\N	\N	2025-05-16 18:40:03.020638	2025-05-16 18:40:03.020638
438	113	Beef Ribs (upcharge $4.00 pp)	beef_ribs_upcharge	3	\N	\N	2025-05-16 18:40:03.073378	2025-05-16 18:40:03.073378
439	113	Guinness Braised Boneless Short Ribs (upcharge $2.00 pp)	short_ribs_upcharge	4	\N	\N	2025-05-16 18:40:03.120889	2025-05-16 18:40:03.120889
440	113	Bacon Wrapped Fillet Mingon - (upcharge of $4.00 pp)	filet_mignon_upcharge	5	\N	\N	2025-05-16 18:40:03.169503	2025-05-16 18:40:03.169503
441	113	Flank Steak with Chimichurri	flank_steak_chimichurri	6	\N	\N	2025-05-16 18:40:03.216446	2025-05-16 18:40:03.216446
442	113	Sausage Medley	sausage_medley	7	\N	\N	2025-05-16 18:40:03.263142	2025-05-16 18:40:03.263142
443	113	Hamburger Bar (upcharge of $2.50 pp)	hamburger_bar_upcharge	8	\N	\N	2025-05-16 18:40:03.309707	2025-05-16 18:40:03.309707
444	113	Lamb Chops (upcharge of $4.00 pp)	lamb_chops_upcharge	9	\N	\N	2025-05-16 18:40:03.356285	2025-05-16 18:40:03.356285
445	113	Smoked Leg of Lamb (Family Style only)	smoked_leg_lamb	10	\N	\N	2025-05-16 18:40:03.40609	2025-05-16 18:40:03.40609
446	113	Pulled Pork	pulled_pork	11	\N	\N	2025-05-16 18:40:03.454718	2025-05-16 18:40:03.454718
447	113	Smoked pork Belly	smoked_pork_belly	12	\N	\N	2025-05-16 18:40:03.503452	2025-05-16 18:40:03.503452
448	113	Baby Back Ribs	baby_back_ribs	13	\N	\N	2025-05-16 18:40:03.552112	2025-05-16 18:40:03.552112
449	113	Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze	pork_chop_korean_bbq	14	\N	\N	2025-05-16 18:40:03.59814	2025-05-16 18:40:03.59814
450	113	BBQ Guiness Chicken	bbq_guiness_chicken	15	\N	\N	2025-05-16 18:40:03.649433	2025-05-16 18:40:03.649433
451	113	Carolina BBQ Chicken	carolina_bbq_chicken	16	\N	\N	2025-05-16 18:40:03.697765	2025-05-16 18:40:03.697765
452	113	Rotisserie Chicken	rotisserie_chicken	17	\N	\N	2025-05-16 18:40:03.747286	2025-05-16 18:40:03.747286
453	113	BBQ Prawns (upcharge of $2.00 pp)	bbq_prawns_upcharge	18	\N	\N	2025-05-16 18:40:03.797466	2025-05-16 18:40:03.797466
454	113	Salmon steak	salmon_steak	19	\N	\N	2025-05-16 18:40:03.847233	2025-05-16 18:40:03.847233
455	113	Tofu	tofu_bbq	20	\N	\N	2025-05-16 18:40:03.89975	2025-05-16 18:40:03.89975
456	113	Vegetable kebabs	vegetable_kebabs_bbq	21	\N	\N	2025-05-16 18:40:03.9523	2025-05-16 18:40:03.9523
457	113	Grilled Cauliflower Steaks	grilled_cauliflower_steaks	22	\N	\N	2025-05-16 18:40:04.006757	2025-05-16 18:40:04.006757
458	114	Ham hock baked Beans	ham_hock_baked_beans	1	\N	\N	2025-05-16 18:40:04.111706	2025-05-16 18:40:04.111706
459	114	Avocado deviled Eggs	avocado_deviled_eggs	2	\N	\N	2025-05-16 18:40:04.15828	2025-05-16 18:40:04.15828
460	114	Mac n' Cheese	mac_n_cheese	3	\N	\N	2025-05-16 18:40:04.206575	2025-05-16 18:40:04.206575
461	114	Stuffed Poblano peppers	stuffed_poblano_peppers_bbq	4	\N	\N	2025-05-16 18:40:04.256044	2025-05-16 18:40:04.256044
462	114	Baked Potato Bar (upcharge $1.50 pp)	baked_potato_bar_upcharge	5	\N	\N	2025-05-16 18:40:04.311019	2025-05-16 18:40:04.311019
463	114	Garlic Mashed Potatoes	garlic_mashed_potatoes	6	\N	\N	2025-05-16 18:40:04.357279	2025-05-16 18:40:04.357279
464	114	Mini Smashed Potatoes	mini_smashed_potatoes	7	\N	\N	2025-05-16 18:40:04.406409	2025-05-16 18:40:04.406409
465	114	Twice Baked Potatoes (upcharge $0.75 pp)	twice_baked_potatoes_upcharge	8	\N	\N	2025-05-16 18:40:04.455934	2025-05-16 18:40:04.455934
466	114	Corn on the Cob	corn_on_the_cob	9	\N	\N	2025-05-16 18:40:04.509709	2025-05-16 18:40:04.509709
467	114	Creamed Corn	creamed_corn	10	\N	\N	2025-05-16 18:40:04.556345	2025-05-16 18:40:04.556345
468	114	Jalapeño Poppers	jalapeno_poppers	11	\N	\N	2025-05-16 18:40:04.613781	2025-05-16 18:40:04.613781
840	163	Fresh Mango Salsa	mango_salsa	2	\N	\N	2025-05-16 18:56:31.247926	2025-05-16 18:56:31.247926
469	114	Roasted Brussels Sprouts	roasted_brussels_sprouts	12	\N	\N	2025-05-16 18:40:04.660981	2025-05-16 18:40:04.660981
470	114	Corn Bread	corn_bread	13	\N	\N	2025-05-16 18:40:04.715628	2025-05-16 18:40:04.715628
471	114	Jalapeno cornbread	jalapeno_cornbread_bbq	14	\N	\N	2025-05-16 18:40:04.761964	2025-05-16 18:40:04.761964
472	114	Grilled Vegetables	grilled_vegetables_bbq	15	\N	\N	2025-05-16 18:40:04.815346	2025-05-16 18:40:04.815346
473	114	Grilled Asparagus	grilled_asparagus	16	\N	\N	2025-05-16 18:40:04.874074	2025-05-16 18:40:04.874074
474	115	Caesar	caesar_salad	1	\N	\N	2025-05-16 18:40:04.973112	2025-05-16 18:40:04.973112
475	115	Coleslaw	coleslaw	2	\N	\N	2025-05-16 18:40:05.028388	2025-05-16 18:40:05.028388
476	115	Garden Salad	garden_salad	3	\N	\N	2025-05-16 18:40:05.084964	2025-05-16 18:40:05.084964
477	115	Pasta Salad	pasta_salad	4	\N	\N	2025-05-16 18:40:05.13705	2025-05-16 18:40:05.13705
478	115	Bacon Jalapeño Corn Salad	bacon_jalapeno_corn_salad	5	\N	\N	2025-05-16 18:40:05.186766	2025-05-16 18:40:05.186766
479	115	Wedge Salad	wedge_salad	6	\N	\N	2025-05-16 18:40:05.236579	2025-05-16 18:40:05.236579
480	115	German cucumber salad	german_cucumber_salad	7	\N	\N	2025-05-16 18:40:05.290536	2025-05-16 18:40:05.290536
481	115	Crunchy Asian Slaw	crunchy_asian_slaw	8	\N	\N	2025-05-16 18:40:05.337012	2025-05-16 18:40:05.337012
482	115	Tossed Cobb Salad	tossed_cobb_salad	9	\N	\N	2025-05-16 18:40:05.396077	2025-05-16 18:40:05.396077
483	115	Classic Potato Salad	classic_potato_salad	10	\N	\N	2025-05-16 18:40:05.444692	2025-05-16 18:40:05.444692
484	115	German Potato Salad	german_potato_salad	11	\N	\N	2025-05-16 18:40:05.493099	2025-05-16 18:40:05.493099
485	115	Macaroni Salad	macaroni_salad	12	\N	\N	2025-05-16 18:40:05.545686	2025-05-16 18:40:05.545686
486	115	Hawaiian Macaroni Salad	hawaiian_macaroni_salad	13	\N	\N	2025-05-16 18:40:05.591999	2025-05-16 18:40:05.591999
487	115	Fruit Salad	fruit_salad	14	\N	\N	2025-05-16 18:40:05.640002	2025-05-16 18:40:05.640002
488	116	Kansas City BBQ Sauce	kansas_city_bbq	1	\N	\N	2025-05-16 18:40:05.734905	2025-05-16 18:40:05.734905
489	116	South Carolina Gold BBQ Sauce	sc_gold_bbq	2	\N	\N	2025-05-16 18:40:05.784003	2025-05-16 18:40:05.784003
490	116	North Carolina Vinegar based BBQ Sauce	nc_vinegar_bbq	3	\N	\N	2025-05-16 18:40:05.870322	2025-05-16 18:40:05.870322
491	116	Alabama White BBQ Sauce	alabama_white_bbq	4	\N	\N	2025-05-16 18:40:05.920102	2025-05-16 18:40:05.920102
492	116	Texas BBQ Sauce	texas_bbq	5	\N	\N	2025-05-16 18:40:05.969321	2025-05-16 18:40:05.969321
493	116	Very Berry BBQ Sauce	very_berry_bbq	6	\N	\N	2025-05-16 18:40:06.024953	2025-05-16 18:40:06.024953
494	116	Smoky bourbon BBQ Sauce	smoky_bourbon_bbq	7	\N	\N	2025-05-16 18:40:06.073276	2025-05-16 18:40:06.073276
495	117	Ketchup	ketchup	1	\N	\N	2025-05-16 18:40:06.168553	2025-05-16 18:40:06.168553
496	117	Stone Ground Mustard	stone_ground_mustard	2	\N	\N	2025-05-16 18:40:06.21683	2025-05-16 18:40:06.21683
497	117	Dijon Mustard	dijon_mustard	3	\N	\N	2025-05-16 18:40:06.263638	2025-05-16 18:40:06.263638
498	117	Yellow Mustard	yellow_mustard	4	\N	\N	2025-05-16 18:40:06.315436	2025-05-16 18:40:06.315436
499	117	Mayonnaise	mayonnaise	5	\N	\N	2025-05-16 18:40:06.365056	2025-05-16 18:40:06.365056
500	117	Sweet pickle Chips	sweet_pickle_chips	6	\N	\N	2025-05-16 18:40:06.414173	2025-05-16 18:40:06.414173
501	117	Dill pickle Chips	dill_pickle_chips	7	\N	\N	2025-05-16 18:40:06.46224	2025-05-16 18:40:06.46224
502	117	Sliced radish	sliced_radish_bbq	8	\N	\N	2025-05-16 18:40:06.51106	2025-05-16 18:40:06.51106
503	117	Sweet Relish	sweet_relish	9	\N	\N	2025-05-16 18:40:06.560737	2025-05-16 18:40:06.560737
504	117	Cranberry Relish	cranberry_relish	10	\N	\N	2025-05-16 18:40:06.606898	2025-05-16 18:40:06.606898
505	117	Kimchi	kimchi	11	\N	\N	2025-05-16 18:40:06.653047	2025-05-16 18:40:06.653047
506	117	Mixed Pickled Vegetables - Giardiniera	giardiniera	12	\N	\N	2025-05-16 18:40:06.701142	2025-05-16 18:40:06.701142
507	118	Bronze - $30 per person 3 mains, 3 sides, 2 salads	greece_bronze	1	\N	\N	2025-05-16 18:41:15.224285	2025-05-16 18:41:15.224285
508	118	Silver - $36 per person 4 mains, 3 sides, 3 salads	greece_silver	2	\N	\N	2025-05-16 18:41:15.281334	2025-05-16 18:41:15.281334
509	118	Gold - $42 per person 4 mains, 4 sides, 3 salads	greece_gold	3	\N	\N	2025-05-16 18:41:15.341369	2025-05-16 18:41:15.341369
510	118	Diamond - $48 per person 5 mains, 5 sides, 4 salads	greece_diamond	4	\N	\N	2025-05-16 18:41:15.390014	2025-05-16 18:41:15.390014
511	119	Chicken Souvlaki	chicken_souvlaki	1	\N	\N	2025-05-16 18:42:13.47237	2025-05-16 18:42:13.47237
512	119	Pork Souvlaki	pork_souvlaki	2	\N	\N	2025-05-16 18:42:13.521393	2025-05-16 18:42:13.521393
513	119	Beef Souvlaki (upcharge of $2.00 pp)	beef_souvlaki_upcharge	3	\N	\N	2025-05-16 18:42:13.57387	2025-05-16 18:42:13.57387
514	119	Lamb Souvlaki (upcharge of $2.00 pp)	lamb_souvlaki_upcharge	4	\N	\N	2025-05-16 18:42:13.622626	2025-05-16 18:42:13.622626
515	119	Keftedes (Greek Meatballs)	keftedes	5	\N	\N	2025-05-16 18:42:13.671126	2025-05-16 18:42:13.671126
516	119	Moussaka	moussaka	6	\N	\N	2025-05-16 18:42:13.718049	2025-05-16 18:42:13.718049
517	119	Pastitsio	pastitsio	7	\N	\N	2025-05-16 18:42:13.772482	2025-05-16 18:42:13.772482
518	119	Spanakopita (Spinach Pie)	spanakopita	8	\N	\N	2025-05-16 18:42:13.831594	2025-05-16 18:42:13.831594
519	119	Tyropita (Cheese Pie)	tyropita	9	\N	\N	2025-05-16 18:42:13.883082	2025-05-16 18:42:13.883082
520	119	Vegetable Moussaka	vegetable_moussaka	10	\N	\N	2025-05-16 18:42:13.929761	2025-05-16 18:42:13.929761
521	119	Gemista (Stuffed Tomatoes and Peppers)	gemista	11	\N	\N	2025-05-16 18:42:13.979009	2025-05-16 18:42:13.979009
522	119	Grilled Halloumi	grilled_halloumi	12	\N	\N	2025-05-16 18:42:14.034867	2025-05-16 18:42:14.034867
523	120	Greek Lemon Potatoes	greek_lemon_potatoes	1	\N	\N	2025-05-16 18:42:14.137825	2025-05-16 18:42:14.137825
524	120	Rice Pilaf	rice_pilaf	2	\N	\N	2025-05-16 18:42:14.187071	2025-05-16 18:42:14.187071
525	120	Orzo with Tomato and Basil	orzo_tomato_basil	3	\N	\N	2025-05-16 18:42:14.237601	2025-05-16 18:42:14.237601
526	120	Horta (Boiled Greens)	horta	4	\N	\N	2025-05-16 18:42:14.285961	2025-05-16 18:42:14.285961
527	120	Gigantes Plaki (Baked Giant Beans)	gigantes_plaki	5	\N	\N	2025-05-16 18:42:14.335256	2025-05-16 18:42:14.335256
528	120	Briam (Roasted Vegetables)	briam	6	\N	\N	2025-05-16 18:42:14.390603	2025-05-16 18:42:14.390603
529	120	Patates Tiganites (Greek Fries)	patates_tiganites	7	\N	\N	2025-05-16 18:42:14.450471	2025-05-16 18:42:14.450471
530	120	Pita Bread	pita_bread	8	\N	\N	2025-05-16 18:42:14.501443	2025-05-16 18:42:14.501443
531	121	Horiatiki (Classic Greek Village Salad)	horiatiki_salad	1	\N	\N	2025-05-16 18:42:14.61361	2025-05-16 18:42:14.61361
532	121	Maroulosalata (Romaine Lettuce Salad)	maroulosalata	2	\N	\N	2025-05-16 18:42:14.66573	2025-05-16 18:42:14.66573
533	121	Prasini Salata (Mixed Green Salad)	prasini_salata	3	\N	\N	2025-05-16 18:42:14.713563	2025-05-16 18:42:14.713563
534	121	Cabbage Salad (Lahanosalata)	lahanosalata	4	\N	\N	2025-05-16 18:42:14.763181	2025-05-16 18:42:14.763181
535	121	Beetroot Salad (Pantzarosalata)	pantzarosalata	5	\N	\N	2025-05-16 18:42:14.813988	2025-05-16 18:42:14.813988
536	121	Dakos (Cretan Rusk Salad)	dakos_salad	6	\N	\N	2025-05-16 18:42:14.864352	2025-05-16 18:42:14.864352
537	122	Chicken Souvlaki	chicken_souvlaki	1	\N	\N	2025-05-16 18:43:56.262635	2025-05-16 18:43:56.262635
538	122	Pork Souvlaki	pork_souvlaki	2	\N	\N	2025-05-16 18:43:56.32483	2025-05-16 18:43:56.32483
539	122	Beef Souvlaki (upcharge of $2.00 pp)	beef_souvlaki_upcharge	3	\N	\N	2025-05-16 18:43:56.3708	2025-05-16 18:43:56.3708
540	122	Lamb Souvlaki (upcharge of $2.00 pp)	lamb_souvlaki_upcharge	4	\N	\N	2025-05-16 18:43:56.418028	2025-05-16 18:43:56.418028
541	122	Keftedes (Greek Meatballs)	keftedes	5	\N	\N	2025-05-16 18:43:56.465274	2025-05-16 18:43:56.465274
542	122	Moussaka	moussaka	6	\N	\N	2025-05-16 18:43:56.511661	2025-05-16 18:43:56.511661
543	122	Pastitsio	pastitsio	7	\N	\N	2025-05-16 18:43:56.56457	2025-05-16 18:43:56.56457
544	122	Spanakopita (Spinach Pie)	spanakopita	8	\N	\N	2025-05-16 18:43:56.611396	2025-05-16 18:43:56.611396
545	122	Tyropita (Cheese Pie)	tyropita	9	\N	\N	2025-05-16 18:43:56.656782	2025-05-16 18:43:56.656782
546	122	Vegetable Moussaka	vegetable_moussaka	10	\N	\N	2025-05-16 18:43:56.703658	2025-05-16 18:43:56.703658
547	122	Gemista (Stuffed Tomatoes and Peppers)	gemista	11	\N	\N	2025-05-16 18:43:56.748319	2025-05-16 18:43:56.748319
548	122	Grilled Halloumi	grilled_halloumi	12	\N	\N	2025-05-16 18:43:56.796755	2025-05-16 18:43:56.796755
549	123	Greek Lemon Potatoes	greek_lemon_potatoes	1	\N	\N	2025-05-16 18:43:56.886524	2025-05-16 18:43:56.886524
550	123	Rice Pilaf	rice_pilaf	2	\N	\N	2025-05-16 18:43:56.931305	2025-05-16 18:43:56.931305
551	123	Orzo with Tomato and Basil	orzo_tomato_basil	3	\N	\N	2025-05-16 18:43:56.974774	2025-05-16 18:43:56.974774
552	123	Horta (Boiled Greens)	horta	4	\N	\N	2025-05-16 18:43:57.021015	2025-05-16 18:43:57.021015
553	123	Gigantes Plaki (Baked Giant Beans)	gigantes_plaki	5	\N	\N	2025-05-16 18:43:57.065674	2025-05-16 18:43:57.065674
554	123	Briam (Roasted Vegetables)	briam	6	\N	\N	2025-05-16 18:43:57.110387	2025-05-16 18:43:57.110387
555	123	Patates Tiganites (Greek Fries)	patates_tiganites	7	\N	\N	2025-05-16 18:43:57.155184	2025-05-16 18:43:57.155184
556	123	Pita Bread	pita_bread	8	\N	\N	2025-05-16 18:43:57.202779	2025-05-16 18:43:57.202779
557	124	Horiatiki (Classic Greek Village Salad)	horiatiki_salad	1	\N	\N	2025-05-16 18:43:57.291688	2025-05-16 18:43:57.291688
558	124	Maroulosalata (Romaine Lettuce Salad)	maroulosalata	2	\N	\N	2025-05-16 18:43:57.336135	2025-05-16 18:43:57.336135
559	124	Prasini Salata (Mixed Green Salad)	prasini_salata	3	\N	\N	2025-05-16 18:43:57.381944	2025-05-16 18:43:57.381944
560	124	Cabbage Salad (Lahanosalata)	lahanosalata	4	\N	\N	2025-05-16 18:43:57.426601	2025-05-16 18:43:57.426601
561	124	Beetroot Salad (Pantzarosalata)	pantzarosalata	5	\N	\N	2025-05-16 18:43:57.472277	2025-05-16 18:43:57.472277
562	124	Dakos (Cretan Rusk Salad)	dakos_salad	6	\N	\N	2025-05-16 18:43:57.524183	2025-05-16 18:43:57.524183
563	125	Chicken Souvlaki	chicken_souvlaki	1	\N	\N	2025-05-16 18:45:19.166455	2025-05-16 18:45:19.166455
564	125	Pork Souvlaki	pork_souvlaki	2	\N	\N	2025-05-16 18:45:19.222273	2025-05-16 18:45:19.222273
565	125	Beef Souvlaki (upcharge of $2.00 pp)	beef_souvlaki_upcharge	3	\N	\N	2025-05-16 18:45:19.268337	2025-05-16 18:45:19.268337
566	125	Lamb Souvlaki (upcharge of $2.00 pp)	lamb_souvlaki_upcharge	4	\N	\N	2025-05-16 18:45:19.315987	2025-05-16 18:45:19.315987
567	125	Keftedes (Greek Meatballs)	keftedes	5	\N	\N	2025-05-16 18:45:19.363028	2025-05-16 18:45:19.363028
568	125	Moussaka	moussaka	6	\N	\N	2025-05-16 18:45:19.419361	2025-05-16 18:45:19.419361
569	125	Pastitsio	pastitsio	7	\N	\N	2025-05-16 18:45:19.468253	2025-05-16 18:45:19.468253
570	125	Spanakopita (Spinach Pie)	spanakopita	8	\N	\N	2025-05-16 18:45:19.519373	2025-05-16 18:45:19.519373
571	125	Tyropita (Cheese Pie)	tyropita	9	\N	\N	2025-05-16 18:45:19.574957	2025-05-16 18:45:19.574957
572	125	Vegetable Moussaka	vegetable_moussaka	10	\N	\N	2025-05-16 18:45:19.620682	2025-05-16 18:45:19.620682
573	125	Gemista (Stuffed Tomatoes and Peppers)	gemista	11	\N	\N	2025-05-16 18:45:19.667134	2025-05-16 18:45:19.667134
574	125	Grilled Halloumi	grilled_halloumi	12	\N	\N	2025-05-16 18:45:19.713762	2025-05-16 18:45:19.713762
575	126	Greek Lemon Potatoes	greek_lemon_potatoes	1	\N	\N	2025-05-16 18:45:19.825303	2025-05-16 18:45:19.825303
576	126	Rice Pilaf	rice_pilaf	2	\N	\N	2025-05-16 18:45:19.880582	2025-05-16 18:45:19.880582
577	126	Orzo with Tomato and Basil	orzo_tomato_basil	3	\N	\N	2025-05-16 18:45:19.94529	2025-05-16 18:45:19.94529
578	126	Horta (Boiled Greens)	horta	4	\N	\N	2025-05-16 18:45:19.997123	2025-05-16 18:45:19.997123
579	126	Gigantes Plaki (Baked Giant Beans)	gigantes_plaki	5	\N	\N	2025-05-16 18:45:20.055528	2025-05-16 18:45:20.055528
580	126	Briam (Roasted Vegetables)	briam	6	\N	\N	2025-05-16 18:45:20.119814	2025-05-16 18:45:20.119814
581	126	Patates Tiganites (Greek Fries)	patates_tiganites	7	\N	\N	2025-05-16 18:45:20.174098	2025-05-16 18:45:20.174098
582	126	Pita Bread	pita_bread	8	\N	\N	2025-05-16 18:45:20.233308	2025-05-16 18:45:20.233308
583	127	Horiatiki (Classic Greek Village Salad)	horiatiki_salad	1	\N	\N	2025-05-16 18:45:20.33087	2025-05-16 18:45:20.33087
584	127	Maroulosalata (Romaine Lettuce Salad)	maroulosalata	2	\N	\N	2025-05-16 18:45:20.379643	2025-05-16 18:45:20.379643
585	127	Prasini Salata (Mixed Green Salad)	prasini_salata	3	\N	\N	2025-05-16 18:45:20.425537	2025-05-16 18:45:20.425537
586	127	Cabbage Salad (Lahanosalata)	lahanosalata	4	\N	\N	2025-05-16 18:45:20.472268	2025-05-16 18:45:20.472268
587	127	Beetroot Salad (Pantzarosalata)	pantzarosalata	5	\N	\N	2025-05-16 18:45:20.519884	2025-05-16 18:45:20.519884
588	127	Dakos (Cretan Rusk Salad)	dakos_salad	6	\N	\N	2025-05-16 18:45:20.566622	2025-05-16 18:45:20.566622
589	128	Chicken Souvlaki	chicken_souvlaki	1	\N	\N	2025-05-16 18:46:22.703205	2025-05-16 18:46:22.703205
590	128	Pork Souvlaki	pork_souvlaki	2	\N	\N	2025-05-16 18:46:22.753818	2025-05-16 18:46:22.753818
591	128	Beef Souvlaki (upcharge of $2.00 pp)	beef_souvlaki_upcharge	3	\N	\N	2025-05-16 18:46:22.799148	2025-05-16 18:46:22.799148
592	128	Lamb Souvlaki (upcharge of $2.00 pp)	lamb_souvlaki_upcharge	4	\N	\N	2025-05-16 18:46:22.850259	2025-05-16 18:46:22.850259
593	128	Keftedes (Greek Meatballs)	keftedes	5	\N	\N	2025-05-16 18:46:22.902974	2025-05-16 18:46:22.902974
594	128	Moussaka	moussaka	6	\N	\N	2025-05-16 18:46:22.9516	2025-05-16 18:46:22.9516
595	128	Pastitsio	pastitsio	7	\N	\N	2025-05-16 18:46:23.009887	2025-05-16 18:46:23.009887
596	128	Spanakopita (Spinach Pie)	spanakopita	8	\N	\N	2025-05-16 18:46:23.057932	2025-05-16 18:46:23.057932
597	128	Tyropita (Cheese Pie)	tyropita	9	\N	\N	2025-05-16 18:46:23.10325	2025-05-16 18:46:23.10325
598	128	Vegetable Moussaka	vegetable_moussaka	10	\N	\N	2025-05-16 18:46:23.155899	2025-05-16 18:46:23.155899
599	128	Gemista (Stuffed Tomatoes and Peppers)	gemista	11	\N	\N	2025-05-16 18:46:23.201602	2025-05-16 18:46:23.201602
600	128	Grilled Halloumi	grilled_halloumi	12	\N	\N	2025-05-16 18:46:23.245692	2025-05-16 18:46:23.245692
601	129	Greek Lemon Potatoes	greek_lemon_potatoes	1	\N	\N	2025-05-16 18:46:23.34067	2025-05-16 18:46:23.34067
602	129	Rice Pilaf	rice_pilaf	2	\N	\N	2025-05-16 18:46:23.384949	2025-05-16 18:46:23.384949
603	129	Orzo with Tomato and Basil	orzo_tomato_basil	3	\N	\N	2025-05-16 18:46:23.430381	2025-05-16 18:46:23.430381
604	129	Horta (Boiled Greens)	horta	4	\N	\N	2025-05-16 18:46:23.475062	2025-05-16 18:46:23.475062
605	129	Gigantes Plaki (Baked Giant Beans)	gigantes_plaki	5	\N	\N	2025-05-16 18:46:23.526483	2025-05-16 18:46:23.526483
606	129	Briam (Roasted Vegetables)	briam	6	\N	\N	2025-05-16 18:46:23.571793	2025-05-16 18:46:23.571793
607	129	Patates Tiganites (Greek Fries)	patates_tiganites	7	\N	\N	2025-05-16 18:46:23.616567	2025-05-16 18:46:23.616567
608	129	Pita Bread	pita_bread	8	\N	\N	2025-05-16 18:46:23.663389	2025-05-16 18:46:23.663389
609	130	Horiatiki (Classic Greek Village Salad)	horiatiki_salad	1	\N	\N	2025-05-16 18:46:23.753237	2025-05-16 18:46:23.753237
610	130	Maroulosalata (Romaine Lettuce Salad)	maroulosalata	2	\N	\N	2025-05-16 18:46:23.799884	2025-05-16 18:46:23.799884
611	130	Prasini Salata (Mixed Green Salad)	prasini_salata	3	\N	\N	2025-05-16 18:46:23.84991	2025-05-16 18:46:23.84991
612	130	Cabbage Salad (Lahanosalata)	lahanosalata	4	\N	\N	2025-05-16 18:46:23.897393	2025-05-16 18:46:23.897393
613	130	Beetroot Salad (Pantzarosalata)	pantzarosalata	5	\N	\N	2025-05-16 18:46:23.941191	2025-05-16 18:46:23.941191
614	130	Dakos (Cretan Rusk Salad)	dakos_salad	6	\N	\N	2025-05-16 18:46:23.986026	2025-05-16 18:46:23.986026
615	131	Bronze - $30 per person 3 proteins, 3 sides, 2 salads	kebab_party_bronze	1	\N	\N	2025-05-16 18:47:38.180282	2025-05-16 18:47:38.180282
616	131	Silver - $36 per person 4 proteins, 3 sides, 3 salads	kebab_party_silver	2	\N	\N	2025-05-16 18:47:38.2275	2025-05-16 18:47:38.2275
617	131	Gold - $42 per person 4 proteins, 4 sides, 3 salads	kebab_party_gold	3	\N	\N	2025-05-16 18:47:38.270825	2025-05-16 18:47:38.270825
618	131	Diamond - $48 per person 5 proteins, 5 sides, 4 salads	kebab_party_diamond	4	\N	\N	2025-05-16 18:47:38.326493	2025-05-16 18:47:38.326493
619	132	Chicken Shish Kebab	chicken_shish_kebab	1	\N	\N	2025-05-16 18:48:59.540196	2025-05-16 18:48:59.540196
620	132	Beef Shish Kebab	beef_shish_kebab	2	\N	\N	2025-05-16 18:48:59.595357	2025-05-16 18:48:59.595357
621	132	Lamb Adana Kebab (Spicy Minced Lamb)	lamb_adana_kebab	3	\N	\N	2025-05-16 18:48:59.640853	2025-05-16 18:48:59.640853
622	132	Kofta Kebab (Ground Meat Patty)	kofta_kebab	4	\N	\N	2025-05-16 18:48:59.685132	2025-05-16 18:48:59.685132
623	132	Shrimp Kebab (upcharge $2.50 pp)	shrimp_kebab_upcharge	5	\N	\N	2025-05-16 18:48:59.731689	2025-05-16 18:48:59.731689
624	132	Vegetable Kebab (Mushrooms, Peppers, Onions, Zucchini)	vegetable_kebab	6	\N	\N	2025-05-16 18:48:59.777305	2025-05-16 18:48:59.777305
625	132	Tofu Kebab (Marinated Tofu)	tofu_kebab	7	\N	\N	2025-05-16 18:48:59.821618	2025-05-16 18:48:59.821618
626	133	Rice Pilaf with Vermicelli	rice_pilaf_vermicelli	1	\N	\N	2025-05-16 18:48:59.914864	2025-05-16 18:48:59.914864
627	133	Saffron Rice	saffron_rice	2	\N	\N	2025-05-16 18:48:59.962872	2025-05-16 18:48:59.962872
628	133	Bulgur Pilaf with Tomato	bulgur_pilaf_tomato	3	\N	\N	2025-05-16 18:49:00.00972	2025-05-16 18:49:00.00972
629	133	Grilled Mediterranean Vegetables	grilled_mediterranean_vegetables	4	\N	\N	2025-05-16 18:49:00.071056	2025-05-16 18:49:00.071056
630	133	Hummus with Pita Bread	hummus_pita	5	\N	\N	2025-05-16 18:49:00.117333	2025-05-16 18:49:00.117333
631	133	Baba Ghanoush with Pita Bread	baba_ghanoush_pita	6	\N	\N	2025-05-16 18:49:00.16512	2025-05-16 18:49:00.16512
632	133	Roasted Potatoes with Herbs	roasted_potatoes_herbs	7	\N	\N	2025-05-16 18:49:00.221983	2025-05-16 18:49:00.221983
633	133	Lentil Kofta (Mercimek Köftesi)	lentil_kofta	8	\N	\N	2025-05-16 18:49:00.269052	2025-05-16 18:49:00.269052
634	134	Shepherd Salad (Tomato, Cucumber, Onion, Parsley)	shepherd_salad	1	\N	\N	2025-05-16 18:49:00.367456	2025-05-16 18:49:00.367456
635	134	Piyaz Salad (White Bean Salad with Onion and Sumac)	piyaz_salad	2	\N	\N	2025-05-16 18:49:00.415275	2025-05-16 18:49:00.415275
636	134	Ezme Salad (Spicy Tomato and Pepper Dip/Salad)	ezme_salad	3	\N	\N	2025-05-16 18:49:00.462895	2025-05-16 18:49:00.462895
637	134	Fattoush Salad (Toasted Pita Bread Salad)	fattoush_salad	4	\N	\N	2025-05-16 18:49:00.508112	2025-05-16 18:49:00.508112
638	134	Tabbouleh Salad (Parsley, Bulgur, Mint)	tabbouleh_salad	5	\N	\N	2025-05-16 18:49:00.555357	2025-05-16 18:49:00.555357
639	134	Red Cabbage Slaw with Lemon and Olive Oil	red_cabbage_slaw	6	\N	\N	2025-05-16 18:49:00.598516	2025-05-16 18:49:00.598516
640	135	Chicken Shish Kebab	chicken_shish_kebab	1	\N	\N	2025-05-16 18:49:47.356096	2025-05-16 18:49:47.356096
641	135	Beef Shish Kebab	beef_shish_kebab	2	\N	\N	2025-05-16 18:49:47.416643	2025-05-16 18:49:47.416643
642	135	Lamb Adana Kebab (Spicy Minced Lamb)	lamb_adana_kebab	3	\N	\N	2025-05-16 18:49:47.46471	2025-05-16 18:49:47.46471
643	135	Kofta Kebab (Ground Meat Patty)	kofta_kebab	4	\N	\N	2025-05-16 18:49:47.515769	2025-05-16 18:49:47.515769
644	135	Shrimp Kebab (upcharge $2.50 pp)	shrimp_kebab_upcharge	5	\N	\N	2025-05-16 18:49:47.569141	2025-05-16 18:49:47.569141
645	135	Vegetable Kebab (Mushrooms, Peppers, Onions, Zucchini)	vegetable_kebab	6	\N	\N	2025-05-16 18:49:47.623224	2025-05-16 18:49:47.623224
646	135	Tofu Kebab (Marinated Tofu)	tofu_kebab	7	\N	\N	2025-05-16 18:49:47.670962	2025-05-16 18:49:47.670962
647	136	Rice Pilaf with Vermicelli	rice_pilaf_vermicelli	1	\N	\N	2025-05-16 18:49:47.77281	2025-05-16 18:49:47.77281
648	136	Saffron Rice	saffron_rice	2	\N	\N	2025-05-16 18:49:47.820905	2025-05-16 18:49:47.820905
649	136	Bulgur Pilaf with Tomato	bulgur_pilaf_tomato	3	\N	\N	2025-05-16 18:49:47.871663	2025-05-16 18:49:47.871663
650	136	Grilled Mediterranean Vegetables	grilled_mediterranean_vegetables	4	\N	\N	2025-05-16 18:49:47.923393	2025-05-16 18:49:47.923393
651	136	Hummus with Pita Bread	hummus_pita	5	\N	\N	2025-05-16 18:49:47.978447	2025-05-16 18:49:47.978447
652	136	Baba Ghanoush with Pita Bread	baba_ghanoush_pita	6	\N	\N	2025-05-16 18:49:48.026717	2025-05-16 18:49:48.026717
653	136	Roasted Potatoes with Herbs	roasted_potatoes_herbs	7	\N	\N	2025-05-16 18:49:48.079452	2025-05-16 18:49:48.079452
654	136	Lentil Kofta (Mercimek Köftesi)	lentil_kofta	8	\N	\N	2025-05-16 18:49:48.133798	2025-05-16 18:49:48.133798
655	137	Shepherd Salad (Tomato, Cucumber, Onion, Parsley)	shepherd_salad	1	\N	\N	2025-05-16 18:49:48.258417	2025-05-16 18:49:48.258417
656	137	Piyaz Salad (White Bean Salad with Onion and Sumac)	piyaz_salad	2	\N	\N	2025-05-16 18:49:48.317392	2025-05-16 18:49:48.317392
657	137	Ezme Salad (Spicy Tomato and Pepper Dip/Salad)	ezme_salad	3	\N	\N	2025-05-16 18:49:48.368821	2025-05-16 18:49:48.368821
658	137	Fattoush Salad (Toasted Pita Bread Salad)	fattoush_salad	4	\N	\N	2025-05-16 18:49:48.419231	2025-05-16 18:49:48.419231
659	137	Tabbouleh Salad (Parsley, Bulgur, Mint)	tabbouleh_salad	5	\N	\N	2025-05-16 18:49:48.47798	2025-05-16 18:49:48.47798
660	137	Red Cabbage Slaw with Lemon and Olive Oil	red_cabbage_slaw	6	\N	\N	2025-05-16 18:49:48.52745	2025-05-16 18:49:48.52745
661	138	Chicken Shish Kebab	chicken_shish_kebab	1	\N	\N	2025-05-16 18:50:13.284946	2025-05-16 18:50:13.284946
662	138	Beef Shish Kebab	beef_shish_kebab	2	\N	\N	2025-05-16 18:50:13.336244	2025-05-16 18:50:13.336244
663	138	Lamb Adana Kebab (Spicy Minced Lamb)	lamb_adana_kebab	3	\N	\N	2025-05-16 18:50:13.384837	2025-05-16 18:50:13.384837
664	138	Kofta Kebab (Ground Meat Patty)	kofta_kebab	4	\N	\N	2025-05-16 18:50:13.432726	2025-05-16 18:50:13.432726
665	138	Shrimp Kebab (upcharge $2.50 pp)	shrimp_kebab_upcharge	5	\N	\N	2025-05-16 18:50:13.485357	2025-05-16 18:50:13.485357
666	138	Vegetable Kebab (Mushrooms, Peppers, Onions, Zucchini)	vegetable_kebab	6	\N	\N	2025-05-16 18:50:13.536192	2025-05-16 18:50:13.536192
667	138	Tofu Kebab (Marinated Tofu)	tofu_kebab	7	\N	\N	2025-05-16 18:50:13.585441	2025-05-16 18:50:13.585441
668	139	Rice Pilaf with Vermicelli	rice_pilaf_vermicelli	1	\N	\N	2025-05-16 18:50:13.682284	2025-05-16 18:50:13.682284
669	139	Saffron Rice	saffron_rice	2	\N	\N	2025-05-16 18:50:13.731012	2025-05-16 18:50:13.731012
670	139	Bulgur Pilaf with Tomato	bulgur_pilaf_tomato	3	\N	\N	2025-05-16 18:50:13.785642	2025-05-16 18:50:13.785642
671	139	Grilled Mediterranean Vegetables	grilled_mediterranean_vegetables	4	\N	\N	2025-05-16 18:50:13.83527	2025-05-16 18:50:13.83527
672	139	Hummus with Pita Bread	hummus_pita	5	\N	\N	2025-05-16 18:50:13.883253	2025-05-16 18:50:13.883253
673	139	Baba Ghanoush with Pita Bread	baba_ghanoush_pita	6	\N	\N	2025-05-16 18:50:13.935662	2025-05-16 18:50:13.935662
674	139	Roasted Potatoes with Herbs	roasted_potatoes_herbs	7	\N	\N	2025-05-16 18:50:13.98831	2025-05-16 18:50:13.98831
675	139	Lentil Kofta (Mercimek Köftesi)	lentil_kofta	8	\N	\N	2025-05-16 18:50:14.043897	2025-05-16 18:50:14.043897
676	140	Shepherd Salad (Tomato, Cucumber, Onion, Parsley)	shepherd_salad	1	\N	\N	2025-05-16 18:50:14.152552	2025-05-16 18:50:14.152552
677	140	Piyaz Salad (White Bean Salad with Onion and Sumac)	piyaz_salad	2	\N	\N	2025-05-16 18:50:14.209528	2025-05-16 18:50:14.209528
678	140	Ezme Salad (Spicy Tomato and Pepper Dip/Salad)	ezme_salad	3	\N	\N	2025-05-16 18:50:14.258663	2025-05-16 18:50:14.258663
679	140	Fattoush Salad (Toasted Pita Bread Salad)	fattoush_salad	4	\N	\N	2025-05-16 18:50:14.307669	2025-05-16 18:50:14.307669
680	140	Tabbouleh Salad (Parsley, Bulgur, Mint)	tabbouleh_salad	5	\N	\N	2025-05-16 18:50:14.365703	2025-05-16 18:50:14.365703
681	140	Red Cabbage Slaw with Lemon and Olive Oil	red_cabbage_slaw	6	\N	\N	2025-05-16 18:50:14.429142	2025-05-16 18:50:14.429142
682	141	Chicken Shish Kebab	chicken_shish_kebab	1	\N	\N	2025-05-16 18:50:41.379606	2025-05-16 18:50:41.379606
683	141	Beef Shish Kebab	beef_shish_kebab	2	\N	\N	2025-05-16 18:50:41.43298	2025-05-16 18:50:41.43298
684	141	Lamb Adana Kebab (Spicy Minced Lamb)	lamb_adana_kebab	3	\N	\N	2025-05-16 18:50:41.48085	2025-05-16 18:50:41.48085
685	141	Kofta Kebab (Ground Meat Patty)	kofta_kebab	4	\N	\N	2025-05-16 18:50:41.530049	2025-05-16 18:50:41.530049
686	141	Shrimp Kebab (upcharge $2.50 pp)	shrimp_kebab_upcharge	5	\N	\N	2025-05-16 18:50:41.581163	2025-05-16 18:50:41.581163
687	141	Vegetable Kebab (Mushrooms, Peppers, Onions, Zucchini)	vegetable_kebab	6	\N	\N	2025-05-16 18:50:41.635872	2025-05-16 18:50:41.635872
688	141	Tofu Kebab (Marinated Tofu)	tofu_kebab	7	\N	\N	2025-05-16 18:50:41.685313	2025-05-16 18:50:41.685313
689	142	Rice Pilaf with Vermicelli	rice_pilaf_vermicelli	1	\N	\N	2025-05-16 18:50:41.787733	2025-05-16 18:50:41.787733
690	142	Saffron Rice	saffron_rice	2	\N	\N	2025-05-16 18:50:41.841828	2025-05-16 18:50:41.841828
691	142	Bulgur Pilaf with Tomato	bulgur_pilaf_tomato	3	\N	\N	2025-05-16 18:50:41.895459	2025-05-16 18:50:41.895459
692	142	Grilled Mediterranean Vegetables	grilled_mediterranean_vegetables	4	\N	\N	2025-05-16 18:50:41.945327	2025-05-16 18:50:41.945327
693	142	Hummus with Pita Bread	hummus_pita	5	\N	\N	2025-05-16 18:50:41.999241	2025-05-16 18:50:41.999241
694	142	Baba Ghanoush with Pita Bread	baba_ghanoush_pita	6	\N	\N	2025-05-16 18:50:42.054321	2025-05-16 18:50:42.054321
695	142	Roasted Potatoes with Herbs	roasted_potatoes_herbs	7	\N	\N	2025-05-16 18:50:42.103765	2025-05-16 18:50:42.103765
696	142	Lentil Kofta (Mercimek Köftesi)	lentil_kofta	8	\N	\N	2025-05-16 18:50:42.159843	2025-05-16 18:50:42.159843
697	143	Shepherd Salad (Tomato, Cucumber, Onion, Parsley)	shepherd_salad	1	\N	\N	2025-05-16 18:50:42.262069	2025-05-16 18:50:42.262069
698	143	Piyaz Salad (White Bean Salad with Onion and Sumac)	piyaz_salad	2	\N	\N	2025-05-16 18:50:42.321523	2025-05-16 18:50:42.321523
699	143	Ezme Salad (Spicy Tomato and Pepper Dip/Salad)	ezme_salad	3	\N	\N	2025-05-16 18:50:42.3711	2025-05-16 18:50:42.3711
700	143	Fattoush Salad (Toasted Pita Bread Salad)	fattoush_salad	4	\N	\N	2025-05-16 18:50:42.423586	2025-05-16 18:50:42.423586
701	143	Tabbouleh Salad (Parsley, Bulgur, Mint)	tabbouleh_salad	5	\N	\N	2025-05-16 18:50:42.471788	2025-05-16 18:50:42.471788
702	143	Red Cabbage Slaw with Lemon and Olive Oil	red_cabbage_slaw	6	\N	\N	2025-05-16 18:50:42.526855	2025-05-16 18:50:42.526855
703	144	Bronze - $30 per person 2 mains, 3 sides, 1 pasta, 1 salad	italy_bronze	1	\N	\N	2025-05-16 18:51:52.686601	2025-05-16 18:51:52.686601
704	144	Silver - $36 per person 3 mains, 3 sides, 1 pasta, 2 salads	italy_silver	2	\N	\N	2025-05-16 18:51:52.731814	2025-05-16 18:51:52.731814
705	144	Gold - $42 per person 3 mains, 4 sides, 2 pastas, 2 salads	italy_gold	3	\N	\N	2025-05-16 18:51:52.780661	2025-05-16 18:51:52.780661
706	144	Diamond - $48 per person 4 mains, 5 sides, 2 pastas, 3 salads	italy_diamond	4	\N	\N	2025-05-16 18:51:52.827066	2025-05-16 18:51:52.827066
707	145	Chicken Parmesan	chicken_parmesan	1	\N	\N	2025-05-16 18:52:37.0044	2025-05-16 18:52:37.0044
708	145	Lasagna Bolognese	lasagna_bolognese	2	\N	\N	2025-05-16 18:52:37.052167	2025-05-16 18:52:37.052167
709	145	Eggplant Rollatini	eggplant_rollatini	3	\N	\N	2025-05-16 18:52:37.100104	2025-05-16 18:52:37.100104
710	145	Sausage and Peppers	sausage_peppers	4	\N	\N	2025-05-16 18:52:37.150637	2025-05-16 18:52:37.150637
711	145	Chicken Marsala	chicken_marsala	5	\N	\N	2025-05-16 18:52:37.201069	2025-05-16 18:52:37.201069
712	145	Veal Piccata (upcharge $3.00 pp)	veal_piccata_upcharge	6	\N	\N	2025-05-16 18:52:37.249552	2025-05-16 18:52:37.249552
713	146	Garlic Bread	garlic_bread	1	\N	\N	2025-05-16 18:52:37.349683	2025-05-16 18:52:37.349683
714	146	Roasted Rosemary Potatoes	roasted_rosemary_potatoes	2	\N	\N	2025-05-16 18:52:37.399141	2025-05-16 18:52:37.399141
715	146	Sautéed Spinach with Garlic	sauteed_spinach_garlic	3	\N	\N	2025-05-16 18:52:37.450422	2025-05-16 18:52:37.450422
716	146	Polenta with Parmesan	polenta_parmesan	4	\N	\N	2025-05-16 18:52:37.502856	2025-05-16 18:52:37.502856
717	146	Grilled Asparagus	grilled_asparagus_italy	5	\N	\N	2025-05-16 18:52:37.556835	2025-05-16 18:52:37.556835
718	146	Caprese Skewers	caprese_skewers	6	\N	\N	2025-05-16 18:52:37.606274	2025-05-16 18:52:37.606274
719	147	Penne alla Vodka	penne_vodka	1	\N	\N	2025-05-16 18:52:37.712029	2025-05-16 18:52:37.712029
720	147	Spaghetti Aglio e Olio	spaghetti_aglio_olio	2	\N	\N	2025-05-16 18:52:37.769202	2025-05-16 18:52:37.769202
721	147	Fettuccine Alfredo	fettuccine_alfredo	3	\N	\N	2025-05-16 18:52:37.818518	2025-05-16 18:52:37.818518
722	147	Rigatoni with Marinara	rigatoni_marinara	4	\N	\N	2025-05-16 18:52:37.866903	2025-05-16 18:52:37.866903
723	148	Classic Caesar Salad	classic_caesar_salad	1	\N	\N	2025-05-16 18:52:37.967075	2025-05-16 18:52:37.967075
724	148	Italian Mixed Green Salad with Vinaigrette	italian_mixed_green_salad	2	\N	\N	2025-05-16 18:52:38.022068	2025-05-16 18:52:38.022068
725	148	Arugula Salad with Lemon and Parmesan	arugula_salad_lemon_parmesan	3	\N	\N	2025-05-16 18:52:38.07136	2025-05-16 18:52:38.07136
726	148	Antipasto Salad	antipasto_salad	4	\N	\N	2025-05-16 18:52:38.121721	2025-05-16 18:52:38.121721
727	149	Chicken Parmesan	chicken_parmesan	1	\N	\N	2025-05-16 18:53:25.525389	2025-05-16 18:53:25.525389
728	149	Lasagna Bolognese	lasagna_bolognese	2	\N	\N	2025-05-16 18:53:25.571387	2025-05-16 18:53:25.571387
729	149	Eggplant Rollatini	eggplant_rollatini	3	\N	\N	2025-05-16 18:53:25.617705	2025-05-16 18:53:25.617705
730	149	Sausage and Peppers	sausage_peppers	4	\N	\N	2025-05-16 18:53:25.663383	2025-05-16 18:53:25.663383
731	149	Chicken Marsala	chicken_marsala	5	\N	\N	2025-05-16 18:53:25.708727	2025-05-16 18:53:25.708727
732	149	Veal Piccata (upcharge $3.00 pp)	veal_piccata_upcharge	6	\N	\N	2025-05-16 18:53:25.757295	2025-05-16 18:53:25.757295
733	149	Osso Buco (upcharge $4.00 pp)	osso_buco_upcharge	7	\N	\N	2025-05-16 18:53:25.803662	2025-05-16 18:53:25.803662
734	149	Shrimp Scampi	shrimp_scampi	8	\N	\N	2025-05-16 18:53:25.84931	2025-05-16 18:53:25.84931
735	150	Garlic Bread	garlic_bread	1	\N	\N	2025-05-16 18:53:25.943936	2025-05-16 18:53:25.943936
736	150	Roasted Rosemary Potatoes	roasted_rosemary_potatoes	2	\N	\N	2025-05-16 18:53:25.995666	2025-05-16 18:53:25.995666
737	150	Sautéed Spinach with Garlic	sauteed_spinach_garlic	3	\N	\N	2025-05-16 18:53:26.040997	2025-05-16 18:53:26.040997
738	150	Polenta with Parmesan	polenta_parmesan	4	\N	\N	2025-05-16 18:53:26.086455	2025-05-16 18:53:26.086455
739	150	Grilled Asparagus	grilled_asparagus_italy	5	\N	\N	2025-05-16 18:53:26.134317	2025-05-16 18:53:26.134317
740	150	Caprese Skewers	caprese_skewers	6	\N	\N	2025-05-16 18:53:26.1812	2025-05-16 18:53:26.1812
741	150	Risotto Milanese	risotto_milanese	7	\N	\N	2025-05-16 18:53:26.228335	2025-05-16 18:53:26.228335
742	151	Penne alla Vodka	penne_vodka	1	\N	\N	2025-05-16 18:53:26.320264	2025-05-16 18:53:26.320264
743	151	Spaghetti Aglio e Olio	spaghetti_aglio_olio	2	\N	\N	2025-05-16 18:53:26.367721	2025-05-16 18:53:26.367721
744	151	Fettuccine Alfredo	fettuccine_alfredo	3	\N	\N	2025-05-16 18:53:26.420502	2025-05-16 18:53:26.420502
745	151	Rigatoni with Marinara	rigatoni_marinara	4	\N	\N	2025-05-16 18:53:26.467993	2025-05-16 18:53:26.467993
746	151	Linguine with Pesto	linguine_pesto	5	\N	\N	2025-05-16 18:53:26.513896	2025-05-16 18:53:26.513896
747	152	Classic Caesar Salad	classic_caesar_salad	1	\N	\N	2025-05-16 18:53:26.611676	2025-05-16 18:53:26.611676
748	152	Italian Mixed Green Salad with Vinaigrette	italian_mixed_green_salad	2	\N	\N	2025-05-16 18:53:26.658142	2025-05-16 18:53:26.658142
749	152	Arugula Salad with Lemon and Parmesan	arugula_salad_lemon_parmesan	3	\N	\N	2025-05-16 18:53:26.703862	2025-05-16 18:53:26.703862
750	152	Antipasto Salad	antipasto_salad	4	\N	\N	2025-05-16 18:53:26.749737	2025-05-16 18:53:26.749737
751	152	Panzanella Salad (Bread Salad)	panzanella_salad	5	\N	\N	2025-05-16 18:53:26.795764	2025-05-16 18:53:26.795764
752	153	Chicken Parmesan	chicken_parmesan	1	\N	\N	2025-05-16 18:53:57.311278	2025-05-16 18:53:57.311278
753	153	Lasagna Bolognese	lasagna_bolognese	2	\N	\N	2025-05-16 18:53:57.361059	2025-05-16 18:53:57.361059
754	153	Eggplant Rollatini	eggplant_rollatini	3	\N	\N	2025-05-16 18:53:57.409211	2025-05-16 18:53:57.409211
755	153	Sausage and Peppers	sausage_peppers	4	\N	\N	2025-05-16 18:53:57.459191	2025-05-16 18:53:57.459191
756	153	Chicken Marsala	chicken_marsala	5	\N	\N	2025-05-16 18:53:57.510326	2025-05-16 18:53:57.510326
757	153	Veal Piccata (upcharge $3.00 pp)	veal_piccata_upcharge	6	\N	\N	2025-05-16 18:53:57.565305	2025-05-16 18:53:57.565305
758	153	Osso Buco (upcharge $4.00 pp)	osso_buco_upcharge	7	\N	\N	2025-05-16 18:53:57.613078	2025-05-16 18:53:57.613078
759	153	Shrimp Scampi	shrimp_scampi	8	\N	\N	2025-05-16 18:53:57.660147	2025-05-16 18:53:57.660147
760	153	Filet Mignon with Balsamic Glaze (upcharge $5.00 pp)	filet_mignon_balsamic_upcharge	9	\N	\N	2025-05-16 18:53:57.710544	2025-05-16 18:53:57.710544
761	154	Garlic Bread	garlic_bread	1	\N	\N	2025-05-16 18:53:57.814491	2025-05-16 18:53:57.814491
762	154	Roasted Rosemary Potatoes	roasted_rosemary_potatoes	2	\N	\N	2025-05-16 18:53:57.861545	2025-05-16 18:53:57.861545
763	154	Sautéed Spinach with Garlic	sauteed_spinach_garlic	3	\N	\N	2025-05-16 18:53:57.907499	2025-05-16 18:53:57.907499
764	154	Polenta with Parmesan	polenta_parmesan	4	\N	\N	2025-05-16 18:53:57.959393	2025-05-16 18:53:57.959393
765	154	Grilled Asparagus	grilled_asparagus_italy	5	\N	\N	2025-05-16 18:53:58.008118	2025-05-16 18:53:58.008118
766	154	Caprese Skewers	caprese_skewers	6	\N	\N	2025-05-16 18:53:58.054429	2025-05-16 18:53:58.054429
767	154	Risotto Milanese	risotto_milanese	7	\N	\N	2025-05-16 18:53:58.100369	2025-05-16 18:53:58.100369
768	154	Broccoli Rabe with Garlic and Oil	broccoli_rabe_garlic_oil	8	\N	\N	2025-05-16 18:53:58.147754	2025-05-16 18:53:58.147754
769	155	Penne alla Vodka	penne_vodka	1	\N	\N	2025-05-16 18:53:58.239639	2025-05-16 18:53:58.239639
770	155	Spaghetti Aglio e Olio	spaghetti_aglio_olio	2	\N	\N	2025-05-16 18:53:58.284438	2025-05-16 18:53:58.284438
771	155	Fettuccine Alfredo	fettuccine_alfredo	3	\N	\N	2025-05-16 18:53:58.333471	2025-05-16 18:53:58.333471
772	155	Rigatoni with Marinara	rigatoni_marinara	4	\N	\N	2025-05-16 18:53:58.379194	2025-05-16 18:53:58.379194
773	155	Linguine with Pesto	linguine_pesto	5	\N	\N	2025-05-16 18:53:58.424548	2025-05-16 18:53:58.424548
774	155	Gnocchi with Sage Butter Sauce	gnocchi_sage_butter	6	\N	\N	2025-05-16 18:53:58.469334	2025-05-16 18:53:58.469334
775	156	Classic Caesar Salad	classic_caesar_salad	1	\N	\N	2025-05-16 18:53:58.563439	2025-05-16 18:53:58.563439
776	156	Italian Mixed Green Salad with Vinaigrette	italian_mixed_green_salad	2	\N	\N	2025-05-16 18:53:58.609247	2025-05-16 18:53:58.609247
777	156	Arugula Salad with Lemon and Parmesan	arugula_salad_lemon_parmesan	3	\N	\N	2025-05-16 18:53:58.68377	2025-05-16 18:53:58.68377
778	156	Antipasto Salad	antipasto_salad	4	\N	\N	2025-05-16 18:53:58.729337	2025-05-16 18:53:58.729337
779	156	Panzanella Salad (Bread Salad)	panzanella_salad	5	\N	\N	2025-05-16 18:53:58.780753	2025-05-16 18:53:58.780753
780	156	Shaved Fennel and Orange Salad	fennel_orange_salad	6	\N	\N	2025-05-16 18:53:58.827961	2025-05-16 18:53:58.827961
781	157	Chicken Parmesan	chicken_parmesan	1	\N	\N	2025-05-16 18:54:28.92759	2025-05-16 18:54:28.92759
782	157	Lasagna Bolognese	lasagna_bolognese	2	\N	\N	2025-05-16 18:54:28.976383	2025-05-16 18:54:28.976383
783	157	Eggplant Rollatini	eggplant_rollatini	3	\N	\N	2025-05-16 18:54:29.026683	2025-05-16 18:54:29.026683
784	157	Sausage and Peppers	sausage_peppers	4	\N	\N	2025-05-16 18:54:29.071205	2025-05-16 18:54:29.071205
785	157	Chicken Marsala	chicken_marsala	5	\N	\N	2025-05-16 18:54:29.117551	2025-05-16 18:54:29.117551
786	157	Veal Piccata (upcharge $3.00 pp)	veal_piccata_upcharge	6	\N	\N	2025-05-16 18:54:29.1685	2025-05-16 18:54:29.1685
787	157	Osso Buco (upcharge $4.00 pp)	osso_buco_upcharge	7	\N	\N	2025-05-16 18:54:29.212768	2025-05-16 18:54:29.212768
788	157	Shrimp Scampi	shrimp_scampi	8	\N	\N	2025-05-16 18:54:29.259577	2025-05-16 18:54:29.259577
789	157	Filet Mignon with Balsamic Glaze (upcharge $5.00 pp)	filet_mignon_balsamic_upcharge	9	\N	\N	2025-05-16 18:54:29.308979	2025-05-16 18:54:29.308979
790	157	Branzino al Forno (Baked Sea Bass)	branzino_al_forno	10	\N	\N	2025-05-16 18:54:29.353974	2025-05-16 18:54:29.353974
791	158	Garlic Bread	garlic_bread	1	\N	\N	2025-05-16 18:54:29.443492	2025-05-16 18:54:29.443492
792	158	Roasted Rosemary Potatoes	roasted_rosemary_potatoes	2	\N	\N	2025-05-16 18:54:29.487822	2025-05-16 18:54:29.487822
793	158	Sautéed Spinach with Garlic	sauteed_spinach_garlic	3	\N	\N	2025-05-16 18:54:29.537679	2025-05-16 18:54:29.537679
794	158	Polenta with Parmesan	polenta_parmesan	4	\N	\N	2025-05-16 18:54:29.585283	2025-05-16 18:54:29.585283
795	158	Grilled Asparagus	grilled_asparagus_italy	5	\N	\N	2025-05-16 18:54:29.632451	2025-05-16 18:54:29.632451
796	158	Caprese Skewers	caprese_skewers	6	\N	\N	2025-05-16 18:54:29.694666	2025-05-16 18:54:29.694666
797	158	Risotto Milanese	risotto_milanese	7	\N	\N	2025-05-16 18:54:29.738669	2025-05-16 18:54:29.738669
798	158	Broccoli Rabe with Garlic and Oil	broccoli_rabe_garlic_oil	8	\N	\N	2025-05-16 18:54:29.788736	2025-05-16 18:54:29.788736
799	158	Arancini (Fried Risotto Balls)	arancini	9	\N	\N	2025-05-16 18:54:29.834276	2025-05-16 18:54:29.834276
800	159	Penne alla Vodka	penne_vodka	1	\N	\N	2025-05-16 18:54:29.926257	2025-05-16 18:54:29.926257
801	159	Spaghetti Aglio e Olio	spaghetti_aglio_olio	2	\N	\N	2025-05-16 18:54:29.971761	2025-05-16 18:54:29.971761
802	159	Fettuccine Alfredo	fettuccine_alfredo	3	\N	\N	2025-05-16 18:54:30.029777	2025-05-16 18:54:30.029777
803	159	Rigatoni with Marinara	rigatoni_marinara	4	\N	\N	2025-05-16 18:54:30.08135	2025-05-16 18:54:30.08135
804	159	Linguine with Pesto	linguine_pesto	5	\N	\N	2025-05-16 18:54:30.130947	2025-05-16 18:54:30.130947
805	159	Gnocchi with Sage Butter Sauce	gnocchi_sage_butter	6	\N	\N	2025-05-16 18:54:30.18052	2025-05-16 18:54:30.18052
806	159	Ravioli with Ricotta and Spinach	ravioli_ricotta_spinach	7	\N	\N	2025-05-16 18:54:30.227158	2025-05-16 18:54:30.227158
807	160	Classic Caesar Salad	classic_caesar_salad	1	\N	\N	2025-05-16 18:54:30.328449	2025-05-16 18:54:30.328449
808	160	Italian Mixed Green Salad with Vinaigrette	italian_mixed_green_salad	2	\N	\N	2025-05-16 18:54:30.374617	2025-05-16 18:54:30.374617
809	160	Arugula Salad with Lemon and Parmesan	arugula_salad_lemon_parmesan	3	\N	\N	2025-05-16 18:54:30.418684	2025-05-16 18:54:30.418684
810	160	Antipasto Salad	antipasto_salad	4	\N	\N	2025-05-16 18:54:30.465961	2025-05-16 18:54:30.465961
811	160	Panzanella Salad (Bread Salad)	panzanella_salad	5	\N	\N	2025-05-16 18:54:30.517478	2025-05-16 18:54:30.517478
812	160	Shaved Fennel and Orange Salad	fennel_orange_salad	6	\N	\N	2025-05-16 18:54:30.56268	2025-05-16 18:54:30.56268
813	160	Caprese Salad (Tomato, Mozzarella, Basil)	caprese_salad	7	\N	\N	2025-05-16 18:54:30.60842	2025-05-16 18:54:30.60842
814	161	Barbacoa	barbacoa	1	\N	\N	2025-05-16 18:56:29.973031	2025-05-16 18:56:29.973031
815	161	Flank steak Fajitas upcharge of $2.00 pp	flank_steak_fajitas_upcharge	2	\N	\N	2025-05-16 18:56:30.018043	2025-05-16 18:56:30.018043
816	161	Ground Beef	ground_beef	3	\N	\N	2025-05-16 18:56:30.063162	2025-05-16 18:56:30.063162
817	161	Pork Carnitas	pork_carnitas	4	\N	\N	2025-05-16 18:56:30.108356	2025-05-16 18:56:30.108356
818	161	Pork Belly	pork_belly	5	\N	\N	2025-05-16 18:56:30.153599	2025-05-16 18:56:30.153599
819	161	Chorizo	chorizo	6	\N	\N	2025-05-16 18:56:30.198468	2025-05-16 18:56:30.198468
820	161	Beef Birria	beef_birria	7	\N	\N	2025-05-16 18:56:30.244345	2025-05-16 18:56:30.244345
821	161	Mexican Chicken	mexican_chicken	8	\N	\N	2025-05-16 18:56:30.289143	2025-05-16 18:56:30.289143
822	161	Cod	cod	9	\N	\N	2025-05-16 18:56:30.333963	2025-05-16 18:56:30.333963
823	161	Shrimp	shrimp	10	\N	\N	2025-05-16 18:56:30.379218	2025-05-16 18:56:30.379218
824	161	Tofu	tofu	11	\N	\N	2025-05-16 18:56:30.424063	2025-05-16 18:56:30.424063
825	161	Roasted Vegetables	roasted_vegetables	12	\N	\N	2025-05-16 18:56:30.469745	2025-05-16 18:56:30.469745
826	161	Escabeche - House-made picked vegetable medley	escabeche	13	\N	\N	2025-05-16 18:56:30.522068	2025-05-16 18:56:30.522068
827	162	Refried Beans	refried_beans	1	\N	\N	2025-05-16 18:56:30.613091	2025-05-16 18:56:30.613091
828	162	Mexican Street corn (Elotes)	elotes	2	\N	\N	2025-05-16 18:56:30.657832	2025-05-16 18:56:30.657832
829	162	Queso Dip	queso_dip	3	\N	\N	2025-05-16 18:56:30.70365	2025-05-16 18:56:30.70365
830	162	Chorizo Queso Dip	chorizo_queso_dip	4	\N	\N	2025-05-16 18:56:30.748441	2025-05-16 18:56:30.748441
831	162	Stuffed Poblano peppers	stuffed_poblano_peppers	5	\N	\N	2025-05-16 18:56:30.796075	2025-05-16 18:56:30.796075
832	162	Mexican Rice	mexican_rice	6	\N	\N	2025-05-16 18:56:30.841294	2025-05-16 18:56:30.841294
833	162	Cilantro Lime Rice	cilantro_lime_rice	7	\N	\N	2025-05-16 18:56:30.886778	2025-05-16 18:56:30.886778
834	162	Rice and Beans	rice_and_beans	8	\N	\N	2025-05-16 18:56:30.931599	2025-05-16 18:56:30.931599
835	162	Jalapeno cornbread	jalapeno_cornbread	9	\N	\N	2025-05-16 18:56:30.976497	2025-05-16 18:56:30.976497
836	162	Grilled Vegetables	grilled_vegetables	10	\N	\N	2025-05-16 18:56:31.021265	2025-05-16 18:56:31.021265
837	162	Mexican Slaw with Mango	mexican_slaw_mango	11	\N	\N	2025-05-16 18:56:31.067427	2025-05-16 18:56:31.067427
838	162	Vegetarian Empanadas	vegetarian_empanadas	12	\N	\N	2025-05-16 18:56:31.112898	2025-05-16 18:56:31.112898
841	163	Pineapple Habanero Salsa	pineapple_habanero_salsa	3	\N	\N	2025-05-16 18:56:31.292686	2025-05-16 18:56:31.292686
842	163	Cucumber & Apple Salsa	cucumber_apple_salsa	4	\N	\N	2025-05-16 18:56:31.339416	2025-05-16 18:56:31.339416
843	163	Jicama and Papaya Salsa	jicama_papaya_salsa	5	\N	\N	2025-05-16 18:56:31.384203	2025-05-16 18:56:31.384203
844	163	Salsa Roja (red sauce)	salsa_roja	6	\N	\N	2025-05-16 18:56:31.429032	2025-05-16 18:56:31.429032
845	163	Salsa Verde (green sauce)	salsa_verde	7	\N	\N	2025-05-16 18:56:31.473753	2025-05-16 18:56:31.473753
846	163	Creamy Salsa Verde (green sauce)	creamy_salsa_verde	8	\N	\N	2025-05-16 18:56:31.51874	2025-05-16 18:56:31.51874
847	163	Salsa Macha -(contains peanuts and sesame seeds)	salsa_macha	9	\N	\N	2025-05-16 18:56:31.564317	2025-05-16 18:56:31.564317
848	164	Shredded cheese	shredded_cheese	1	\N	\N	2025-05-16 18:56:31.657014	2025-05-16 18:56:31.657014
849	164	Shredded vegan cheese	shredded_vegan_cheese	2	\N	\N	2025-05-16 18:56:31.704562	2025-05-16 18:56:31.704562
850	164	Diced Onions	diced_onions	3	\N	\N	2025-05-16 18:56:31.752915	2025-05-16 18:56:31.752915
851	164	Lime wedges	lime_wedges	4	\N	\N	2025-05-16 18:56:31.798152	2025-05-16 18:56:31.798152
852	164	Jalapeños	jalapenos	5	\N	\N	2025-05-16 18:56:31.843252	2025-05-16 18:56:31.843252
853	164	Sour Cream	sour_cream	6	\N	\N	2025-05-16 18:56:31.888312	2025-05-16 18:56:31.888312
854	164	Diced bell peppers	diced_bell_peppers	7	\N	\N	2025-05-16 18:56:31.936955	2025-05-16 18:56:31.936955
855	164	Guacamole	guacamole	8	\N	\N	2025-05-16 18:56:31.981887	2025-05-16 18:56:31.981887
856	164	Fire roasted bell peppers	fire_roasted_bell_peppers	9	\N	\N	2025-05-16 18:56:32.027186	2025-05-16 18:56:32.027186
857	164	Sliced radish	sliced_radish	10	\N	\N	2025-05-16 18:56:32.071905	2025-05-16 18:56:32.071905
858	164	Cilantro	cilantro	11	\N	\N	2025-05-16 18:56:32.116692	2025-05-16 18:56:32.116692
859	164	Pickled cabbage	pickled_cabbage	12	\N	\N	2025-05-16 18:56:32.162744	2025-05-16 18:56:32.162744
860	164	Escabeche - House-made picked vegetable medley	escabeche_condiment	13	\N	\N	2025-05-16 18:56:32.207643	2025-05-16 18:56:32.207643
861	165	Kebabs	custom_kebabs	1	\N	\N	2025-05-16 18:56:32.298276	2025-05-16 18:56:32.298276
862	165	American BBQ	custom_american_bbq	2	\N	\N	2025-05-16 18:56:32.344444	2025-05-16 18:56:32.344444
863	165	Taste of Greece	custom_taste_of_greece	3	\N	\N	2025-05-16 18:56:32.389272	2025-05-16 18:56:32.389272
864	165	Taste of Italy	custom_taste_of_italy	4	\N	\N	2025-05-16 18:56:32.434957	2025-05-16 18:56:32.434957
865	165	Vegan Menu	custom_vegan_menu	5	\N	\N	2025-05-16 18:56:32.480338	2025-05-16 18:56:32.480338
866	165	I'm finished with my choices	custom_finished_choices	6	\N	\N	2025-05-16 18:56:32.525293	2025-05-16 18:56:32.525293
867	167	Prime Rib - Boneless -Carving station (upcharge of $4.00 pp)	custom_prime_rib_upcharge	1	\N	\N	2025-05-16 19:00:52.989841	2025-05-16 19:00:52.989841
868	167	Smoked Brisket (upcharge $3.00 pp)	custom_smoked_brisket_upcharge	2	\N	\N	2025-05-16 19:00:53.046195	2025-05-16 19:00:53.046195
869	167	Beef Ribs (upcharge $4.00 pp)	custom_beef_ribs_upcharge	3	\N	\N	2025-05-16 19:00:53.099276	2025-05-16 19:00:53.099276
870	167	Guinness Braised Boneless Short Ribs (upcharge $2.00 pp)	custom_short_ribs_upcharge	4	\N	\N	2025-05-16 19:00:53.152229	2025-05-16 19:00:53.152229
871	167	Bacon Wrapped Fillet Mingon - (upcharge of $4.00 pp)	custom_filet_mignon_upcharge	5	\N	\N	2025-05-16 19:00:53.203356	2025-05-16 19:00:53.203356
872	167	Flank Steak with Chimichurri	custom_flank_steak_chimichurri	6	\N	\N	2025-05-16 19:00:53.253468	2025-05-16 19:00:53.253468
873	167	Sausage Medley	custom_sausage_medley	7	\N	\N	2025-05-16 19:00:53.305459	2025-05-16 19:00:53.305459
874	167	Hamburger Bar (upcharge of $2.50 pp)	custom_hamburger_bar_upcharge	8	\N	\N	2025-05-16 19:00:53.352807	2025-05-16 19:00:53.352807
875	167	Lamb Chops (upcharge of $4.00 pp)	custom_lamb_chops_upcharge	9	\N	\N	2025-05-16 19:00:53.401065	2025-05-16 19:00:53.401065
876	167	Smoked Leg of Lamb (Family Style only)	custom_smoked_leg_lamb	10	\N	\N	2025-05-16 19:00:53.449125	2025-05-16 19:00:53.449125
877	167	Pulled Pork	custom_pulled_pork	11	\N	\N	2025-05-16 19:00:53.49866	2025-05-16 19:00:53.49866
878	167	Smoked pork Belly	custom_smoked_pork_belly	12	\N	\N	2025-05-16 19:00:53.546829	2025-05-16 19:00:53.546829
879	167	Baby Back Ribs	custom_baby_back_ribs	13	\N	\N	2025-05-16 19:00:53.602571	2025-05-16 19:00:53.602571
880	167	Bone-in, thick-cut, Grilled Pork Chop with Korean BBQ glaze	custom_pork_chop_korean_bbq	14	\N	\N	2025-05-16 19:00:53.653722	2025-05-16 19:00:53.653722
881	167	BBQ Guiness Chicken	custom_bbq_guiness_chicken	15	\N	\N	2025-05-16 19:00:53.708089	2025-05-16 19:00:53.708089
882	167	Carolina BBQ Chicken	custom_carolina_bbq_chicken	16	\N	\N	2025-05-16 19:00:53.761351	2025-05-16 19:00:53.761351
883	167	Rotisserie Chicken	custom_rotisserie_chicken	17	\N	\N	2025-05-16 19:00:53.812895	2025-05-16 19:00:53.812895
884	167	BBQ Prawns (upcharge of $2.00 pp)	custom_bbq_prawns_upcharge	18	\N	\N	2025-05-16 19:00:53.871315	2025-05-16 19:00:53.871315
885	167	Salmon steak	custom_salmon_steak	19	\N	\N	2025-05-16 19:00:53.939803	2025-05-16 19:00:53.939803
886	167	Tofu	custom_tofu_bbq	20	\N	\N	2025-05-16 19:00:53.999592	2025-05-16 19:00:53.999592
887	167	Vegetable kebabs	custom_vegetable_kebabs_bbq	21	\N	\N	2025-05-16 19:00:54.050885	2025-05-16 19:00:54.050885
888	167	Grilled Cauliflower Steaks	custom_grilled_cauliflower_steaks	22	\N	\N	2025-05-16 19:00:54.10155	2025-05-16 19:00:54.10155
889	168	Ham hock baked Beans	custom_ham_hock_baked_beans	1	\N	\N	2025-05-16 19:00:54.205697	2025-05-16 19:00:54.205697
890	168	Avocado deviled Eggs	custom_avocado_deviled_eggs	2	\N	\N	2025-05-16 19:00:54.255763	2025-05-16 19:00:54.255763
891	168	Mac n' Cheese	custom_mac_n_cheese	3	\N	\N	2025-05-16 19:00:54.302146	2025-05-16 19:00:54.302146
892	168	Stuffed Poblano peppers	custom_stuffed_poblano_peppers_bbq	4	\N	\N	2025-05-16 19:00:54.357778	2025-05-16 19:00:54.357778
893	168	Baked Potato Bar (upcharge $1.50 pp)	custom_baked_potato_bar_upcharge	5	\N	\N	2025-05-16 19:00:54.411695	2025-05-16 19:00:54.411695
894	168	Garlic Mashed Potatoes	custom_garlic_mashed_potatoes	6	\N	\N	2025-05-16 19:00:54.479287	2025-05-16 19:00:54.479287
895	168	Mini Smashed Potatoes	custom_mini_smashed_potatoes	7	\N	\N	2025-05-16 19:00:54.539489	2025-05-16 19:00:54.539489
896	168	Twice Baked Potatoes (upcharge $0.75 pp)	custom_twice_baked_potatoes_upcharge	8	\N	\N	2025-05-16 19:00:54.589406	2025-05-16 19:00:54.589406
897	168	Corn on the Cob	custom_corn_on_the_cob	9	\N	\N	2025-05-16 19:00:54.638171	2025-05-16 19:00:54.638171
898	168	Creamed Corn	custom_creamed_corn	10	\N	\N	2025-05-16 19:00:54.684432	2025-05-16 19:00:54.684432
899	168	Jalapeño Poppers	custom_jalapeno_poppers	11	\N	\N	2025-05-16 19:00:54.734823	2025-05-16 19:00:54.734823
900	168	Roasted Brussels Sprouts	custom_roasted_brussels_sprouts	12	\N	\N	2025-05-16 19:00:54.786962	2025-05-16 19:00:54.786962
901	168	Corn Bread	custom_corn_bread	13	\N	\N	2025-05-16 19:00:54.834994	2025-05-16 19:00:54.834994
902	168	Jalapeno cornbread	custom_jalapeno_cornbread_bbq	14	\N	\N	2025-05-16 19:00:54.883895	2025-05-16 19:00:54.883895
903	168	Grilled Vegetables	custom_grilled_vegetables_bbq	15	\N	\N	2025-05-16 19:00:54.931047	2025-05-16 19:00:54.931047
904	168	Grilled Asparagus	custom_grilled_asparagus	16	\N	\N	2025-05-16 19:00:54.991106	2025-05-16 19:00:54.991106
905	169	Caesar	custom_caesar_salad	1	\N	\N	2025-05-16 19:00:55.089289	2025-05-16 19:00:55.089289
906	169	Coleslaw	custom_coleslaw	2	\N	\N	2025-05-16 19:00:55.141858	2025-05-16 19:00:55.141858
907	169	Garden Salad	custom_garden_salad	3	\N	\N	2025-05-16 19:00:55.188273	2025-05-16 19:00:55.188273
908	169	Pasta Salad	custom_pasta_salad	4	\N	\N	2025-05-16 19:00:55.237993	2025-05-16 19:00:55.237993
909	169	Bacon Jalapeño Corn Salad	custom_bacon_jalapeno_corn_salad	5	\N	\N	2025-05-16 19:00:55.285614	2025-05-16 19:00:55.285614
910	169	Wedge Salad	custom_wedge_salad	6	\N	\N	2025-05-16 19:00:55.332685	2025-05-16 19:00:55.332685
911	169	German cucumber salad	custom_german_cucumber_salad	7	\N	\N	2025-05-16 19:00:55.383116	2025-05-16 19:00:55.383116
912	169	Crunchy Asian Slaw	custom_crunchy_asian_slaw	8	\N	\N	2025-05-16 19:00:55.429331	2025-05-16 19:00:55.429331
913	169	Tossed Cobb Salad	custom_tossed_cobb_salad	9	\N	\N	2025-05-16 19:00:55.477098	2025-05-16 19:00:55.477098
914	169	Classic Potato Salad	custom_classic_potato_salad	10	\N	\N	2025-05-16 19:00:55.525037	2025-05-16 19:00:55.525037
915	169	German Potato Salad	custom_german_potato_salad	11	\N	\N	2025-05-16 19:00:55.571706	2025-05-16 19:00:55.571706
916	169	Macaroni Salad	custom_macaroni_salad	12	\N	\N	2025-05-16 19:00:55.622872	2025-05-16 19:00:55.622872
917	169	Hawaiian Macaroni Salad	custom_hawaiian_macaroni_salad	13	\N	\N	2025-05-16 19:00:55.670163	2025-05-16 19:00:55.670163
918	169	Fruit Salad	custom_fruit_salad	14	\N	\N	2025-05-16 19:00:55.718364	2025-05-16 19:00:55.718364
919	170	Kansas City BBQ Sauce	custom_kansas_city_bbq	1	\N	\N	2025-05-16 19:00:55.816394	2025-05-16 19:00:55.816394
920	170	South Carolina Gold BBQ Sauce	custom_sc_gold_bbq	2	\N	\N	2025-05-16 19:00:55.863321	2025-05-16 19:00:55.863321
921	170	North Carolina Vinegar based BBQ Sauce	custom_nc_vinegar_bbq	3	\N	\N	2025-05-16 19:00:55.910415	2025-05-16 19:00:55.910415
922	170	Alabama White BBQ Sauce	custom_alabama_white_bbq	4	\N	\N	2025-05-16 19:00:55.969147	2025-05-16 19:00:55.969147
923	170	Texas BBQ Sauce	custom_texas_bbq	5	\N	\N	2025-05-16 19:00:56.020932	2025-05-16 19:00:56.020932
924	170	Very Berry BBQ Sauce	custom_very_berry_bbq	6	\N	\N	2025-05-16 19:00:56.069207	2025-05-16 19:00:56.069207
925	170	Smoky bourbon BBQ Sauce	custom_smoky_bourbon_bbq	7	\N	\N	2025-05-16 19:00:56.117151	2025-05-16 19:00:56.117151
926	171	Ketchup	custom_ketchup	1	\N	\N	2025-05-16 19:00:56.213401	2025-05-16 19:00:56.213401
927	171	Stone Ground Mustard	custom_stone_ground_mustard	2	\N	\N	2025-05-16 19:00:56.265397	2025-05-16 19:00:56.265397
928	171	Dijon Mustard	custom_dijon_mustard	3	\N	\N	2025-05-16 19:00:56.312901	2025-05-16 19:00:56.312901
929	171	Yellow Mustard	custom_yellow_mustard	4	\N	\N	2025-05-16 19:00:56.369458	2025-05-16 19:00:56.369458
930	171	Mayonnaise	custom_mayonnaise	5	\N	\N	2025-05-16 19:00:56.420676	2025-05-16 19:00:56.420676
931	171	Sweet pickle Chips	custom_sweet_pickle_chips	6	\N	\N	2025-05-16 19:00:56.469883	2025-05-16 19:00:56.469883
932	171	Dill pickle Chips	custom_dill_pickle_chips	7	\N	\N	2025-05-16 19:00:56.527132	2025-05-16 19:00:56.527132
933	171	Sliced radish	custom_sliced_radish_bbq	8	\N	\N	2025-05-16 19:00:56.585843	2025-05-16 19:00:56.585843
934	171	Sweet Relish	custom_sweet_relish	9	\N	\N	2025-05-16 19:00:56.632376	2025-05-16 19:00:56.632376
935	171	Cranberry Relish	custom_cranberry_relish	10	\N	\N	2025-05-16 19:00:56.680365	2025-05-16 19:00:56.680365
936	171	Kimchi	custom_kimchi	11	\N	\N	2025-05-16 19:00:56.741386	2025-05-16 19:00:56.741386
937	171	Mixed Pickled Vegetables - Giardiniera	custom_giardiniera	12	\N	\N	2025-05-16 19:00:56.797829	2025-05-16 19:00:56.797829
938	172	Taco Fiesta	custom_taco_fiesta_nav	1	\N	\N	2025-05-16 19:00:56.903873	2025-05-16 19:00:56.903873
939	172	Taste of Greece	custom_taste_of_greece_nav	2	\N	\N	2025-05-16 19:00:56.951583	2025-05-16 19:00:56.951583
940	172	Kebab Party	custom_kebab_party_nav	3	\N	\N	2025-05-16 19:00:56.997236	2025-05-16 19:00:56.997236
941	172	Taste of Italy	custom_taste_of_italy_nav	4	\N	\N	2025-05-16 19:00:57.04666	2025-05-16 19:00:57.04666
942	172	Vegan Menu	custom_vegan_menu_nav	5	\N	\N	2025-05-16 19:00:57.097212	2025-05-16 19:00:57.097212
943	172	I'm finished with my choices	custom_finished_choices_nav_from_bbq	6	\N	\N	2025-05-16 19:00:57.145305	2025-05-16 19:00:57.145305
944	175	Chicken Souvlaki	custom_chicken_souvlaki	1	\N	\N	2025-05-16 21:03:06.19387	2025-05-16 21:03:06.19387
945	175	Pork Souvlaki	custom_pork_souvlaki	2	\N	\N	2025-05-16 21:03:06.281802	2025-05-16 21:03:06.281802
946	175	Beef Souvlaki (upcharge of $2.00 pp)	custom_beef_souvlaki_upcharge	3	\N	\N	2025-05-16 21:03:06.329347	2025-05-16 21:03:06.329347
947	175	Lamb Souvlaki (upcharge of $2.00 pp)	custom_lamb_souvlaki_upcharge	4	\N	\N	2025-05-16 21:03:06.376021	2025-05-16 21:03:06.376021
948	175	Keftedes (Greek Meatballs)	custom_keftedes	5	\N	\N	2025-05-16 21:03:06.422695	2025-05-16 21:03:06.422695
949	175	Moussaka	custom_moussaka	6	\N	\N	2025-05-16 21:03:06.469183	2025-05-16 21:03:06.469183
950	175	Pastitsio	custom_pastitsio	7	\N	\N	2025-05-16 21:03:06.516522	2025-05-16 21:03:06.516522
951	175	Spanakopita (Spinach Pie)	custom_spanakopita	8	\N	\N	2025-05-16 21:03:06.562407	2025-05-16 21:03:06.562407
952	175	Tyropita (Cheese Pie)	custom_tyropita	9	\N	\N	2025-05-16 21:03:06.608511	2025-05-16 21:03:06.608511
953	175	Vegetable Moussaka	custom_vegetable_moussaka	10	\N	\N	2025-05-16 21:03:06.654242	2025-05-16 21:03:06.654242
954	175	Gemista (Stuffed Tomatoes and Peppers)	custom_gemista	11	\N	\N	2025-05-16 21:03:06.699175	2025-05-16 21:03:06.699175
955	175	Grilled Halloumi	custom_grilled_halloumi	12	\N	\N	2025-05-16 21:03:06.745442	2025-05-16 21:03:06.745442
956	176	Greek Lemon Potatoes	custom_greek_lemon_potatoes	1	\N	\N	2025-05-16 21:03:06.837859	2025-05-16 21:03:06.837859
957	176	Rice Pilaf	custom_rice_pilaf_greece	2	\N	\N	2025-05-16 21:03:06.883264	2025-05-16 21:03:06.883264
958	176	Orzo with Tomato and Basil	custom_orzo_tomato_basil	3	\N	\N	2025-05-16 21:03:06.931293	2025-05-16 21:03:06.931293
959	176	Horta (Boiled Greens)	custom_horta	4	\N	\N	2025-05-16 21:03:06.978554	2025-05-16 21:03:06.978554
960	176	Gigantes Plaki (Baked Giant Beans)	custom_gigantes_plaki	5	\N	\N	2025-05-16 21:03:07.024894	2025-05-16 21:03:07.024894
961	176	Briam (Roasted Vegetables)	custom_briam	6	\N	\N	2025-05-16 21:03:07.070513	2025-05-16 21:03:07.070513
962	176	Patates Tiganites (Greek Fries)	custom_patates_tiganites	7	\N	\N	2025-05-16 21:03:07.116426	2025-05-16 21:03:07.116426
963	176	Pita Bread	custom_pita_bread_greece	8	\N	\N	2025-05-16 21:03:07.162532	2025-05-16 21:03:07.162532
964	177	Horiatiki (Classic Greek Village Salad)	custom_horiatiki_salad	1	\N	\N	2025-05-16 21:03:07.254788	2025-05-16 21:03:07.254788
965	177	Maroulosalata (Romaine Lettuce Salad)	custom_maroulosalata	2	\N	\N	2025-05-16 21:03:07.300851	2025-05-16 21:03:07.300851
966	177	Prasini Salata (Mixed Green Salad)	custom_prasini_salata	3	\N	\N	2025-05-16 21:03:07.34703	2025-05-16 21:03:07.34703
967	177	Cabbage Salad (Lahanosalata)	custom_lahanosalata	4	\N	\N	2025-05-16 21:03:07.392865	2025-05-16 21:03:07.392865
968	177	Beetroot Salad (Pantzarosalata)	custom_pantzarosalata	5	\N	\N	2025-05-16 21:03:07.438628	2025-05-16 21:03:07.438628
969	177	Dakos (Cretan Rusk Salad)	custom_dakos_salad	6	\N	\N	2025-05-16 21:03:07.485045	2025-05-16 21:03:07.485045
970	178	Taco Fiesta	custom_taco_fiesta_nav_from_greece	1	\N	\N	2025-05-16 21:03:07.576788	2025-05-16 21:03:07.576788
971	178	American BBQ	custom_american_bbq_nav_from_greece	2	\N	\N	2025-05-16 21:03:07.623574	2025-05-16 21:03:07.623574
972	178	Kebab Party	custom_kebab_party_nav_from_greece	3	\N	\N	2025-05-16 21:03:07.669322	2025-05-16 21:03:07.669322
973	178	Taste of Italy	custom_taste_of_italy_nav_from_greece	4	\N	\N	2025-05-16 21:03:07.715586	2025-05-16 21:03:07.715586
974	178	Vegan Menu	custom_vegan_menu_nav_from_greece	5	\N	\N	2025-05-16 21:03:07.761299	2025-05-16 21:03:07.761299
975	178	I'm finished with my choices	custom_finished_choices_nav_from_greece	6	\N	\N	2025-05-16 21:03:07.807353	2025-05-16 21:03:07.807353
976	180	Chicken Shish Kebab	custom_chicken_shish_kebab	1	\N	\N	2025-05-16 21:44:51.239077	2025-05-16 21:44:51.239077
977	180	Beef Shish Kebab	custom_beef_shish_kebab	2	\N	\N	2025-05-16 21:44:51.296483	2025-05-16 21:44:51.296483
978	180	Lamb Adana Kebab (Spicy Minced Lamb)	custom_lamb_adana_kebab	3	\N	\N	2025-05-16 21:44:51.340298	2025-05-16 21:44:51.340298
979	180	Kofta Kebab (Ground Meat Patty)	custom_kofta_kebab	4	\N	\N	2025-05-16 21:44:51.385917	2025-05-16 21:44:51.385917
980	180	Shrimp Kebab (upcharge $2.50 pp)	custom_shrimp_kebab_upcharge	5	\N	\N	2025-05-16 21:44:51.431243	2025-05-16 21:44:51.431243
981	180	Vegetable Kebab (Mushrooms, Peppers, Onions, Zucchini)	custom_vegetable_kebab	6	\N	\N	2025-05-16 21:44:51.476565	2025-05-16 21:44:51.476565
982	180	Tofu Kebab (Marinated Tofu)	custom_tofu_kebab	7	\N	\N	2025-05-16 21:44:51.521156	2025-05-16 21:44:51.521156
983	181	Rice Pilaf with Vermicelli	custom_rice_pilaf_vermicelli_kebab	1	\N	\N	2025-05-16 21:44:51.613815	2025-05-16 21:44:51.613815
984	181	Saffron Rice	custom_saffron_rice_kebab	2	\N	\N	2025-05-16 21:44:51.65676	2025-05-16 21:44:51.65676
985	181	Bulgur Pilaf with Tomato	custom_bulgur_pilaf_tomato_kebab	3	\N	\N	2025-05-16 21:44:51.701556	2025-05-16 21:44:51.701556
986	181	Grilled Mediterranean Vegetables	custom_grilled_mediterranean_vegetables_kebab	4	\N	\N	2025-05-16 21:44:51.745895	2025-05-16 21:44:51.745895
987	181	Hummus with Pita Bread	custom_hummus_pita_kebab	5	\N	\N	2025-05-16 21:44:51.788584	2025-05-16 21:44:51.788584
988	181	Baba Ghanoush with Pita Bread	custom_baba_ghanoush_pita_kebab	6	\N	\N	2025-05-16 21:44:51.834742	2025-05-16 21:44:51.834742
989	181	Roasted Potatoes with Herbs	custom_roasted_potatoes_herbs_kebab	7	\N	\N	2025-05-16 21:44:51.883354	2025-05-16 21:44:51.883354
990	181	Lentil Kofta (Mercimek Köftesi)	custom_lentil_kofta_kebab	8	\N	\N	2025-05-16 21:44:51.929853	2025-05-16 21:44:51.929853
991	182	Shepherd Salad (Tomato, Cucumber, Onion, Parsley)	custom_shepherd_salad_kebab	1	\N	\N	2025-05-16 21:44:52.018357	2025-05-16 21:44:52.018357
992	182	Piyaz Salad (White Bean Salad with Onion and Sumac)	custom_piyaz_salad_kebab	2	\N	\N	2025-05-16 21:44:52.064036	2025-05-16 21:44:52.064036
993	182	Ezme Salad (Spicy Tomato and Pepper Dip/Salad)	custom_ezme_salad_kebab	3	\N	\N	2025-05-16 21:44:52.113614	2025-05-16 21:44:52.113614
994	182	Fattoush Salad (Toasted Pita Bread Salad)	custom_fattoush_salad_kebab	4	\N	\N	2025-05-16 21:44:52.156394	2025-05-16 21:44:52.156394
995	182	Tabbouleh Salad (Parsley, Bulgur, Mint)	custom_tabbouleh_salad_kebab	5	\N	\N	2025-05-16 21:44:52.198527	2025-05-16 21:44:52.198527
996	182	Red Cabbage Slaw with Lemon and Olive Oil	custom_red_cabbage_slaw_kebab	6	\N	\N	2025-05-16 21:44:52.240514	2025-05-16 21:44:52.240514
997	183	Taco Fiesta	custom_taco_fiesta_nav_from_kebab	1	\N	\N	2025-05-16 21:44:52.331289	2025-05-16 21:44:52.331289
998	183	American BBQ	custom_american_bbq_nav_from_kebab	2	\N	\N	2025-05-16 21:44:52.377436	2025-05-16 21:44:52.377436
999	183	Taste of Greece	custom_taste_of_greece_nav_from_kebab	3	\N	\N	2025-05-16 21:44:52.421061	2025-05-16 21:44:52.421061
1000	183	Taste of Italy	custom_taste_of_italy_nav_from_kebab	4	\N	\N	2025-05-16 21:44:52.465082	2025-05-16 21:44:52.465082
1001	183	Vegan Menu	custom_vegan_menu_nav_from_kebab	5	\N	\N	2025-05-16 21:44:52.513303	2025-05-16 21:44:52.513303
1002	183	I'm finished with my choices	custom_finished_choices_nav_from_kebab	6	\N	\N	2025-05-16 21:44:52.558361	2025-05-16 21:44:52.558361
1003	185	Chicken Parmesan	custom_chicken_parmesan	1	\N	\N	2025-05-16 21:51:17.35177	2025-05-16 21:51:17.35177
1004	185	Lasagna Bolognese	custom_lasagna_bolognese	2	\N	\N	2025-05-16 21:51:17.408578	2025-05-16 21:51:17.408578
1005	185	Eggplant Rollatini	custom_eggplant_rollatini	3	\N	\N	2025-05-16 21:51:17.461026	2025-05-16 21:51:17.461026
1006	185	Sausage and Peppers	custom_sausage_peppers	4	\N	\N	2025-05-16 21:51:17.516791	2025-05-16 21:51:17.516791
1007	185	Chicken Marsala	custom_chicken_marsala	5	\N	\N	2025-05-16 21:51:17.5731	2025-05-16 21:51:17.5731
1008	185	Veal Piccata (upcharge $3.00 pp)	custom_veal_piccata_upcharge	6	\N	\N	2025-05-16 21:51:17.628506	2025-05-16 21:51:17.628506
1009	186	Garlic Bread	custom_garlic_bread_italy	1	\N	\N	2025-05-16 21:51:17.724378	2025-05-16 21:51:17.724378
1010	186	Roasted Rosemary Potatoes	custom_roasted_rosemary_potatoes_italy	2	\N	\N	2025-05-16 21:51:17.770682	2025-05-16 21:51:17.770682
1011	186	Sautéed Spinach with Garlic	custom_sauteed_spinach_garlic_italy	3	\N	\N	2025-05-16 21:51:17.825691	2025-05-16 21:51:17.825691
1012	186	Polenta with Parmesan	custom_polenta_parmesan_italy	4	\N	\N	2025-05-16 21:51:17.874995	2025-05-16 21:51:17.874995
1013	186	Grilled Asparagus	custom_grilled_asparagus_italy	5	\N	\N	2025-05-16 21:51:17.924505	2025-05-16 21:51:17.924505
1014	186	Caprese Skewers	custom_caprese_skewers_italy	6	\N	\N	2025-05-16 21:51:17.977074	2025-05-16 21:51:17.977074
1015	187	Penne alla Vodka	custom_penne_vodka_italy	1	\N	\N	2025-05-16 21:51:18.076937	2025-05-16 21:51:18.076937
1016	187	Spaghetti Aglio e Olio	custom_spaghetti_aglio_olio_italy	2	\N	\N	2025-05-16 21:51:18.124638	2025-05-16 21:51:18.124638
1017	187	Fettuccine Alfredo	custom_fettuccine_alfredo_italy	3	\N	\N	2025-05-16 21:51:18.18701	2025-05-16 21:51:18.18701
1018	187	Rigatoni with Marinara	custom_rigatoni_marinara_italy	4	\N	\N	2025-05-16 21:51:18.232271	2025-05-16 21:51:18.232271
1019	188	Classic Caesar Salad	custom_classic_caesar_salad_italy	1	\N	\N	2025-05-16 21:51:18.327012	2025-05-16 21:51:18.327012
1020	188	Italian Mixed Green Salad with Vinaigrette	custom_italian_mixed_green_salad_italy	2	\N	\N	2025-05-16 21:51:18.374106	2025-05-16 21:51:18.374106
1021	188	Arugula Salad with Lemon and Parmesan	custom_arugula_salad_lemon_parmesan_italy	3	\N	\N	2025-05-16 21:51:18.425486	2025-05-16 21:51:18.425486
1022	188	Antipasto Salad	custom_antipasto_salad_italy	4	\N	\N	2025-05-16 21:51:18.475409	2025-05-16 21:51:18.475409
1023	189	Taco Fiesta	custom_taco_fiesta_nav_from_italy	1	\N	\N	2025-05-16 21:51:18.571135	2025-05-16 21:51:18.571135
1024	189	American BBQ	custom_american_bbq_nav_from_italy	2	\N	\N	2025-05-16 21:51:18.62045	2025-05-16 21:51:18.62045
1025	189	Taste of Greece	custom_taste_of_greece_nav_from_italy	3	\N	\N	2025-05-16 21:51:18.666384	2025-05-16 21:51:18.666384
1026	189	Kebab Party	custom_kebab_party_nav_from_italy	4	\N	\N	2025-05-16 21:51:18.716571	2025-05-16 21:51:18.716571
1027	189	Vegan Menu	custom_vegan_menu_nav_from_italy	5	\N	\N	2025-05-16 21:51:18.762715	2025-05-16 21:51:18.762715
1028	189	I'm finished with my choices	custom_finished_choices_nav_from_italy	6	\N	\N	2025-05-16 21:51:18.808165	2025-05-16 21:51:18.808165
1029	192	Vegetable Spring Rolls with Sweet Chili Dip	vegan_spring_rolls	1	\N	\N	2025-05-16 22:02:11.166657	2025-05-16 22:02:11.166657
1030	192	Bruschetta with Tomato, Basil, and Balsamic Glaze	vegan_bruschetta	2	\N	\N	2025-05-16 22:02:11.234316	2025-05-16 22:02:11.234316
1031	192	Mushroom and Herb Stuffed Bell Peppers	vegan_stuffed_peppers	3	\N	\N	2025-05-16 22:02:11.294968	2025-05-16 22:02:11.294968
1032	192	Avocado and Corn Salsa with Tortilla Chips	vegan_avocado_corn_salsa	4	\N	\N	2025-05-16 22:02:11.357302	2025-05-16 22:02:11.357302
1033	193	Lentil Shepherd's Pie with Sweet Potato Topping	vegan_lentil_shepherds_pie	1	\N	\N	2025-05-16 22:02:11.461897	2025-05-16 22:02:11.461897
1034	193	Chickpea and Spinach Curry with Coconut Milk	vegan_chickpea_spinach_curry	2	\N	\N	2025-05-16 22:02:11.509163	2025-05-16 22:02:11.509163
1035	193	Grilled Tofu Steaks with Teriyaki Glaze	vegan_grilled_tofu_teriyaki	3	\N	\N	2025-05-16 22:02:11.554883	2025-05-16 22:02:11.554883
1036	193	Black Bean Burgers on Whole Wheat Buns	vegan_black_bean_burgers	4	\N	\N	2025-05-16 22:02:11.599945	2025-05-16 22:02:11.599945
1037	193	Vegan Lasagna with Cashew Ricotta	vegan_lasagna	5	\N	\N	2025-05-16 22:02:11.644577	2025-05-16 22:02:11.644577
1038	194	Roasted Root Vegetables (Carrots, Parsnips, Beets)	vegan_roasted_root_vegetables	1	\N	\N	2025-05-16 22:02:11.740227	2025-05-16 22:02:11.740227
1039	194	Quinoa Salad with Lemon-Herb Dressing	vegan_quinoa_salad	2	\N	\N	2025-05-16 22:02:11.801158	2025-05-16 22:02:11.801158
1040	194	Garlic Sautéed Green Beans with Almonds	vegan_garlic_green_beans	3	\N	\N	2025-05-16 22:02:11.855893	2025-05-16 22:02:11.855893
1041	194	Creamy Vegan Mashed Potatoes	vegan_mashed_potatoes	4	\N	\N	2025-05-16 22:02:11.90812	2025-05-16 22:02:11.90812
1042	195	Chocolate Avocado Mousse	vegan_chocolate_avocado_mousse	1	\N	\N	2025-05-16 22:02:12.006929	2025-05-16 22:02:12.006929
1043	195	Apple and Berry Crumble with Oat Topping	vegan_apple_berry_crumble	2	\N	\N	2025-05-16 22:02:12.079844	2025-05-16 22:02:12.079844
1044	195	Vegan Chocolate Chip Cookies	vegan_chocolate_chip_cookies	3	\N	\N	2025-05-16 22:02:12.127682	2025-05-16 22:02:12.127682
1045	195	Fresh Fruit Platter	vegan_fresh_fruit_platter	4	\N	\N	2025-05-16 22:02:12.17618	2025-05-16 22:02:12.17618
1046	196	Taco Fiesta	custom_taco_fiesta_nav_from_vegan	1	\N	\N	2025-05-16 22:02:12.297087	2025-05-16 22:02:12.297087
1047	196	American BBQ	custom_american_bbq_nav_from_vegan	2	\N	\N	2025-05-16 22:02:12.361827	2025-05-16 22:02:12.361827
1048	196	Taste of Greece	custom_taste_of_greece_nav_from_vegan	3	\N	\N	2025-05-16 22:02:12.415539	2025-05-16 22:02:12.415539
1049	196	Kebab Party	custom_kebab_party_nav_from_vegan	4	\N	\N	2025-05-16 22:02:12.470751	2025-05-16 22:02:12.470751
1050	196	Taste of Italy	custom_taste_of_italy_nav_from_vegan	5	\N	\N	2025-05-16 22:02:12.522988	2025-05-16 22:02:12.522988
1051	196	I'm finished with my choices	custom_finished_choices_nav_from_vegan	6	\N	\N	2025-05-16 22:02:12.571327	2025-05-16 22:02:12.571327
1052	199	Stationary buffet	stationary_buffet	1	\N	\N	2025-05-16 22:04:47.633295	2025-05-16 22:04:47.633295
1053	199	Passed	passed	2	\N	\N	2025-05-16 22:04:47.68226	2025-05-16 22:04:47.68226
1054	202	Tzatziki	tzatziki	1	\N	\N	2025-05-16 22:07:56.817972	2025-05-16 22:07:56.817972
1055	202	Hummus	hummus	2	\N	\N	2025-05-16 22:07:56.874428	2025-05-16 22:07:56.874428
1056	202	Melitzanosalata (Eggplant Dip)	melitzanosalata	3	\N	\N	2025-05-16 22:07:56.921036	2025-05-16 22:07:56.921036
1057	202	Spicy Feta (Tirokafteri)	spicy_feta	4	\N	\N	2025-05-16 22:07:56.972046	2025-05-16 22:07:56.972046
1058	202	Taramasalata (Fish Roe Dip)	taramasalata	5	\N	\N	2025-05-16 22:07:57.020508	2025-05-16 22:07:57.020508
1059	202	Muhammara (Walnut and Red Pepper Dip)	muhammara	6	\N	\N	2025-05-16 22:07:57.067964	2025-05-16 22:07:57.067964
1060	202	Beet Hummus	beet_hummus	7	\N	\N	2025-05-16 22:07:57.116115	2025-05-16 22:07:57.116115
1061	202	Lebanese garlic dip (Toum)	toum	8	\N	\N	2025-05-16 22:07:57.162563	2025-05-16 22:07:57.162563
1062	203	24 servings	24	1	\N	\N	2025-05-16 22:07:57.264357	2025-05-16 22:07:57.264357
1063	203	36 servings	36	2	\N	\N	2025-05-16 22:07:57.313306	2025-05-16 22:07:57.313306
1064	203	48 servings	48	3	\N	\N	2025-05-16 22:07:57.363747	2025-05-16 22:07:57.363747
1065	203	96 servings	96	4	\N	\N	2025-05-16 22:07:57.411147	2025-05-16 22:07:57.411147
1066	203	144 servings	144	5	\N	\N	2025-05-16 22:07:57.460201	2025-05-16 22:07:57.460201
1067	204	Taco Fiesta	nav_to_custom_taco_fiesta	1	\N	\N	2025-05-16 22:10:12.043416	2025-05-16 22:10:12.043416
1068	204	American BBQ	nav_to_custom_american_bbq	2	\N	\N	2025-05-16 22:10:12.09041	2025-05-16 22:10:12.09041
1069	204	Taste of Greece	nav_to_custom_taste_of_greece	3	\N	\N	2025-05-16 22:10:12.143804	2025-05-16 22:10:12.143804
1070	204	Kebab Party	nav_to_custom_kebab_party	4	\N	\N	2025-05-16 22:10:12.191205	2025-05-16 22:10:12.191205
1071	204	Taste of Italy	nav_to_custom_taste_of_italy	5	\N	\N	2025-05-16 22:10:12.240294	2025-05-16 22:10:12.240294
1072	206	Alcoholic	alcoholic	1	\N	\N	2025-05-16 22:13:56.973782	2025-05-16 22:13:56.973782
1073	206	Non Alcoholic	non_alcoholic	2	\N	\N	2025-05-16 22:13:57.023935	2025-05-16 22:13:57.023935
1074	206	Both	both	3	\N	\N	2025-05-16 22:13:57.068189	2025-05-16 22:13:57.068189
1075	210	DRY HIRE - YOU provide alcohol & mixers	dry_hire	1	\N	\N	2025-05-16 22:13:57.277719	2025-05-16 22:13:57.277719
1076	210	WET HIRE - WE provide everything	wet_hire	2	\N	\N	2025-05-16 22:13:57.319371	2025-05-16 22:13:57.319371
1077	211	Beer	dry_hire_beer	1	\N	\N	2025-05-16 22:15:08.947373	2025-05-16 22:15:08.947373
1078	211	Wine	dry_hire_wine	2	\N	\N	2025-05-16 22:15:08.998948	2025-05-16 22:15:08.998948
1079	211	Cocktails X2	dry_hire_cocktails_x2	3	\N	\N	2025-05-16 22:15:09.048637	2025-05-16 22:15:09.048637
1080	211	Mocktails	dry_hire_mocktails	4	\N	\N	2025-05-16 22:15:09.099093	2025-05-16 22:15:09.099093
1081	212	YES	yes	1	\N	\N	2025-05-16 22:15:09.219283	2025-05-16 22:15:09.219283
1082	212	NO	no	2	\N	\N	2025-05-16 22:15:09.266213	2025-05-16 22:15:09.266213
1083	214	Beer	wet_hire_beer	1	\N	\N	2025-05-16 22:15:09.41421	2025-05-16 22:15:09.41421
1084	214	Wine	wet_hire_wine	2	\N	\N	2025-05-16 22:15:09.461077	2025-05-16 22:15:09.461077
1085	214	Cocktails X 2	wet_hire_cocktails_x2	3	\N	\N	2025-05-16 22:15:09.507282	2025-05-16 22:15:09.507282
1086	214	Mocktails	wet_hire_mocktails	4	\N	\N	2025-05-16 22:15:09.556784	2025-05-16 22:15:09.556784
1087	214	OPEN BAR	wet_hire_open_bar	5	\N	\N	2025-05-16 22:15:09.602739	2025-05-16 22:15:09.602739
1088	214	CASH BAR	wet_hire_cash_bar	6	\N	\N	2025-05-16 22:15:09.649793	2025-05-16 22:15:09.649793
1089	215	YES	yes	1	\N	\N	2025-05-16 22:15:09.747391	2025-05-16 22:15:09.747391
1090	215	NO	no	2	\N	\N	2025-05-16 22:15:09.793066	2025-05-16 22:15:09.793066
1091	217	Well (Economical)	well	1	\N	\N	2025-05-16 22:15:09.942604	2025-05-16 22:15:09.942604
1092	217	Mid Shelf (Medium Pricing)	mid_shelf	2	\N	\N	2025-05-16 22:15:09.991116	2025-05-16 22:15:09.991116
1093	217	Top Shelf (Premium)	top_shelf	3	\N	\N	2025-05-16 22:15:10.047314	2025-05-16 22:15:10.047314
1094	219	YES	yes	1	\N	\N	2025-05-16 22:18:54.472249	2025-05-16 22:18:54.472249
1095	219	NO	no	2	\N	\N	2025-05-16 22:18:54.530463	2025-05-16 22:18:54.530463
1096	221	YES	yes	1	\N	\N	2025-05-16 22:18:54.681189	2025-05-16 22:18:54.681189
1097	221	NO	no	2	\N	\N	2025-05-16 22:18:54.729865	2025-05-16 22:18:54.729865
1098	223	YES	yes	1	\N	\N	2025-05-16 22:19:10.051377	2025-05-16 22:19:10.051377
1099	223	NO	no	2	\N	\N	2025-05-16 22:19:10.098225	2025-05-16 22:19:10.098225
1100	229	Tzatziki	tzatziki	1	\N	\N	2025-05-16 22:44:13.368007	2025-05-16 22:44:13.368007
1101	229	Hummus	hummus	2	\N	\N	2025-05-16 22:44:13.430375	2025-05-16 22:44:13.430375
1102	229	Melitzanosalata (Eggplant Dip)	melitzanosalata	3	\N	\N	2025-05-16 22:44:13.478257	2025-05-16 22:44:13.478257
1103	229	Spicy Feta (Tirokafteri)	spicy_feta	4	\N	\N	2025-05-16 22:44:13.525366	2025-05-16 22:44:13.525366
1104	229	Taramasalata (Fish Roe Dip)	taramasalata	5	\N	\N	2025-05-16 22:44:13.571722	2025-05-16 22:44:13.571722
1105	229	Muhammara (Walnut and Red Pepper Dip)	muhammara	6	\N	\N	2025-05-16 22:44:13.62937	2025-05-16 22:44:13.62937
1106	229	Beet Hummus	beet_hummus	7	\N	\N	2025-05-16 22:44:13.678754	2025-05-16 22:44:13.678754
1107	229	Lebanese garlic dip (Toum)	toum	8	\N	\N	2025-05-16 22:44:13.725215	2025-05-16 22:44:13.725215
1108	230	24 servings	24	1	\N	\N	2025-05-16 22:44:13.817505	2025-05-16 22:44:13.817505
1109	230	36 servings	36	2	\N	\N	2025-05-16 22:44:13.86414	2025-05-16 22:44:13.86414
1110	230	48 servings	48	3	\N	\N	2025-05-16 22:44:13.909876	2025-05-16 22:44:13.909876
1111	230	96 servings	96	4	\N	\N	2025-05-16 22:44:13.957315	2025-05-16 22:44:13.957315
1112	230	144 servings	144	5	\N	\N	2025-05-16 22:44:14.004123	2025-05-16 22:44:14.004123
1113	233	YES	yes	1	\N	\N	2025-05-16 22:48:07.814004	2025-05-16 22:48:07.814004
1114	233	NO	no	2	\N	\N	2025-05-16 22:48:07.869404	2025-05-16 22:48:07.869404
1115	242	Bronze - from $13 per person -Meats, Cheeses, veggies, & four condiments, White, multigrain, and whole wheat breads.	sandwich_factory_bronze	1	\N	\N	2025-05-16 22:55:41.424879	2025-05-16 22:55:41.424879
1116	242	Silver - from $18 per person -Meats, cheeses, veggies, & five condiments. White, Multigrain, and whole wheat breads, croissants, bagels, and two salads	sandwich_factory_silver	2	\N	\N	2025-05-16 22:55:41.477802	2025-05-16 22:55:41.477802
1117	242	Gold - from $23 per person -Premium meats & cheeses, veggies, fruits & six condiments. White, multigrain, whole wheat sliced breads, croissants, bagels, and two salads.	sandwich_factory_gold	3	\N	\N	2025-05-16 22:55:41.522549	2025-05-16 22:55:41.522549
1118	242	Diamond -from $28 per person -premium meats & cheeses, veggies, & six condiments. White, multigrain, and whole wheat breads, croissants, bagels and rolls, three salads, and fresh fruit grazing board.	sandwich_factory_diamond	4	\N	\N	2025-05-16 22:55:41.567336	2025-05-16 22:55:41.567336
1119	244	Turkey Breast	turkey_breast	1	\N	\N	2025-05-16 22:58:57.273134	2025-05-16 22:58:57.273134
1120	244	Ham (Honey Glazed)	ham_honey_glazed	2	\N	\N	2025-05-16 22:58:57.328885	2025-05-16 22:58:57.328885
1121	244	Roast Beef	roast_beef	3	\N	\N	2025-05-16 22:58:57.375158	2025-05-16 22:58:57.375158
1122	244	Salami	salami	4	\N	\N	2025-05-16 22:58:57.420838	2025-05-16 22:58:57.420838
1123	244	Grilled Chicken Strips	grilled_chicken_strips	5	\N	\N	2025-05-16 22:58:57.467121	2025-05-16 22:58:57.467121
1124	244	Vegan Deli Slices (e.g., Tofurky)	vegan_deli_slices	6	\N	\N	2025-05-16 22:58:57.515233	2025-05-16 22:58:57.515233
1125	245	Cheddar	cheddar	1	\N	\N	2025-05-16 22:58:57.607426	2025-05-16 22:58:57.607426
1126	245	Swiss	swiss	2	\N	\N	2025-05-16 22:58:57.653871	2025-05-16 22:58:57.653871
1127	245	Provolone	provolone	3	\N	\N	2025-05-16 22:58:57.704757	2025-05-16 22:58:57.704757
1128	245	American Cheese	american_cheese	4	\N	\N	2025-05-16 22:58:57.75474	2025-05-16 22:58:57.75474
1129	245	Vegan Cheese Slices (e.g., Daiya)	vegan_cheese_slices	5	\N	\N	2025-05-16 22:58:57.802537	2025-05-16 22:58:57.802537
1130	246	Lettuce (Romaine)	lettuce_romaine	1	\N	\N	2025-05-16 22:58:57.898165	2025-05-16 22:58:57.898165
1131	246	Tomatoes (Sliced)	tomatoes_sliced	2	\N	\N	2025-05-16 22:58:57.944358	2025-05-16 22:58:57.944358
1132	246	Onions (Red, Sliced)	onions_red_sliced	3	\N	\N	2025-05-16 22:58:57.990885	2025-05-16 22:58:57.990885
1133	246	Pickles (Dill Slices)	pickles_dill_slices	4	\N	\N	2025-05-16 22:58:58.050041	2025-05-16 22:58:58.050041
1134	246	Cucumbers (Sliced)	cucumbers_sliced	5	\N	\N	2025-05-16 22:58:58.100599	2025-05-16 22:58:58.100599
1135	246	Bell Peppers (Green, Sliced)	bell_peppers_green	6	\N	\N	2025-05-16 22:58:58.146835	2025-05-16 22:58:58.146835
1136	246	Spinach	spinach	7	\N	\N	2025-05-16 22:58:58.193349	2025-05-16 22:58:58.193349
1137	247	Mayonnaise	mayonnaise	1	\N	\N	2025-05-16 22:58:58.288188	2025-05-16 22:58:58.288188
1138	247	Mustard (Yellow)	mustard_yellow	2	\N	\N	2025-05-16 22:58:58.335767	2025-05-16 22:58:58.335767
1139	247	Mustard (Dijon)	mustard_dijon	3	\N	\N	2025-05-16 22:58:58.384071	2025-05-16 22:58:58.384071
1140	247	Honey Mustard	honey_mustard	4	\N	\N	2025-05-16 22:58:58.430526	2025-05-16 22:58:58.430526
1141	247	Italian Dressing	italian_dressing	5	\N	\N	2025-05-16 22:58:58.477548	2025-05-16 22:58:58.477548
1142	247	Ranch Dressing	ranch_dressing	6	\N	\N	2025-05-16 22:58:58.52373	2025-05-16 22:58:58.52373
1143	247	Hot Sauce	hot_sauce	7	\N	\N	2025-05-16 22:58:58.573692	2025-05-16 22:58:58.573692
1144	247	Vegan Mayo	vegan_mayo	8	\N	\N	2025-05-16 22:58:58.62044	2025-05-16 22:58:58.62044
1145	248	White Bread	white_bread	1	\N	\N	2025-05-16 22:58:58.717945	2025-05-16 22:58:58.717945
1146	248	Multigrain Bread	multigrain_bread	2	\N	\N	2025-05-16 22:58:58.765691	2025-05-16 22:58:58.765691
1147	248	Whole Wheat Bread	whole_wheat_bread	3	\N	\N	2025-05-16 22:58:58.817746	2025-05-16 22:58:58.817746
1148	250	Turkey Breast (Premium Sliced)	turkey_breast_premium	1	\N	\N	2025-05-16 23:02:45.69541	2025-05-16 23:02:45.69541
1149	250	Ham (Black Forest)	ham_black_forest	2	\N	\N	2025-05-16 23:02:45.743151	2025-05-16 23:02:45.743151
1150	250	Roast Beef (Top Round)	roast_beef_top_round	3	\N	\N	2025-05-16 23:02:45.801097	2025-05-16 23:02:45.801097
1151	250	Salami (Genoa)	salami_genoa	4	\N	\N	2025-05-16 23:02:45.85364	2025-05-16 23:02:45.85364
1152	250	Grilled Chicken Strips	grilled_chicken_strips	5	\N	\N	2025-05-16 23:02:45.911214	2025-05-16 23:02:45.911214
1153	250	Prosciutto (upcharge $1.00 pp)	prosciutto_upcharge	6	\N	\N	2025-05-16 23:02:45.973722	2025-05-16 23:02:45.973722
1154	250	Vegan Deli Slices (e.g., Tofurky, Field Roast)	vegan_deli_slices_premium	7	\N	\N	2025-05-16 23:02:46.03331	2025-05-16 23:02:46.03331
1155	251	Cheddar (Aged)	cheddar_aged	1	\N	\N	2025-05-16 23:02:46.136813	2025-05-16 23:02:46.136813
1156	251	Swiss (Emmental)	swiss_emmental	2	\N	\N	2025-05-16 23:02:46.18642	2025-05-16 23:02:46.18642
1157	251	Provolone (Sharp)	provolone_sharp	3	\N	\N	2025-05-16 23:02:46.234048	2025-05-16 23:02:46.234048
1158	251	Pepper Jack	pepper_jack	4	\N	\N	2025-05-16 23:02:46.287158	2025-05-16 23:02:46.287158
1159	251	Muenster	muenster	5	\N	\N	2025-05-16 23:02:46.333619	2025-05-16 23:02:46.333619
1160	251	Vegan Cheese Slices (e.g., Violife, Chao)	vegan_cheese_slices_premium	6	\N	\N	2025-05-16 23:02:46.382268	2025-05-16 23:02:46.382268
1161	252	Lettuce (Romaine, Iceberg, Spring Mix)	lettuce_mixed	1	\N	\N	2025-05-16 23:02:46.486977	2025-05-16 23:02:46.486977
1162	252	Tomatoes (Heirloom Sliced, Roma)	tomatoes_mixed	2	\N	\N	2025-05-16 23:02:46.537109	2025-05-16 23:02:46.537109
1163	252	Onions (Red, White, Sweet)	onions_mixed	3	\N	\N	2025-05-16 23:02:46.585833	2025-05-16 23:02:46.585833
1164	252	Pickles (Dill Slices, Bread & Butter)	pickles_mixed	4	\N	\N	2025-05-16 23:02:46.633704	2025-05-16 23:02:46.633704
1165	252	Cucumbers (Sliced)	cucumbers_sliced	5	\N	\N	2025-05-16 23:02:46.686776	2025-05-16 23:02:46.686776
1166	252	Bell Peppers (Red, Yellow, Green)	bell_peppers_mixed	6	\N	\N	2025-05-16 23:02:46.739755	2025-05-16 23:02:46.739755
1167	252	Spinach	spinach	7	\N	\N	2025-05-16 23:02:46.791664	2025-05-16 23:02:46.791664
1168	252	Sprouts (Alfalfa, Broccoli)	sprouts_mixed	8	\N	\N	2025-05-16 23:02:46.84356	2025-05-16 23:02:46.84356
1169	252	Olives (Kalamata, Green)	olives_mixed	9	\N	\N	2025-05-16 23:02:46.895934	2025-05-16 23:02:46.895934
1170	253	Mayonnaise	mayonnaise	1	\N	\N	2025-05-16 23:02:46.992849	2025-05-16 23:02:46.992849
1171	253	Mustard (Yellow)	mustard_yellow	2	\N	\N	2025-05-16 23:02:47.043004	2025-05-16 23:02:47.043004
1172	253	Mustard (Dijon)	mustard_dijon	3	\N	\N	2025-05-16 23:02:47.092145	2025-05-16 23:02:47.092145
1173	253	Honey Mustard	honey_mustard	4	\N	\N	2025-05-16 23:02:47.140539	2025-05-16 23:02:47.140539
1174	253	Spicy Brown Mustard	spicy_brown_mustard	5	\N	\N	2025-05-16 23:02:47.192115	2025-05-16 23:02:47.192115
1175	253	Italian Dressing	italian_dressing	6	\N	\N	2025-05-16 23:02:47.245714	2025-05-16 23:02:47.245714
1176	253	Ranch Dressing	ranch_dressing	7	\N	\N	2025-05-16 23:02:47.295976	2025-05-16 23:02:47.295976
1177	253	Chipotle Aioli	chipotle_aioli	8	\N	\N	2025-05-16 23:02:47.341911	2025-05-16 23:02:47.341911
1178	253	Pesto Mayo	pesto_mayo	9	\N	\N	2025-05-16 23:02:47.390262	2025-05-16 23:02:47.390262
1179	253	Hot Sauce	hot_sauce	10	\N	\N	2025-05-16 23:02:47.437908	2025-05-16 23:02:47.437908
1180	253	Vegan Mayo	vegan_mayo	11	\N	\N	2025-05-16 23:02:47.486094	2025-05-16 23:02:47.486094
1181	254	White Bread	white_bread	1	\N	\N	2025-05-16 23:02:47.581117	2025-05-16 23:02:47.581117
1182	254	Multigrain Bread	multigrain_bread	2	\N	\N	2025-05-16 23:02:47.628048	2025-05-16 23:02:47.628048
1183	254	Whole Wheat Bread	whole_wheat_bread	3	\N	\N	2025-05-16 23:02:47.675502	2025-05-16 23:02:47.675502
1184	254	Croissants	croissants	4	\N	\N	2025-05-16 23:02:47.722665	2025-05-16 23:02:47.722665
1185	254	Bagels (Plain, Everything, Sesame)	bagels_mixed	5	\N	\N	2025-05-16 23:02:47.778689	2025-05-16 23:02:47.778689
1186	254	Sourdough Slices	sourdough_slices	6	\N	\N	2025-05-16 23:02:47.829518	2025-05-16 23:02:47.829518
1187	255	Classic Potato Salad	classic_potato_salad	1	\N	\N	2025-05-16 23:02:47.930106	2025-05-16 23:02:47.930106
1188	255	Coleslaw (Creamy)	coleslaw_creamy	2	\N	\N	2025-05-16 23:02:47.978803	2025-05-16 23:02:47.978803
1189	255	Macaroni Salad	macaroni_salad	3	\N	\N	2025-05-16 23:02:48.027113	2025-05-16 23:02:48.027113
1190	255	Pasta Salad (Italian Vinaigrette)	pasta_salad_italian	4	\N	\N	2025-05-16 23:02:48.073436	2025-05-16 23:02:48.073436
1191	255	Quinoa Salad with Veggies	quinoa_salad_veggies	5	\N	\N	2025-05-16 23:02:48.121175	2025-05-16 23:02:48.121175
1192	255	Fruit Salad (Seasonal)	fruit_salad_seasonal	6	\N	\N	2025-05-16 23:02:48.169201	2025-05-16 23:02:48.169201
1193	257	Prosciutto di Parma	prosciutto_di_parma	1	\N	\N	2025-05-16 23:05:38.330402	2025-05-16 23:05:38.330402
1194	257	Capicola (Coppa)	capicola	2	\N	\N	2025-05-16 23:05:38.377372	2025-05-16 23:05:38.377372
1195	257	Mortadella with Pistachios	mortadella_pistachios	3	\N	\N	2025-05-16 23:05:38.423616	2025-05-16 23:05:38.423616
1196	257	Smoked Salmon (upcharge $2.00 pp)	smoked_salmon_upcharge	4	\N	\N	2025-05-16 23:05:38.469632	2025-05-16 23:05:38.469632
1197	257	Artisan Turkey Breast (Herb Roasted)	artisan_turkey_herb_roasted	5	\N	\N	2025-05-16 23:05:38.515934	2025-05-16 23:05:38.515934
1198	257	Premium Roast Beef (Angus)	premium_roast_beef_angus	6	\N	\N	2025-05-16 23:05:38.562965	2025-05-16 23:05:38.562965
1199	257	Gourmet Vegan Deli Slices (e.g., Smoked Tomato)	gourmet_vegan_deli_slices	7	\N	\N	2025-05-16 23:05:38.609873	2025-05-16 23:05:38.609873
1200	258	Brie	brie	1	\N	\N	2025-05-16 23:05:38.707026	2025-05-16 23:05:38.707026
1201	258	Gouda (Smoked)	gouda_smoked	2	\N	\N	2025-05-16 23:05:38.757515	2025-05-16 23:05:38.757515
1202	258	Havarti (Dill)	havarti_dill	3	\N	\N	2025-05-16 23:05:38.81026	2025-05-16 23:05:38.81026
1203	258	Fresh Mozzarella	fresh_mozzarella	4	\N	\N	2025-05-16 23:05:38.860164	2025-05-16 23:05:38.860164
1204	258	Gruyère	gruyere	5	\N	\N	2025-05-16 23:05:38.90902	2025-05-16 23:05:38.90902
1205	258	Artisan Vegan Cheese (e.g., Cashew-based)	artisan_vegan_cheese	6	\N	\N	2025-05-16 23:05:38.956188	2025-05-16 23:05:38.956188
1206	259	Lettuce (Arugula, Butter Lettuce)	lettuce_premium_mix	1	\N	\N	2025-05-16 23:05:39.052294	2025-05-16 23:05:39.052294
1207	259	Tomatoes (Vine-Ripened, Sun-Dried)	tomatoes_premium_mix	2	\N	\N	2025-05-16 23:05:39.100253	2025-05-16 23:05:39.100253
1208	259	Onions (Red, Caramelized)	onions_premium_mix	3	\N	\N	2025-05-16 23:05:39.153271	2025-05-16 23:05:39.153271
1209	259	Pickles (Gourmet Dill Spears, Cornichons)	pickles_gourmet_mix	4	\N	\N	2025-05-16 23:05:39.204238	2025-05-16 23:05:39.204238
1210	259	Roasted Red Peppers	roasted_red_peppers	5	\N	\N	2025-05-16 23:05:39.251522	2025-05-16 23:05:39.251522
1211	259	Artichoke Hearts (Marinated)	artichoke_hearts_marinated	6	\N	\N	2025-05-16 23:05:39.297299	2025-05-16 23:05:39.297299
1212	259	Avocado Slices	avocado_slices	7	\N	\N	2025-05-16 23:05:39.34383	2025-05-16 23:05:39.34383
1213	260	Sliced Apples (Granny Smith, Fuji)	sliced_apples	1	\N	\N	2025-05-16 23:05:39.436427	2025-05-16 23:05:39.436427
1214	260	Pear Slices (Bartlett)	pear_slices	2	\N	\N	2025-05-16 23:05:39.488128	2025-05-16 23:05:39.488128
1215	260	Grapes (Red, Green)	grapes_mixed	3	\N	\N	2025-05-16 23:05:39.54131	2025-05-16 23:05:39.54131
1216	260	Fig Jam/Spread	fig_jam_spread	4	\N	\N	2025-05-16 23:05:39.587824	2025-05-16 23:05:39.587824
1217	260	Cranberry Relish (House-made)	cranberry_relish_house	5	\N	\N	2025-05-16 23:05:39.639191	2025-05-16 23:05:39.639191
1218	261	Artisan Mayonnaise (e.g., Garlic Aioli)	artisan_mayo_garlic_aioli	1	\N	\N	2025-05-16 23:05:39.741798	2025-05-16 23:05:39.741798
1219	261	Gourmet Mustard (e.g., Whole Grain, Champagne Dill)	gourmet_mustard_whole_grain	2	\N	\N	2025-05-16 23:05:39.789638	2025-05-16 23:05:39.789638
1220	261	Balsamic Glaze	balsamic_glaze	3	\N	\N	2025-05-16 23:05:39.840681	2025-05-16 23:05:39.840681
1221	261	Olive Tapenade	olive_tapenade	4	\N	\N	2025-05-16 23:05:39.893909	2025-05-16 23:05:39.893909
1222	261	Red Pepper Hummus	red_pepper_hummus	5	\N	\N	2025-05-16 23:05:39.940072	2025-05-16 23:05:39.940072
1223	261	Pesto (Basil)	pesto_basil	6	\N	\N	2025-05-16 23:05:39.988385	2025-05-16 23:05:39.988385
1224	261	Fig & Balsamic Onion Jam	fig_balsamic_onion_jam	7	\N	\N	2025-05-16 23:05:40.039094	2025-05-16 23:05:40.039094
1225	261	Spicy Chipotle Mayo	spicy_chipotle_mayo	8	\N	\N	2025-05-16 23:05:40.085288	2025-05-16 23:05:40.085288
1226	261	Horseradish Cream Sauce	horseradish_cream_sauce	9	\N	\N	2025-05-16 23:05:40.133427	2025-05-16 23:05:40.133427
1227	261	Premium Vegan Aioli	premium_vegan_aioli	10	\N	\N	2025-05-16 23:05:40.178843	2025-05-16 23:05:40.178843
1228	262	White Bread (Artisan Loaf)	white_bread_artisan	1	\N	\N	2025-05-16 23:05:40.271431	2025-05-16 23:05:40.271431
1229	262	Multigrain Bread (Seeded)	multigrain_bread_seeded	2	\N	\N	2025-05-16 23:05:40.320332	2025-05-16 23:05:40.320332
1230	262	Whole Wheat Bread (Honey Oat)	whole_wheat_honey_oat	3	\N	\N	2025-05-16 23:05:40.368043	2025-05-16 23:05:40.368043
1231	262	Croissants (Butter)	croissants_butter	4	\N	\N	2025-05-16 23:05:40.417426	2025-05-16 23:05:40.417426
1232	262	Bagels (Assorted Premium - e.g., Asiago, Pumpernickel)	bagels_premium_assorted	5	\N	\N	2025-05-16 23:05:40.462685	2025-05-16 23:05:40.462685
1233	262	Ciabatta Rolls	ciabatta_rolls	6	\N	\N	2025-05-16 23:05:40.512885	2025-05-16 23:05:40.512885
1234	262	Focaccia (Rosemary & Sea Salt)	focaccia_rosemary	7	\N	\N	2025-05-16 23:05:40.558736	2025-05-16 23:05:40.558736
1235	263	Caprese Salad (Fresh Mozzarella, Tomato, Basil)	caprese_salad_sf	1	\N	\N	2025-05-16 23:05:40.649795	2025-05-16 23:05:40.649795
1236	263	Greek Salad with Feta and Olives	greek_salad_sf	2	\N	\N	2025-05-16 23:05:40.699621	2025-05-16 23:05:40.699621
1237	263	Caesar Salad with Homemade Croutons	caesar_salad_homemade_croutons	3	\N	\N	2025-05-16 23:05:40.748401	2025-05-16 23:05:40.748401
1238	263	Spinach Salad with Berries and Nuts	spinach_salad_berries_nuts	4	\N	\N	2025-05-16 23:05:40.798763	2025-05-16 23:05:40.798763
1239	263	Orzo Salad with Roasted Vegetables	orzo_salad_roasted_veg	5	\N	\N	2025-05-16 23:05:40.844907	2025-05-16 23:05:40.844907
1240	263	Gourmet Fruit Salad with Mint	gourmet_fruit_salad_mint	6	\N	\N	2025-05-16 23:05:40.89232	2025-05-16 23:05:40.89232
1241	265	Prosciutto di Parma (Aged 18 months)	prosciutto_di_parma_aged	1	\N	\N	2025-05-16 23:08:24.982552	2025-05-16 23:08:24.982552
1242	265	Capicola (Hot or Sweet)	capicola_hot_sweet	2	\N	\N	2025-05-16 23:08:25.028486	2025-05-16 23:08:25.028486
1243	265	Mortadella with Pistachios (Imported)	mortadella_pistachios_imported	3	\N	\N	2025-05-16 23:08:25.072504	2025-05-16 23:08:25.072504
1244	265	Smoked Salmon (Wild Caught, upcharge $2.50 pp)	smoked_salmon_wild_upcharge	4	\N	\N	2025-05-16 23:08:25.117379	2025-05-16 23:08:25.117379
1245	265	Artisan Turkey Breast (Smoked or Herb Roasted)	artisan_turkey_smoked_herb	5	\N	\N	2025-05-16 23:08:25.161334	2025-05-16 23:08:25.161334
1246	265	Premium Roast Beef (Dry-Aged Angus)	premium_roast_beef_dry_aged	6	\N	\N	2025-05-16 23:08:25.206563	2025-05-16 23:08:25.206563
1247	265	Sopressata (Italian Dry Salami)	sopressata	7	\N	\N	2025-05-16 23:08:25.25079	2025-05-16 23:08:25.25079
1248	265	Gourmet Vegan Deli Slices (Variety Pack)	gourmet_vegan_deli_slices_variety	8	\N	\N	2025-05-16 23:08:25.297311	2025-05-16 23:08:25.297311
1249	266	Brie (Double Cream)	brie_double_cream	1	\N	\N	2025-05-16 23:08:25.391007	2025-05-16 23:08:25.391007
1250	266	Gouda (Aged)	gouda_aged	2	\N	\N	2025-05-16 23:08:25.44339	2025-05-16 23:08:25.44339
1251	266	Havarti (Creamy or Dill)	havarti_creamy_dill	3	\N	\N	2025-05-16 23:08:25.488301	2025-05-16 23:08:25.488301
1252	266	Fresh Mozzarella (Buffalo Mozzarella if available)	fresh_mozzarella_buffalo	4	\N	\N	2025-05-16 23:08:25.538071	2025-05-16 23:08:25.538071
1253	266	Gruyère (Cave-Aged)	gruyere_cave_aged	5	\N	\N	2025-05-16 23:08:25.582617	2025-05-16 23:08:25.582617
1254	266	Manchego (Aged 6 months)	manchego_6_months	6	\N	\N	2025-05-16 23:08:25.637705	2025-05-16 23:08:25.637705
1255	266	Artisan Vegan Cheese (Variety - e.g., Smoked Gouda, Herbed Feta style)	artisan_vegan_cheese_variety	7	\N	\N	2025-05-16 23:08:25.681644	2025-05-16 23:08:25.681644
1256	267	Lettuce (Organic Spring Mix, Arugula, Butter)	lettuce_organic_premium_mix	1	\N	\N	2025-05-16 23:08:25.775012	2025-05-16 23:08:25.775012
1257	267	Tomatoes (Heirloom, Sun-Dried, Cherry Medley)	tomatoes_heirloom_premium_mix	2	\N	\N	2025-05-16 23:08:25.823017	2025-05-16 23:08:25.823017
1258	267	Onions (Red, Sweet Vidalia, Caramelized)	onions_sweet_caramelized_mix	3	\N	\N	2025-05-16 23:08:25.868564	2025-05-16 23:08:25.868564
1259	267	Pickles (Artisan Dill, Bread & Butter, Spicy)	pickles_artisan_mix	4	\N	\N	2025-05-16 23:08:25.916784	2025-05-16 23:08:25.916784
1260	267	Roasted Red & Yellow Peppers	roasted_mixed_peppers	5	\N	\N	2025-05-16 23:08:25.962677	2025-05-16 23:08:25.962677
1261	267	Marinated Artichoke Hearts	marinated_artichoke_hearts_diamond	6	\N	\N	2025-05-16 23:08:26.007396	2025-05-16 23:08:26.007396
1262	267	Avocado Slices (Freshly Prepared)	avocado_slices_fresh	7	\N	\N	2025-05-16 23:08:26.052343	2025-05-16 23:08:26.052343
1263	267	Grilled Asparagus Spears	grilled_asparagus_spears_diamond	8	\N	\N	2025-05-16 23:08:26.098156	2025-05-16 23:08:26.098156
1264	267	Marinated Mushrooms	marinated_mushrooms	9	\N	\N	2025-05-16 23:08:26.150314	2025-05-16 23:08:26.150314
1265	268	Garlic Aioli (House-made)	garlic_aioli_house	1	\N	\N	2025-05-16 23:08:26.239921	2025-05-16 23:08:26.239921
1266	268	Whole Grain Mustard	whole_grain_mustard	2	\N	\N	2025-05-16 23:08:26.288609	2025-05-16 23:08:26.288609
1267	268	Champagne Dill Mustard	champagne_dill_mustard	3	\N	\N	2025-05-16 23:08:26.340053	2025-05-16 23:08:26.340053
1268	268	Balsamic Vinaigrette Glaze	balsamic_vinaigrette_glaze	4	\N	\N	2025-05-16 23:08:26.392974	2025-05-16 23:08:26.392974
1269	268	Olive Tapenade (Kalamata & Green Olive)	olive_tapenade_mixed	5	\N	\N	2025-05-16 23:08:26.437072	2025-05-16 23:08:26.437072
1270	268	Sun-Dried Tomato Pesto	sun_dried_tomato_pesto	6	\N	\N	2025-05-16 23:08:26.482492	2025-05-16 23:08:26.482492
1271	268	Fig & Balsamic Onion Jam	fig_balsamic_onion_jam_diamond	7	\N	\N	2025-05-16 23:08:26.526498	2025-05-16 23:08:26.526498
1272	268	Spicy Chipotle Aioli (House-made)	spicy_chipotle_aioli_house	8	\N	\N	2025-05-16 23:08:26.585791	2025-05-16 23:08:26.585791
1273	268	Horseradish Cream Sauce (Fresh Grated)	horseradish_cream_fresh	9	\N	\N	2025-05-16 23:08:26.630418	2025-05-16 23:08:26.630418
1274	268	Truffle Mayo (upcharge $0.50 pp)	truffle_mayo_upcharge	10	\N	\N	2025-05-16 23:08:26.674333	2025-05-16 23:08:26.674333
1275	268	Premium Vegan Spreads (e.g., Cashew Cream Cheese)	premium_vegan_spreads	11	\N	\N	2025-05-16 23:08:26.719862	2025-05-16 23:08:26.719862
1276	269	Artisan White Loaf	artisan_white_loaf_diamond	1	\N	\N	2025-05-16 23:08:26.808727	2025-05-16 23:08:26.808727
1277	269	Seeded Multigrain Loaf	seeded_multigrain_loaf_diamond	2	\N	\N	2025-05-16 23:08:26.854516	2025-05-16 23:08:26.854516
1278	269	Honey Oat Whole Wheat Loaf	honey_oat_whole_wheat_diamond	3	\N	\N	2025-05-16 23:08:26.898848	2025-05-16 23:08:26.898848
1279	269	Butter Croissants	butter_croissants_diamond	4	\N	\N	2025-05-16 23:08:26.942753	2025-05-16 23:08:26.942753
1280	269	Assorted Bagels (e.g., Asiago, Everything, Pumpernickel, Plain)	assorted_bagels_diamond	5	\N	\N	2025-05-16 23:08:26.988026	2025-05-16 23:08:26.988026
1281	269	Assorted Rolls (e.g., Ciabatta, Kaiser, Pretzel)	assorted_rolls_diamond	6	\N	\N	2025-05-16 23:08:27.041092	2025-05-16 23:08:27.041092
1282	269	Rosemary & Sea Salt Focaccia	rosemary_focaccia_diamond	7	\N	\N	2025-05-16 23:08:27.087483	2025-05-16 23:08:27.087483
1283	269	Gluten-Free Bread Option (upcharge $1.00 pp)	gluten_free_bread_upcharge	8	\N	\N	2025-05-16 23:08:27.132684	2025-05-16 23:08:27.132684
1284	270	Caprese Salad with Balsamic Glaze	caprese_salad_balsamic_sf	1	\N	\N	2025-05-16 23:08:27.224436	2025-05-16 23:08:27.224436
1285	270	Greek Salad with Imported Feta	greek_salad_imported_feta_sf	2	\N	\N	2025-05-16 23:08:27.270963	2025-05-16 23:08:27.270963
1286	270	Caesar Salad with Shaved Parmesan & Anchovy Option	caesar_shaved_parmesan_anchovy	3	\N	\N	2025-05-16 23:08:27.31587	2025-05-16 23:08:27.31587
1287	270	Spinach Salad with Goat Cheese, Berries, and Candied Nuts	spinach_goat_cheese_berries_nuts	4	\N	\N	2025-05-16 23:08:27.362731	2025-05-16 23:08:27.362731
1288	270	Orzo Salad with Roasted Mediterranean Vegetables and Lemon Vinaigrette	orzo_mediterranean_veg_lemon	5	\N	\N	2025-05-16 23:08:27.409528	2025-05-16 23:08:27.409528
1289	270	Arugula Salad with Prosciutto, Figs, and Gorgonzola (upcharge $1.00 pp)	arugula_prosciutto_figs_gorgonzola_upcharge	6	\N	\N	2025-05-16 23:08:27.454523	2025-05-16 23:08:27.454523
1290	274	YES	yes	1	\N	\N	2025-05-16 23:22:13.666687	2025-05-16 23:22:13.666687
1291	274	NO	no	2	\N	\N	2025-05-16 23:22:13.738798	2025-05-16 23:22:13.738798
1292	282	YES	yes	1	\N	\N	2025-05-16 23:28:45.307667	2025-05-16 23:28:45.307667
1293	282	NO	no	2	\N	\N	2025-05-16 23:28:45.363043	2025-05-16 23:28:45.363043
1294	283	Sandwich Factory	sandwich_factory	1	\N	\N	2025-05-16 23:33:36.650099	2025-05-16 23:33:36.650099
1295	290	chose1	1	0	\N	\N	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
1296	290	chose2	2	1	\N	\N	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
1297	290	ch3	3	2	\N	\N	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
1298	290	ch4	4	3	\N	\N	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
1299	290	ch5	5	4	\N	\N	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
\.


--
-- Data for Name: questionnaire_questions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_questions (id, page_id, question_text, question_key, question_type, "order", is_required, placeholder_text, help_text, validation_rules, created_at, updated_at) FROM stdin;
49	70	Client- Quotation Form	cid_1	info_text	1	f	\N	At Home Bites, we understand that every occasion is unique. That's why we've designed our "Themed Menus" to provide a variety of options to suit all your different needs. We also offer an exciting food truck option for smaller parties with a menu that has something for everyone. Our food is simple, approachable, affordable, and most importantly, prepared with love and care. So go ahead and choose the menu that best suits your event. We'll get back to you soon with a cost estimate. Thank you for considering Home Bites!	\N	2025-05-16 17:26:15.221747	2025-05-16 17:26:15.221747
54	70	Event Type?	event_type	radio	2	t	\N	Please select the type of event you are planning.	\N	2025-05-16 17:54:07.723457	2025-05-16 17:54:07.723457
55	71	Company Name	id_14	text	1	f	\N	Please enter the company name if applicable.	\N	2025-05-16 17:56:48.61761	2025-05-16 17:56:48.61761
56	71	Billing Address	id_5	address	2	f	\N	Please enter the billing address.	\N	2025-05-16 17:57:42.310248	2025-05-16 17:57:42.310248
57	71	Name	id_3	name	3	t	\N	Please enter your first and last name.	\N	2025-05-16 17:58:11.624485	2025-05-16 17:58:11.624485
58	71	Email	id_4	email	4	t	\N	example@example.com	\N	2025-05-16 17:58:46.506531	2025-05-16 17:58:46.506531
59	71	Phone Number	id_6	phone	5	t	(###) ###-####	Please enter a valid phone number.	\N	2025-05-16 17:59:27.646613	2025-05-16 17:59:27.646613
60	71	What is the date of your event	id_15	date	6	t	\N	Please select the month, day, and year of your event.	\N	2025-05-16 18:00:40.806507	2025-05-16 18:00:40.806507
63	71	Enter code here	id_711	text	9	f	\N	If you selected 'YES' for having a discount promo code, please enter it here.	\N	2025-05-16 18:00:41.099719	2025-05-16 18:00:41.099719
64	71	Discount percent	id_712	number	10	f	\N	The percentage of the discount, if applicable.	\N	2025-05-16 18:00:41.145758	2025-05-16 18:00:41.145758
65	71	Have you secured a venue?	id_20	radio	11	f	\N	Please indicate if you have already secured a venue for your event.	\N	2025-05-16 18:02:43.754999	2025-05-16 18:02:43.754999
66	71	What is the name of your venue?	id_430	text	12	f	\N	If yes, please provide the name of your venue.	\N	2025-05-16 18:02:43.935431	2025-05-16 18:02:43.935431
67	71	What is the location of your venue?	id_21	address	13	f	\N	Please provide the full address of your venue.	\N	2025-05-16 18:02:43.988756	2025-05-16 18:02:43.988756
72	71	Set-up before Ceremony start time?	id_566	radio	18	f	\N	Do you require setup before the ceremony start time?	\N	2025-05-16 18:03:33.999624	2025-05-16 18:03:33.999624
73	71	Cocktail Hour?	id_604	radio	19	f	\N	Will there be a cocktail hour?	\N	2025-05-16 18:03:34.160524	2025-05-16 18:03:34.160524
76	71	Main Course Service	id_607	radio	22	f	\N	Will there be a main course service?	\N	2025-05-16 18:03:34.432599	2025-05-16 18:03:34.432599
80	71	Service Style	id_39	radio	26	t	\N	Select the desired service style for your event.	\N	2025-05-16 18:04:50.274145	2025-05-16 18:04:50.274145
81	71	What would like a quote for:	id_23	radio	27	t	\N	Please select the main menu theme you are interested in.	\N	2025-05-16 18:04:50.762776	2025-05-16 18:04:50.762776
82	72	Taco Fiesta	id_52	info_text	1	f	\N	Bronze package not available for a guest count lower than 50.	\N	2025-05-16 18:07:42.325776	2025-05-16 18:07:42.325776
83	72	Please select a package	id_25	radio	2	t	\N	Choose one package for your Taco Fiesta.	\N	2025-05-16 18:07:42.409585	2025-05-16 18:07:42.409585
87	72	Taco Fiesta - Bronze Choose 4 Condiments	id_33	checkbox_group	6	f	\N	Select 4 condiment options for the Bronze package. (Note: PDF states Max Selections: 5, Min Selections: 4)	\N	2025-05-16 18:09:14.90873	2025-05-16 18:09:14.90873
61	71	Do you have a Discount Promo Code	id_710	toggle	7	f		Select if you have a discount promo code.	\N	2025-05-16 18:00:40.862414	2025-05-17 12:43:14.813
70	71	Ceremony start time: 	id_564	time	16	f		If applicable, select the start time of your ceremony.	\N	2025-05-16 18:03:33.885397	2025-05-17 15:45:08.336
68	71	Event Start Time:	id_513	time	14	t		Select the start time for your event (Hour, Minutes, AM/PM).	\N	2025-05-16 18:02:44.045	2025-05-17 15:43:57.646
69	71	Event End Time	id_514	time	15	t		Select the end time for your event (Hour, Minutes, AM/PM).	\N	2025-05-16 18:02:44.110659	2025-05-17 15:44:14.732
71	71	Ceremony end time:	id_565	time	17	f		If applicable, select the end time of your ceremony.	\N	2025-05-16 18:03:33.945954	2025-05-17 15:45:32.352
77	71	Start time of your Food service:	id_17	time	23	f		If yes to main course service, what is the start time?	\N	2025-05-16 18:04:50.113114	2025-05-17 15:46:29.719
78	71	End time of your Food service?	id_16	time	24	f		What is the end time for the food service?	\N	2025-05-16 18:04:50.167456	2025-05-17 15:46:48.288
74	71	Start time of your Cocktail/Appetizer service:	id_605	time	20	f		If yes to cocktail hour, what is the start time?	\N	2025-05-16 18:03:34.312358	2025-05-17 15:47:28.09
75	71	End time of your Cocktail/Appetizer service:	id_606	time	21	f		What is the end time for the cocktail/appetizer service?	\N	2025-05-16 18:03:34.381231	2025-05-17 15:48:34.067
85	72	Taco Fiesta Sides - Bronze - Choose 2 Sides	id_29	checkbox_group	4	f		Select exactly 2 side options for the Bronze package. (Note: Max Selections: 2, Min Selections: 2 as per PDF)	{}	2025-05-16 18:09:13.689293	2025-05-17 16:13:35.421
86	72	Taco Fiesta - Bronze - Salsas - Choose 3 Salsas	id_31	checkbox_group	5	f		Select exactly 3 salsa options for the Bronze package. (Note: Max Selections: 3, Min Selections: 3 as per PDF)	{}	2025-05-16 18:09:14.418488	2025-05-17 16:14:01.808
84	72	Taco Fiesta - Bronze - Protein - Choose 3 Proteins	id_8	checkbox_group	3	f		Select 3 proteins options for the Bronze package.	{}	2025-05-16 18:09:12.778564	2025-05-17 16:41:32.836
88	72	Taco Fiesta - Silver - Protein - Make 4 choices.	id_57	checkbox_group	7	f		Select 4 protein options for the Silver package.	{}	2025-05-16 18:11:06.089961	2025-05-17 19:07:16.552
90	72	Taco Fiesta - Silver - Salsas - Choose 4 Salsas	id_70	checkbox_group	9	f		Select 4 salsa options for the Silver package.	{}	2025-05-16 18:11:07.436728	2025-05-17 18:12:44.326
89	72	Taco Fiesta - Silver - Sides - Make 3 choices.	id_62	checkbox_group	8	f		Select 3 side options for the Silver package.	{}	2025-05-16 18:11:06.772335	2025-05-17 18:12:57.28
94	72	Taco Fiesta - Diamond- Salsas - Choose 5 Salsas	id_76	checkbox_group	17	f		Select 5 salsa options for the Diamond package. (Note: PDF states Min Selections: 3, but label says Choose 5 Salsas)	{}	2025-05-16 18:19:02.616463	2025-05-17 18:12:00.441
93	72	Taco Fiesta - Diamond - Sides - Make 5 choices.	id_60	checkbox_group	16	f		Select 5 side options for the Diamond package.	{}	2025-05-16 18:19:01.966798	2025-05-17 18:12:10.026
92	72	Taco Fiesta - Diamond - Protein - Make 5 choices.	id_59	checkbox_group	15	f		Select 5 protein options for the Diamond package.	{}	2025-05-16 18:19:01.278416	2025-05-17 18:12:17.769
91	72	Taco Fiesta Condiments - Silver- Choose 6 Condiments	id_77	checkbox_group	10	f		Select 6 condiment options for the Silver package.	{}	2025-05-16 18:11:08.192275	2025-05-17 18:12:25.539
96	73	American BBQ - Please select a package	id_38	radio	1	t	\N	Choose one package for your American BBQ. Bronze package not available for a guest count lower than 50.	\N	2025-05-16 18:22:34.903326	2025-05-16 18:22:34.903326
97	73	American BBQ - Bronze - Protein choice - Pick 3	id_89	checkbox_group	2	f	\N	Select 3 protein options for the American BBQ Bronze package.	\N	2025-05-16 18:24:25.898268	2025-05-16 18:24:25.898268
98	73	American BBQ - Bronze - Side choice - Pick 2	id_118	checkbox_group	3	f	\N	Select 2 side options for the American BBQ Bronze package.	\N	2025-05-16 18:24:27.170288	2025-05-16 18:24:27.170288
99	73	American BBQ - Bronze - Salad choice - Pick 2	id_119	checkbox_group	4	f	\N	Select 2 salad options for the American BBQ Bronze package.	\N	2025-05-16 18:24:28.05898	2025-05-16 18:24:28.05898
100	73	American BBQ - Bronze - Sauce choice - Pick 2	id_120	checkbox_group	5	f	\N	Select 2 sauce options for the American BBQ Bronze package.	\N	2025-05-16 18:24:28.864302	2025-05-16 18:24:28.864302
101	73	American BBQ - Bronze - Condiment choice - Pick 3	id_121	checkbox_group	6	f	\N	Select 3 condiment options for the American BBQ Bronze package.	\N	2025-05-16 18:24:29.29717	2025-05-16 18:24:29.29717
103	73	American BBQ - Silver - Protein choice - Pick 4	id_115	checkbox_group	7	f	\N	Select 4 protein options for the American BBQ Silver package.	\N	2025-05-16 18:37:35.780225	2025-05-16 18:37:35.780225
104	73	American BBQ - Silver - Side choice - Pick 3	id_122	checkbox_group	8	f	\N	Select 3 side options for the American BBQ Silver package.	\N	2025-05-16 18:37:37.033994	2025-05-16 18:37:37.033994
105	73	American BBQ - Silver - Salad choice - Pick 2	id_123	checkbox_group	9	f	\N	Select 2 salad options for the American BBQ Silver package.	\N	2025-05-16 18:37:37.895789	2025-05-16 18:37:37.895789
106	73	American BBQ - Silver - Sauce choice - Pick 3	id_124	checkbox_group	10	f	\N	Select 3 sauce options for the American BBQ Silver package.	\N	2025-05-16 18:37:38.649343	2025-05-16 18:37:38.649343
107	73	American BBQ - Silver - Condiment choice - Pick 4	id_125	checkbox_group	11	f	\N	Select 4 condiment options for the American BBQ Silver package.	\N	2025-05-16 18:37:39.044223	2025-05-16 18:37:39.044223
108	73	American BBQ - Gold - Protein choice - Pick 4	id_126	checkbox_group	12	f	\N	Select 4 protein options for the American BBQ Gold package.	\N	2025-05-16 18:38:54.104329	2025-05-16 18:38:54.104329
109	73	American BBQ - Gold - Side choice - Pick 4	id_127	checkbox_group	13	f	\N	Select 4 side options for the American BBQ Gold package.	\N	2025-05-16 18:38:55.229183	2025-05-16 18:38:55.229183
110	73	American BBQ - Gold - Salad choice - Pick 3	id_128	checkbox_group	14	f	\N	Select 3 salad options for the American BBQ Gold package.	\N	2025-05-16 18:38:56.094453	2025-05-16 18:38:56.094453
111	73	American BBQ - Gold - Sauce choice - Pick 3	id_129	checkbox_group	15	f	\N	Select 3 sauce options for the American BBQ Gold package.	\N	2025-05-16 18:38:56.987306	2025-05-16 18:38:56.987306
112	73	American BBQ - Gold - Condiment choice - Pick 5	id_130	checkbox_group	16	f	\N	Select 5 condiment options for the American BBQ Gold package.	\N	2025-05-16 18:38:57.370023	2025-05-16 18:38:57.370023
113	73	American BBQ - Diamond - Protein choice - Pick 5	id_131	checkbox_group	17	f	\N	Select 5 protein options for the American BBQ Diamond package.	\N	2025-05-16 18:40:02.917469	2025-05-16 18:40:02.917469
114	73	American BBQ - Diamond - Side choice - Pick 5	id_132	checkbox_group	18	f	\N	Select 5 side options for the American BBQ Diamond package.	\N	2025-05-16 18:40:04.058472	2025-05-16 18:40:04.058472
115	73	American BBQ - Diamond - Salad choice - Pick 4	id_133	checkbox_group	19	f	\N	Select 4 salad options for the American BBQ Diamond package.	\N	2025-05-16 18:40:04.926707	2025-05-16 18:40:04.926707
116	73	American BBQ - Diamond - Sauce choice - Pick 4	id_134	checkbox_group	20	f	\N	Select 4 sauce options for the American BBQ Diamond package.	\N	2025-05-16 18:40:05.686951	2025-05-16 18:40:05.686951
117	73	American BBQ - Diamond - Condiment choice - Pick 6	id_135	checkbox_group	21	f	\N	Select 6 condiment options for the American BBQ Diamond package.	\N	2025-05-16 18:40:06.12124	2025-05-16 18:40:06.12124
118	74	Taste of Greece- Please select a package	id_91	radio	1	t	\N	Choose one package for your 'A Taste of Greece' menu. Bronze package not available for a guest count lower than 50.	\N	2025-05-16 18:41:15.171266	2025-05-16 18:41:15.171266
119	74	A Taste of Greece - Bronze - Mains - Pick 3	id_191	checkbox_group	2	f	\N	Select 3 main course options for the A Taste of Greece Bronze package.	\N	2025-05-16 18:42:13.416411	2025-05-16 18:42:13.416411
120	74	A Taste of Greece - Bronze - Sides - Pick 3	id_92	checkbox_group	3	f	\N	Select 3 side options for the A Taste of Greece Bronze package.	\N	2025-05-16 18:42:14.087377	2025-05-16 18:42:14.087377
121	74	A Taste of Greece - Bronze - Salads - Pick 2	id_194	checkbox_group	4	f	\N	Select 2 salad options for the A Taste of Greece Bronze package.	\N	2025-05-16 18:42:14.563261	2025-05-16 18:42:14.563261
122	74	A Taste of Greece - Silver - Mains - Pick 4	id_192	checkbox_group	5	f	\N	Select 4 main course options for the A Taste of Greece Silver package.	\N	2025-05-16 18:43:56.185847	2025-05-16 18:43:56.185847
123	74	A Taste of Greece - Silver - Sides - Pick 3	id_195	checkbox_group	6	f	\N	Select 3 side options for the A Taste of Greece Silver package.	\N	2025-05-16 18:43:56.841289	2025-05-16 18:43:56.841289
124	74	A Taste of Greece - Silver - Salads - Pick 3	id_197	checkbox_group	7	f	\N	Select 3 salad options for the A Taste of Greece Silver package.	\N	2025-05-16 18:43:57.247214	2025-05-16 18:43:57.247214
125	74	A Taste of Greece - Gold - Mains - Pick 4	id_193	checkbox_group	8	f	\N	Select 4 main course options for the A Taste of Greece Gold package.	\N	2025-05-16 18:45:19.091105	2025-05-16 18:45:19.091105
126	74	A Taste of Greece - Gold - Sides - Pick 4	id_196	checkbox_group	9	f	\N	Select 4 side options for the A Taste of Greece Gold package.	\N	2025-05-16 18:45:19.764488	2025-05-16 18:45:19.764488
127	74	A Taste of Greece - Gold - Salads - Pick 3	id_198	checkbox_group	10	f	\N	Select 3 salad options for the A Taste of Greece Gold package.	\N	2025-05-16 18:45:20.284914	2025-05-16 18:45:20.284914
128	74	A Taste of Greece - Diamond - Mains - Pick 5	id_200	checkbox_group	11	f	\N	Select 5 main course options for the A Taste of Greece Diamond package.	\N	2025-05-16 18:46:22.657436	2025-05-16 18:46:22.657436
129	74	A Taste of Greece - Diamond - Sides - Pick 5	id_203	checkbox_group	12	f	\N	Select 5 side options for the A Taste of Greece Diamond package.	\N	2025-05-16 18:46:23.293003	2025-05-16 18:46:23.293003
130	74	A Taste of Greece - Diamond - Salads - Pick 4	id_206	checkbox_group	13	f	\N	Select 4 salad options for the A Taste of Greece Diamond package.	\N	2025-05-16 18:46:23.709236	2025-05-16 18:46:23.709236
131	75	Kebab Party- Please select a package	id_94	radio	1	t	\N	Choose one package for your Kebab Party. Bronze package not available for a guest count lower than 50.	\N	2025-05-16 18:47:38.134563	2025-05-16 18:47:38.134563
132	75	Kebab Party - Bronze - Protein choice - Pick 3	id_95	checkbox_group	2	f	\N	Select 3 protein options for the Kebab Party Bronze package.	\N	2025-05-16 18:48:59.462412	2025-05-16 18:48:59.462412
133	75	Kebab Party - Bronze - Side choice - Pick 3	id_211	checkbox_group	3	f	\N	Select 3 side options for the Kebab Party Bronze package.	\N	2025-05-16 18:48:59.866733	2025-05-16 18:48:59.866733
134	75	Kebab Party - Bronze - Salad choice - Pick 2	id_218	checkbox_group	4	f	\N	Select 2 salad options for the Kebab Party Bronze package.	\N	2025-05-16 18:49:00.322039	2025-05-16 18:49:00.322039
135	75	Kebab Party - Silver - Protein choice - Pick 4	id_212	checkbox_group	5	f	\N	Select 4 protein options for the Kebab Party Silver package.	\N	2025-05-16 18:49:47.301254	2025-05-16 18:49:47.301254
136	75	Kebab Party - Silver - Side choice - Pick 3	id_215	checkbox_group	6	f	\N	Select 3 side options for the Kebab Party Silver package.	\N	2025-05-16 18:49:47.718818	2025-05-16 18:49:47.718818
137	75	Kebab Party - Silver - Salad choice - Pick 3	id_219	checkbox_group	7	f	\N	Select 3 salad options for the Kebab Party Silver package.	\N	2025-05-16 18:49:48.183805	2025-05-16 18:49:48.183805
138	75	Kebab Party - Gold - Protein choice - Pick 4	id_213	checkbox_group	8	f	\N	Select 4 protein options for the Kebab Party Gold package.	\N	2025-05-16 18:50:13.23323	2025-05-16 18:50:13.23323
139	75	Kebab Party - Gold - Side choice - Pick 4	id_216	checkbox_group	9	f	\N	Select 4 side options for the Kebab Party Gold package.	\N	2025-05-16 18:50:13.63322	2025-05-16 18:50:13.63322
140	75	Kebab Party - Gold - Salad choice - Pick 3	id_220	checkbox_group	10	f	\N	Select 3 salad options for the Kebab Party Gold package.	\N	2025-05-16 18:50:14.0957	2025-05-16 18:50:14.0957
141	75	Kebab Party - Diamond - Protein choice - Pick 5	id_214	checkbox_group	11	f	\N	Select 5 protein options for the Kebab Party Diamond package.	\N	2025-05-16 18:50:41.330669	2025-05-16 18:50:41.330669
142	75	Kebab Party - Diamond - Side choice - Pick 5	id_217	checkbox_group	12	f	\N	Select 5 side options for the Kebab Party Diamond package.	\N	2025-05-16 18:50:41.737745	2025-05-16 18:50:41.737745
143	75	Kebab Party - Diamond - Salad choice - Pick 4	id_221	checkbox_group	13	f	\N	Select 4 salad options for the Kebab Party Diamond package.	\N	2025-05-16 18:50:42.212652	2025-05-16 18:50:42.212652
144	76	A taste of Italy- Please select a package	id_418	radio	1	t	\N	Choose one package for your 'A Taste of Italy' menu. Bronze package not available for a guest count lower than 50.	\N	2025-05-16 18:51:52.635662	2025-05-16 18:51:52.635662
145	76	Taste of Italy - Bronze - Main choice - Pick 2	id_398	checkbox_group	2	f	\N	Select 2 main course options for the A Taste of Italy Bronze package.	\N	2025-05-16 18:52:36.955887	2025-05-16 18:52:36.955887
146	76	Taste of Italy - Bronze - Side choice - Pick 3	id_399	checkbox_group	3	f	\N	Select 3 side options for the A Taste of Italy Bronze package.	\N	2025-05-16 18:52:37.302619	2025-05-16 18:52:37.302619
147	76	Taste of Italy - Bronze - Pasta Choice - Pick 1	id_400	checkbox_group	4	f	\N	Select 1 pasta option for the A Taste of Italy Bronze package.	\N	2025-05-16 18:52:37.659704	2025-05-16 18:52:37.659704
148	76	Taste of Italy - Bronze - Salad Choice - Pick 1	id_401	checkbox_group	5	f	\N	Select 1 salad option for the A Taste of Italy Bronze package.	\N	2025-05-16 18:52:37.918408	2025-05-16 18:52:37.918408
149	76	Taste of Italy - Silver - Main choice - Pick 3	id_402	checkbox_group	6	f	\N	Select 3 main course options for the A Taste of Italy Silver package.	\N	2025-05-16 18:53:25.479755	2025-05-16 18:53:25.479755
150	76	Taste of Italy - Silver - Side choice - Pick 3	id_403	checkbox_group	7	f	\N	Select 3 side options for the A Taste of Italy Silver package.	\N	2025-05-16 18:53:25.896327	2025-05-16 18:53:25.896327
151	76	Taste of Italy - Silver - Pasta Choice - Pick 1	id_404	checkbox_group	8	f	\N	Select 1 pasta option for the A Taste of Italy Silver package.	\N	2025-05-16 18:53:26.273912	2025-05-16 18:53:26.273912
152	76	Taste of Italy - Silver - Salad Choice - Pick 2	id_405	checkbox_group	9	f	\N	Select 2 salad options for the A Taste of Italy Silver package.	\N	2025-05-16 18:53:26.563586	2025-05-16 18:53:26.563586
153	76	Taste of Italy - Gold - Main choice - Pick 3	id_406	checkbox_group	10	f	\N	Select 3 main course options for the A Taste of Italy Gold package.	\N	2025-05-16 18:53:57.264326	2025-05-16 18:53:57.264326
154	76	Taste of Italy - Gold - Side choice - Pick 4	id_407	checkbox_group	11	f	\N	Select 4 side options for the A Taste of Italy Gold package.	\N	2025-05-16 18:53:57.763879	2025-05-16 18:53:57.763879
155	76	Taste of Italy - Gold - Pasta Choice - Pick 2	id_408	checkbox_group	12	f	\N	Select 2 pasta options for the A Taste of Italy Gold package.	\N	2025-05-16 18:53:58.193741	2025-05-16 18:53:58.193741
156	76	Taste of Italy - Gold - Salad Choice - Pick 2	id_409	checkbox_group	13	f	\N	Select 2 salad options for the A Taste of Italy Gold package.	\N	2025-05-16 18:53:58.514906	2025-05-16 18:53:58.514906
157	76	Taste of Italy - Diamond - Main choice - Pick 4	id_410	checkbox_group	14	f	\N	Select 4 main course options for the A Taste of Italy Diamond package.	\N	2025-05-16 18:54:28.875027	2025-05-16 18:54:28.875027
158	76	Taste of Italy - Diamond - Side choice - Pick 5	id_411	checkbox_group	15	f	\N	Select 5 side options for the A Taste of Italy Diamond package.	\N	2025-05-16 18:54:29.398997	2025-05-16 18:54:29.398997
159	76	Taste of Italy - Diamond - Pasta Choice - Pick 2	id_412	checkbox_group	16	f	\N	Select 2 pasta options for the A Taste of Italy Diamond package.	\N	2025-05-16 18:54:29.882102	2025-05-16 18:54:29.882102
160	76	Taste of Italy - Diamond - Salad Choice - Pick 3	id_413	checkbox_group	17	f	\N	Select 3 salad options for the A Taste of Italy Diamond package.	\N	2025-05-16 18:54:30.281212	2025-05-16 18:54:30.281212
161	78	Taco Fiesta - Proteins	id_462	checkbox_group	1	f	\N	Select desired proteins for your custom Taco Fiesta menu.	\N	2025-05-16 18:56:29.927296	2025-05-16 18:56:29.927296
162	78	Taco Fiesta Sides -	id_463	checkbox_group	2	f	\N	Select desired sides for your custom Taco Fiesta menu.	\N	2025-05-16 18:56:30.568232	2025-05-16 18:56:30.568232
163	78	Taco Fiesta -Salsas	id_464	checkbox_group	3	f	\N	Select desired salsas for your custom Taco Fiesta menu.	\N	2025-05-16 18:56:31.157659	2025-05-16 18:56:31.157659
164	78	Taco Fiesta Condiments -	id_465	checkbox_group	4	f	\N	Select desired condiments for your custom Taco Fiesta menu.	\N	2025-05-16 18:56:31.610902	2025-05-16 18:56:31.610902
165	78	Which Category would you like to choose from next?	id_466	radio	5	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 18:56:32.253273	2025-05-16 18:56:32.253273
166	79	American BBQ	id_468	info_text	1	f	\N	Select your desired items from the American BBQ menu.	\N	2025-05-16 19:00:52.867555	2025-05-16 19:00:52.867555
167	79	American BBQ - Mains	id_469	checkbox_group	2	f	\N	Select desired main courses for your custom American BBQ menu.	\N	2025-05-16 19:00:52.940878	2025-05-16 19:00:52.940878
168	79	American BBQ - Side choice	id_601	checkbox_group	3	f	\N	Select desired sides for your custom American BBQ menu.	\N	2025-05-16 19:00:54.156978	2025-05-16 19:00:54.156978
169	79	American BBQ -Salads	id_470	checkbox_group	4	f	\N	Select desired salads for your custom American BBQ menu.	\N	2025-05-16 19:00:55.041763	2025-05-16 19:00:55.041763
170	79	American BBQ Sauces	id_471	checkbox_group	5	f	\N	Select desired sauces for your custom American BBQ menu.	\N	2025-05-16 19:00:55.769814	2025-05-16 19:00:55.769814
171	79	American BBQ - Condiments	id_472	checkbox_group	6	f	\N	Select desired condiments for your custom American BBQ menu.	\N	2025-05-16 19:00:56.163461	2025-05-16 19:00:56.163461
172	79	Which Category would you like to choose from next?	id_473	radio	7	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 19:00:56.850165	2025-05-16 19:00:56.850165
174	80	A Taste of Greece	id_474_greece_custom_header	info_text	1	f	\N	Select your desired items from the 'A Taste of Greece' menu.	\N	2025-05-16 21:03:06.057911	2025-05-16 21:03:06.057911
175	80	Taste of Greece - Mains	id_475_greece_custom_mains	checkbox_group	2	f	\N	Select desired main courses for your custom 'A Taste of Greece' menu.	\N	2025-05-16 21:03:06.141347	2025-05-16 21:03:06.141347
176	80	Taste of Greece - Sides	id_476_greece_custom_sides	checkbox_group	3	f	\N	Select desired sides for your custom 'A Taste of Greece' menu.	\N	2025-05-16 21:03:06.791447	2025-05-16 21:03:06.791447
177	80	Taste of Greece - Salads	id_477_greece_custom_salads	checkbox_group	4	f	\N	Select desired salads for your custom 'A Taste of Greece' menu.	\N	2025-05-16 21:03:07.208809	2025-05-16 21:03:07.208809
178	80	Which Category would you like to choose from next?	id_479_greece_custom_nav	radio	5	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 21:03:07.531014	2025-05-16 21:03:07.531014
179	81	Kebab Party	id_480_kebab_custom_header	info_text	1	f	\N	Select your desired items from the Kebab Party menu.	\N	2025-05-16 21:44:51.123673	2025-05-16 21:44:51.123673
180	81	Kebab Party - Proteins	id_481_kebab_custom_proteins	checkbox_group	2	f	\N	Select desired proteins for your custom Kebab Party menu.	\N	2025-05-16 21:44:51.19396	2025-05-16 21:44:51.19396
181	81	Kebab Party - Sides	id_482_kebab_custom_sides	checkbox_group	3	f	\N	Select desired sides for your custom Kebab Party menu.	\N	2025-05-16 21:44:51.564325	2025-05-16 21:44:51.564325
182	81	Kebab Party - Salads	id_483_kebab_custom_salads	checkbox_group	4	f	\N	Select desired salads for your custom Kebab Party menu.	\N	2025-05-16 21:44:51.974475	2025-05-16 21:44:51.974475
183	81	Which Category would you like to choose from next?	id_485_kebab_custom_nav	radio	5	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 21:44:52.285455	2025-05-16 21:44:52.285455
184	82	A Taste of Italy	id_486_italy_custom_header	info_text	1	f	\N	Select your desired items from the 'A Taste of Italy' menu.	\N	2025-05-16 21:51:17.216971	2025-05-16 21:51:17.216971
185	82	Taste of Italy - Main choice	id_487_italy_custom_mains	checkbox_group	2	f	\N	Select desired main courses for your custom 'A Taste of Italy' menu.	\N	2025-05-16 21:51:17.302611	2025-05-16 21:51:17.302611
186	82	Taste of Italy - Side choice	id_488_italy_custom_sides	checkbox_group	3	f	\N	Select desired sides for your custom 'A Taste of Italy' menu.	\N	2025-05-16 21:51:17.676483	2025-05-16 21:51:17.676483
187	82	Taste of Italy - Pasta Choice	id_489_italy_custom_pasta	checkbox_group	4	f	\N	Select desired pasta options for your custom 'A Taste of Italy' menu.	\N	2025-05-16 21:51:18.024439	2025-05-16 21:51:18.024439
188	82	Taste of Italy - Salad Choice	id_490_italy_custom_salads	checkbox_group	5	f	\N	Select desired salads for your custom 'A Taste of Italy' menu.	\N	2025-05-16 21:51:18.280604	2025-05-16 21:51:18.280604
189	82	Which Category would you like to choose from next?	id_491_italy_custom_nav	radio	6	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 21:51:18.522804	2025-05-16 21:51:18.522804
191	83	Vegan Menu	vegan_menu_custom_header	info_text	1	f	\N	Select your desired items from the Vegan menu.	\N	2025-05-16 22:02:11.046249	2025-05-16 22:02:11.046249
192	83	Vegan Menu - Appetizers	vegan_menu_custom_appetizers	checkbox_group	2	f	\N	Select desired vegan appetizers.	\N	2025-05-16 22:02:11.109538	2025-05-16 22:02:11.109538
193	83	Vegan Menu - Mains	vegan_menu_custom_mains	checkbox_group	3	f	\N	Select desired vegan main courses.	\N	2025-05-16 22:02:11.408736	2025-05-16 22:02:11.408736
194	83	Vegan Menu - Sides	vegan_menu_custom_sides	checkbox_group	4	f	\N	Select desired vegan sides.	\N	2025-05-16 22:02:11.69037	2025-05-16 22:02:11.69037
195	83	Vegan Menu - Desserts	vegan_menu_custom_desserts	checkbox_group	5	f	\N	Select desired vegan desserts.	\N	2025-05-16 22:02:11.960368	2025-05-16 22:02:11.960368
196	83	Which Category would you like to choose from next?	id_528_vegan_custom_nav	radio	6	t	\N	Navigate to another custom menu category or finish your selections.	\N	2025-05-16 22:02:12.229535	2025-05-16 22:02:12.229535
197	84	Hor d' oeuvres	id_180	info_text	1	f	\N		\N	2025-05-16 22:04:47.494	2025-05-16 22:04:47.494
198	84	Please choose from the tables below indicating the amount of each item that you would like to add to your quote...	id_186	info_text	2	f	\N		\N	2025-05-16 22:04:47.540414	2025-05-16 22:04:47.540414
199	84	Service Style	id_245	radio	3	t	\N	Select the service style for the hor d'oeuvres.	\N	2025-05-16 22:04:47.586957	2025-05-16 22:04:47.586957
200	84	Hor d' oeuvres Tea Sandwiches --Offered in lots of 48	id_236	matrix_single	4	f	\N	Select the desired quantity for each tea sandwich.	\N	2025-05-16 22:06:27.94562	2025-05-16 22:06:27.94562
201	84	Hor d' oeuvres Shooters -	id_237	matrix_single	5	f	\N	Select the desired quantity for each shooter.	\N	2025-05-16 22:06:28.015017	2025-05-16 22:06:28.015017
202	84	Spreads - $6.50 per person - Served with Pita bread, and crudite. (Select 3 spreads)	id_548	checkbox_group	6	f	\N	Select 3 spreads. Served with Pita bread and crudite. Priced at $6.50 per person.	\N	2025-05-16 22:07:56.743992	2025-05-16 22:07:56.743992
203	84	Enter number of servings (for Spreads)	id_552	checkbox_group	7	f	\N	Select the number of servings for the chosen spreads.	\N	2025-05-16 22:07:57.216821	2025-05-16 22:07:57.216821
204	85	Which Category would you like to choose from next?	id_459_from_hor_d_oeuvres_nav	radio	1	t	\N	Select another custom menu category to continue building your quote.	\N	2025-05-16 22:10:11.995656	2025-05-16 22:10:11.995656
205	86	Beverage Service	id_264_beverage_header	info_text	1	f	\N	Details regarding your beverage requirements.	\N	2025-05-16 22:13:56.872103	2025-05-16 22:13:56.872103
206	86	Beverage Service type	id_567	radio	2	f	\N	Select the type of beverage service you require.	\N	2025-05-16 22:13:56.931687	2025-05-16 22:13:56.931687
207	86	Number of guests	id_569	number	3	f	\N	Enter the total number of guests for beverage service. This may be copied from previous guest count.	\N	2025-05-16 22:13:57.110767	2025-05-16 22:13:57.110767
208	86	Number of drinking aged guests	id_591	number	4	f	\N	Enter the number of guests who are of legal drinking age.	\N	2025-05-16 22:13:57.154481	2025-05-16 22:13:57.154481
209	86	Bar service period (hours)	id_585	number	5	f	\N	Enter the duration of the bar service in hours.	\N	2025-05-16 22:13:57.196133	2025-05-16 22:13:57.196133
210	86	What type of Bartending Service are you requesting?	id_721	radio	6	f	\N	Select the type of bartending service.	\N	2025-05-16 22:13:57.23704	2025-05-16 22:13:57.23704
211	86	What we are serving (Dry Hire)	id_582	checkbox_group	7	f	\N	If Dry Hire, select what beverages you will be providing.	\N	2025-05-16 22:15:08.89627	2025-05-16 22:15:08.89627
212	86	Add additional Cocktails? (Dry Hire)	id_719	radio	8	f	\N	For Dry Hire, would you like to add more than the standard 2 cocktails?	\N	2025-05-16 22:15:09.167839	2025-05-16 22:15:09.167839
213	86	How many additional cocktails? (Dry Hire)	id_720	number	9	f	\N	If yes, specify the number of additional cocktails for Dry Hire.	\N	2025-05-16 22:15:09.316801	2025-05-16 22:15:09.316801
214	86	What we are serving (Wet Hire)	id_722	checkbox_group	10	f	\N	If Wet Hire, select what beverages we will be providing.	\N	2025-05-16 22:15:09.365296	2025-05-16 22:15:09.365296
215	86	Add additional Cocktails? (Wet Hire)	id_724	radio	11	f	\N	For Wet Hire, would you like to add more than the standard 2 cocktails (if not Open/Cash Bar)?	\N	2025-05-16 22:15:09.697187	2025-05-16 22:15:09.697187
216	86	How many additional cocktails? (Wet Hire)	id_723	number	12	f	\N	If yes, specify the number of additional cocktails for Wet Hire.	\N	2025-05-16 22:15:09.842592	2025-05-16 22:15:09.842592
217	86	Liquor Quality	id_726	radio	13	f	\N	Select the desired quality tier for liquors (for Wet Hire).	\N	2025-05-16 22:15:09.888766	2025-05-16 22:15:09.888766
218	86	Use this box to notate any particular spirit brands you require	id_727	textarea	14	f	\N	If you selected Mid or Top Shelf liquor, specify any particular brands.	\N	2025-05-16 22:15:10.101022	2025-05-16 22:15:10.101022
219	86	Add Bar Equipment	id_595	radio	15	f	\N	Do you require us to provide bar equipment?	\N	2025-05-16 22:18:54.40657	2025-05-16 22:18:54.40657
220	86	Bar Equipment	id_597	matrix_single	16	f	\N	Select desired quantities for bar equipment. Prices as listed.	\N	2025-05-16 22:18:54.578385	2025-05-16 22:18:54.578385
221	86	Add Non-alcoholic beverages?	id_594	radio	17	f	\N	Would you like to add non-alcoholic beverage service?	\N	2025-05-16 22:18:54.631112	2025-05-16 22:18:54.631112
222	86	Non Alcoholic Beverage service: Enter the amount of each item in corresponding column.	id_353	matrix_single	18	f	\N	Select desired quantities for non-alcoholic beverages. Prices as listed.	\N	2025-05-16 22:19:09.943992	2025-05-16 22:19:09.943992
223	86	Table water service? ($2.50 pp)	id_730	radio	19	f	\N	Would you like to add table water service?	\N	2025-05-16 22:19:10.000938	2025-05-16 22:19:10.000938
224	87	Equipment Rentals & Serving Ware	id_263_equipment_header	info_text	1	f	\N	Select any equipment, linens, or serving ware you require.	\N	2025-05-16 22:42:20.177855	2025-05-16 22:42:20.177855
225	87	Furniture	id_422	matrix_single	2	f	\N	Select desired quantities for furniture items. Prices as listed.	\N	2025-05-16 22:42:20.251713	2025-05-16 22:42:20.251713
226	87	Linens	id_352	matrix_single	3	f	\N	Select desired quantities for linen items. Prices as listed.	\N	2025-05-16 22:42:20.296666	2025-05-16 22:42:20.296666
227	87	Serving Ware	id_269	matrix_single	4	f	\N	Select desired quantities for serving ware items. Prices as listed.	\N	2025-05-16 22:42:20.33888	2025-05-16 22:42:20.33888
228	88	Dessert Selections	id_504	matrix_single	1	f	\N	Select desired quantity for each dessert. Prices as listed.	\N	2025-05-16 22:44:13.273329	2025-05-16 22:44:13.273329
229	88	Spreads - $6.50 per person - Served with Pita bread, and crudite. (Select 3 spreads)	id_548_dessert_page	checkbox_group	2	f	\N	Select 3 spreads. Served with Pita bread and crudite. Priced at $6.50 per person.	\N	2025-05-16 22:44:13.321096	2025-05-16 22:44:13.321096
230	88	Enter number of servings (for Spreads)	id_552_dessert_page	checkbox_group	3	f	\N	Select the number of servings for the chosen spreads.	\N	2025-05-16 22:44:13.772017	2025-05-16 22:44:13.772017
231	88	Dietary Notes	id_560	textarea	4	f	\N	Please list any dietary restrictions, allergies, or special requests for your guests.	\N	2025-05-16 22:44:14.052827	2025-05-16 22:44:14.052827
232	89	Please list any comment/concerns/special requests. There is a Dietary restriction page to follow.	id_494	textarea	1	f	\N	Use this space for any additional information or questions you have for us.	\N	2025-05-16 22:48:07.689606	2025-05-16 22:48:07.689606
233	89	Would you like to add any appetizers to your quote?	id_495	radio	2	f	\N	Select if you would like to add appetizers from our Hor d' oeuvres menu.	\N	2025-05-16 22:48:07.765934	2025-05-16 22:48:07.765934
234	90	Totals	id_282_totals_header	info_text	1	f	\N	Summary of your quotation.	\N	2025-05-16 22:52:47.000944	2025-05-16 22:52:47.000944
235	90	Food and Beverage Summary	id_446	textarea	2	f	\N	This area will summarize your food and beverage selections and costs (auto-populated or for admin use).	\N	2025-05-16 22:52:47.063114	2025-05-16 22:52:47.063114
236	90	Equipment/Linens/Serving Ware Summary	id_448	textarea	3	f	\N	This area will summarize your equipment, linens, and serving ware selections and costs (auto-populated or for admin use).	\N	2025-05-16 22:52:47.11317	2025-05-16 22:52:47.11317
237	90	Service Fee Note (Full Service)	id_516	textarea	4	f	\N	Note regarding full service fee (auto-populated or for admin use).	\N	2025-05-16 22:52:47.160823	2025-05-16 22:52:47.160823
238	90	Service Fee Note (Standard Service)	id_717	textarea	5	f	\N	Note regarding standard service fee (auto-populated or for admin use).	\N	2025-05-16 22:52:47.20873	2025-05-16 22:52:47.20873
239	90	Service Fee Note (General)	id_716	textarea	6	f	\N	General notes regarding service fees (auto-populated or for admin use).	\N	2025-05-16 22:52:47.256207	2025-05-16 22:52:47.256207
240	90	Notes	id_508	textarea	7	f	\N	Any additional notes regarding your quote (auto-populated or for admin use).	\N	2025-05-16 22:52:47.30501	2025-05-16 22:52:47.30501
241	90	Coupon Code Applied	id_455	text	8	f	\N	Coupon code applied to this quote (auto-populated or for admin use).	\N	2025-05-16 22:52:47.35551	2025-05-16 22:52:47.35551
242	91	Choose a package (Sandwich Factory)	id_736	radio	1	t	\N	Select a Sandwich Factory package.	\N	2025-05-16 22:55:41.364242	2025-05-16 22:55:41.364242
243	92	Sandwich Factory - Bronze Package Selections	sf_bronze_header	info_text	1	f	\N	Please make your selections for meats, cheeses, veggies, condiments (choose 4), and bread types.	\N	2025-05-16 22:58:57.148079	2025-05-16 22:58:57.148079
244	92	Meats Selection (Bronze)	sf_bronze_meats	checkbox_group	2	f	\N	Select your desired meats.	\N	2025-05-16 22:58:57.225463	2025-05-16 22:58:57.225463
245	92	Cheeses Selection (Bronze)	sf_bronze_cheeses	checkbox_group	3	f	\N	Select your desired cheeses.	\N	2025-05-16 22:58:57.561357	2025-05-16 22:58:57.561357
246	92	Veggies Selection (Bronze)	sf_bronze_veggies	checkbox_group	4	f	\N	Select your desired veggies.	\N	2025-05-16 22:58:57.851661	2025-05-16 22:58:57.851661
247	92	Condiments Selection (Bronze) - Choose 4	sf_bronze_condiments	checkbox_group	5	f	\N	Select exactly 4 condiments.	\N	2025-05-16 22:58:58.24164	2025-05-16 22:58:58.24164
248	92	Bread Types Selection (Bronze)	sf_bronze_breads	checkbox_group	6	f	\N	Select your desired bread types (White, Multigrain, Whole Wheat available).	\N	2025-05-16 22:58:58.669414	2025-05-16 22:58:58.669414
249	93	Sandwich Factory - Silver Package Selections	sf_silver_header	info_text	1	f	\N	Please make your selections for meats, cheeses, veggies, condiments (choose 5), breads (including croissants/bagels), and salads (choose 2).	\N	2025-05-16 23:02:45.597986	2025-05-16 23:02:45.597986
250	93	Meats Selection (Silver)	sf_silver_meats	checkbox_group	2	f	\N	Select your desired meats.	\N	2025-05-16 23:02:45.64731	2025-05-16 23:02:45.64731
251	93	Cheeses Selection (Silver)	sf_silver_cheeses	checkbox_group	3	f	\N	Select your desired cheeses.	\N	2025-05-16 23:02:46.088146	2025-05-16 23:02:46.088146
252	93	Veggies Selection (Silver)	sf_silver_veggies	checkbox_group	4	f	\N	Select your desired veggies.	\N	2025-05-16 23:02:46.438625	2025-05-16 23:02:46.438625
253	93	Condiments Selection (Silver) - Choose 5	sf_silver_condiments	checkbox_group	5	f	\N	Select exactly 5 condiments.	\N	2025-05-16 23:02:46.945352	2025-05-16 23:02:46.945352
254	93	Bread Types Selection (Silver)	sf_silver_breads	checkbox_group	6	f	\N	Select your desired bread types.	\N	2025-05-16 23:02:47.534586	2025-05-16 23:02:47.534586
255	93	Salads Selection (Silver) - Choose 2	sf_silver_salads	checkbox_group	7	f	\N	Select exactly 2 salads.	\N	2025-05-16 23:02:47.882171	2025-05-16 23:02:47.882171
256	94	Sandwich Factory - Gold Package Selections	sf_gold_header	info_text	1	f	\N	Please make your selections for premium meats, premium cheeses, veggies, fruits, condiments (choose 6), breads (including croissants/bagels), and salads (choose 2).	\N	2025-05-16 23:05:38.237097	2025-05-16 23:05:38.237097
257	94	Premium Meats Selection (Gold)	sf_gold_meats	checkbox_group	2	f	\N	Select your desired premium meats.	\N	2025-05-16 23:05:38.284459	2025-05-16 23:05:38.284459
258	94	Premium Cheeses Selection (Gold)	sf_gold_cheeses	checkbox_group	3	f	\N	Select your desired premium cheeses.	\N	2025-05-16 23:05:38.658434	2025-05-16 23:05:38.658434
259	94	Veggies Selection (Gold)	sf_gold_veggies	checkbox_group	4	f	\N	Select your desired veggies.	\N	2025-05-16 23:05:39.004132	2025-05-16 23:05:39.004132
260	94	Fruits Selection (Gold)	sf_gold_fruits	checkbox_group	5	f	\N	Select desired fruits for your sandwiches or side.	\N	2025-05-16 23:05:39.390708	2025-05-16 23:05:39.390708
261	94	Condiments Selection (Gold) - Choose 6	sf_gold_condiments	checkbox_group	6	f	\N	Select exactly 6 condiments.	\N	2025-05-16 23:05:39.692405	2025-05-16 23:05:39.692405
262	94	Bread Types Selection (Gold)	sf_gold_breads	checkbox_group	7	f	\N	Select your desired bread types.	\N	2025-05-16 23:05:40.224558	2025-05-16 23:05:40.224558
263	94	Salads Selection (Gold) - Choose 2	sf_gold_salads	checkbox_group	8	f	\N	Select exactly 2 salads.	\N	2025-05-16 23:05:40.604463	2025-05-16 23:05:40.604463
264	95	Sandwich Factory - Diamond Package Selections	sf_diamond_header	info_text	1	f	\N	Please make your selections for premium meats, premium cheeses, veggies, condiments (choose 6), breads (including croissants/bagels/rolls), salads (choose 3), and fresh fruit grazing board.	\N	2025-05-16 23:08:24.882801	2025-05-16 23:08:24.882801
265	95	Premium Meats Selection (Diamond)	sf_diamond_meats	checkbox_group	2	f	\N	Select your desired premium meats.	\N	2025-05-16 23:08:24.9331	2025-05-16 23:08:24.9331
266	95	Premium Cheeses Selection (Diamond)	sf_diamond_cheeses	checkbox_group	3	f	\N	Select your desired premium cheeses.	\N	2025-05-16 23:08:25.344653	2025-05-16 23:08:25.344653
267	95	Veggies Selection (Diamond)	sf_diamond_veggies	checkbox_group	4	f	\N	Select your desired veggies.	\N	2025-05-16 23:08:25.72791	2025-05-16 23:08:25.72791
268	95	Condiments Selection (Diamond) - Choose 6	sf_diamond_condiments	checkbox_group	5	f	\N	Select exactly 6 condiments.	\N	2025-05-16 23:08:26.195551	2025-05-16 23:08:26.195551
269	95	Bread Types Selection (Diamond)	sf_diamond_breads	checkbox_group	6	f	\N	Select your desired bread types.	\N	2025-05-16 23:08:26.76396	2025-05-16 23:08:26.76396
270	95	Salads Selection (Diamond) - Choose 3	sf_diamond_salads	checkbox_group	7	f	\N	Select exactly 3 salads.	\N	2025-05-16 23:08:27.177837	2025-05-16 23:08:27.177837
271	95	Fresh Fruit Grazing Board	sf_diamond_fruit_board	info_text	8	f	\N	A fresh fruit grazing board is included with the Diamond Package.	\N	2025-05-16 23:08:27.502345	2025-05-16 23:08:27.502345
274	88	Add Beverages?	id_526	radio	5	f	\N	Would you like to add beverage service to your quote?	\N	2025-05-16 23:22:13.590406	2025-05-16 23:22:13.590406
275	86	Dry Hire Bartending Labor Fee:	id_593	info_text	20	f	\N	(This will display the calculated Dry Hire Bartending Labor Fee)	\N	2025-05-16 23:24:14.53397	2025-05-16 23:24:14.53397
276	86	WET HIRE Liquor and Labor:	id_725	info_text	21	f	\N	(This will display the calculated WET HIRE Liquor and Labor cost)	\N	2025-05-16 23:24:14.575658	2025-05-16 23:24:14.575658
277	86	Cash Bar Deposit Information:	id_728	info_text	22	f	\N	For CASH BAR setup, a deposit may be required. Details will be provided.	\N	2025-05-16 23:24:14.618512	2025-05-16 23:24:14.618512
278	86	Bar Equipment Total:	id_588	info_text	23	f	\N	(This will display the total for selected Bar Equipment)	\N	2025-05-16 23:24:14.659618	2025-05-16 23:24:14.659618
279	86	Non-alcoholic Beverage Service Note:	id_599	info_text	24	f	\N	(Note regarding non-alcoholic beverage choices or status)	\N	2025-05-16 23:24:14.701217	2025-05-16 23:24:14.701217
280	86	Non-Alcoholic Beverages Total:	id_354	info_text	25	f	\N	(This will display the total for selected Non-Alcoholic Beverages)	\N	2025-05-16 23:24:14.744066	2025-05-16 23:24:14.744066
281	86	Table Water Service Total:	id_732	info_text	26	f	\N	(This will display the total for Table Water Service if selected)	\N	2025-05-16 23:24:14.785272	2025-05-16 23:24:14.785272
282	89	Add Equipment Rentals or Serving Ware?	id_538	radio	3	f	\N	Would you like to add equipment rentals or serving ware to your quote?	\N	2025-05-16 23:28:45.234114	2025-05-16 23:28:45.234114
283	96	Select Food Truck Menu Concept	food_truck_menu_choice	radio	1	t	\N	Choose your preferred food truck menu style.	\N	2025-05-16 23:33:36.579477	2025-05-16 23:33:36.579477
284	90	Taco Fiesta Total:	id_370_taco_total_display	info_text	9	f	\N	(This will display the calculated total for Taco Fiesta selections)	\N	2025-05-16 23:39:26.131701	2025-05-16 23:39:26.131701
285	90	American BBQ Total:	id_bbq_total_display	info_text	10	f	\N	(This will display the calculated total for American BBQ selections)	\N	2025-05-16 23:40:50.531583	2025-05-16 23:40:50.531583
286	90	A Taste of Greece Total:	id_greece_total_display	info_text	11	f	\N	(This will display the calculated total for A Taste of Greece selections)	\N	2025-05-16 23:40:50.610096	2025-05-16 23:40:50.610096
287	90	Kebab Party Total:	id_kebab_total_display	info_text	12	f	\N	(This will display the calculated total for Kebab Party selections)	\N	2025-05-16 23:40:50.668181	2025-05-16 23:40:50.668181
288	90	A Taste of Italy Total:	id_italy_total_display	info_text	13	f	\N	(This will display the calculated total for A Taste of Italy selections)	\N	2025-05-16 23:40:50.714159	2025-05-16 23:40:50.714159
289	86	Bar Service Period Details:	id_590_bar_period_note	info_text	27	f	\N	(Details related to the bar service period will be displayed here if applicable)	\N	2025-05-16 23:41:53.370067	2025-05-16 23:41:53.370067
79	71	How many guests are you hosting?	id_19	slider	25	t		Enter the total number of guests you are expecting.	{"max": 500, "min": 10}	2025-05-16 18:04:50.215497	2025-05-17 08:06:04.974
95	72	Taco Fiesta Condiments - Diamond- Choose 7 Condiments	id_82	checkbox_group	18	f		Select 7 condiment options for the Diamond package. (Note: PDF states Min Selections: 5, but label says Choose 7 Condiments)	{}	2025-05-16 18:19:03.151114	2025-05-17 18:11:48.596
290	72	chose 4 	choice_test	checkbox	1	f			{"maxCount": 4, "minCount": 4, "exactCount": 4}	2025-05-17 19:48:16.650902	2025-05-17 19:48:16.650902
\.


--
-- Data for Name: questionnaire_submissions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.questionnaire_submissions (id, definition_id, submitted_data, status, client_identifier, user_id, raw_lead_id, submitted_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: raw_leads; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.raw_leads (id, source, raw_data, extracted_name, extracted_email, extracted_phone, event_summary, received_at, status, created_opportunity_id, internal_notes, assigned_to_user_id, created_at, updated_at, extracted_event_type, extracted_event_date, extracted_event_time, extracted_guest_count, extracted_venue, extracted_message_summary, lead_source_platform, ai_urgency_score, ai_budget_indication, ai_budget_value, ai_clarity_of_request_score, ai_decision_maker_likelihood, ai_key_requirements, ai_potential_red_flags, ai_overall_lead_quality, ai_suggested_next_step, ai_sentiment, ai_confidence_score, questionnaire_submission_id, questionnaire_definition_id) FROM stdin;
992	questionnaire	\N	\N	\N	\N	\N	2025-05-15 23:38:39.39	new	\N	\N	\N	2025-05-15 23:38:39.412058	2025-05-15 23:38:39.412058	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
993	questionnaire	\N	\N	\N	\N	\N	2025-05-15 23:55:13.552	new	\N	\N	\N	2025-05-15 23:55:13.570807	2025-05-15 23:55:13.570807	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, first_name, last_name, email, phone, role, created_at) FROM stdin;
1	admin	admin123	Admin	User	admin@homebites.net	\N	admin	2025-05-13 23:12:24.024026
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

SELECT pg_catalog.setval('public.leads_id_seq', 4, true);


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
-- Name: questionnaire_conditional_logic_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_conditional_logic_id_seq', 311, true);


--
-- Name: questionnaire_definitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_definitions_id_seq', 30, true);


--
-- Name: questionnaire_matrix_columns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_matrix_columns_id_seq', 5, true);


--
-- Name: questionnaire_pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_pages_id_seq', 97, true);


--
-- Name: questionnaire_question_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_question_options_id_seq', 1299, true);


--
-- Name: questionnaire_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_questions_id_seq', 290, true);


--
-- Name: questionnaire_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.questionnaire_submissions_id_seq', 2, true);


--
-- Name: raw_leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.raw_leads_id_seq', 993, true);


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
-- Name: questionnaire_conditional_logic questionnaire_conditional_logic_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_conditional_logic
    ADD CONSTRAINT questionnaire_conditional_logic_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_definitions questionnaire_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_definitions
    ADD CONSTRAINT questionnaire_definitions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_matrix_columns questionnaire_matrix_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_matrix_columns
    ADD CONSTRAINT questionnaire_matrix_columns_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_pages questionnaire_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_pages
    ADD CONSTRAINT questionnaire_pages_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_question_options questionnaire_question_options_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_question_options
    ADD CONSTRAINT questionnaire_question_options_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_questions questionnaire_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_submissions questionnaire_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_pkey PRIMARY KEY (id);


--
-- Name: questionnaire_submissions questionnaire_submissions_raw_lead_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_raw_lead_id_key UNIQUE (raw_lead_id);


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
-- Name: opportunities opportunities_questionnaire_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_questionnaire_definition_id_fkey FOREIGN KEY (questionnaire_definition_id) REFERENCES public.questionnaire_definitions(id) ON DELETE SET NULL;


--
-- Name: opportunities opportunities_questionnaire_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_questionnaire_submission_id_fkey FOREIGN KEY (questionnaire_submission_id) REFERENCES public.questionnaire_submissions(id) ON DELETE SET NULL;


--
-- Name: questionnaire_conditional_logic questionnaire_conditional_logic_definition_id_questionnaire_def; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_conditional_logic
    ADD CONSTRAINT questionnaire_conditional_logic_definition_id_questionnaire_def FOREIGN KEY (definition_id) REFERENCES public.questionnaire_definitions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_conditional_logic questionnaire_conditional_logic_target_page_id_questionnaire_pa; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_conditional_logic
    ADD CONSTRAINT questionnaire_conditional_logic_target_page_id_questionnaire_pa FOREIGN KEY (target_page_id) REFERENCES public.questionnaire_pages(id) ON DELETE SET NULL;


--
-- Name: questionnaire_matrix_columns questionnaire_matrix_columns_question_id_questionnaire_question; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_matrix_columns
    ADD CONSTRAINT questionnaire_matrix_columns_question_id_questionnaire_question FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_pages questionnaire_pages_definition_id_questionnaire_definitions_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_pages
    ADD CONSTRAINT questionnaire_pages_definition_id_questionnaire_definitions_id_ FOREIGN KEY (definition_id) REFERENCES public.questionnaire_definitions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_question_options questionnaire_question_options_question_id_questionnaire_questi; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_question_options
    ADD CONSTRAINT questionnaire_question_options_question_id_questionnaire_questi FOREIGN KEY (question_id) REFERENCES public.questionnaire_questions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_question_options questionnaire_question_options_related_menu_item_id_menu_items_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_question_options
    ADD CONSTRAINT questionnaire_question_options_related_menu_item_id_menu_items_ FOREIGN KEY (related_menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: questionnaire_questions questionnaire_questions_page_id_questionnaire_pages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_questions
    ADD CONSTRAINT questionnaire_questions_page_id_questionnaire_pages_id_fk FOREIGN KEY (page_id) REFERENCES public.questionnaire_pages(id) ON DELETE CASCADE;


--
-- Name: questionnaire_submissions questionnaire_submissions_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_definition_id_fkey FOREIGN KEY (definition_id) REFERENCES public.questionnaire_definitions(id) ON DELETE CASCADE;


--
-- Name: questionnaire_submissions questionnaire_submissions_raw_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_raw_lead_id_fkey FOREIGN KEY (raw_lead_id) REFERENCES public.raw_leads(id) ON DELETE SET NULL;


--
-- Name: questionnaire_submissions questionnaire_submissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.questionnaire_submissions
    ADD CONSTRAINT questionnaire_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


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
-- Name: raw_leads raw_leads_questionnaire_definition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_questionnaire_definition_id_fkey FOREIGN KEY (questionnaire_definition_id) REFERENCES public.questionnaire_definitions(id) ON DELETE SET NULL;


--
-- Name: raw_leads raw_leads_questionnaire_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.raw_leads
    ADD CONSTRAINT raw_leads_questionnaire_submission_id_fkey FOREIGN KEY (questionnaire_submission_id) REFERENCES public.questionnaire_submissions(id) ON DELETE SET NULL;


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

