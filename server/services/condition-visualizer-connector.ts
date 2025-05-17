/**
 * This service connects the main application with the condition visualizer component,
 * preparing data in the format required by the visualizer.
 */

import { db } from '../db';
import { questionnaireDefinitions, questionnairePages, questionnaireQuestions, conditionalLogicRules } from '../../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Get all the data needed for the condition visualizer for a specific questionnaire definition
 */
export async function getVisualizerData(definitionId: number) {
  try {
    // Fetch the pages for this definition
    const pages = await db.select()
      .from(questionnairePages)
      .where(eq(questionnairePages.definitionId, definitionId))
      .orderBy(questionnairePages.order);
    
    // Create a collection of page data
    const pagesData = await Promise.all(
      pages.map(async (page) => {
        // Fetch questions for this page
        const questions = await db.select()
          .from(questionnaireQuestions)
          .where(eq(questionnaireQuestions.pageId, page.id))
          .orderBy(questionnaireQuestions.order);
        
        return {
          page,
          questions
        };
      })
    );
    
    // Fetch conditional logic rules for this definition
    const rules = await db.select()
      .from(conditionalLogicRules)
      .where(eq(conditionalLogicRules.definitionId, definitionId));
    
    // Return the compiled data
    return {
      definitionId,
      pages: pagesData,
      rules
    };
  } catch (error) {
    console.error('Error fetching visualizer data:', error);
    throw error;
  }
}

/**
 * Analyze the conditional logic for potential issues
 */
export function analyzeConditionalLogic(visualizerData: any) {
  const { pages, rules } = visualizerData;
  const issues = [];
  
  // Create maps for questions and rules to make lookups easier
  const questionMap = new Map();
  pages.forEach(pageData => {
    pageData.questions.forEach(question => {
      questionMap.set(question.questionKey, question);
    });
  });
  
  // Check for rules that reference non-existent questions
  rules.forEach(rule => {
    // Check if trigger question exists
    if (!questionMap.has(rule.triggerQuestionKey)) {
      issues.push({
        type: 'missing_trigger_question',
        ruleId: rule.id,
        message: `Rule ${rule.id} references a trigger question "${rule.triggerQuestionKey}" that doesn't exist`
      });
    }
    
    // Check if target question exists (for show/hide rules)
    if (
      (rule.targetAction === 'show_question' || rule.targetAction === 'hide_question') &&
      rule.targetQuestionKey &&
      !questionMap.has(rule.targetQuestionKey)
    ) {
      issues.push({
        type: 'missing_target_question',
        ruleId: rule.id,
        message: `Rule ${rule.id} targets a question "${rule.targetQuestionKey}" that doesn't exist`
      });
    }
  });
  
  // Check for circular dependencies
  const dependencyGraph = buildDependencyGraph(rules, questionMap);
  const circularDependencies = findCircularDependencies(dependencyGraph);
  
  circularDependencies.forEach(cycle => {
    issues.push({
      type: 'circular_dependency',
      questionKeys: cycle,
      message: `Circular dependency detected: ${cycle.join(' → ')}`
    });
  });
  
  return {
    issues,
    hasIssues: issues.length > 0
  };
}

/**
 * Build a graph of question dependencies based on conditional logic rules
 */
function buildDependencyGraph(rules, questionMap) {
  const graph = new Map();
  
  // Initialize graph with all questions
  questionMap.forEach((question, key) => {
    graph.set(key, []);
  });
  
  // Add dependencies based on rules
  rules.forEach(rule => {
    const source = rule.triggerQuestionKey;
    
    if (rule.targetAction === 'show_question' || rule.targetAction === 'hide_question') {
      const target = rule.targetQuestionKey;
      
      // If both source and target exist in our questions
      if (graph.has(source) && graph.has(target)) {
        // Add target as dependent on source
        graph.get(source).push(target);
      }
    }
  });
  
  return graph;
}

/**
 * Find circular dependencies in the dependency graph
 */
function findCircularDependencies(graph) {
  const visited = new Set();
  const recStack = new Set();
  const cycles = [];
  
  function dfs(node, path = []) {
    if (recStack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    
    if (visited.has(node)) {
      return;
    }
    
    visited.add(node);
    recStack.add(node);
    path.push(node);
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path]);
    }
    
    recStack.delete(node);
  }
  
  // Run DFS from each node
  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  
  return cycles;
}