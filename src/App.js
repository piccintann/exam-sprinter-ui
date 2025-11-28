import React, { useState } from 'react'; // Rimuovi useEffect
import HomePage from './components/HomePage';
import StudyMode from './components/StudyMode';
import ExamMode from './components/ExamMode';
import Report from './components/Report';
import './App.css';

function App() {
    const [currentView, setCurrentView] = useState('home');
    const [selectedExam, setSelectedExam] = useState(null);
    const [examData, setExamData] = useState(null);
    const [modeSettings, setModeSettings] = useState({}); // Rimuovi mode non usato
    const [reportData, setReportData] = useState(null);

    const handleExamSelect = (exam, data) => {
        setSelectedExam(exam);
        setExamData(data);
    };

    const handleModeSelect = (selectedMode, settings) => {
        setModeSettings(settings);
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
        setReportData(null);
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
                    />
                );
            case 'study':
                return (
                    <StudyMode
                        examData={examData}
                        settings={modeSettings}
                        onComplete={handleExamComplete}
                        onBack={handleBackToHome}
                    />
                );
            case 'exam':
                return (
                    <ExamMode
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