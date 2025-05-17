import React, { useState, useEffect } from 'react';
import ConditionGraph from './components/ConditionGraph';
import ControlPanel from './components/ControlPanel';
import { fetchQuestionnaireDefinitions } from './services/api';
import './App.css';

function App() {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [selectedDefinition, setSelectedDefinition] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDefinitions = async () => {
      setIsLoading(true);
      try {
        const data = await fetchQuestionnaireDefinitions();
        setDefinitions(data);
        setError(null);
      } catch (err) {
        setError('Failed to load questionnaire definitions');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefinitions();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Questionnaire Condition Visualizer</h1>
      </header>
      
      <main className="app-content">
        <div className="control-panel-container">
          <ControlPanel 
            definitions={definitions}
            selectedDefinition={selectedDefinition}
            onSelectDefinition={setSelectedDefinition}
            isLoading={isLoading}
          />
        </div>
        
        <div className="graph-container">
          {error && <div className="error-message">{error}</div>}
          {selectedDefinition && (
            <ConditionGraph definitionId={selectedDefinition} />
          )}
          {!selectedDefinition && !error && (
            <div className="placeholder-message">
              Select a questionnaire definition to visualize its conditions
            </div>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>Interactive visualization tool for questionnaire conditional logic</p>
      </footer>
    </div>
  );
}

export default App;