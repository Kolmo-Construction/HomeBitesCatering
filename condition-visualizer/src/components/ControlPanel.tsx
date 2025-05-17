import React, { useState } from 'react';
import { QuestionnaireDefinition } from '../services/api';
import './ControlPanel.css';

interface ControlPanelProps {
  definitions: QuestionnaireDefinition[];
  selectedDefinition: number | null;
  onSelectDefinition: (id: number) => void;
  isLoading: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  definitions,
  selectedDefinition,
  onSelectDefinition,
  isLoading
}) => {
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter definitions based on active status and search term
  const filteredDefinitions = definitions.filter(def => {
    // Filter by active status
    if (filterActive !== null && def.isActive !== filterActive) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !def.versionName.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="control-panel">
      <h2>Control Panel</h2>
      
      {/* Search and filter controls */}
      <div className="control-section">
        <h3>Questionnaire Definitions</h3>
        
        <div className="search-box">
          <input
            type="text"
            placeholder="Search questionnaires..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-options">
          <button 
            className={filterActive === null ? 'active' : ''} 
            onClick={() => setFilterActive(null)}
          >
            All
          </button>
          <button 
            className={filterActive === true ? 'active' : ''} 
            onClick={() => setFilterActive(true)}
          >
            Active
          </button>
          <button 
            className={filterActive === false ? 'active' : ''} 
            onClick={() => setFilterActive(false)}
          >
            Inactive
          </button>
        </div>
      </div>
      
      {/* Definition list */}
      <div className="definitions-list">
        {isLoading ? (
          <div className="loading">Loading definitions...</div>
        ) : filteredDefinitions.length === 0 ? (
          <div className="no-results">No definitions found</div>
        ) : (
          filteredDefinitions.map(def => (
            <div 
              key={def.id}
              className={`definition-item ${selectedDefinition === def.id ? 'selected' : ''}`}
              onClick={() => onSelectDefinition(def.id)}
            >
              <div className="definition-name">{def.versionName}</div>
              <div className="definition-description">{def.description || 'No description'}</div>
              <div className="definition-status">
                <span className={`status-badge ${def.isActive ? 'active' : 'inactive'}`}>
                  {def.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Visualization settings - can be expanded later */}
      {selectedDefinition && (
        <div className="visualization-settings">
          <h3>Visualization Settings</h3>
          
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Show question nodes
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Show page boundaries
            </label>
          </div>
          
          <div className="setting-item">
            <label>
              <input type="checkbox" defaultChecked />
              Highlight condition paths
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;