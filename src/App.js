import React, { useState } from 'react';
import HomePage from './components/HomePage';
import StudyMode from './components/StudyMode';
import ExamMode from './components/ExamMode';
import Report from './components/Report';
import './App.css';

// Utility per gestire le configurazioni salvate
const SAVED_CONFIGS_KEY = 'examSprinterSavedConfigs';

const loadSavedConfigs = () => {
    try {
        return JSON.parse(localStorage.getItem(SAVED_CONFIGS_KEY) || '[]');
    } catch {
        return [];
    }
};

const persistConfigs = (configs) => {
    localStorage.setItem(SAVED_CONFIGS_KEY, JSON.stringify(configs));
};

const saveConfig = (examFilename, examName, mode, settings, source, githubInfo) => {
    const configs = loadSavedConfigs();
    const newConfig = {
        id: Date.now(),
        examFilename,
        examName,
        mode,
        settings,
        source: source || 'local',
        githubInfo: githubInfo || null,
        createdAt: new Date().toISOString()
    };
    // Mantieni max 20 configurazioni
    const updated = [newConfig, ...configs].slice(0, 20);
    persistConfigs(updated);
    return updated;
};

const deleteConfig = (configId) => {
    const configs = loadSavedConfigs();
    const updated = configs.filter(c => c.id !== configId);
    persistConfigs(updated);
    return updated;
};

const deleteAllConfigs = () => {
    persistConfigs([]);
};

function App() {
    const [currentView, setCurrentView] = useState('home');
    const [selectedExam, setSelectedExam] = useState(null);
    const [examData, setExamData] = useState(null);
    const [examSource, setExamSource] = useState(null);
    const [examGithubInfo, setExamGithubInfo] = useState(null);
    const [modeSettings, setModeSettings] = useState({});
    const [currentMode, setCurrentMode] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [sessionKey, setSessionKey] = useState(0);
    const [configsVersion, setConfigsVersion] = useState(0);

    const handleExamSelect = (exam, data, examName, source, githubInfo) => {
        setSelectedExam(exam);
        setExamData(data);
        setExamSource(source || 'local');
        setExamGithubInfo(githubInfo || null);
    };

    const handleModeSelect = (selectedMode, settings) => {
        setModeSettings(settings);
        setCurrentMode(selectedMode);
        // Salva la configurazione automaticamente
        const examName = examData?.[0]?.exam_name || selectedExam || 'Unknown';
        saveConfig(selectedExam, examName, selectedMode, settings, examSource, examGithubInfo);
        setCurrentView(selectedMode === 'study' ? 'study' : 'exam');
    };

    const handleExamComplete = (report) => {
        setReportData(report);
        setCurrentView('report');
    };

    const handleBackToHome = () => {
        setCurrentView('home');
        setSelectedExam(null);
        setExamData(null);
        setExamSource(null);
        setExamGithubInfo(null);
        setReportData(null);
        setCurrentMode(null);
    };

    const handleRestartSession = () => {
        // Riavvia la sessione con le stesse configurazioni
        setReportData(null);
        setSessionKey(prev => prev + 1);
        setCurrentView(currentMode === 'study' ? 'study' : 'exam');
    };

    const handleLaunchConfig = (config, data) => {
        // Lancia una configurazione salvata
        setSelectedExam(config.examFilename);
        setExamData(data);
        setExamSource(config.source);
        setExamGithubInfo(config.githubInfo);
        setModeSettings(config.settings);
        setCurrentMode(config.mode);
        setSessionKey(prev => prev + 1);
        setCurrentView(config.mode === 'study' ? 'study' : 'exam');
    };

    const renderCurrentView = () => {
        switch (currentView) {
            case 'home':
                return (
                    <HomePage
                        onExamSelect={handleExamSelect}
                        onModeSelect={handleModeSelect}
                        selectedExam={selectedExam}
                        examData={examData}
                        savedConfigs={loadSavedConfigs()}
                        onLaunchConfig={handleLaunchConfig}
                        onDeleteConfig={(id) => { deleteConfig(id); setConfigsVersion(v => v + 1); }}
                        onDeleteAllConfigs={() => { deleteAllConfigs(); setConfigsVersion(v => v + 1); }}
                    />
                );
            case 'study':
                return (
                    <StudyMode
                        key={sessionKey}
                        examData={examData}
                        settings={modeSettings}
                        onComplete={handleExamComplete}
                        onBack={handleBackToHome}
                    />
                );
            case 'exam':
                return (
                    <ExamMode
                        key={sessionKey}
                        examData={examData}
                        settings={modeSettings}
                        onComplete={handleExamComplete}
                        onBack={handleBackToHome}
                    />
                );
            case 'report':
                return (
                    <Report
                        reportData={reportData}
                        onBack={handleBackToHome}
                        onRestart={handleRestartSession}
                    />
                );
            default:
                return <HomePage onExamSelect={handleExamSelect} onModeSelect={handleModeSelect} />;
        }
    };

    return (
        <div className="App">
            {renderCurrentView()}
        </div>
    );
}

export default App;