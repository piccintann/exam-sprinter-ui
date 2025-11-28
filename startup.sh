#!/bin/bash

# Script per creare la struttura completa dell'applicazione React per esami
# Nome: create-exam-app.sh

echo "🚀 Creazione dell'applicazione React per esami..."

# Nome dell'applicazione
APP_NAME="exam-app"

# Controlla se l'applicazione esiste già
if [ -d "$APP_NAME" ]; then
    echo "⚠️  La cartella $APP_NAME esiste già!"
    read -p "Vuoi sovrascriverla? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$APP_NAME"
        echo "🗑️  Cartella esistente rimossa"
    else
        echo "❌ Operazione annullata"
        exit 1
    fi
fi

# Crea l'app React
echo "📦 Creazione app React..."
npx create-react-app "$APP_NAME"

# Entra nella cartella dell'app
cd "$APP_NAME"

echo "📁 Creazione struttura cartelle..."

# Crea le cartelle principali
mkdir -p src/components
mkdir -p src/utils
mkdir -p data
mkdir -p exam-reports
mkdir -p images
mkdir -p public/api

# Crea cartelle di esempio per le immagini
mkdir -p images/professional_cloud_developer
mkdir -p images/aws_solutions_architect
mkdir -p images/azure_fundamentals

echo "📝 Creazione file componenti..."

# 1. App.js
cat > src/App.js << 'EOF'
import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import StudyMode from './components/StudyMode';
import ExamMode from './components/ExamMode';
import Report from './components/Report';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('home');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examData, setExamData] = useState(null);
  const [mode, setMode] = useState(null);
  const [modeSettings, setModeSettings] = useState({});
  const [reportData, setReportData] = useState(null);

  const handleExamSelect = (exam, data) => {
    setSelectedExam(exam);
    setExamData(data);
  };

  const handleModeSelect = (selectedMode, settings) => {
    setMode(selectedMode);
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
    setMode(null);
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
        return <HomePage onExamSelect={handleExamSelect} />;
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

export default App;
EOF

# 2. HomePage.js
cat > src/components/HomePage.js << 'EOF'
import React, { useState, useEffect } from 'react';
import FileUploader from './FileUploader';
import ReportsList from './ReportsList';
import { loadAvailableExams } from '../utils/fileUtils';

const HomePage = ({ onExamSelect, onModeSelect, selectedExam, examData }) => {
  const [availableExams, setAvailableExams] = useState([]);
  const [showModeSelection, setShowModeSelection] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const exams = await loadAvailableExams();
      setAvailableExams(exams);
    } catch (error) {
      console.error('Error loading exams:', error);
    }
  };

  const handleFileUpload = (data, filename) => {
    onExamSelect(filename, data);
    setShowModeSelection(true);
  };

  const handleExamSelect = async (examName) => {
    try {
      const response = await fetch(`/data/${examName}`);
      const data = await response.json();
      onExamSelect(examName, data);
      setShowModeSelection(true);
    } catch (error) {
      console.error('Error loading exam:', error);
      alert('Error loading exam file. Make sure the backend is running.');
    }
  };

  const handleModeSelect = (mode, settings) => {
    onModeSelect(mode, settings);
  };

  if (showModeSelection && selectedExam && examData) {
    return <ModeSelection onModeSelect={handleModeSelect} examData={examData} />;
  }

  return (
    <div className="home-page">
      <h1>📚 Exam Practice App</h1>
      
      <div className="upload-section">
        <h2>Upload New Exam</h2>
        <FileUploader onFileUpload={handleFileUpload} />
      </div>

      <div className="available-exams">
        <h2>Available Exams</h2>
        {availableExams.length > 0 ? (
          <ul>
            {availableExams.map((exam, index) => (
              <li key={index}>
                <button onClick={() => handleExamSelect(exam)}>
                  📋 {exam.replace('.json', '')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No exams available. Upload a JSON file to get started.</p>
        )}
      </div>

      <ReportsList />
    </div>
  );
};

const ModeSelection = ({ onModeSelect, examData }) => {
  const [mode, setMode] = useState('');
  const [settings, setSettings] = useState({
    questionCount: examData?.length || 0,
    timeLimit: 60,
    randomOrder: false,
    startFromQuestion: 1
  });

  const handleSubmit = () => {
    if (mode) {
      onModeSelect(mode, settings);
    }
  };

  return (
    <div className="mode-selection">
      <h2>Select Mode</h2>
      
      <div className="mode-options">
        <label className={mode === 'study' ? 'selected' : ''}>
          <input
            type="radio"
            value="study"
            checked={mode === 'study'}
            onChange={(e) => setMode(e.target.value)}
          />
          <span>📖 Study Mode</span>
        </label>
        <label className={mode === 'exam' ? 'selected' : ''}>
          <input
            type="radio"
            value="exam"
            checked={mode === 'exam'}
            onChange={(e) => setMode(e.target.value)}
          />
          <span>⏰ Exam Mode</span>
        </label>
      </div>

      <div className="settings">
        <div>
          <label>Number of Questions:</label>
          <input
            type="number"
            min="1"
            max={examData.length}
            value={settings.questionCount}
            onChange={(e) => setSettings({...settings, questionCount: parseInt(e.target.value)})}
          />
        </div>

        {mode === 'exam' && (
          <div>
            <label>Time Limit (minutes):</label>
            <input
              type="number"
              min="1"
              value={settings.timeLimit}
              onChange={(e) => setSettings({...settings, timeLimit: parseInt(e.target.value)})}
            />
          </div>
        )}

        <div className="checkbox-container">
          <label>
            <input
              type="checkbox"
              checked={settings.randomOrder}
              onChange={(e) => setSettings({...settings, randomOrder: e.target.checked})}
            />
            🔀 Random Order
          </label>
        </div>

        {!settings.randomOrder && (
          <div>
            <label>Start from question:</label>
            <input
              type="number"
              min="1"
              max={examData.length}
              value={settings.startFromQuestion}
              onChange={(e) => setSettings({...settings, startFromQuestion: parseInt(e.target.value)})}
            />
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={!mode} className="start-btn">
        Start {mode === 'study' ? '📖 Study' : '⏰ Exam'}
      </button>
    </div>
  );
};

export default HomePage;
EOF

# 3. FileUploader.js
cat > src/components/FileUploader.js << 'EOF'
import React, { useRef, useState } from 'react';

const FileUploader = ({ onFileUpload }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            onFileUpload(jsonData, file.name);
          } else {
            alert('Invalid exam format. Expected an array of questions.');
          }
        } catch (error) {
          alert('Invalid JSON file format.');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsText(file);
    } else {
      alert('Please select a valid JSON file');
    }
  };

  return (
    <div className="file-uploader">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="upload-btn"
      >
        {uploading ? '⏳ Uploading...' : '📁 Choose JSON File'}
      </button>
    </div>
  );
};

export default FileUploader;
EOF

# 4. Question.js
cat > src/components/Question.js << 'EOF'
import React, { useState } from 'react';

const Question = ({ 
  questionData, 
  questionIndex, 
  totalQuestions, 
  userAnswers, 
  onAnswerChange, 
  showCorrectAnswers = false,
  examName 
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState(userAnswers[questionIndex] || []);

  const handleAnswerToggle = (answerIndex) => {
    const isMultiple = questionData.answer_checks.filter(Boolean).length > 1;
    
    let newAnswers;
    if (isMultiple) {
      newAnswers = selectedAnswers.includes(answerIndex)
        ? selectedAnswers.filter(i => i !== answerIndex)
        : [...selectedAnswers, answerIndex];
    } else {
      newAnswers = [answerIndex];
    }
    
    setSelectedAnswers(newAnswers);
    onAnswerChange(questionIndex, newAnswers);
  };

  const getAnswerClass = (answerIndex) => {
    let classes = ['answer-option'];
    
    if (selectedAnswers.includes(answerIndex)) {
      classes.push('selected');
    }
    
    if (showCorrectAnswers) {
      if (questionData.answer_checks[answerIndex]) {
        classes.push('correct');
      } else if (selectedAnswers.includes(answerIndex)) {
        classes.push('incorrect');
      }
    }
    
    return classes.join(' ');
  };

  const renderImage = (imagePath) => {
    const imageSrc = `/images/${examName}/${imagePath}`;
    return <img src={imageSrc} alt="Question" className="question-image" onError={(e) => {
      e.target.style.display = 'none';
      console.warn(`Image not found: ${imageSrc}`);
    }} />;
  };

  const isMultipleChoice = questionData.answer_checks.filter(Boolean).length > 1;

  return (
    <div className="question-container">
      <div className="question-header">
        <h3>Question {questionIndex + 1} of {totalQuestions}</h3>
        <div className="question-meta">
          <span>📝 Topic {questionData.topic_number}</span>
          <span>🔢 Question {questionData.question_number}</span>
          {isMultipleChoice && <span>✅ Multiple Answers</span>}
        </div>
      </div>

      <div className="question-content">
        <p className="question-text">{questionData.question}</p>
        
        {questionData.images && questionData.images.length > 0 && (
          <div className="question-images">
            {questionData.images.map((image, index) => (
              <div key={index} className="image-container">
                {renderImage(image)}
              </div>
            ))}
          </div>
        )}

        <div className="answers-section">
          <h4>Select your answer{isMultipleChoice ? 's' : ''}:</h4>
          {questionData.answers.map((answer, index) => (
            <div
              key={index}
              className={getAnswerClass(index)}
              onClick={() => !showCorrectAnswers && handleAnswerToggle(index)}
            >
              <span className="answer-label">
                {questionData.answer_labels[index]}
              </span>
              <span className="answer-text">{answer}</span>
            </div>
          ))}
        </div>

        {showCorrectAnswers && (
          <div className="correct-answers-section">
            <h4>✅ Correct Answer(s):</h4>
            <ul>
              {questionData.correct_answers.map((answer, index) => (
                <li key={index}>{answer}</li>
              ))}
            </ul>
          </div>
        )}

        {questionData.community_answers && questionData.community_answers.length > 0 && showCorrectAnswers && (
          <div className="community-answers">
            <h4>👥 Community Answers:</h4>
            {questionData.community_answers.map((answer, index) => (
              <p key={index}>{answer.text} - {answer.votes} votes</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Question;
EOF

# 5. StudyMode.js
cat > src/components/StudyMode.js << 'EOF'
import React, { useState, useEffect } from 'react';
import Question from './Question';
import { saveReport } from '../utils/reportUtils';

const StudyMode = ({ examData, settings, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [startTime] = useState(new Date());
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    initializeQuestions();
  }, [examData, settings]);

  const initializeQuestions = () => {
    let questionsToUse = [...examData];
    
    if (settings.randomOrder) {
      questionsToUse = shuffleArray(questionsToUse);
    } else {
      questionsToUse = questionsToUse.slice(settings.startFromQuestion - 1);
    }
    
    questionsToUse = questionsToUse.slice(0, settings.questionCount);
    setQuestions(questionsToUse);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerChange = (questionIndex, answers) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: answers
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowAnswers(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowAnswers(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswers(!showAnswers);
  };

  const handleFinish = () => {
    const endTime = new Date();
    const report = generateReport(startTime, endTime);
    saveReport(report, 'study');
    onComplete(report);
  };

  const generateReport = (startTime, endTime) => {
    const totalTime = Math.round((endTime - startTime) / 1000);
    let correctAnswers = 0;
    let totalAnswered = 0;

    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer && userAnswer.length > 0) {
        totalAnswered++;
        const correctIndices = question.answer_checks
          .map((isCorrect, i) => isCorrect ? i : -1)
          .filter(i => i !== -1);
        
        if (arraysEqual(userAnswer.sort(), correctIndices.sort())) {
          correctAnswers++;
        }
      }
    });

    return {
      mode: 'study',
      examName: examData[0]?.exam_name || 'Unknown',
      totalQuestions: questions.length,
      totalAnswered,
      correctAnswers,
      incorrectAnswers: totalAnswered - correctAnswers,
      unanswered: questions.length - totalAnswered,
      percentage: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0,
      timeSpent: totalTime,
      timestamp: new Date().toISOString(),
      questions: questions,
      userAnswers
    };
  };

  const arraysEqual = (a, b) => {
    return a.length === b.length && a.every(val => b.includes(val));
  };

  if (questions.length === 0) {
    return <div className="loading">📚 Loading questions...</div>;
  }

  return (
    <div className="study-mode">
      <div className="study-header">
        <button onClick={onBack} className="back-btn">← Back to Home</button>
        <h2>📖 Study Mode</h2>
        <button onClick={handleFinish} className="finish-btn">✅ Finish Study</button>
      </div>

      <Question
        questionData={questions[currentQuestionIndex]}
        questionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        userAnswers={userAnswers}
        onAnswerChange={handleAnswerChange}
        showCorrectAnswers={showAnswers}
        examName={examData[0]?.exam_name}
      />

      <div className="study-controls">
        <button 
          onClick={handlePrevious} 
          disabled={currentQuestionIndex === 0}
          className="nav-btn"
        >
          ← Previous
        </button>
        
        <button onClick={handleShowAnswer} className="show-answer-btn">
          {showAnswers ? '🙈 Hide Answer' : '👁️ Show Answer'}
        </button>
        
        <button 
          onClick={handleNext} 
          disabled={currentQuestionIndex === questions.length - 1}
          className="nav-btn"
        >
          Next →
        </button>
      </div>

      <div className="progress-container">
        <div className="progress">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` 
            }}
          />
        </div>
        <span className="progress-text">{currentQuestionIndex + 1} / {questions.length}</span>
      </div>
    </div>
  );
};

export default StudyMode;
EOF

# 6. ExamMode.js
cat > src/components/ExamMode.js << 'EOF'
import React, { useState, useEffect } from 'react';
import Question from './Question';
import { saveReport } from '../utils/reportUtils';

const ExamMode = ({ examData, settings, onComplete, onBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [startTime] = useState(new Date());
  const [timeLeft, setTimeLeft] = useState(settings.timeLimit * 60);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    initializeQuestions();
  }, [examData, settings]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const initializeQuestions = () => {
    let questionsToUse = [...examData];
    
    if (settings.randomOrder) {
      questionsToUse = shuffleArray(questionsToUse);
    }
    
    questionsToUse = questionsToUse.slice(0, settings.questionCount);
    setQuestions(questionsToUse);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerChange = (questionIndex, answers) => {
    setUserAnswers({
      ...userAnswers,
      [questionIndex]: answers
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleTimeUp = () => {
    if (!isFinished) {
      setIsFinished(true);
      handleFinish();
    }
  };

  const handleFinish = () => {
    if (isFinished) return;
    setIsFinished(true);
    const endTime = new Date();
    const report = generateReport(startTime, endTime);
    saveReport(report, 'exam');
    onComplete(report);
  };

  const generateReport = (startTime, endTime) => {
    const totalTime = Math.round((endTime - startTime) / 1000);
    let correctAnswers = 0;
    let totalAnswered = 0;

    questions.forEach((question, index) => {
      const userAnswer = userAnswers[index];
      if (userAnswer && userAnswer.length > 0) {
        totalAnswered++;
        const correctIndices = question.answer_checks
          .map((isCorrect, i) => isCorrect ? i : -1)
          .filter(i => i !== -1);
        
        if (arraysEqual(userAnswer.sort(), correctIndices.sort())) {
          correctAnswers++;
        }
      }
    });

    return {
      mode: 'exam',
      examName: examData[0]?.exam_name || 'Unknown',
      totalQuestions: questions.length,
      totalAnswered,
      correctAnswers,
      incorrectAnswers: totalAnswered - correctAnswers,
      unanswered: questions.length - totalAnswered,
      percentage: totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0,
      timeSpent: totalTime,
      timeLimit: settings.timeLimit * 60,
      timestamp: new Date().toISOString(),
      questions: questions,
      userAnswers
    };
  };

  const arraysEqual = (a, b) => {
    return a.length === b.length && a.every(val => b.includes(val));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerClass = () => {
    if (timeLeft <= 60) return 'timer critical';
    if (timeLeft <= 300) return 'timer warning';
    return 'timer';
  };

  if (questions.length === 0) {
    return <div className="loading">⏰ Loading exam...</div>;
  }

  return (
    <div className="exam-mode">
      <div className="exam-header">
        <button onClick={onBack} className="back-btn">← Back to Home</button>
        <h2>⏰ Exam Mode</h2>
        <div className={getTimerClass()}>
          ⏱️ Time Left: {formatTime(timeLeft)}
        </div>
        <button onClick={handleFinish} className="finish-btn" disabled={isFinished}>
          ✅ Finish Exam
        </button>
      </div>

      <Question
        questionData={questions[currentQuestionIndex]}
        questionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        userAnswers={userAnswers}
        onAnswerChange={handleAnswerChange}
        examName={examData[0]?.exam_name}
      />

      <div className="exam-controls">
        <button 
          onClick={handlePrevious} 
          disabled={currentQuestionIndex === 0}
          className="nav-btn"
        >
          ← Previous
        </button>
        
        <div className="question-nav">
          {questions.map((_, index) => (
            <button
              key={index}
              className={`question-nav-btn ${
                index === currentQuestionIndex ? 'current' : ''
              } ${
                userAnswers[index] && userAnswers[index].length > 0 ? 'answered' : ''
              }`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        
        <button 
          onClick={handleNext} 
          disabled={currentQuestionIndex === questions.length - 1}
          className="nav-btn"
        >
          Next →
        </button>
      </div>

      <div className="progress-container">
        <div className="progress">
          <div 
            className="progress-bar" 
            style={{ 
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` 
            }}
          />
        </div>
        <span className="progress-text">{currentQuestionIndex + 1} / {questions.length}</span>
      </div>
    </div>
  );
};

export default ExamMode;
EOF

# 7. Report.js
cat > src/components/Report.js << 'EOF'
import React from 'react';

const Report = ({ reportData, onBack }) => {
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
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
    <div className="report-container">
      <div className="report-header">
        <button onClick={onBack} className="back-btn">← Back to Home</button>
        <h2>📊 Exam Report</h2>
      </div>

      <div className="report-summary">
        <div className="score-circle">
          <div className="score-emoji">{getScoreEmoji(reportData.percentage)}</div>
          <div 
            className="score-text" 
            style={{ color: getScoreColor(reportData.percentage) }}
          >
            {reportData.percentage}%
          </div>
          <div className="score-label">Final Score</div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{reportData.totalQuestions}</div>
            <div className="stat-label">📝 Total Questions</div>
          </div>
          <div className="stat-item">
            <div className="stat-value correct">{reportData.correctAnswers}</div>
            <div className="stat-label">✅ Correct</div>
          </div>
          <div className="stat-item">
            <div className="stat-value incorrect">{reportData.incorrectAnswers}</div>
            <div className="stat-label">❌ Incorrect</div>
          </div>
          <div className="stat-item">
            <div className="stat-value unanswered">{reportData.unanswered}</div>
            <div className="stat-label">⏭️ Unanswered</div>
          </div>
        </div>
      </div>

      <div className="report-details">
        <h3>📋 Exam Details</h3>
        <div className="detail-row">
          <span>📚 Exam:</span>
          <span>{reportData.examName}</span>
        </div>
        <div className="detail-row">
          <span>🎯 Mode:</span>
          <span>{reportData.mode === 'exam' ? '⏰ Exam Mode' : '📖 Study Mode'}</span>
        </div>
        <div className="detail-row">
          <span>⏱️ Time Spent:</span>
          <span>{formatTime(reportData.timeSpent)}</span>
        </div>
        {reportData.timeLimit && (
          <div className="detail-row">
            <span>⏰ Time Limit:</span>
            <span>{formatTime(reportData.timeLimit)}</span>
          </div>
        )}
        <div className="detail-row">
          <span>📅 Date:</span>
          <span>{new Date(reportData.timestamp).toLocaleString()}</span>
        </div>
      </div>

      <div className="questions-review">
        <h3>🔍 Question Review</h3>
        {reportData.questions.map((question, index) => {
          const userAnswer = reportData.userAnswers[index] || [];
          const correctIndices = question.answer_checks
            .map((isCorrect, i) => isCorrect ? i : -1)
            .filter(i => i !== -1);
          const isCorrect = userAnswer.length > 0 && 
            userAnswer.sort().toString() === correctIndices.sort().toString();

          return (
            <div key={index} className={`question-review ${
              userAnswer.length === 0 ? 'unanswered' : isCorrect ? 'correct' : 'incorrect'
            }`}>
              <div className="question-review-header">
                <span className="question-number">Q{index + 1}</span>
                <span className={`status ${
                  userAnswer.length === 0 ? 'unanswered' : isCorrect ? 'correct' : 'incorrect'
                }`}>
                  {userAnswer.length === 0 ? '⏭️ Unanswered' : isCorrect ? '✅ Correct' : '❌ Incorrect'}
                </span>
              </div>
              <div className="question-text">{question.question}</div>
              <div className="answers-comparison">
                <div className="user-answers">
                  <strong>Your Answer:</strong>
                  {userAnswer.length > 0 ? (
                    <div className="answer-tags">
                      {userAnswer.map(i => (
                        <span key={i} className="answer-tag user">
                          {question.answer_labels[i]}: {question.answers[i]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="no-answer">No answer selected</span>
                  )}
                </div>
                <div className="correct-answers">
                  <strong>Correct Answer:</strong>
                  <div className="answer-tags">
                    {correctIndices.map(i => (
                      <span key={i} className="answer-tag correct">
                        {question.answer_labels[i]}: {question.answers[i]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Report;
EOF

# 8. ReportsList.js
cat > src/components/ReportsList.js << 'EOF'
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
EOF

# 9. utils/fileUtils.js
cat > src/utils/fileUtils.js << 'EOF'
export const loadAvailableExams = async () => {
  try {
    // Per il momento restituisce un array vuoto
    // Questo dovrebbe essere implementato con un backend
    console.log('Loading available exams...');
    
    // Esempio di implementazione mock per testing
    const mockExams = [
      'professional_cloud_developer.json',
      'aws_solutions_architect.json',
      'azure_fundamentals.json'
    ];
    
    // Simula una chiamata API
    return new Promise(resolve => {
      setTimeout(() => resolve([]), 1000);
    });
    
  } catch (error) {
    console.error('Error loading available exams:', error);
    return [];
  }
};

export const saveExamFile = async (data, filename) => {
  try {
    // Questo dovrebbe salvare il file nella cartella data/
    console.log('Saving exam file:', filename);
    
    // Per ora salva in localStorage come fallback
    const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
    savedExams[filename] = data;
    localStorage.setItem('savedExams', JSON.stringify(savedExams));
    
    return true;
  } catch (error) {
    console.error('Error saving exam file:', error);
    return false;
  }
};

export const loadExamData = async (filename) => {
  try {
    // Prima prova a caricare da localStorage
    const savedExams = JSON.parse(localStorage.getItem('savedExams') || '{}');
    if (savedExams[filename]) {
      return savedExams[filename];
    }
    
    // Altrimenti prova a caricare dal server
    const response = await fetch(`/data/${filename}`);
    if (response.ok) {
      return await response.json();
    }
    
    throw new Error('Exam file not found');
  } catch (error) {
    console.error('Error loading exam data:', error);
    return null;
  }
};
EOF

# 10. utils/reportUtils.js
cat > src/utils/reportUtils.js << 'EOF'
export const saveReport = (reportData, mode) => {
  const reports = getReports();
  const reportWithId = {
    ...reportData,
    id: Date.now().toString(),
    mode
  };
  
  reports.push(reportWithId);
  localStorage.setItem('examReports', JSON.stringify(reports));
  
  // Log per debug
  console.log('Report saved:', reportWithId);
  
  // Qui dovrebbe essere implementato il salvataggio su file
  // saveReportToFile(reportWithId);
};

export const getReports = () => {
  try {
    const reports = localStorage.getItem('examReports');
    return reports ? JSON.parse(reports) : [];
  } catch (error) {
    console.error('Error getting reports:', error);
    return [];
  }
};

export const loadReports = async () => {
  return getReports();
};

export const deleteReport = async (reportId) => {
  try {
    const reports = getReports();
    const filteredReports = reports.filter(report => report.id !== reportId);
    localStorage.setItem('examReports', JSON.stringify(filteredReports));
    console.log('Report deleted:', reportId);
  } catch (error) {
    console.error('Error deleting report:', error);
  }
};

const saveReportToFile = async (reportData) => {
  try {
    // Questo dovrebbe salvare il report nella cartella exam-reports/
    console.log('Saving report to file:', reportData.id);
    
    // Implementazione futura con backend
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving report to file:', error);
    return false;
  }
};

export const generateReportFileName = (reportData) => {
  const date = new Date(reportData.timestamp);
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${reportData.examName}_${reportData.mode}_${dateStr}_${timeStr}.json`;
};
EOF

# 11. App.css (versione completa con emoji e stili moderni)
cat > src/App.css << 'EOF'
/* Reset e variabili */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #007bff;
  --primary-hover: #0056b3;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --info-color: #17a2b8;
  --light-color: #f8f9fa;
  --dark-color: #343a40;
  --border-radius: 8px;
  --box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  --transition: all 0.3s ease;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  min-height: 100vh;
}

.App {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
}

/* Loading */
.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 24px;
  color: var(--dark-color);
}

/* Home Page */
.home-page {
  text-align: center;
  animation: fadeIn 0.5s ease-in;
}

.home-page h1 {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: var(--dark-color);
  text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
}

.upload-section, .available-exams {
  margin: 30px 0;
  padding: 30px;
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  transition: var(--transition);
}

.upload-section:hover, .available-exams:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.available-exams ul {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 15px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.available-exams li button {
  width: 100%;
  padding: 15px 25px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 16px;
  transition: var(--transition);
}

.available-exams li button:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

/* File Uploader */
.file-uploader {
  margin: 20px 0;
}

.upload-btn {
  background: var(--success-color) !important;
  color: white !important;
  padding: 15px 30px !important;
  font-size: 18px !important;
  border-radius: var(--border-radius) !important;
  border: none !important;
  cursor: pointer !important;
  transition: var(--transition) !important;
}

.upload-btn:hover {
  background: #218838 !important;
  transform: translateY(-2px) !important;
}

.upload-btn:disabled {
  background: #6c757d !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Mode Selection */
.mode-selection {
  max-width: 600px;
  margin: 50px auto;
  padding: 40px;
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  animation: slideUp 0.5s ease-out;
}

.mode-selection h2 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--dark-color);
}

.mode-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 30px 0;
}

.mode-options label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 25px;
  border: 3px solid #e9ecef;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  background: white;
}

.mode-options label:hover {
  border-color: var(--primary-color);
  background: #f8f9ff;
}

.mode-options label.selected,
.mode-options label:has(input:checked) {
  border-color: var(--primary-color);
  background: #e3f2fd;
  transform: scale(1.05);
}

.mode-options input[type="radio"] {
  display: none;
}

.mode-options span {
  font-size: 18px;
  font-weight: 600;
}

.settings {
  display: grid;
  gap: 20px;
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: var(--border-radius);
}

.settings > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings label {
  font-weight: 500;
  color: var(--dark-color);
}

.settings input[type="number"] {
  padding: 10px;
  border: 2px solid #e9ecef;
  border-radius: var(--border-radius);
  width: 120px;
  font-size: 16px;
  transition: var(--transition);
}

.settings input[type="number"]:focus {
  border-color: var(--primary-color);
  outline: none;
}

.checkbox-container {
  justify-content: center !important;
}

.checkbox-container label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.start-btn {
  width: 100%;
  padding: 15px;
  font-size: 18px;
  font-weight: 600;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  margin-top: 20px;
}

.start-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-2px);
}

.start-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

/* Question Container */
.question-container {
  background: white;
  border-radius: 15px;
  padding: 40px;
  box-shadow: var(--box-shadow);
  margin: 20px 0;
  animation: fadeIn 0.3s ease-in;
}

.question-header {
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 20px;
  margin-bottom: 30px;
}

.question-header h3 {
  font-size: 24px;
  color: var(--dark-color);
  margin-bottom: 10px;
}

.question-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.question-meta span {
  background: var(--light-color);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 14px;
  color: var(--dark-color);
  border: 1px solid #dee2e6;
}

.question-text {
  font-size: 18px;
  line-height: 1.7;
  margin: 30px 0;
  white-space: pre-wrap;
  color: var(--dark-color);
}

.question-images {
  margin: 20px 0;
}

.image-container {
  text-align: center;
  margin: 15px 0;
}

.question-image {
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

/* Answers */
.answers-section h4 {
  margin: 30px 0 20px 0;
  color: var(--dark-color);
  font-size: 20px;
}

.answer-option {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  margin: 15px 0;
  border: 2px solid #e9ecef;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
  background: white;
}

.answer-option:hover {
  border-color: var(--primary-color);
  background: #f8f9ff;
  transform: translateX(5px);
}

.answer-option.selected {
  border-color: var(--primary-color);
  background: #e3f2fd;
  box-shadow: 0 2px 8px rgba(0,123,255,0.2);
}

.answer-option.correct {
  border-color: var(--success-color);
  background: #d4edda;
}

.answer-option.incorrect {
  border-color: var(--danger-color);
  background: #f8d7da;
}

.answer-label {
  font-weight: bold;
  min-width: 30px;
  color: var(--primary-color);
  font-size: 18px;
}

.answer-text {
  flex: 1;
  line-height: 1.6;
  font-size: 16px;
}

/* Study and Exam Mode Headers */
.study-header, .exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 2px solid #e9ecef;
  margin-bottom: 30px;
  background: white;
  border-radius: var(--border-radius);
  padding: 20px 30px;
  box-shadow: var(--box-shadow);
}

.study-header h2, .exam-header h2 {
  color: var(--dark-color);
  font-size: 28px;
}

.timer {
  font-size: 20px;
  font-weight: bold;
  padding: 12px 20px;
  border-radius: var(--border-radius);
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.timer.warning {
  background: #fff3cd;
  color: #856404;
  animation: pulse 1s infinite;
}

.timer.critical {
  background: #f8d7da;
  color: #721c24;
  animation: pulse 0.5s infinite;
}

/* Controls */
.study-controls, .exam-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30px 0;
  gap: 20px;
  background: white;
  border-radius: var(--border-radius);
  padding: 20px 30px;
  margin-top: 20px;
  box-shadow: var(--box-shadow);
}

.question-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
}

.question-nav-btn {
  min-width: 45px;
  height: 45px;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
}

.question-nav-btn:hover {
  border-color: var(--primary-color);
  background: #f8f9ff;
}

.question-nav-btn.current {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  transform: scale(1.1);
}

.question-nav-btn.answered {
  background: var(--success-color);
  color: white;
  border-color: var(--success-color);
}

/* Progress */
.progress-container {
  margin: 20px 0;
  background: white;
  padding: 20px;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
}

.progress {
  position: relative;
  height: 12px;
  background: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(45deg, var(--primary-color), #0056b3);
  border-radius: 6px;
  transition: width 0.5s ease;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%);
  animation: shimmer 2s infinite;
}

.progress-text {
  display: block;
  text-align: center;
  margin-top: 10px;
  font-weight: 600;
  color: var(--dark-color);
}

/* Buttons */
button {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: var(--transition);
  background: var(--primary-color);
  color: white;
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}

.back-btn {
  background: var(--info-color);
}

.back-btn:hover {
  background: #138496;
}

.finish-btn {
  background: var(--success-color);
}

.finish-btn:hover {
  background: #218838;
}

.nav-btn {
  background: var(--primary-color);
  min-width: 120px;
}

.show-answer-btn {
  background: var(--warning-color);
  color: var(--dark-color);
}

.show-answer-btn:hover {
  background: #e0a800;
}

/* Report Styles */
.report-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  animation: fadeIn 0.5s ease-in;
}

.report-summary {
  display: flex;
  align-items: center;
  gap: 50px;
  margin: 40px 0;
  padding: 40px;
  background: white;
  border-radius: 15px;
  box-shadow: var(--box-shadow);
}

.score-circle {
  text-align: center;
  padding: 20px;
}

.score-emoji {
  font-size: 60px;
  margin-bottom: 10px;
}

.score-text {
  font-size: 48px;
  font-weight: bold;
  margin: 10px 0;
}

.score-label {
  color: #6c757d;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 30px;
  flex: 1;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: var(--border-radius);
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-value.correct {
  color: var(--success-color);
}

.stat-value.incorrect {
  color: var(--danger-color);
}

.stat-value.unanswered {
  color: #6c757d;
}

.stat-label {
  color: #6c757d;
  font-size: 14px;
}

.report-details {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin: 30px 0;
  box-shadow: var(--box-shadow);
}

.report-details h3 {
  margin-bottom: 20px;
  color: var(--dark-color);
  font-size: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 16px;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row span:first-child {
  font-weight: 600;
  color: #6c757d;
}

/* Question Review */
.questions-review {
  margin: 40px 0;
}

.questions-review h3 {
  margin-bottom: 30px;
  color: var(--dark-color);
  font-size: 24px;
}

.question-review {
  background: white;
  border-radius: var(--border-radius);
  padding: 25px;
  margin: 20px 0;
  border-left: 5px solid #dee2e6;
  box-shadow: var(--box-shadow);
  transition: var(--transition);
}

.question-review:hover {
  transform: translateX(5px);
}

.question-review.correct {
  border-left-color: var(--success-color);
}

.question-review.incorrect {
  border-left-color: var(--danger-color);
}

.question-review.unanswered {
  border-left-color: #6c757d;
}

.question-review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.question-number {
  font-weight: bold;
  color: var(--dark-color);
  font-size: 18px;
}

.status {
  font-weight: bold;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.status.correct {
  background: #d4edda;
  color: var(--success-color);
}

.status.incorrect {
  background: #f8d7da;
  color: var(--danger-color);
}

.status.unanswered {
  background: #e2e3e5;
  color: #6c757d;
}

.answers-comparison {
  margin-top: 20px;
}

.user-answers, .correct-answers {
  margin: 15px 0;
}

.user-answers strong, .correct-answers strong {
  display: block;
  margin-bottom: 10px;
  color: var(--dark-color);
}

.answer-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.answer-tag {
  display: inline-block;
  background: #e9ecef;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 14px;
  border: 1px solid #dee2e6;
}

.answer-tag.user {
  background: #e3f2fd;
  border-color: var(--primary-color);
}

.answer-tag.correct {
  background: #d4edda;
  color: var(--success-color);
  border-color: var(--success-color);
}

.no-answer {
  color: #6c757d;
  font-style: italic;
  padding: 8px 0;
}

/* Reports List */
.reports-list {
  margin: 50px 0;
}

.reports-list h2 {
  margin-bottom: 30px;
  color: var(--dark-color);
  font-size: 28px;
}

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
  margin: 30px 0;
}

.report-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: var(--box-shadow);
  transition: var(--transition);
  border: 1px solid #e9ecef;
}

.report-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.report-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.exam-info {
  flex: 1;
}

.exam-name {
  font-weight: bold;
  color: var(--dark-color);
  font-size: 18px;
  display: block;
  margin-bottom: 5px;
}

.exam-mode {
  background: var(--light-color);
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #6c757d;
}

.score-info {
  text-align: right;
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-emoji {
  font-size: 24px;
}

.score {
  font-size: 24px;
  font-weight: bold;
}

.report-stats {
  display: flex;
  justify-content: space-between;
  margin: 15px 0;
  color: #6c757d;
  font-size: 14px;
}

.report-date {
  font-size: 12px;
  color: #adb5bd;
  margin-top: 10px;
}

.report-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.view-btn, .delete-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.view-btn {
  background: var(--primary-color);
  color: white;
}

.view-btn:hover {
  background: var(--primary-hover);
}

.delete-btn {
  background: var(--danger-color);
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.no-reports {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
  background: white;
  border-radius: 15px;
  box-shadow: var(--box-shadow);
}

.no-reports p {
  margin: 10px 0;
  font-size: 18px;
}

/* Modal */
.report-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-in;
}

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 95vw;
  max-height: 95vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 2px solid #e9ecef;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.modal-header button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6c757d;
  padding: 5px;
  border-radius: 50%;
  transition: var(--transition);
}

.modal-header button:hover {
  background: #f8f9fa;
  color: var(--danger-color);
}

.modal-body {
  padding: 0;
}

/* Correct Answers Section */
.correct-answers-section {
  margin: 30px 0;
  padding: 25px;
  background: #d4edda;
  border-radius: var(--border-radius);
  border-left: 5px solid var(--success-color);
}

.correct-answers-section h4 {
  color: var(--success-color);
  margin-bottom: 15px;
}

.correct-answers-section ul {
  list-style: none;
  padding: 0;
}

.correct-answers-section li {
  padding: 8px 0;
  border-bottom: 1px solid #c3e6cb;
  color: #155724;
}

.correct-answers-section li:last-child {
  border-bottom: none;
}

/* Community Answers */
.community-answers {
  margin: 25px 0;
  padding: 20px;
  background: #e3f2fd;
  border-radius: var(--border-radius);
  border-left: 5px solid var(--info-color);
}

.community-answers h4 {
  color: var(--info-color);
  margin-bottom: 15px;
}

.community-answers p {
  margin: 8px 0;
  color: #0c5460;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .App {
    padding: 10px;
  }
  
  .home-page h1 {
    font-size: 2rem;
  }
  
  .mode-selection {
    margin: 20px auto;
    padding: 25px;
  }
  
  .mode-options {
    grid-template-columns: 1fr;
  }
  
  .report-summary {
    flex-direction: column;
    gap: 30px;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  
  .study-controls, .exam-controls {
    flex-direction: column;
    gap: 20px;
  }
  
  .question-nav {
    justify-content: center;
    max-width: 100%;
  }
  
  .reports-grid {
    grid-template-columns: 1fr;
  }
  
  .question-nav-btn {
    min-width: 35px;
    height: 35px;
    font-size: 12px;
  }
  
  .modal-content {
    max-width: 98vw;
    margin: 10px;
  }
}

@media (max-width: 480px) {
  .settings > div {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
  
  .settings input {
    width: 100%;
  }
  
  .question-container {
    padding: 20px;
  }
  
  .study-header, .exam-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .report-card-header {
    flex-direction: column;
    gap: 10px;
    align-items: center;
    text-align: center;
  }
}

/* Print styles */
@media print {
  .App {
    background: white;
  }
  
  button, .study-controls, .exam-controls {
    display: none;
  }
  
  .question-container, .report-container {
    box-shadow: none;
    border: 1px solid #ddd;
  }
}
EOF

# 12. File di esempio
echo "📄 Creazione file di esempio..."

# Crea un file di esempio per testare l'app
cat > data/example-exam.json << 'EOF'
[
  {
    "url": "https://example.com/question1",
    "question_number": 1,
    "question_number_found": 1,
    "topic_number": 1,
    "topic_number_found": 1,
    "warnings": [],
    "question": "What is the capital of France?",
    "images": [],
    "answers": [
      "London",
      "Berlin",
      "Paris",
      "Madrid"
    ],
    "answer_checks": [
      false,
      false,
      true,
      false
    ],
    "correct_answers": [
      "Paris"
    ],
    "community_answers": [
      {
        "text": "C (100%)",
        "percentage": "100%",
        "votes": "10"
      }
    ],
    "is_matching_question": true,
    "is_matching_topic": true,
    "answer_labels": [
      "A",
      "B",
      "C",
      "D"
    ],
    "exam_name": "example_exam",
    "highly_votated_answers": [],
    "most_recent_answers": []
  },
  {
    "url": "https://example.com/question2",
    "question_number": 2,
    "question_number_found": 2,
    "topic_number": 1,
    "topic_number_found": 1,
    "warnings": [],
    "question": "Which of the following are programming languages? (Select all that apply)",
    "images": [],
    "answers": [
      "JavaScript",
      "HTML",
      "Python",
      "CSS"
    ],
    "answer_checks": [
      true,
      false,
      true,
      false
    ],
    "correct_answers": [
      "JavaScript",
      "Python"
    ],
    "community_answers": [
      {
        "text": "A, C (95%)",
        "percentage": "95%",
        "votes": "8"
      }
    ],
    "is_matching_question": true,
    "is_matching_topic": true,
    "answer_labels": [
      "A",
      "B",
      "C",
      "D"
    ],
    "exam_name": "example_exam",
    "highly_votated_answers": [],
    "most_recent_answers": []
  }
]
EOF

# 13. README.md
cat > README.md << 'EOF'
# 📚 Exam Practice App

Una moderna applicazione React per praticare esami e quiz interattivi.

## ✨ Caratteristiche

- 📁 Caricamento file JSON con domande d'esame
- 📖 Modalità Studio: naviga tra le domande con risposte visibili
- ⏰ Modalità Esame: simulazione completa con timer
- 📊 Report dettagliati con statistiche e analisi
- 🖼️ Supporto per immagini nelle domande
- ✅ Gestione risposte multiple
- 💾 Salvataggio automatico dei progressi
- 📱 Design completamente responsivo

## 🚀 Installazione

```bash
# Clona il repository o usa lo script
./create-exam-app.sh

# Entra nella cartella
cd exam-app

# Installa le dipendenze
npm install

# Avvia l'applicazione
npm start