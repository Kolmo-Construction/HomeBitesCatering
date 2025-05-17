import axios from 'axios';

// Define API endpoints
const API_BASE_URL = '/api';

// Interface for questionnaire definition data
export interface QuestionnaireDefinition {
  id: number;
  versionName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

// Interface for page data
export interface QuestionnairePage {
  id: number;
  definitionId: number;
  title: string;
  order: number;
}

// Interface for question data
export interface QuestionnaireQuestion {
  id: number;
  pageId: number;
  questionText: string;
  questionKey: string;
  questionType: string;
  isRequired: boolean;
  order: number;
}

// Interface for conditional logic rule
export interface ConditionalLogicRule {
  id: number;
  definitionId: number;
  triggerQuestionKey: string;
  triggerCondition: string;
  triggerValue: string | null;
  targetAction: string;
  targetQuestionKey: string | null;
  targetPageId: number | null;
  targetOptionValue: string | null;
}

// Fetch all questionnaire definitions
export async function fetchQuestionnaireDefinitions(): Promise<QuestionnaireDefinition[]> {
  const response = await axios.get(`${API_BASE_URL}/admin/questionnaires/definitions`);
  return response.data;
}

// Fetch pages for a specific questionnaire definition
export async function fetchQuestionnairePages(definitionId: number): Promise<QuestionnairePage[]> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/questionnaires/definitions/${definitionId}/pages`
  );
  return response.data;
}

// Fetch questions for a specific page
export async function fetchQuestionnaireQuestions(pageId: number): Promise<QuestionnaireQuestion[]> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/questionnaires/pages/${pageId}/questions`
  );
  return response.data;
}

// Fetch conditional logic rules for a definition
export async function fetchConditionalLogicRules(definitionId: number): Promise<ConditionalLogicRule[]> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/questionnaires/definitions/${definitionId}/conditional-logic`
  );
  return response.data;
}

// Fetch all data needed for visualization in one comprehensive call
export async function fetchAllQuestionnaireData(definitionId: number) {
  try {
    // Fetch the questionnaire pages
    const pages = await fetchQuestionnairePages(definitionId);
    
    // Fetch all questions for all pages
    const questionsPromises = pages.map(page => fetchQuestionnaireQuestions(page.id));
    const questionsResults = await Promise.all(questionsPromises);
    
    // Organize questions by page
    const questionsByPage = pages.reduce((acc, page, index) => {
      acc[page.id] = questionsResults[index];
      return acc;
    }, {} as Record<number, QuestionnaireQuestion[]>);
    
    // Fetch conditional logic rules
    const conditionalLogicRules = await fetchConditionalLogicRules(definitionId);
    
    return {
      pages,
      questionsByPage,
      conditionalLogicRules
    };
  } catch (error) {
    console.error('Error fetching questionnaire data:', error);
    throw error;
  }
}