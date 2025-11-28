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
