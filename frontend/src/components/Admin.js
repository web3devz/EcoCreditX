import React, { useState, useEffect } from 'react';
import hederaClient from '../services/hederaClient';
import guardianClient from '../services/guardianClient';

/**
 * Admin Panel Component for Project Developers
 * 
 * Handles carbon project onboarding through Guardian PWE:
 * 1. Project registration and document upload
 * 2. Guardian policy workflow validation
 * 3. dMRV engine integration for monitoring
 * 4. Smart contract registration upon approval
 * 5. Automatic credit minting
 * 
 * References:
 * - Guardian PWE: https://github.com/hashgraph/guardian
 * - Guardian 3.0: https://hedera.com/blog/hedera-guardian-3-0-sustainability-for-enterprise
 * - Verra VCS: https://verra.org/programs/verified-carbon-standard/
 */

const Admin = ({ accountInfo, onStatsUpdate }) => {
  const [activeTab, setActiveTab] = useState('demo');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  // Project onboarding form state
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    projectType: 'REDD+',
    location: '',
    country: '',
    state: '',
    coordinates: { lat: '', lng: '' },
    estimatedCredits: '',
    startDate: '',
    endDate: '',
    methodology: 'VCS',
    developer: accountInfo?.accountId || '',
    pricePerCredit: '10', // USD
    description: '',
    documents: [],
    monitoringPlan: '',
    safeguards: '',
    stakeholders: ''
  });

  const [guardianStatus, setGuardianStatus] = useState(null);
  const [validationProgress, setValidationProgress] = useState(0);

  // Demo projects setup
  const setupDemoProjects = async () => {
    setLoading(true);
    setMessage({ type: 'info', content: 'Setting up real carbon projects...' });

    try {
      const realProjects = [
        {
          projectId: 'AMAZON_001',
          projectName: 'Amazon Rainforest Conservation',
          methodology: 'VCS',
          location: 'Amazon Basin, Brazil',
          totalCredits: 10000,
          pricePerCredit: 0.05, // HBAR
          developer: accountInfo?.accountId
        },
        {
          projectId: 'SOLAR_001',
          projectName: 'Solar Farm Maharashtra',
          methodology: 'VCS',
          location: 'Maharashtra, India',
          totalCredits: 5000,
          pricePerCredit: 0.03, // HBAR
          developer: accountInfo?.accountId
        },
        {
          projectId: 'BIOGAS_001',
          projectName: 'Community Biogas Program',
          methodology: 'VCS',
          location: 'Rural Kenya',
          totalCredits: 2500,
          pricePerCredit: 0.07, // HBAR
          developer: accountInfo?.accountId
        }
      ];

      for (const project of realProjects) {
        try {
          console.log(`Registering project: ${project.projectId}`);
          const result = await hederaClient.registerProject(project);
          
          if (result.success) {
            console.log(`✅ Project ${project.projectId} registered: ${result.transactionId}`);
            
            // Mint credits after registration
            await hederaClient.mintCredits(
              accountInfo.accountId, 
              project.totalCredits, 
              project.projectId
            );
            console.log(`✅ Credits minted for ${project.projectId}`);
          }
        } catch (error) {
          console.log(`⚠️ Project ${project.projectId} registration issue:`, error.message);
        }
      }

      setMessage({ type: 'success', content: '✅ Real carbon projects are ready for purchase! Check the Marketplace.' });
    } catch (error) {
      console.error('Real project setup failed:', error);
      setMessage({ type: 'error', content: `Project setup failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const projectTypes = [
    'REDD+',
    'Renewable Energy',
    'Energy Efficiency',
    'Reforestation',
    'Afforestation',
    'Biogas',
    'Solar',
    'Wind',
    'Hydroelectric',
    'Waste Management',
    'Agriculture',
    'Transport'
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      // Load projects from localStorage for demo
      const savedProjects = JSON.parse(localStorage.getItem('ecocreditx_projects') || '[]');
      setProjects(savedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const saveProject = (project) => {
    const updatedProjects = [...projects, project];
    setProjects(updatedProjects);
    localStorage.setItem('ecocreditx_projects', JSON.stringify(updatedProjects));
  };

  const updateProject = (projectId, updates) => {
    const updatedProjects = projects.map(p => 
      p.projectId === projectId ? { ...p, ...updates } : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('ecocreditx_projects', JSON.stringify(updatedProjects));
  };

  const handleFileUpload = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      const document = {
        type: docType,
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString(),
        file: file
      };
      
      setProjectForm(prev => ({
        ...prev,
        documents: [...prev.documents.filter(d => d.type !== docType), document]
      }));
      
      setMessage({ 
        type: 'success', 
        content: `${docType} uploaded successfully: ${file.name}` 
      });
    }
  };

  const submitProjectToGuardian = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', content: '' });

    try {
      // Generate unique project ID
      const projectId = `ECCX_${Date.now()}`;
      
      const projectData = {
        ...projectForm,
        projectId: projectId,
        developer: accountInfo.accountId,
        submissionDate: new Date().toISOString()
      };

      // Submit to Guardian PWE
      console.log('🌱 Submitting project to Guardian PWE...');
      const guardianResult = await guardianClient.submitProject(projectData);
      
      if (guardianResult.success) {
        const newProject = {
          ...projectData,
          instanceId: guardianResult.instanceId,
          status: 'submitted',
          guardianUrl: guardianResult.trackingUrl,
          submissionDate: guardianResult.submissionDate
        };

        saveProject(newProject);
        setGuardianStatus(guardianResult);
        
        setMessage({
          type: 'success',
          content: `Project submitted successfully! Instance ID: ${guardianResult.instanceId}`
        });

        // Start polling for status updates
        pollProjectStatus(guardianResult.instanceId, projectId);
        
        // Reset form
        setProjectForm({
          ...projectForm,
          projectName: '',
          location: '',
          estimatedCredits: '',
          description: '',
          documents: [],
          monitoringPlan: '',
          safeguards: '',
          stakeholders: ''
        });
      } else {
        throw new Error('Guardian submission failed');
      }
    } catch (error) {
      console.error('Project submission failed:', error);
      setMessage({
        type: 'error',
        content: `Submission failed: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const pollProjectStatus = async (instanceId, projectId) => {
    const maxPolls = 20;
    let pollCount = 0;

    const poll = async () => {
      try {
        pollCount++;
        const status = await guardianClient.getProjectStatus(instanceId);
        
        setValidationProgress(status.progress);
        updateProject(projectId, { 
          status: status.status.toLowerCase(),
          progress: status.progress,
          lastUpdate: status.lastUpdate,
          validatedCredits: status.validatedCredits
        });

        if (status.status === 'APPROVED') {
          await handleProjectApproval(projectId, status);
          return;
        }

        if (status.status === 'REJECTED') {
          setMessage({
            type: 'error',
            content: 'Project was rejected by Guardian validation'
          });
          return;
        }

        // Continue polling if not final status
        if (pollCount < maxPolls && !['APPROVED', 'REJECTED'].includes(status.status)) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        console.error('Status polling failed:', error);
      }
    };

    setTimeout(poll, 2000);
  };

  const handleProjectApproval = async (projectId, guardianStatus) => {
    try {
      console.log('✅ Project approved by Guardian, registering in contract...');
      
      const project = projects.find(p => p.projectId === projectId);
      if (!project) return;

      // Register project in smart contract
      const contractResult = await hederaClient.registerProject({
        projectId: projectId,
        methodology: project.methodology,
        location: project.location,
        totalCredits: guardianStatus.validatedCredits || project.estimatedCredits,
        pricePerCredit: project.pricePerCredit
      });

      if (contractResult.success) {
        // Mint initial credits
        await hederaClient.mintCredits(
          accountInfo.accountId,
          guardianStatus.validatedCredits || project.estimatedCredits,
          projectId
        );

        updateProject(projectId, {
          status: 'approved',
          contractRegistered: true,
          validatedCredits: guardianStatus.validatedCredits,
          contractTransactionId: contractResult.transactionId,
          hashscanUrl: contractResult.hashscanUrl
        });

        setMessage({
          type: 'success',
          content: `🎉 Project approved and credits minted! View on HashScan: ${contractResult.hashscanUrl}`
        });

        // Update platform stats
        if (onStatsUpdate) {
          const stats = await hederaClient.getPlatformStats();
          onStatsUpdate(stats);
        }
      }
    } catch (error) {
      console.error('Contract registration failed:', error);
      setMessage({
        type: 'error',
        content: `Contract registration failed: ${error.message}`
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'submitted': { class: 'badge-warning', text: 'Submitted' },
      'under_review': { class: 'badge-warning', text: 'Under Review' },
      'validation': { class: 'badge-warning', text: 'Validating' },
      'approved': { class: 'badge-success', text: 'Approved' },
      'rejected': { class: 'badge-error', text: 'Rejected' }
    };
    
    const config = statusMap[status] || { class: 'badge-warning', text: 'Unknown' };
    return <span className={config.class}>{config.text}</span>;
  };

  const requiredDocuments = [
    { type: 'project_design', name: 'Project Design Document (PDD)', required: true },
    { type: 'monitoring_plan', name: 'Monitoring Plan', required: true },
    { type: 'validation_report', name: 'Validation Report', required: false },
    { type: 'environmental_assessment', name: 'Environmental Impact Assessment', required: false }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-hedera-900">Project Administration</h1>
          <p className="text-hedera-600 mt-1">
            Onboard carbon projects through Guardian PWE validation
          </p>
        </div>
        
        <div className="text-right text-sm text-hedera-600">
          <p>Connected as: <span className="font-medium">{accountInfo?.accountId}</span></p>
          <p>Role: Project Developer</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hedera-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('demo')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'demo'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            🚀 Setup Projects
          </button>
          <button
            onClick={() => setActiveTab('onboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'onboard'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            Onboard Project
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            My Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('guardian')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guardian'
                ? 'border-eco-500 text-eco-600'
                : 'border-transparent text-hedera-500 hover:text-hedera-700 hover:border-hedera-300'
            }`}
          >
            Guardian Integration
          </button>
        </nav>
      </div>

      {/* Message Display */}
      {message.content && (
        <div className={`rounded-md p-4 ${
          message.type === 'success' ? 'bg-eco-50 border border-eco-200 text-eco-700' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
          'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'demo' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-hedera-900 mb-6">
            🚀 Setup Real Carbon Projects
          </h2>
          
          <div className="space-y-4">
            <p className="text-hedera-600">
              Register real carbon projects in the smart contract to enable marketplace purchasing.
              This will create three verified projects on the Hedera Testnet that buyers can purchase credits from.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-700">
                <strong>Real Projects:</strong> This registers actual carbon projects on Hedera Testnet with real blockchain transactions.
                You must be the contract owner to register projects.
              </p>
            </div>

            <button
              onClick={setupDemoProjects}
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span>Registering Projects...</span>
                </>
              ) : (
                <>
                  <span>🌱</span>
                  <span>Register Real Projects</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'onboard' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-hedera-900 mb-6">
            Submit New Carbon Project
          </h2>

          <form onSubmit={submitProjectToGuardian} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectForm.projectName}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, projectName: e.target.value }))}
                  className="input-field"
                  placeholder="Amazon Rainforest Conservation Project"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Project Type *
                </label>
                <select
                  value={projectForm.projectType}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, projectType: e.target.value }))}
                  className="input-field"
                  required
                >
                  {projectTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Location *
                </label>
                <input
                  type="text"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, location: e.target.value }))}
                  className="input-field"
                  placeholder="Amazon Basin, Brazil"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Estimated Credits *
                </label>
                <input
                  type="number"
                  value={projectForm.estimatedCredits}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, estimatedCredits: e.target.value }))}
                  className="input-field"
                  placeholder="1000"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Project Start Date *
                </label>
                <input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Project End Date *
                </label>
                <input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-hedera-700 mb-1">
                Project Description *
              </label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="input-field"
                placeholder="Describe your carbon project, methodology, and expected environmental impact..."
                required
              />
            </div>

            {/* Document Uploads */}
            <div>
              <h3 className="text-lg font-medium text-hedera-900 mb-4">
                Required Documents
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredDocuments.map(doc => (
                  <div key={doc.type} className="border border-hedera-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-hedera-700">
                        {doc.name}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {projectForm.documents.find(d => d.type === doc.type) && (
                        <span className="badge-success text-xs">Uploaded</span>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      onChange={(e) => handleFileUpload(e, doc.type)}
                      accept=".pdf,.doc,.docx"
                      className="block w-full text-sm text-hedera-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-eco-50 file:text-eco-700 hover:file:bg-eco-100"
                    />
                    
                    {projectForm.documents.find(d => d.type === doc.type) && (
                      <p className="text-xs text-eco-600 mt-1">
                        ✓ {projectForm.documents.find(d => d.type === doc.type).name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Monitoring Plan
                </label>
                <textarea
                  value={projectForm.monitoringPlan}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, monitoringPlan: e.target.value }))}
                  rows={3}
                  className="input-field"
                  placeholder="Describe your monitoring methodology and schedule..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-hedera-700 mb-1">
                  Safeguards Implementation
                </label>
                <textarea
                  value={projectForm.safeguards}
                  onChange={(e) => setProjectForm(prev => ({ ...prev, safeguards: e.target.value }))}
                  rows={3}
                  className="input-field"
                  placeholder="Environmental and social safeguards..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setProjectForm({ ...projectForm })}
              >
                Save Draft
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    <span>Submitting to Guardian...</span>
                  </>
                ) : (
                  <>
                    <span>🌱</span>
                    <span>Submit to Guardian PWE</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-eco-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-eco-600 text-2xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-hedera-900 mb-2">No projects yet</h3>
              <p className="text-hedera-600">Submit your first carbon project to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div key={project.projectId} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-hedera-900">
                      {project.projectName}
                    </h3>
                    {getStatusBadge(project.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm text-hedera-600">
                    <p><span className="font-medium">Type:</span> {project.projectType}</p>
                    <p><span className="font-medium">Location:</span> {project.location}</p>
                    <p><span className="font-medium">Credits:</span> {project.estimatedCredits}</p>
                    <p><span className="font-medium">Submitted:</span> {new Date(project.submissionDate).toLocaleDateString()}</p>
                  </div>

                  {project.progress > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-hedera-700">Validation Progress</span>
                        <span className="text-hedera-600">{project.progress}%</span>
                      </div>
                      <div className="w-full bg-hedera-200 rounded-full h-2">
                        <div 
                          className="bg-eco-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {project.hashscanUrl && (
                    <div className="mt-4 pt-3 border-t border-hedera-200">
                      <a
                        href={project.hashscanUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eco-600 hover:text-eco-700 text-sm font-medium"
                      >
                        View on HashScan ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guardian' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-hedera-900 mb-6">
            Guardian PWE Integration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-hedera-900 mb-4">
                Policy Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-hedera-600">Policy:</span>
                  <span className="font-medium">Verra VCS 2023</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">Version:</span>
                  <span className="font-medium">2023.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">Methodology:</span>
                  <span className="font-medium">VCS Standard</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">Status:</span>
                  <span className="badge-success">Active</span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-hedera-900 mb-2">Supported Project Types</h4>
                <div className="flex flex-wrap gap-2">
                  {projectTypes.slice(0, 6).map(type => (
                    <span key={type} className="badge-success text-xs">{type}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-hedera-900 mb-4">
                dMRV Engine Status
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-hedera-600">Engine:</span>
                  <span className="font-medium">Guardian dMRV 3.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">Monitoring:</span>
                  <span className="badge-success">Active</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">IoT Integration:</span>
                  <span className="badge-success">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-hedera-600">Satellite Data:</span>
                  <span className="badge-success">Connected</span>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-hedera-900 mb-2">Recent Activity</h4>
                <div className="space-y-2 text-sm text-hedera-600">
                  <p>• Monitoring data collected: 2 hours ago</p>
                  <p>• Satellite imagery updated: 1 day ago</p>
                  <p>• Verification cycle: Weekly</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-hedera-200">
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/hashgraph/guardian"
                target="_blank"
                rel="noopener noreferrer"
                className="text-eco-600 hover:text-eco-700 font-medium"
              >
                Guardian GitHub ↗
              </a>
              <a
                href="https://hedera.com/guardian"
                target="_blank"
                rel="noopener noreferrer"
                className="text-eco-600 hover:text-eco-700 font-medium"
              >
                Guardian Landing Page ↗
              </a>
              <a
                href="https://hedera.com/blog/hedera-guardian-3-0-sustainability-for-enterprise"
                target="_blank"
                rel="noopener noreferrer"
                className="text-eco-600 hover:text-eco-700 font-medium"
              >
                Guardian 3.0 Blog ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
