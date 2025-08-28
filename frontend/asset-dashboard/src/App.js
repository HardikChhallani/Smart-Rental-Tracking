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

  // Helper function to get alert styling
  const getAlertStyling = (item) => {
    if (hasAlerts(item)) {
      return {
        border: '2px solid #FF6B6B',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        boxShadow: '0 4px 12px rgba(255, 107, 107, 0.2)'
      };
    }
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
                              ...getAlertStyling(item)
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
                                <div style={{ 
                                  padding: '12px',
                                  backgroundColor: hasAlerts(item) ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                  borderRadius: '8px',
                                  border: hasAlerts(item) ? '1px solid #FF6B6B' : '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                  <div style={{ 
                                    color: hasAlerts(item) ? '#FF6B6B' : '#FFCD00', 
                                    fontSize: '12px', 
                                    fontWeight: '600', 
                                    marginBottom: '4px' 
                                  }}>
                                    ⚠️ Alerts
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
                                        marginTop: '4px', 
                                        padding: '4px 6px', 
                                        backgroundColor: 'rgba(255, 107, 107, 0.2)', 
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: '600'
                                      }}>
                                        ⚠️ Requires Attention
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
          <div className="max-w-4xl mx-auto" style={{ padding: '20px 0' }}>
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
                              <div className="space-y-6">
                  <div className="p-6 rounded-lg border border-yellow-200" style={{
                    background: 'linear-gradient(135deg, rgba(255, 205, 0, 0.1) 0%, rgba(255, 184, 0, 0.05) 100%)',
                    border: '2px solid #FFCD00'
                  }}>
                    <div className="flex items-center gap-4 mb-4">
                      <Activity style={{ color: '#FFCD00' }} size={24} />
                      <span className="font-semibold" style={{ color: '#FFCD00', fontSize: '18px' }}>Auto-polling every 60 seconds</span>
                    </div>
                    <p className="text-sm" style={{ color: '#ffffff' }}>
                      Last updated: {telemetryData ? new Date().toLocaleString() : 'Never'}
                    </p>
                  </div>
                
                                  {telemetryData && (
                    <div className="p-6 rounded-lg" style={{
                      backgroundColor: '#2a2a2a',
                      border: '1px solid #555555'
                    }}>
                      <h4 className="font-semibold mb-4" style={{ color: '#FFCD00' }}>Current Data:</h4>
                      <pre className="text-sm whitespace-pre-wrap overflow-x-auto" style={{ color: '#ffffff' }}>
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
          <div className="max-w-4xl mx-auto" style={{ padding: '20px 0' }}>
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
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                              msg.type === 'user'
                                ? 'bg-yellow-500 text-black font-medium'
                                : 'bg-white text-gray-800 shadow-sm border border-gray-200'
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
                
                <div className="flex gap-4" style={{ marginTop: '20px' }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask me anything about your assets..."
                    className="flex-1 px-6 py-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      fontSize: '16px',
                      backgroundColor: '#2a2a2a',
                      border: '2px solid #555555',
                      color: '#ffffff',
                      borderRadius: '12px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit(e)}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || loading.chat}
                    className="btn-caterpillar disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    style={{
                      backgroundColor: '#FFCD00',
                      color: '#000000',
                      border: 'none',
                      padding: '16px 24px',
                      margin: '8px 0',
                      borderRadius: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      fontSize: '16px',
                      minWidth: '120px',
                      justifyContent: 'center'
                    }}
                  >
                    <Send size={20} />
                    Send
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" style={{ padding: '20px 0' }}>
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
                    className="btn-caterpillar w-full flex items-center justify-center gap-3"
                    style={{
                      backgroundColor: '#FFCD00',
                      color: '#000000',
                      border: 'none',
                      padding: '16px 20px',
                      margin: '12px 0',
                      borderRadius: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                      fontSize: '15px',
                      minHeight: '50px'
                    }}
                  >
                    <Icon size={18} />
                    Load Data
                  </button>
                  
                  {analysisData[endpoint] && (
                    <div className="p-4 rounded-lg mt-4" style={{
                      backgroundColor: '#2a2a2a',
                      border: '1px solid #555555'
                    }}>
                      <div className="text-xs mb-2" style={{ color: '#FFCD00', fontWeight: '600' }}>Response:</div>
                      <pre className="text-xs whitespace-pre-wrap overflow-x-auto max-h-32" style={{ color: '#ffffff' }}>
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