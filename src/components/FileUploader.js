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
