import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MessageCircle, 
  BarChart3, 
  AlertTriangle, 
  Wrench, 
  TrendingUp,
  RefreshCw,
  Send,
  Upload,
  Activity,
  Settings,
  Bell,
  Zap
} from 'lucide-react';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [qrResult, setQrResult] = useState(null);
  const [telemetryData, setTelemetryData] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [analysisData, setAnalysisData] = useState({});
  const [loading, setLoading] = useState({});
  const fileInputRef = useRef(null);

  // Debug function
  const debugLog = (message, data = null) => {
    console.log(`[Dashboard Debug] ${message}`, data);
  };

  // Test API endpoints
  const testAPIs = async () => {
    debugLog('Testing API endpoints...');
    
    const endpoints = [
      { name: 'QR Scanner', url: 'http://localhost:8081/health' },
      { name: 'Telemetry', url: 'http://localhost:8082/health' },
      { name: 'AI Chat', url: 'http://localhost:8090/health' },
      { name: 'Analysis', url: 'http://localhost:8085/health' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        debugLog(`${endpoint.name} API:`, response.ok ? 'Working' : 'Failed');
      } catch (error) {
        debugLog(`${endpoint.name} API:`, `Error - ${error.message}`);
      }
    }
  };

  // Telemetry polling every minute
  useEffect(() => {
    debugLog('Setting up telemetry polling...');
    
    const pollTelemetry = async () => {
      debugLog('Polling telemetry...');
      try {
        setLoading(prev => ({ ...prev, telemetry: true }));
        
        // Try the simulate endpoint
        const response = await fetch('http://localhost:8082/simulate');
        debugLog('Telemetry response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        debugLog('Telemetry data received:', data);
        setTelemetryData(data);
      } catch (error) {
        debugLog('Telemetry error:', error.message);
        setTelemetryData({ 
          error: `Connection failed: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(prev => ({ ...prev, telemetry: false }));
      }
    };

    // Test APIs on component mount
    testAPIs();
    
    pollTelemetry(); // Initial call
    const interval = setInterval(pollTelemetry, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // QR Scanner
  const handleQRScan = async () => {
    debugLog('QR scan initiated');

    try {
      setLoading(prev => ({ ...prev, qr: true }));
      debugLog('Creating form data for QR scan...');

      
      const response = await fetch('http://localhost:8081/read_qr', {
        method: 'POST'
      });
      
      debugLog('QR scan response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      debugLog('QR scan result:', data);
      setQrResult(data);
    } catch (error) {
      debugLog('QR scan error:', error.message);
      setQrResult({ 
        error: `Failed to scan QR code: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(prev => ({ ...prev, qr: false }));
    }
  };

  // Chat with AI
  const handleChatSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    debugLog('Chat message sent:', chatInput);
    const userMessage = { type: 'user', content: chatInput };
    const currentInput = chatInput;
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      setLoading(prev => ({ ...prev, chat: true }));
      
      const requestBody = { query: currentInput };
      debugLog('Chat request body:', requestBody);
      
      const response = await fetch('http://localhost:8090/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      debugLog('Chat response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const data = await response.json();
      debugLog('Full chat response data:', data);
      
      // Format the response from your FastAPI structure
      let aiResponseContent = '';
      
      if (data.error) {
        aiResponseContent = `Error: ${data.error}`;
      } else {
        // Create a nicely formatted response from your API structure
        aiResponseContent = `
**Query:** ${data.user_query || currentInput}

**SQL Generated:** 
\`\`\`sql
${data.sql_generated || 'No SQL generated'}
\`\`\`

**Reasoning:** ${data.model_reasoning || 'No reasoning provided'}

**Database Result:**
${data.db_result || 'No result'}
        `.trim();
      }
      
      const aiMessage = { 
        type: 'ai', 
        content: aiResponseContent,
        timestamp: new Date().toISOString(),
        rawData: data // Store raw data for debugging
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      debugLog('Chat error:', error.message);
      const errorMessage = { 
        type: 'ai', 
        content: `Error: ${error.message}. Check if the AI service is running on localhost:8090`,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(prev => ({ ...prev, chat: false }));
    }
  };

  // Analysis API calls
  const callAnalysisAPI = async (endpoint) => {
    try {
      setLoading(prev => ({ ...prev, [endpoint]: true }));
      const response = await fetch(`http://localhost:8085${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAnalysisData(prev => ({ ...prev, [endpoint]: data }));
      console.log(`Analysis ${endpoint} result:`, data);
    } catch (error) {
      console.error(`Analysis ${endpoint} error:`, error);
      setAnalysisData(prev => ({ ...prev, [endpoint]: { error: `Failed to load data: ${error.message}` } }));
    } finally {
      setLoading(prev => ({ ...prev, [endpoint]: false }));
    }
  };

  const TabButton = ({ id, icon: Icon, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const Card = ({ title, children, loading = false, onRefresh }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="animate-spin" size={24} />
          <span className="ml-2">Loading...</span>
        </div>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Asset Management Dashboard</h1>
          <p className="text-gray-600">Monitor, analyze, and manage your assets in real-time</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton id="overview" icon={BarChart3} label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
          <TabButton id="qr-scanner" icon={Camera} label="QR Scanner" active={activeTab === 'qr-scanner'} onClick={setActiveTab} />
          <TabButton id="telemetry" icon={Activity} label="Telemetry" active={activeTab === 'telemetry'} onClick={setActiveTab} />
          <TabButton id="chat" icon={MessageCircle} label="AI Chat" active={activeTab === 'chat'} onClick={setActiveTab} />
          <TabButton id="analysis" icon={TrendingUp} label="Analysis" active={activeTab === 'analysis'} onClick={setActiveTab} />
        </div>

        {/* Debug Panel */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Active Tab: {activeTab}</span>
            <span className="text-gray-500">|</span>
            <button 
              onClick={testAPIs}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Test All APIs
            </button>
            <span className="text-gray-500">|</span>
            <span>Check browser console for detailed logs</span>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="System Status">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>QR Scanner</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Telemetry</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    {telemetryData ? 'Running' : 'Connecting...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>AI Assistant</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">Ready</span>
                </div>
              </div>
            </Card>

            <Card title="Quick Stats">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Zap className="text-blue-600" size={20} />
                  <div>
                    <div className="font-semibold">Telemetry Updates</div>
                    <div className="text-sm text-gray-600">Every 60 seconds</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="text-green-600" size={20} />
                  <div>
                    <div className="font-semibold">Chat Messages</div>
                    <div className="text-sm text-gray-600">{chatMessages.length} total</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Recent Activity">
              <div className="space-y-2">
                {qrResult && (
                  <div className="text-sm text-gray-600">
                    QR Code scanned: {new Date().toLocaleTimeString()}
                  </div>
                )}
                {telemetryData && (
                  <div className="text-sm text-gray-600">
                    Telemetry updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
                {chatMessages.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Last chat: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* QR Scanner Tab */}
        {activeTab === 'qr-scanner' && (
          <div className="max-w-2xl mx-auto">
            <Card title="QR Code Scanner" loading={loading.qr}>
              <div className="space-y-4">
                <button
                  onClick={handleQRScan}
                  disabled={loading.qr}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Camera size={18} />
                  Load QR Data
                </button>

                {qrResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">QR Data:</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(qrResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Telemetry Tab */}
        {activeTab === 'telemetry' && (
          <div className="max-w-4xl mx-auto">
            <Card 
              title="Telemetry Data" 
              loading={loading.telemetry}
              onRefresh={async () => {
                try {
                  setLoading(prev => ({ ...prev, telemetry: true }));
                  const response = await fetch('http://localhost:8082/simulate');
                  const data = await response.json();
                  setTelemetryData(data);
                } catch (error) {
                  console.error('Manual telemetry refresh error:', error);
                } finally {
                  setLoading(prev => ({ ...prev, telemetry: false }));
                }
              }}
            >
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="text-blue-600" size={20} />
                    <span className="font-semibold">Auto-polling every 60 seconds</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Last updated: {telemetryData ? new Date().toLocaleString() : 'Never'}
                  </p>
                </div>
                
                {telemetryData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Current Data:</h4>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(telemetryData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <Card title="AI Assistant">
              <div className="space-y-4">
                <div className="h-96 border rounded-lg p-4 overflow-y-auto bg-gray-50">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Start a conversation with the AI assistant
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.type === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-800 shadow-sm'
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm">
                              {msg.content}
                            </div>
                            {msg.timestamp && (
                              <div className="text-xs opacity-70 mt-1">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {loading.chat && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-800 shadow-sm px-4 py-2 rounded-lg">
                            <RefreshCw className="animate-spin" size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything about your assets..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(e)}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || loading.chat}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send size={18} />
                    Send
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[
              { endpoint: '/run-all', title: 'Run All Analysis', icon: Settings },
              { endpoint: '/asset-dashboard', title: 'Asset Dashboard', icon: BarChart3 },
              { endpoint: '/usage-metrics', title: 'Usage Metrics', icon: TrendingUp },
              { endpoint: '/overdue-alerts', title: 'Overdue Alerts', icon: AlertTriangle },
              { endpoint: '/maintenance-alerts', title: 'Maintenance Alerts', icon: Wrench },
              { endpoint: '/anomalies', title: 'Anomalies', icon: Zap },
              { endpoint: '/predictive-allocation', title: 'Predictive Allocation', icon: TrendingUp },
              { endpoint: '/rollback-allocation', title: 'Rollback Allocation', icon: RefreshCw },
              { endpoint: '/alerts', title: 'All Alerts', icon: Bell },
            ].map(({ endpoint, title, icon: Icon }) => (
              <Card
                key={endpoint}
                title={title}
                loading={loading[endpoint]}
                onRefresh={() => callAnalysisAPI(endpoint)}
              >
                <div className="space-y-3">
                  <button
                    onClick={() => callAnalysisAPI(endpoint)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-2"
                  >
                    <Icon size={18} />
                    Load Data
                  </button>
                  
                  {analysisData[endpoint] && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">Response:</div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto max-h-32">
                        {JSON.stringify(analysisData[endpoint], null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;