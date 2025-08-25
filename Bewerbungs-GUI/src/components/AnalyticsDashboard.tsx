import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface AnalyticsData {
  totalApplications: number;
  responseRate: number;
  interviewRate: number;
  successRate: number;
  averageResponseTime: number;
  weeklyApplications: number;
  monthlyApplications: number;
  applicationsByStatus: {
    pending: number;
    responded: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  applicationsBySource: Array<{
    source: string;
    count: number;
    successRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    applications: number;
    responses: number;
  }>;
}

export interface ApplicationRecord {
  id: string;
  company: string;
  position: string;
  source: string;
  applicationDate: string;
  status: 'pending' | 'responded' | 'interview' | 'offer' | 'rejected';
  responseDate?: string;
  notes?: string;
  followUpDate?: string;
}

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ className = '' }) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'applications' | 'trends'>('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try Flask API first, then fallback to Tauri commands, then local fallback
      const API_BASE_URL = 'http://localhost:5002';
      
      let analyticsData: AnalyticsData | null = null;
      let applicationsData: ApplicationRecord[] = [];
      
      try {
        // Fetch from Flask API
        const [analyticsResponse, applicationsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/analytics/overview`),
          fetch(`${API_BASE_URL}/api/analytics/applications`)
        ]);
        
        if (analyticsResponse.ok && applicationsResponse.ok) {
          const analyticsResult = await analyticsResponse.json();
          const applicationsResult = await applicationsResponse.json();
          
          if (analyticsResult.success) {
            analyticsData = analyticsResult.data;
          }
          
          if (applicationsResult.success) {
            applicationsData = applicationsResult.applications;
          }
          
          console.log('✅ Loaded analytics data from Flask API');
        } else {
          throw new Error('Flask API not available');
        }
      } catch (flaskError) {
        console.warn('Flask API unavailable, trying Tauri commands...', flaskError);
        
        try {
          // Fallback to Tauri commands
          const { invoke } = await import('@tauri-apps/api/tauri');
          
          const [analyticsResult, applicationsResult] = await Promise.all([
            invoke('get_analytics_data').catch(() => null),
            invoke('get_applications_list').catch(() => null)
          ]);

          if (analyticsResult && typeof analyticsResult === 'string') {
            try {
              analyticsData = JSON.parse(analyticsResult);
            } catch (parseError) {
              console.error('Failed to parse Tauri analytics data:', parseError);
            }
          }

          if (applicationsResult && typeof applicationsResult === 'string') {
            try {
              applicationsData = JSON.parse(applicationsResult);
            } catch (parseError) {
              console.error('Failed to parse Tauri applications data:', parseError);
            }
          }
          
          if (analyticsData) {
            console.log('✅ Loaded analytics data from Tauri commands');
          }
        } catch (tauriError) {
          console.warn('Tauri commands also unavailable:', tauriError);
        }
      }

      // Use data if available, otherwise set fallback with demo data
      if (analyticsData) {
        setAnalyticsData(analyticsData);
        setApplications(applicationsData);
      } else {
        console.warn('Using fallback demo data for analytics - Backend not available');
        setAnalyticsData({
          totalApplications: 24,
          responseRate: 45.8,
          interviewRate: 20.8,
          successRate: 8.3,
          averageResponseTime: 7.2,
          weeklyApplications: 6,
          monthlyApplications: 24,
          applicationsByStatus: {
            pending: 12,
            responded: 8,
            interview: 3,
            offer: 1,
            rejected: 4
          },
          applicationsBySource: [
            { source: 'Adzuna', count: 15, successRate: 12.5 },
            { source: 'JSearch', count: 9, successRate: 5.6 },
            { source: 'Direct', count: 5, successRate: 20.0 }
          ],
          timeSeriesData: [
            { date: '2025-06-29', applications: 3, responses: 1 },
            { date: '2025-06-30', applications: 5, responses: 2 },
            { date: '2025-07-01', applications: 4, responses: 3 },
            { date: '2025-07-02', applications: 6, responses: 1 }
          ]
        });
        setApplications([
          {
            id: '1',
            company: 'TechCorp GmbH',
            position: 'Frontend Developer',
            source: 'Adzuna',
            applicationDate: '2025-06-28',
            status: 'interview',
            responseDate: '2025-07-01',
            notes: 'Positive Rückmeldung, Interview am Freitag'
          },
          {
            id: '2',
            company: 'StartupX',
            position: 'React Developer',
            source: 'JSearch',
            applicationDate: '2025-06-25',
            status: 'pending'
          },
          {
            id: '3',
            company: 'Enterprise Solutions',
            position: 'Full Stack Developer',
            source: 'Adzuna',
            applicationDate: '2025-06-22',
            status: 'rejected',
            responseDate: '2025-06-30'
          },
          {
            id: '4',
            company: 'Digital Agency',
            position: 'E-Commerce Developer',
            source: 'Direct',
            applicationDate: '2025-07-01',
            status: 'responded',
            responseDate: '2025-07-02'
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      setError('Fehler beim Laden der Analytics-Daten. Stellen Sie sicher, dass der Backend-Service läuft.');
      
      // Set minimal fallback data
      setAnalyticsData({
        totalApplications: 0,
        responseRate: 0,
        interviewRate: 0,
        successRate: 0,
        averageResponseTime: 0,
        weeklyApplications: 0,
        monthlyApplications: 0,
        applicationsByStatus: {
          pending: 0,
          responded: 0,
          interview: 0,
          offer: 0,
          rejected: 0
        },
        applicationsBySource: [],
        timeSeriesData: []
      });
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatDays = (value: number) => `${value.toFixed(1)} Tage`;

  const getStatusColor = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'interview': return 'bg-purple-100 text-purple-800';
      case 'offer': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'pending': return 'Ausstehend';
      case 'responded': return 'Antwort erhalten';
      case 'interview': return 'Interview';
      case 'offer': return 'Angebot';
      case 'rejected': return 'Absage';
      default: return status;
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: string, notes?: string) => {
    try {
      const API_BASE_URL = 'http://localhost:5002';
      
      // Try Flask API first
      try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/applications/${applicationId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            response_type: newStatus === 'responded' ? 'response' : newStatus,
            notes
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Status updated via Flask API');
            // Refresh data
            await fetchAnalyticsData();
            return;
          }
        }
        throw new Error('Flask API update failed');
      } catch (flaskError) {
        console.warn('Flask API status update failed, trying Tauri...', flaskError);
        
        // Fallback to Tauri commands
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          await invoke('update_application_status', {
            applicationId,
            status: newStatus,
            responseType: newStatus === 'responded' ? 'response' : newStatus,
            notes
          });
          
          console.log('✅ Status updated via Tauri commands');
          // Refresh data
          await fetchAnalyticsData();
        } catch (tauriError) {
          console.error('Both Flask API and Tauri failed:', tauriError);
          setError('Fehler beim Aktualisieren des Bewerbungsstatus. Backend nicht verfügbar.');
        }
      }
    } catch (error) {
      console.error('Failed to update application status:', error);
      setError('Fehler beim Aktualisieren des Bewerbungsstatus');
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analytics-Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Übersicht über Ihre Bewerbungsaktivitäten und Erfolgsraten
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: '📈 Übersicht', icon: '📈' },
            { id: 'applications', label: '📋 Bewerbungen', icon: '📋' },
            { id: 'trends', label: '📊 Trends', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSection === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Sections */}
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeSection === 'overview' && analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* KPI Cards */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📝</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Bewerbungen gesamt</h3>
                  <p className="text-2xl font-semibold text-gray-900">{analyticsData.totalApplications}</p>
                  <p className="text-sm text-gray-600">{analyticsData.weeklyApplications} diese Woche</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💬</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Antwortrate</h3>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analyticsData.responseRate)}</p>
                  <p className="text-sm text-gray-600">{formatDays(analyticsData.averageResponseTime)} durchschnittlich</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🎯</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Interview-Rate</h3>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analyticsData.interviewRate)}</p>
                  <p className="text-sm text-gray-600">{analyticsData.applicationsByStatus.interview} Interviews</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">🎉</div>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Erfolgsrate</h3>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(analyticsData.successRate)}</p>
                  <p className="text-sm text-gray-600">{analyticsData.applicationsByStatus.offer} Angebote</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'applications' && (
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Bewerbungsübersicht</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unternehmen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quelle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bewerbungsdatum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {application.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {application.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(application.applicationDate).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.status)}`}>
                          {getStatusLabel(application.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {application.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'responded')}
                                className="text-blue-600 hover:text-blue-900 text-xs px-2 py-1 rounded border border-blue-300"
                              >
                                ✉️ Antwort
                              </button>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded border border-red-300"
                              >
                                ❌ Absage
                              </button>
                            </>
                          )}
                          {application.status === 'responded' && (
                            <>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'interview')}
                                className="text-purple-600 hover:text-purple-900 text-xs px-2 py-1 rounded border border-purple-300"
                              >
                                🎯 Interview
                              </button>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded border border-red-300"
                              >
                                ❌ Absage
                              </button>
                            </>
                          )}
                          {application.status === 'interview' && (
                            <>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'offer')}
                                className="text-green-600 hover:text-green-900 text-xs px-2 py-1 rounded border border-green-300"
                              >
                                🎉 Angebot
                              </button>
                              <button 
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                className="text-red-600 hover:text-red-900 text-xs px-2 py-1 rounded border border-red-300"
                              >
                                ❌ Absage
                              </button>
                            </>
                          )}
                          {application.status === 'offer' && (
                            <span className="text-green-600 font-semibold text-xs">
                              🎉 Erfolgreich!
                            </span>
                          )}
                          {application.status === 'rejected' && (
                            <button 
                              onClick={() => updateApplicationStatus(application.id, 'pending')}
                              className="text-gray-600 hover:text-gray-900 text-xs px-2 py-1 rounded border border-gray-300"
                            >
                              🔄 Zurücksetzen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === 'trends' && analyticsData && (
          <div className="space-y-6">
            {/* Time Series Chart */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📈 Bewerbungstrends</h2>
              <div className="h-80">
                {analyticsData.timeSeriesData && analyticsData.timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString('de-DE')}
                        formatter={(value, name) => [value, name === 'applications' ? 'Bewerbungen' : 'Antworten']}
                        contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                      />
                      <Legend 
                        formatter={(value) => value === 'applications' ? 'Bewerbungen' : 'Antworten'}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="applications" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6, fill: '#1d4ed8' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responses" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', r: 4 }}
                        activeDot={{ r: 6, fill: '#047857' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    📊 Noch keine Trenddaten verfügbar. Sammeln Sie mehr Bewerbungsdaten.
                  </div>
                )}
              </div>
            </div>

            {/* Platform Success Chart */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">🎯 Erfolg nach Quelle</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart for Source Distribution */}
                <div className="h-80">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Bewerbungsverteilung</h3>
                  {analyticsData.applicationsBySource && analyticsData.applicationsBySource.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.applicationsBySource}
                          dataKey="count"
                          nameKey="source"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {analyticsData.applicationsBySource.map((_, index) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Keine Quelldaten verfügbar
                    </div>
                  )}
                </div>

                {/* Bar Chart for Success Rates */}
                <div className="h-80">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Erfolgsraten nach Quelle</h3>
                  {analyticsData.applicationsBySource && analyticsData.applicationsBySource.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.applicationsBySource} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <YAxis 
                          type="category" 
                          dataKey="source" 
                          tick={{ fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Erfolgsrate']}
                          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                        />
                        <Bar 
                          dataKey="successRate" 
                          fill="#10b981"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Keine Erfolgsdaten verfügbar
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Status Distribution Chart */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📊 Bewerbungsstatus-Verteilung</h2>
              <div className="h-80">
                {analyticsData.applicationsByStatus ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { status: 'Ausstehend', count: analyticsData.applicationsByStatus.pending, color: '#f59e0b' },
                      { status: 'Antwort', count: analyticsData.applicationsByStatus.responded, color: '#3b82f6' },
                      { status: 'Interview', count: analyticsData.applicationsByStatus.interview, color: '#8b5cf6' },
                      { status: 'Angebot', count: analyticsData.applicationsByStatus.offer, color: '#10b981' },
                      { status: 'Absage', count: analyticsData.applicationsByStatus.rejected, color: '#ef4444' }
                    ].filter(item => item.count > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="status" 
                        stroke="#666"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value) => [value, 'Anzahl']}
                        contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      >
                        {[
                          { status: 'Ausstehend', count: analyticsData.applicationsByStatus.pending, color: '#f59e0b' },
                          { status: 'Antwort', count: analyticsData.applicationsByStatus.responded, color: '#3b82f6' },
                          { status: 'Interview', count: analyticsData.applicationsByStatus.interview, color: '#8b5cf6' },
                          { status: 'Angebot', count: analyticsData.applicationsByStatus.offer, color: '#10b981' },
                          { status: 'Absage', count: analyticsData.applicationsByStatus.rejected, color: '#ef4444' }
                        ].filter(item => item.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Keine Statusdaten verfügbar
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Source Statistics Table */}
            <div className="bg-white p-6 rounded-lg shadow border">
              <h2 className="text-lg font-medium text-gray-900 mb-4">📋 Detaillierte Quellenstatistiken</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quelle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bewerbungen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Erfolgsrate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.applicationsBySource?.map((source, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {source.source}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-2">{source.count}</span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(source.count / Math.max(...analyticsData.applicationsBySource.map(s => s.count))) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            source.successRate > 10 ? 'bg-green-100 text-green-800' :
                            source.successRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {formatPercentage(source.successRate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {source.successRate > 5 ? '📈' : source.successRate > 0 ? '📊' : '📉'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AnalyticsDashboard; 