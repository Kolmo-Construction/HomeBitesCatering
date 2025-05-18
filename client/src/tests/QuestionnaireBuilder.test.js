// QuestionnaireBuilder Component Tests
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import QuestionnaireBuilder from '../pages/QuestionnaireBuilder';

// Mock the API responses
vi.mock('../lib/queryClient', () => ({
  apiRequest: vi.fn((url, options) => {
    // Mock creating a questionnaire definition
    if (url === '/api/questionnaires/builder' && options.body.action === 'createDefinition') {
      return Promise.resolve({
        id: 1,
        versionName: options.body.data.versionName,
        description: options.body.data.description,
        category: options.body.data.category,
        isActive: options.body.data.isActive
      });
    }
    
    // Mock creating a page
    if (url === '/api/questionnaires/builder' && options.body.action === 'createPage') {
      return Promise.resolve({
        id: 1,
        definitionId: options.body.data.definitionId,
        title: options.body.data.title,
        description: options.body.data.description,
        order: options.body.data.order
      });
    }
    
    // Mock creating a section
    if (url === '/api/questionnaires/builder' && options.body.action === 'createSection') {
      return Promise.resolve({
        id: 1,
        title: options.body.data.title,
        description: options.body.data.description,
        order: options.body.data.order
      });
    }
    
    // Mock linking a section to a page
    if (url === '/api/questionnaires/builder' && options.body.action === 'linkSectionToPage') {
      return Promise.resolve({
        success: true,
        message: 'Section linked to page successfully'
      });
    }
    
    // Mock adding questions
    if (url === '/api/questionnaires/builder' && options.body.action === 'addQuestions') {
      const questions = options.body.data.questions.map((q, index) => ({
        id: index + 1,
        ...q
      }));
      
      return Promise.resolve({
        success: true,
        message: 'Questions added successfully',
        questions
      });
    }
    
    // Mock adding conditional logic
    if (url === '/api/questionnaires/builder' && options.body.action === 'addConditionalLogic') {
      return Promise.resolve({
        success: true,
        message: 'Conditional logic added successfully'
      });
    }
    
    // Mock getting the full questionnaire
    if (url === '/api/questionnaires/builder' && options.body.action === 'getFullQuestionnaire') {
      return Promise.resolve({
        id: options.body.data.definitionId,
        versionName: 'Test Questionnaire',
        description: 'Test Description',
        isActive: true,
        pages: [
          {
            id: 1,
            title: 'Page 1',
            description: 'Page 1 Description',
            order: 0,
            sections: [
              {
                id: 1,
                title: 'Section 1',
                description: 'Section 1 Description',
                order: 0,
                questions: [
                  {
                    id: 1,
                    questionText: 'Question 1',
                    questionKey: 'question_1',
                    questionType: 'text',
                    isRequired: true,
                    order: 0,
                    helpText: 'Help Text 1'
                  },
                  {
                    id: 2,
                    questionText: 'Question 2',
                    questionKey: 'question_2',
                    questionType: 'radio',
                    isRequired: true,
                    order: 1,
                    helpText: 'Help Text 2',
                    options: [
                      {
                        id: 1,
                        optionText: 'Option 1',
                        optionValue: 'option_1',
                        order: 0
                      },
                      {
                        id: 2,
                        optionText: 'Option 2',
                        optionValue: 'option_2',
                        order: 1
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        conditionalLogic: [
          {
            id: 1,
            targetQuestionId: 2,
            conditions: [
              {
                id: 1,
                sourceQuestionId: 1,
                operator: 'equals',
                value: 'test'
              }
            ],
            actionType: 'show_if_true'
          }
        ]
      });
    }
    
    return Promise.reject(new Error('Unhandled request'));
  })
}));

// Setup query client for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const TestWrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

// Tests for the QuestionnaireBuilder component
describe('QuestionnaireBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test('renders the questionnaire builder interface', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Check that the component renders with the expected title
    expect(screen.getByText(/Questionnaire Builder/i)).toBeInTheDocument();
  });
  
  test('can create a new questionnaire definition', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Find and click the "Create New Questionnaire" button
    const createButton = screen.getByText(/Create New Questionnaire/i);
    fireEvent.click(createButton);
    
    // Fill out the form
    const nameInput = screen.getByLabelText(/Version Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    const categorySelect = screen.getByLabelText(/Category/i);
    
    fireEvent.change(nameInput, { target: { value: 'Test Questionnaire' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.change(categorySelect, { target: { value: 'CORPORATE_EVENT' } });
    
    // Submit the form
    const submitButton = screen.getByText(/Submit/i);
    fireEvent.click(submitButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Questionnaire created successfully/i)).toBeInTheDocument();
    });
  });
  
  test('can add a page to the questionnaire', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Assume we already have a questionnaire selected
    // Find and click the "Add Page" button
    const addPageButton = screen.getByText(/Add Page/i);
    fireEvent.click(addPageButton);
    
    // Fill out the form
    const titleInput = screen.getByLabelText(/Title/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    
    fireEvent.change(titleInput, { target: { value: 'Test Page' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Page Description' } });
    
    // Submit the form
    const submitButton = screen.getByText(/Submit/i);
    fireEvent.click(submitButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Page added successfully/i)).toBeInTheDocument();
    });
  });
  
  test('can add a section to a page', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Assume we already have a questionnaire and page selected
    // Find and click the "Add Section" button
    const addSectionButton = screen.getByText(/Add Section/i);
    fireEvent.click(addSectionButton);
    
    // Fill out the form
    const titleInput = screen.getByLabelText(/Title/i);
    const descriptionInput = screen.getByLabelText(/Description/i);
    
    fireEvent.change(titleInput, { target: { value: 'Test Section' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Section Description' } });
    
    // Submit the form
    const submitButton = screen.getByText(/Submit/i);
    fireEvent.click(submitButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Section added successfully/i)).toBeInTheDocument();
    });
  });
  
  test('can add questions to a section', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Assume we already have a questionnaire, page, and section selected
    // Find and click the "Add Question" button
    const addQuestionButton = screen.getByText(/Add Question/i);
    fireEvent.click(addQuestionButton);
    
    // Fill out the form for a text question
    const textInput = screen.getByLabelText(/Question Text/i);
    const keyInput = screen.getByLabelText(/Question Key/i);
    const typeSelect = screen.getByLabelText(/Question Type/i);
    const helpTextInput = screen.getByLabelText(/Help Text/i);
    const requiredCheckbox = screen.getByLabelText(/Required/i);
    
    fireEvent.change(textInput, { target: { value: 'Test Question' } });
    fireEvent.change(keyInput, { target: { value: 'test_question' } });
    fireEvent.change(typeSelect, { target: { value: 'text' } });
    fireEvent.change(helpTextInput, { target: { value: 'Enter your answer' } });
    fireEvent.click(requiredCheckbox);
    
    // Submit the form
    const submitButton = screen.getByText(/Submit/i);
    fireEvent.click(submitButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Question added successfully/i)).toBeInTheDocument();
    });
  });
  
  test('can add conditional logic between questions', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Assume we already have a questionnaire with questions
    // Find and click the "Add Conditional Logic" button
    const addLogicButton = screen.getByText(/Add Conditional Logic/i);
    fireEvent.click(addLogicButton);
    
    // Fill out the form
    const targetQuestionSelect = screen.getByLabelText(/Target Question/i);
    const sourceQuestionSelect = screen.getByLabelText(/Source Question/i);
    const operatorSelect = screen.getByLabelText(/Operator/i);
    const valueInput = screen.getByLabelText(/Value/i);
    const actionTypeSelect = screen.getByLabelText(/Action Type/i);
    
    fireEvent.change(targetQuestionSelect, { target: { value: '2' } });
    fireEvent.change(sourceQuestionSelect, { target: { value: '1' } });
    fireEvent.change(operatorSelect, { target: { value: 'equals' } });
    fireEvent.change(valueInput, { target: { value: 'test' } });
    fireEvent.change(actionTypeSelect, { target: { value: 'show_if_true' } });
    
    // Submit the form
    const submitButton = screen.getByText(/Submit/i);
    fireEvent.click(submitButton);
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/Conditional logic added successfully/i)).toBeInTheDocument();
    });
  });
  
  test('can view the full questionnaire structure', async () => {
    render(
      <TestWrapper>
        <QuestionnaireBuilder />
      </TestWrapper>
    );
    
    // Find and click the "View Questionnaire" button
    const viewButton = screen.getByText(/View Questionnaire/i);
    fireEvent.click(viewButton);
    
    // Check that the questionnaire structure is displayed
    await waitFor(() => {
      expect(screen.getByText(/Test Questionnaire/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Section 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Question 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Question 2/i)).toBeInTheDocument();
    });
  });
});