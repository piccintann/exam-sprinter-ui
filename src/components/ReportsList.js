import React, { useState, useEffect } from 'react';
import { loadReports, deleteReport } from '../utils/reportUtils';
import Report from './Report';

const ReportsList = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    loadExistingReports();
  }, []);

  const loadExistingReports = async () => {
    try {
      const reportsList = await loadReports();
      setReports(reportsList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteReport(reportId);
        await loadExistingReports();
      } catch (error) {
        console.error('Error deleting report:', error);
      }
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + 
           new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  const getScoreEmoji = (percentage) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🥇';
    if (percentage >= 70) return '🥈';
    if (percentage >= 60) return '🥉';
    return '📚';
  };

  return (
    <div className="reports-list">
      <h2>📈 Previous Reports</h2>
      {reports.length > 0 ? (
        <div className="reports-grid">
          {reports.map((report, index) => (
            <div key={report.id || index} className="report-card">
              <div className="report-card-header">
                <div className="exam-info">
                  <span className="exam-name">📚 {report.examName}</span>
                  <span className="exam-mode">
                    {report.mode === 'exam' ? '⏰' : '📖'} {report.mode}
                  </span>
                </div>
                <div className="score-info">
                  <span className="score-emoji">{getScoreEmoji(report.percentage)}</span>
                  <span 
                    className="score" 
                    style={{ color: getScoreColor(report.percentage) }}
                  >
                    {report.percentage}%
                  </span>
                </div>
              </div>
              <div className="report-card-body">
                <div className="report-stats">
                  <span>✅ {report.correctAnswers}/{report.totalQuestions} correct</span>
                  <span>⏱️ {Math.round(report.timeSpent / 60)}min</span>
                </div>
                <div className="report-date">
                  📅 {formatDate(report.timestamp)}
                </div>
              </div>
              <div className="report-card-actions">
                <button 
                  onClick={() => setSelectedReport(report)}
                  className="view-btn"
                >
                  👁️ View Details
                </button>
                <button 
                  onClick={() => handleDeleteReport(report.id)}
                  className="delete-btn"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-reports">
          <p>📭 No previous reports found.</p>
          <p>Complete an exam or study session to see your reports here.</p>
        </div>
      )}

      {selectedReport && (
        <div className="report-modal" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Report Details</h3>
              <button onClick={() => setSelectedReport(null)}>✖️</button>
            </div>
            <div className="modal-body">
              <Report reportData={selectedReport} onBack={() => setSelectedReport(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsList;
