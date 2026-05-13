import React, { useState, useEffect } from 'react';
import { loadReports, deleteReport, deleteAllReports } from '../utils/reportUtils';
import Report from './Report';
import { t } from '../utils/i18n';

const ReportsList = () => {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (window.confirm(t('deleteReportConfirm'))) {
            try {
                await deleteReport(reportId);
                await loadExistingReports();
            } catch (error) {
                console.error('Error deleting report:', error);
            }
        }
    };

    const handleDeleteAllReports = async () => {
        if (window.confirm(t('deleteAllReportsConfirm', reports.length))) {
            try {
                await deleteAllReports();
                setReports([]);
            } catch (error) {
                console.error('Error deleting all reports:', error);
            }
        }
    };

    const filteredReports = reports.filter(report => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (report.examName || '').toLowerCase().includes(term) ||
            (report.mode || '').toLowerCase().includes(term)
        );
    });

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
            {reports.length > 0 ? (
                <>
                    <div className="tab-toolbar">
                        <input
                            type="text"
                            placeholder={t('searchReports')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                        <button onClick={handleDeleteAllReports} className="delete-all-btn">
                            {t('deleteAll')}
                        </button>
                    </div>
                    <div className="reports-grid">
                        {filteredReports.map((report, index) => (
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
                                        {t('viewDetails')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReport(report.id)}
                                        className="delete-btn"
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="no-reports">
                    <p>{t('noReports')}</p>
                    <p>{t('noReportsHint')}</p>
                </div>
            )}

            {selectedReport && (
                <div className="report-modal" onClick={() => setSelectedReport(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{t('reportDetails')}</h3>
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
