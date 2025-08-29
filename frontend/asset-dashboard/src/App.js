import React, { useState, useEffect, useRef } from 'react';
import './App.css';
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
  const [equipmentData, setEquipmentData] = useState([]);
  const [loading, setLoading] = useState({});
  const [emailPopup, setEmailPopup] = useState({ show: false, siteId: '' });
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);

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
    
    // Clear input immediately and maintain focus
    setChatInput('');
    setChatMessages(prev => [...prev, userMessage]);
    
    // Focus back to input after state update
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }, 0);

    try {
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
        const dbResult = data.db_result;
        let resultDisplay = 'No result';
        
        if (dbResult && Array.isArray(dbResult) && dbResult.length > 0) {
          if (dbResult.length === 1 && typeof dbResult[0] === 'object') {
            // Single object result
            resultDisplay = JSON.stringify(dbResult[0], null, 2);
          } else if (dbResult.length > 1) {
            // Multiple results - show first few
            const displayCount = Math.min(dbResult.length, 5);
            resultDisplay = `Found ${dbResult.length} results. Showing first ${displayCount}:\n\n${JSON.stringify(dbResult.slice(0, displayCount), null, 2)}`;
            if (dbResult.length > 5) {
              resultDisplay += `\n\n... and ${dbResult.length - 5} more results`;
            }
          } else {
            // Other array results
            resultDisplay = JSON.stringify(dbResult, null, 2);
          }
        } else if (dbResult && typeof dbResult === 'object') {
          // Object result
          resultDisplay = JSON.stringify(dbResult, null, 2);
        } else if (dbResult && dbResult !== '') {
          // String or other result
          resultDisplay = String(dbResult);
        }
        
        aiResponseContent = `
**Query:** ${data.user_query || currentInput}

**SQL Generated:** 
\`\`\`sql
${data.sql_generated || 'No SQL generated'}
\`\`\`

**Reasoning:** ${data.model_reasoning || 'No reasoning provided'}

**Database Result:**
${resultDisplay}
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
      
      // If this is the asset dashboard endpoint, store the equipment data
      if (endpoint === '/asset-dashboard') {
        setEquipmentData(data);
      }
      
      console.log(`Analysis ${endpoint} result:`, data);
    } catch (error) {
      console.error(`Analysis ${endpoint} error:`, error);
      setAnalysisData(prev => ({ ...prev, [endpoint]: { error: `Failed to load data: ${error.message}` } }));
    } finally {
      setLoading(prev => ({ ...prev, [endpoint]: false }));
    }
  };

  // Load equipment data on component mount
  useEffect(() => {
    callAnalysisAPI('/asset-dashboard');
  }, []);

  // Maintain chat input focus when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat' && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [activeTab]);

  // Helper function to group equipment by site
  const groupEquipmentBySite = (equipment) => {
    if (!Array.isArray(equipment)) return {};
    
    const grouped = {};
    equipment.forEach(item => {
      const siteId = item.site_id || 'Unknown Site';
      if (!grouped[siteId]) {
        grouped[siteId] = [];
      }
      grouped[siteId].push(item);
    });
    return grouped;
  };

  // Helper function to get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: '#FFCD00', text: '#000000' };
      case 'overdue':
        return { bg: '#FF6B6B', text: '#ffffff' };
      case 'returned':
        return { bg: '#4ECDC4', text: '#ffffff' };
      case 'maintenance':
        return { bg: '#FF6B6B', text: '#ffffff' };
      default:
        return { bg: '#666666', text: '#ffffff' };
    }
  };

  // Helper function to check if equipment has alerts
  const hasAlerts = (item) => {
    return (
      item.alert_type && item.alert_type !== 'None' ||
      item.overdue_status === 1 ||
      item.anomaly_flag === 1 ||
      item.condition_status === 'Critical'
    );
  };

  // Helper function to get equipment styling (no red border on whole item)
  const getEquipmentStyling = () => {
    return {
      border: '1px solid rgba(255, 255, 255, 0.1)',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    };
  };

  // Helper function to get site emoji
  const getSiteEmoji = (siteId) => {
    if (siteId.includes('SITE')) return '🏗️';
    if (siteId.includes('MINE')) return '⛏️';
    if (siteId.includes('INFRA')) return '🏗️';
    return '📍';
  };

  // Helper function to get priority level based on AI analysis
  const getPriorityLevel = (item) => {
    if (item.overdue_status === 1) return '🔴 HIGH - Overdue';
    if (item.condition_status === 'Critical') return '🔴 HIGH - Critical Condition';
    if (item.anomaly_flag === 1) return '🟡 MEDIUM - Anomaly Detected';
    if (item.utilization_pct_snapshot && item.utilization_pct_snapshot < 50) return '🟡 MEDIUM - Low Utilization';
    if (item.predicted_demand_score && item.predicted_demand_score > 0.8) return '🟢 LOW - High Demand';
    return '🟢 LOW - Normal Operations';
  };

  // Helper function to get recommended actions based on AI analysis
  const getRecommendedActions = (item) => {
    const actions = [];
    
    // Overdue actions
    if (item.overdue_status === 1) {
      actions.push('• Contact customer for immediate return');
      actions.push('• Assess penalty fees');
    }
    
    // Maintenance actions
    if (item.condition_status === 'Critical') {
      actions.push('• Schedule emergency maintenance');
      actions.push('• Remove from active fleet');
    }
    
    if (item.breakdowns_reported > 2) {
      actions.push('• Investigate recurring issues');
      actions.push('• Consider replacement');
    }
    
    // Utilization actions
    if (item.utilization_pct_snapshot && item.utilization_pct_snapshot < 50) {
      actions.push('• Reallocate to busier site');
      actions.push('• Offer promotional rates');
    }
    
    // AI recommendations
    if (item.recommended_site && item.recommended_site !== item.site_id) {
      actions.push('• Consider relocation to ' + item.recommended_site);
    }
    
    if (item.predicted_demand_score && item.predicted_demand_score > 0.8) {
      actions.push('• Prepare for high demand period');
      actions.push('• Ensure maintenance is current');
    }
    
    // Default action if no specific recommendations
    if (actions.length === 0) {
      actions.push('• Continue monitoring');
      actions.push('• Regular maintenance schedule');
    }
    
    return actions.slice(0, 3).join('\n'); // Show top 3 actions
  };

  // Function to handle alert click and show email popup
  const handleAlertClick = (siteId) => {
    setEmailPopup({ show: true, siteId });
  };

  const TabButton = ({ id, icon: Icon, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`tab-caterpillar flex items-center gap-3 ${
        active ? 'active' : ''
      }`}
      style={{
        backgroundColor: active ? '#FFCD00' : '#333333',
        color: active ? '#000000' : '#ffffff',
        border: active ? '2px solid #FFCD00' : '2px solid #555555',
        padding: '16px 24px',
        margin: '8px',
        borderRadius: '12px',
        fontWeight: active ? '700' : '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: active ? '0 6px 12px rgba(255, 205, 0, 0.4)' : '0 4px 8px rgba(0, 0, 0, 0.3)',
        fontSize: '16px',
        minWidth: '140px',
        justifyContent: 'center'
      }}
    >
      <Icon size={20} />
      {label}
    </button>
  );

  const Card = ({ title, children, loading = false, onRefresh }) => (
    <div className="card-caterpillar" style={{
      background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
      border: '2px solid #FFCD00',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 205, 0, 0.1)',
      transition: 'all 0.3s ease',
      color: '#ffffff',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="flex justify-between items-center mb-8" style={{ borderBottom: '1px solid rgba(255, 205, 0, 0.3)', paddingBottom: '12px' }}>
        <h3 className="text-xl font-bold" style={{ color: '#FFCD00', letterSpacing: '0.5px' }}>{title}</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '12px',
              margin: '8px',
              borderRadius: '10px',
              backgroundColor: '#FFCD00',
              color: '#000000',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ flex: '1' }}>
            <RefreshCw className="animate-spin" style={{ color: '#FFCD00' }} size={28} />
            <span className="ml-4 text-lg font-medium" style={{ color: '#ffffff' }}>Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );

  return (
    <div className="App" style={{ 
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 25%, #1a1a1a 50%, #0f0f0f 100%)', 
      minHeight: '100vh',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      <div className="p-8" style={{ 
        width: '100%', 
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div className="mb-12" style={{ textAlign: 'center' }}>
          <h1 className="dashboard-header text-4xl mb-4" style={{ 
            color: '#FFCD00', 
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            fontWeight: '800',
            letterSpacing: '0.5px'
          }}>
            Caterpillar Asset Management Dashboard
          </h1>
          <p className="dashboard-subtitle" style={{ 
            color: '#ffffff', 
            fontSize: '20px',
            fontWeight: '400',
            letterSpacing: '0.3px',
            opacity: '0.9'
          }}>
            Monitor, analyze, and manage your construction assets in real-time
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-4 mb-10" style={{ 
          justifyContent: 'center',
          padding: '16px 0',
          borderBottom: '1px solid rgba(255, 205, 0, 0.2)',
          marginBottom: '24px'
        }}>
          <TabButton id="overview" icon={BarChart3} label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
          <TabButton id="qr-scanner" icon={Camera} label="QR Scanner" active={activeTab === 'qr-scanner'} onClick={setActiveTab} />
          <TabButton id="telemetry" icon={Activity} label="Telemetry" active={activeTab === 'telemetry'} onClick={setActiveTab} />
          <TabButton id="chat" icon={MessageCircle} label="AI Chat" active={activeTab === 'chat'} onClick={setActiveTab} />
          <TabButton id="analysis" icon={TrendingUp} label="Analysis" active={activeTab === 'analysis'} onClick={setActiveTab} />
        </div>

        {/* Debug Panel */}
        <div className="mb-8 p-5 rounded-lg" style={{ 
          background: 'linear-gradient(135deg, #FFCD00 0%, #FFB800 100%)',
          border: '2px solid #FFCD00',
          boxShadow: '0 6px 12px rgba(255, 205, 0, 0.3)',
          textAlign: 'center'
        }}>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="font-semibold" style={{ color: '#000000' }}>Active Tab: {activeTab}</span>
            <span style={{ color: '#000000' }}>|</span>
            <button 
              onClick={testAPIs}
              style={{ 
                color: '#000000', 
                textDecoration: 'underline', 
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Test All APIs
            </button>
            <span style={{ color: '#000000' }}>|</span>
            <span style={{ color: '#000000' }}>Check browser console for detailed logs</span>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" style={{ 
            padding: '24px 0',
            justifyContent: 'center'
          }}>
            <Card title="Equipment Status by Site">
              <div className="space-y-6" style={{ padding: '8px 0' }}>
                {loading['/asset-dashboard'] ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ fontSize: '16px', opacity: '0.8' }}>
                      Loading equipment data...
                    </div>
                  </div>
                ) : equipmentData.length > 0 ? (
                  Object.entries(groupEquipmentBySite(equipmentData)).map(([siteId, equipment]) => (
                    <div key={siteId} style={{ 
                      border: '2px solid #555555',
                      borderRadius: '16px',
                      padding: '20px',
                      backgroundColor: 'rgba(255, 205, 0, 0.05)',
                      marginBottom: '16px'
                    }}>
                      <h4 style={{ 
                        color: '#FFCD00',
                        fontSize: '18px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        borderBottom: '1px solid #555555',
                        paddingBottom: '12px',
                        textAlign: 'center',
                        letterSpacing: '0.5px'
                      }}>
                        {getSiteEmoji(siteId)} {siteId}
                      </h4>
                      
                      <div className="space-y-4" style={{ padding: '8px 0' }}>
                        {equipment.map((item, index) => {
                          const statusColors = getStatusColor(item.status);
                          return (
                            <div key={item.equipment_id} style={{ 
                              margin: '16px 0',
                              padding: '20px',
                              borderRadius: '16px',
                              ...getEquipmentStyling()
                            }}>
                              {/* Equipment Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div style={{ flex: '1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ 
                                      color: '#FFCD00', 
                                      fontWeight: '700',
                                      fontSize: '16px',
                                      letterSpacing: '0.3px'
                                    }}>
                                      {item.type} {item.equipment_id}
                                    </span>
                                    {hasAlerts(item) && (
                                      <span style={{
                                        backgroundColor: '#FF6B6B',
                                        color: '#ffffff',
                                        padding: '2px 6px',
                                        borderRadius: '8px',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        letterSpacing: '0.5px'
                                      }}>
                                        ⚠️ ALERT
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ 
                                    color: '#cccccc', 
                                    fontSize: '12px', 
                                    marginTop: '4px',
                                    lineHeight: '1.4'
                                  }}>
                                    QR Tag: {item.qr_tag_id} • Site: {item.site_id}
                                  </div>
                                </div>
                                <span className="status-badge" style={{
                                  backgroundColor: statusColors.bg,
                                  color: statusColors.text,
                                  padding: '8px 16px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  border: `2px solid ${statusColors.bg}`,
                                  minWidth: '70px',
                                  textAlign: 'center',
                                  letterSpacing: '0.3px',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                                  marginLeft: '16px',
                                  display: 'inline-block'
                                }}>
                                  {item.status || 'Unknown'}
                                </span>
                              </div>

                              {/* Detailed Information Grid */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                gap: '16px',
                                marginTop: '16px'
                              }}>
                                {/* Location & GPS */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    📍 Location & GPS
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Coordinates: {item.location_coordinates || 'GPS Tracking'}
                                  </div>
                                </div>

                                {/* Rental Information */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    📅 Rental Details
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Check Out: {item.check_out_date || 'N/A'}<br/>
                                    Expected Return: {item.expected_return_date || 'N/A'}<br/>
                                    {item.check_in_date && `Returned: ${item.check_in_date}`}
                                  </div>
                                </div>

                                {/* Usage Metrics */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    ⚡ Usage Metrics
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Engine Hours: {item.last_engine_hpd || 'N/A'} hrs/day<br/>
                                    Idle Hours: {item.last_idle_hpd || 'N/A'} hrs/day<br/>
                                    Utilization: {item.utilization_pct_snapshot ? `${item.utilization_pct_snapshot.toFixed(1)}%` : 'N/A'}
                                  </div>
                                </div>

                                {/* Last Activity */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    🕒 Last Activity
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Last Seen: {item.last_seen || 'N/A'}<br/>
                                    Operating Days: {item.operating_days || 'N/A'}<br/>
                                    Downtime: {item.downtime_hours || '0'} hrs
                                  </div>
                                </div>
                              </div>

                              {/* Additional Details Row */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                gap: '16px',
                                marginTop: '16px'
                              }}>
                                {/* Financial Data */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    💰 Financial
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Rental Rate: ${item.rental_rate_per_day || 'N/A'}/day<br/>
                                    Total Cost: ${item.total_rental_cost || 'N/A'}<br/>
                                    Fuel Cost: ${item.fuel_cost || 'N/A'}
                                  </div>
                                </div>

                                {/* Maintenance Status */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    🔧 Maintenance
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Last Service: {item.last_service_date || 'N/A'}<br/>
                                    Next Service: {item.next_service_due || 'N/A'}<br/>
                                    Condition: {item.condition_status || 'N/A'}
                                  </div>
                                </div>

                                {/* AI Insights */}
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ color: '#FFCD00', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                                    🤖 AI Insights
                                  </div>
                                  <div style={{ color: '#ffffff', fontSize: '11px', lineHeight: '1.4' }}>
                                    Utilization Rate: {item.utilization_rate ? `${(item.utilization_rate * 100).toFixed(1)}%` : 'N/A'}<br/>
                                    Idle Ratio: {item.idle_ratio ? `${(item.idle_ratio * 100).toFixed(1)}%` : 'N/A'}<br/>
                                    Demand Score: {item.predicted_demand_score ? item.predicted_demand_score.toFixed(2) : 'N/A'}
                                  </div>
                                </div>

                                {/* Alerts & Notifications */}
                                <div 
                                  onClick={() => hasAlerts(item) && handleAlertClick(item.site_id)}
                                  style={{ 
                                    padding: '12px',
                                    backgroundColor: hasAlerts(item) ? 'rgba(255, 107, 107, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '8px',
                                    border: hasAlerts(item) ? '2px solid #FF6B6B' : '1px solid rgba(255, 255, 255, 0.05)',
                                    boxShadow: hasAlerts(item) ? '0 2px 8px rgba(255, 107, 107, 0.3)' : 'none',
                                    cursor: hasAlerts(item) ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  <div style={{ 
                                    color: hasAlerts(item) ? '#FF6B6B' : '#FFCD00', 
                                    fontSize: '12px', 
                                    fontWeight: '700', 
                                    marginBottom: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}>
                                    ⚠️ Alerts
                                    {hasAlerts(item) && (
                                      <span style={{
                                        backgroundColor: '#FF6B6B',
                                        color: '#ffffff',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        fontSize: '9px',
                                        fontWeight: '600',
                                        letterSpacing: '0.5px'
                                      }}>
                                        ACTIVE
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ 
                                    color: hasAlerts(item) ? '#FFE6E6' : '#ffffff', 
                                    fontSize: '11px', 
                                    lineHeight: '1.4' 
                                  }}>
                                    Alert Type: {item.alert_type || 'None'}<br/>
                                    Overdue: {item.overdue_status ? 'Yes' : 'No'}<br/>
                                    Anomaly: {item.anomaly_flag ? 'Detected' : 'None'}
                                    {hasAlerts(item) && (
                                      <div style={{ 
                                        marginTop: '6px', 
                                        padding: '6px 8px', 
                                        backgroundColor: 'rgba(255, 107, 107, 0.25)', 
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        border: '1px solid rgba(255, 107, 107, 0.4)',
                                        textAlign: 'center'
                                      }}>
                                        ⚠️ REQUIRES IMMEDIATE ATTENTION
                                      </div>
                                    )}
                                    {hasAlerts(item) && (
                                      <div style={{ 
                                        marginTop: '4px', 
                                        fontSize: '9px', 
                                        color: '#FFCD00', 
                                        fontStyle: 'italic',
                                        textAlign: 'center'
                                      }}>
                                        Click to send email notification
                                      </div>
                                    )}
                                  </div>
                                </div>


                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ fontSize: '16px', opacity: '0.8' }}>
                      No equipment data available.
                    </div>
                    <button 
                      onClick={() => callAnalysisAPI('/asset-dashboard')}
                      style={{
                        backgroundColor: '#FFCD00',
                        color: '#000000',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        letterSpacing: '0.3px',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Refresh Data
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Quick Stats">
              <div className="space-y-3">
                <div className="flex items-center gap-3" style={{ margin: '16px 0' }}>
                  <Zap style={{ color: '#FFCD00' }} size={20} />
                  <div>
                    <div className="font-semibold" style={{ color: '#FFCD00' }}>Telemetry Updates</div>
                    <div className="text-sm" style={{ color: '#ffffff' }}>Every 60 seconds</div>
                  </div>
                </div>
                <div className="flex items-center gap-3" style={{ margin: '16px 0' }}>
                  <MessageCircle style={{ color: '#FFCD00' }} size={20} />
                  <div>
                    <div className="font-semibold" style={{ color: '#FFCD00' }}>Chat Messages</div>
                    <div className="text-sm" style={{ color: '#ffffff' }}>{chatMessages.length} total</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Recent Activity">
                              <div className="space-y-2">
                  {qrResult && (
                    <div className="text-sm" style={{ color: '#ffffff', margin: '8px 0', padding: '4px 0' }}>
                      QR Code scanned: {new Date().toLocaleTimeString()}
                    </div>
                  )}
                  {telemetryData && (
                    <div className="text-sm" style={{ color: '#ffffff', margin: '8px 0', padding: '4px 0' }}>
                      Telemetry updated: {new Date().toLocaleTimeString()}
                    </div>
                  )}
                  {chatMessages.length > 0 && (
                    <div className="text-sm" style={{ color: '#ffffff', margin: '8px 0', padding: '4px 0' }}>
                      Last chat: {new Date().toLocaleTimeString()}
                    </div>
                  )}
                </div>
            </Card>
          </div>
        )}

        {/* QR Scanner Tab */}
        {activeTab === 'qr-scanner' && (
          <div className="max-w-2xl mx-auto" style={{ padding: '20px 0' }}>
            <Card title="QR Code Scanner" loading={loading.qr}>
              <div className="space-y-4">
                <button
                  onClick={handleQRScan}
                  disabled={loading.qr}
                  className="btn-caterpillar w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                  style={{
                    backgroundColor: '#FFCD00',
                    color: '#000000',
                    border: 'none',
                    padding: '20px 32px',
                    margin: '16px 0',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
                    fontSize: '18px',
                    minHeight: '60px'
                  }}
                >
                  <Camera size={24} />
                  Load QR Data
                </button>

                {qrResult && (
                  <div className="mt-6 p-6 rounded-lg" style={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #555555'
                  }}>
                    <h4 className="font-semibold mb-4" style={{ color: '#FFCD00' }}>QR Data:</h4>
                    <pre className="text-sm whitespace-pre-wrap" style={{ color: '#ffffff' }}>
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
          <div style={{ padding: '10px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
              border: '2px solid #FFCD00',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 205, 0, 0.1)',
              color: '#ffffff',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {/* Header */}
              <div style={{ 
                borderBottom: '1px solid rgba(255, 205, 0, 0.3)', 
                paddingBottom: '12px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FFCD00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  📡
                </div>
                <div>
                  <h3 style={{ color: '#FFCD00', fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>
                    Real-Time Telemetry Dashboard
                  </h3>
                  <p style={{ color: '#cccccc', fontSize: '14px', margin: '0' }}>
                    Live monitoring of equipment performance and operational metrics
                  </p>
                </div>
              </div>

              {/* Status Overview */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(255, 205, 0, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 205, 0, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#FFCD00', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    🔄 Auto-Polling Status
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
                    Active
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px' }}>
                    Every 60 seconds
                  </div>
                </div>

                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#4CAF50', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    📊 Data Points
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
                    {telemetryData ? Object.keys(telemetryData).length : 0}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px' }}>
                    Metrics captured
                  </div>
                </div>

                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(0, 150, 255, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 150, 255, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#0096FF', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    🕒 Last Update
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                    {telemetryData ? new Date().toLocaleTimeString() : 'Never'}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px' }}>
                    {telemetryData ? new Date().toLocaleDateString() : 'No data'}
                  </div>
                </div>

                <div style={{ 
                  padding: '16px',
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#FF6B6B', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    ⚠️ Connection
                  </div>
                  <div style={{ color: '#ffffff', fontSize: '18px', fontWeight: '700' }}>
                    {telemetryData ? 'Connected' : 'Disconnected'}
                  </div>
                  <div style={{ color: '#cccccc', fontSize: '12px' }}>
                    localhost:8082
                  </div>
                </div>
              </div>

              {/* Refresh Button */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <button
                  onClick={async () => {
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
                  disabled={loading.telemetry}
                  style={{
                    backgroundColor: '#FFCD00',
                    color: '#000000',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    fontSize: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  {loading.telemetry ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={20} />
                      Refresh Telemetry
                    </>
                  )}
                </button>
              </div>

              {/* Telemetry Data Display */}
              {telemetryData ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                  gap: '16px' 
                }}>
                  {Object.entries(telemetryData).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        padding: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative'
                      }}
                    >
                      <div style={{ 
                        color: '#FFCD00', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        marginBottom: '8px',
                        textTransform: 'capitalize'
                      }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{ 
                        color: '#ffffff', 
                        fontSize: '16px',
                        fontWeight: '500',
                        wordBreak: 'break-word'
                      }}>
                        {typeof value === 'object' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {Object.entries(value).map(([subKey, subValue]) => (
                              <div key={subKey} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#cccccc', fontSize: '12px' }}>
                                  {subKey.replace(/_/g, ' ')}:
                                </span>
                                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: '500' }}>
                                  {String(subValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          String(value)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#888888',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px', color: '#cccccc' }}>
                    No telemetry data available
                  </div>
                  <div style={{ fontSize: '14px', color: '#888888' }}>
                    Click "Refresh Telemetry" to load data from the simulator
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div style={{ padding: '10px 0' }}>
            <div style={{
              background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
              border: '2px solid #FFCD00',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.3), 0 0 30px rgba(255, 205, 0, 0.1)',
              color: '#ffffff',
              maxWidth: '1000px',
              margin: '0 auto',
              minWidth: '320px' // Ensures minimum width for mobile
            }}>
              {/* Header */}
              <div style={{ 
                borderBottom: '1px solid rgba(255, 205, 0, 0.3)', 
                paddingBottom: '12px', 
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: '#FFCD00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  🤖
                </div>
                <div>
                  <h3 style={{ color: '#FFCD00', fontSize: '20px', fontWeight: '700', margin: '0 0 4px 0' }}>
                    AI Asset Assistant
                  </h3>
                  <p style={{ color: '#cccccc', fontSize: '14px', margin: '0' }}>
                    Ask me anything about your construction assets, maintenance, or operations
                  </p>
                </div>
              </div>



              {/* Chat Messages */}
              <div style={{ 
                height: '400px', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                overflowY: 'auto',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                marginBottom: '20px'
              }}>
                {chatMessages.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#888888', 
                    padding: '40px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ 
                      width: '60px', 
                      height: '60px', 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(255, 205, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '30px'
                    }}>
                      💬
                    </div>
                    <div>
                      <div style={{ fontSize: '18px', marginBottom: '8px', color: '#cccccc' }}>
                        Start a conversation
                      </div>
                      <div style={{ fontSize: '14px', color: '#888888' }}>
                        Ask about equipment status, maintenance, or operations
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: '8px'
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '80%',
                            padding: '12px 16px',
                            borderRadius: '16px',
                            backgroundColor: msg.type === 'user' 
                              ? '#FFCD00' 
                              : 'rgba(255, 255, 255, 0.1)',
                            color: msg.type === 'user' ? '#000000' : '#ffffff',
                            border: msg.type === 'user' 
                              ? 'none' 
                              : '1px solid rgba(255, 255, 255, 0.2)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ 
                            whiteSpace: 'pre-wrap', 
                            fontSize: '14px',
                            lineHeight: '1.4',
                            fontWeight: msg.type === 'user' ? '600' : '400'
                          }}>
                            {msg.content}
                          </div>
                          {msg.timestamp && (
                            <div style={{ 
                              fontSize: '11px', 
                              opacity: '0.7', 
                              marginTop: '6px',
                              color: msg.type === 'user' ? '#666666' : '#cccccc'
                            }}>
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhanced Search Input */}
              <div style={{ 
                display: 'flex', 
                gap: '16px',
                alignItems: 'stretch',
                width: '100%',
                position: 'relative'
              }}>
                <div style={{ 
                  flex: '1',
                  position: 'relative',
                  minWidth: '0', // Prevents flex item from overflowing
                  marginRight: '8px' // Ensures space between input and button
                }}>
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything about your construction assets, maintenance, or operations..."
                    style={{
                      width: '100%',
                      fontSize: '16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '2px solid rgba(255, 205, 0, 0.3)',
                      color: '#ffffff',
                      borderRadius: '12px',
                      padding: '14px 16px 14px 48px',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box' // Ensures padding doesn't affect width
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(e)}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FFCD00';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 205, 0, 0.3)';
                      e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#FFCD00',
                    fontSize: '18px',
                    pointerEvents: 'none' // Prevents icon from interfering with input
                  }}>
                    🔍
                  </div>
                </div>
                <button
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim()}
                  style={{
                    backgroundColor: '#FFCD00',
                    color: '#000000',
                    border: 'none',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    fontSize: '16px',
                    minWidth: '120px',
                    maxWidth: '140px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    justifyContent: 'center',
                    opacity: chatInput.trim() ? '1' : '0.5',
                    flexShrink: '0', // Prevents button from shrinking
                    height: 'fit-content',
                    alignSelf: 'center',
                    position: 'relative',
                    zIndex: '10' // Ensures button is above other elements
                  }}
                  onMouseEnter={(e) => {
                    if (chatInput.trim()) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chatInput.trim()) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                    }
                  }}
                >
                  <Send size={18} />
                  Send
                </button>
              </div>

              {/* Status Bar */}
              <div style={{ 
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '12px',
                color: '#888888'
              }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#4CAF50' 
                }}></div>
                <span>AI Assistant Ready</span>
                <span>•</span>
                <span>{chatMessages.length} messages</span>
                <span>•</span>
                <span>Connected to localhost:8090</span>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div style={{ padding: '10px 0' }}>
            {/* AI Analysis Overview */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)',
                border: '2px solid #FFCD00',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 205, 0, 0.1)',
                color: '#ffffff'
              }}>
                <div style={{ 
                  borderBottom: '1px solid rgba(255, 205, 0, 0.3)', 
                  paddingBottom: '8px', 
                  marginBottom: '12px'
                }}>
                  <h3 style={{ color: '#FFCD00', fontSize: '18px', fontWeight: '700', margin: '0' }}>
                    🤖 AI Analysis Overview
                  </h3>
                </div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '8px' 
                }}>
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 107, 107, 0.3)'
                  }}>
                    <div style={{ color: '#FF6B6B', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>
                      🔴 High Priority Issues
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                      {equipmentData.filter(item => 
                        item.overdue_status === 1 || item.condition_status === 'Critical'
                      ).length}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '11px' }}>
                      Equipment requiring immediate attention
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                  }}>
                    <div style={{ color: '#FFC107', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>
                      🟡 Medium Priority
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                      {equipmentData.filter(item => 
                        item.anomaly_flag === 1 || 
                        (item.utilization_pct_snapshot && item.utilization_pct_snapshot < 50)
                      ).length}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '11px' }}>
                      Equipment with anomalies or low utilization
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(76, 175, 80, 0.3)'
                  }}>
                    <div style={{ color: '#4CAF50', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>
                      🟢 Optimal Performance
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                      {equipmentData.filter(item => 
                        !item.overdue_status && 
                        item.condition_status !== 'Critical' && 
                        !item.anomaly_flag &&
                        (!item.utilization_pct_snapshot || item.utilization_pct_snapshot >= 50)
                      ).length}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '11px' }}>
                      Equipment operating normally
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '8px',
                    backgroundColor: 'rgba(0, 150, 255, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 150, 255, 0.3)'
                  }}>
                    <div style={{ color: '#0096FF', fontSize: '13px', fontWeight: '700', marginBottom: '2px' }}>
                      📊 Total Equipment
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '20px', fontWeight: '700' }}>
                      {equipmentData.length}
                    </div>
                    <div style={{ color: '#cccccc', fontSize: '11px' }}>
                      Equipment in fleet
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <button
                onClick={() => callAnalysisAPI('/asset-dashboard')}
                className="btn-caterpillar"
                style={{
                  backgroundColor: '#FFCD00',
                  color: '#000000',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  fontSize: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
                disabled={loading['/asset-dashboard']}
              >
                {loading['/asset-dashboard'] ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw size={20} />
                    Refresh AI Analysis
                  </>
                )}
              </button>
            </div>

            {/* AI Recommendations for Each Equipment */}
            <div style={{ marginTop: '20px' }}>
              <Card title="🤖 AI Recommendations by Equipment">
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                  gap: '16px' 
                }}>
                  {equipmentData.length === 0 ? (
                    <div style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '24px',
                      color: '#888888'
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '6px' }}>
                        No equipment data available
                      </div>
                      <div style={{ fontSize: '14px' }}>
                        Click "Refresh AI Analysis" to load the latest data
                      </div>
                    </div>
                  ) : (
                    equipmentData.map((equipment) => (
                      <div
                        key={equipment.equipment_id}
                        style={{
                          padding: '16px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          position: 'relative'
                        }}
                      >
                        {/* Equipment Header */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <div>
                            <div style={{ 
                              color: '#FFCD00', 
                              fontSize: '18px', 
                              fontWeight: '700',
                              marginBottom: '2px'
                            }}>
                              {equipment.equipment_id}
                            </div>
                            <div style={{ 
                              color: '#cccccc', 
                              fontSize: '14px' 
                            }}>
                              {equipment.type || 'Unknown Type'}
                            </div>
                          </div>
                          <div style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            fontWeight: '600',
                            ...getStatusColor(equipment.status)
                          }}>
                            {equipment.status || 'Unknown'}
                          </div>
                        </div>

                        {/* AI Recommendations */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ 
                            color: '#FFCD00', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            marginBottom: '6px'
                          }}>
                            🎯 AI Recommendations:
                          </div>
                          
                          {/* Priority Level */}
                          {equipment.overdue_status === 1 && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255, 107, 107, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(255, 107, 107, 0.4)'
                            }}>
                              <div style={{ color: '#FF6B6B', fontSize: '11px', fontWeight: '600' }}>
                                🔴 HIGH PRIORITY: Equipment is overdue for return
                              </div>
                            </div>
                          )}

                          {/* Maintenance Alerts */}
                          {equipment.condition_status === 'Critical' && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255, 107, 107, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(255, 107, 107, 0.4)'
                            }}>
                              <div style={{ color: '#FF6B6B', fontSize: '11px', fontWeight: '600' }}>
                                🔴 CRITICAL: Immediate maintenance required
                              </div>
                            </div>
                          )}

                          {/* Utilization Recommendations */}
                          {equipment.utilization_pct_snapshot && equipment.utilization_pct_snapshot < 50 && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255, 193, 7, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(255, 193, 7, 0.4)'
                            }}>
                              <div style={{ color: '#FFC107', fontSize: '11px', fontWeight: '600' }}>
                                🟡 LOW UTILIZATION: Only {equipment.utilization_pct_snapshot.toFixed(1)}% utilization
                              </div>
                            </div>
                          )}

                          {/* Anomaly Detection */}
                          {equipment.anomaly_flag === 1 && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255, 193, 7, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(255, 193, 7, 0.4)'
                            }}>
                              <div style={{ color: '#FFC107', fontSize: '11px', fontWeight: '600' }}>
                                ⚠️ ANOMALY: Operational anomaly detected
                              </div>
                            </div>
                          )}

                          {/* Predictive Allocation */}
                          {equipment.recommended_site && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(76, 175, 80, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(76, 175, 80, 0.4)'
                            }}>
                              <div style={{ color: '#4CAF50', fontSize: '11px', fontWeight: '600' }}>
                                🎯 RECOMMENDED: Allocate to {equipment.recommended_site}
                              </div>
                            </div>
                          )}

                          {/* Service Due */}
                          {equipment.next_service_due && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(255, 193, 7, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(255, 193, 7, 0.4)'
                            }}>
                              <div style={{ color: '#FFC107', fontSize: '11px', fontWeight: '600' }}>
                                🔧 SERVICE: Next service due {equipment.next_service_due}
                              </div>
                            </div>
                          )}

                          {/* No Issues */}
                          {!equipment.overdue_status && 
                           equipment.condition_status !== 'Critical' && 
                           !equipment.anomaly_flag &&
                           (!equipment.utilization_pct_snapshot || equipment.utilization_pct_snapshot >= 50) && (
                            <div style={{
                              padding: '6px 10px',
                              backgroundColor: 'rgba(76, 175, 80, 0.2)',
                              borderRadius: '6px',
                              marginBottom: '6px',
                              border: '1px solid rgba(76, 175, 80, 0.4)'
                            }}>
                              <div style={{ color: '#4CAF50', fontSize: '11px', fontWeight: '600' }}>
                                ✅ OPTIMAL: Equipment operating normally
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Equipment Details */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr 1fr', 
                          gap: '8px',
                          fontSize: '11px'
                        }}>
                          <div>
                            <div style={{ color: '#888888', marginBottom: '2px' }}>Site:</div>
                            <div style={{ color: '#ffffff' }}>{equipment.site_id || 'Unassigned'}</div>
                          </div>
                          <div>
                            <div style={{ color: '#888888', marginBottom: '2px' }}>Utilization:</div>
                            <div style={{ color: '#ffffff' }}>
                              {equipment.utilization_pct_snapshot ? 
                                `${equipment.utilization_pct_snapshot.toFixed(1)}%` : 'N/A'
                              }
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#888888', marginBottom: '2px' }}>Last Service:</div>
                            <div style={{ color: '#ffffff' }}>
                              {equipment.last_service_date || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#888888', marginBottom: '2px' }}>Rental Rate:</div>
                            <div style={{ color: '#ffffff' }}>
                              {equipment.rental_rate_per_day ? 
                                `$${equipment.rental_rate_per_day}/day` : 'N/A'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Email Sent Popup */}
        {emailPopup.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: '#2a2a2a',
              border: '2px solid #FFCD00',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                📧
              </div>
              <h3 style={{
                color: '#FFCD00',
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '16px'
              }}>
                Email Sent Successfully!
              </h3>
              <p style={{
                color: '#ffffff',
                fontSize: '16px',
                marginBottom: '24px',
                lineHeight: '1.5'
              }}>
                An email has been sent to <strong>{emailPopup.siteId}</strong> regarding the alert.
              </p>
              <button
                onClick={() => setEmailPopup({ show: false, siteId: '' })}
                style={{
                  backgroundColor: '#FFCD00',
                  color: '#000000',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;