import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Settings, Calendar, User, Zap } from 'lucide-react';

interface SchedulerStatus {
  is_running: boolean;
  has_active_job: boolean;
  next_run: string | null;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  total_logs: number;
}

interface SchedulerConfig {
  time: string;
  frequency: 'daily' | 'weekdays';
  profile: string;
  auto_apply: boolean;
}

const SchedulerPanel: React.FC = () => {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [config, setConfig] = useState<SchedulerConfig>({
    time: '08:00',
    frequency: 'daily',
    profile: 'default',
    auto_apply: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [logs, setLogs] = useState<Array<{
    timestamp: string;
    level: string;
    message: string;
  }>>([]);

  // Load status on component mount
  useEffect(() => {
    loadStatus();
    loadLogs();
    
    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      loadStatus();
      if (status?.is_running) {
        loadLogs();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/scheduler/status');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.status);
      }
    } catch (error) {
      console.error('Failed to load scheduler status:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/scheduler/logs?limit=20');
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.logs);
      }
    } catch (error) {
      console.error('Failed to load scheduler logs:', error);
    }
  };

  const startScheduler = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scheduler/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadStatus();
        setShowConfig(false);
      } else {
        alert(`Fehler beim Starten: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to start scheduler:', error);
      alert('Fehler beim Starten des Schedulers');
    } finally {
      setIsLoading(false);
    }
  };

  const stopScheduler = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scheduler/stop', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadStatus();
      } else {
        alert(`Fehler beim Stoppen: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to stop scheduler:', error);
      alert('Fehler beim Stoppen des Schedulers');
    } finally {
      setIsLoading(false);
    }
  };

  const runNow = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/scheduler/run-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: config.profile,
          auto_apply: config.auto_apply
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('Automatische Jobsuche gestartet!');
        await loadStatus();
        await loadLogs();
      } else {
        alert(`Fehler: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to run scheduler now:', error);
      alert('Fehler beim Ausführen der Jobsuche');
    } finally {
      setIsLoading(false);
    }
  };

  const formatLogLevel = (level: string) => {
    const colors = {
      'info': 'text-blue-600',
      'success': 'text-green-600',
      'warning': 'text-yellow-600',
      'error': 'text-red-600'
    };
    return colors[level as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Clock className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Automatische Jobsuche</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            status?.is_running ? 'bg-green-500' : 'bg-gray-300'
          }`} />
          <span className="text-sm text-gray-600">
            {status?.is_running ? 'Aktiv' : 'Inaktiv'}
          </span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Nächster Lauf</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {status?.next_run || 'Nicht geplant'}
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Such-Vorlage</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{config.profile}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-gray-600" />
            <span className="font-medium">Status</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {status?.has_active_job ? 'Läuft gerade' : 'Bereit'}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3 mb-6">
        {!status?.is_running ? (
          <button
            onClick={() => setShowConfig(true)}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            <span>Scheduler starten</span>
          </button>
        ) : (
          <button
            onClick={stopScheduler}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Square className="h-4 w-4" />
            <span>Scheduler stoppen</span>
          </button>
        )}
        
        <button
          onClick={runNow}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          <span>Jetzt ausführen</span>
        </button>
        
        <button
          onClick={() => setShowConfig(true)}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          <Settings className="h-4 w-4" />
          <span>Konfiguration</span>
        </button>
      </div>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Scheduler Konfiguration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ausführungszeit
                </label>
                <input
                  type="time"
                  value={config.time}
                  onChange={(e) => setConfig({ ...config, time: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Häufigkeit
                </label>
                <select
                  value={config.frequency}
                  onChange={(e) => setConfig({ ...config, frequency: e.target.value as 'daily' | 'weekdays' })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="daily">Täglich</option>
                  <option value="weekdays">Nur Werktage</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suchprofil
                </label>
                <input
                  type="text"
                  value={config.profile}
                  onChange={(e) => setConfig({ ...config, profile: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="default"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_apply"
                  checked={config.auto_apply}
                  onChange={(e) => setConfig({ ...config, auto_apply: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="auto_apply" className="text-sm text-gray-700">
                  Automatisch bewerben (ohne Bestätigung)
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={status?.is_running ? stopScheduler : startScheduler}
                disabled={isLoading}
                className={`flex-1 py-2 rounded-lg text-white ${
                  status?.is_running 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {status?.is_running ? 'Stoppen' : 'Starten'}
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-800">Aktivitätslog</h3>
          <button
            onClick={loadLogs}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Aktualisieren
          </button>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-500">{log.timestamp}</span>
                  <span className={`ml-2 font-medium ${formatLogLevel(log.level)}`}>
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="ml-2 text-gray-700">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">Keine Logs verfügbar</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchedulerPanel;